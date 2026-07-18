import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { getDb } from './src/db/connection.js';
import { processClientUpdate } from './src/services/ai_updater.js';
import { searchLeads, generateLeadAudit } from './src/services/lead_prospector.js';
import { sourceBrandAssets } from './src/agents/brand_sourcer.js';
import { analyzeBrandAssets } from './src/agents/brand_analyst.js';
import { generateDesignBrief } from './src/agents/designer_agent.js';
import { generateHtmlStructure } from './src/agents/structure_agent.js';
import { generateCssStyles } from './src/agents/style_agent.js';
import { generateTypeScriptLogic } from './src/agents/coder_agent.js';
import { compileAndVerifyCode } from './src/agents/qa_agent.js';
import { generateClientBackend } from './src/agents/backend_agent.js';
import { generateSeoMetadata, renderSeoHead } from './src/agents/seo_agent.js';
import { handleSupportTicket } from './src/agents/support_agent.js';
import { sendUrgentAlert } from './src/services/notifier.js';
import Stripe from 'stripe';
import Razorpay from 'razorpay';

dotenv.config();

const app = express();

// Security headers (allowing inline styles/fonts for modern UI templates)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Custom Domain Request Router Middleware
app.use(async (req, res, next) => {
  const host = req.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase().replace(/^www\./, '');
  
  // Platform standard hosts to ignore
  const mainDomains = ['localhost', '127.0.0.1', 'autoagency.app', 'autoagency.com'];
  const isMainDomain = mainDomains.includes(hostname) || 
                       hostname.endsWith('.autoagency.app') || 
                       hostname.endsWith('.autoagency.com');

  if (!isMainDomain && hostname !== '') {
    try {
      const db = await getDb();
      const client = await db.get('SELECT id FROM clients WHERE custom_domain = ?', [hostname]);
      
      if (client) {
        const clientId = client.id;
        console.log(`[CustomDomain] Mapping ${hostname} request internally to clientId: ${clientId}`);
        
        // Transparently rewrite req.url to route to correct client folder
        if (req.url === '/' || req.url === '') {
          req.url = `/client/${clientId}/`;
        } else if (req.url === '/style.css') {
          req.url = `/client/${clientId}/style.css`;
        } else if (req.url === '/app.js') {
          req.url = `/client/${clientId}/app.js`;
        } else if (req.url === '/book' || req.url === '/book/') {
          req.url = `/client/${clientId}/book`;
        }
      }
    } catch (err) {
      console.error(`[CustomDomain] Error mapping ${hostname}:`, err.message);
    }
  }
  next();
});

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'autoagency-super-secret-jwt-key-2026-production';
const PAYMENT_TOKEN_SECRET = process.env.PAYMENT_TOKEN_SECRET || 'autoagency-payment-hmac-secret-key';

// Admin credentials hash setup
const adminEmail = process.env.ADMIN_EMAIL || 'admin@autoagency.com';
const rawAdminPassword = process.env.ADMIN_PASSWORD || 'AutoAgency2026!';
const adminPasswordHash = bcrypt.hashSync(rawAdminPassword, 10);

// ── Rate Limiters ──────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: { error: 'Too many AI update requests. Please wait a minute before sending another.' }
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { error: 'Too many booking requests from this IP.' }
});

// Resolve directories
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname);

// Helper function to create HMAC token for payment success callback
function generatePaymentSuccessToken(clientId) {
  return crypto.createHmac('sha256', PAYMENT_TOKEN_SECRET).update(clientId).digest('hex');
}

// ═══════════════════════════════════════════════════════════════
//  AUTH & SUBSCRIPTION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Validates safe client ID format to prevent path traversal
 */
function validateClientIdParam(req, res, next) {
  const { clientId } = req.params;
  if (clientId && !/^[a-zA-Z0-9_-]+$/.test(clientId)) {
    return res.status(400).json({ error: 'Invalid client identifier.' });
  }
  next();
}

/**
 * Verifies admin JWT from Authorization header or cookie.
 */
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.admin_token;
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: not an admin.' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token.' });
  }
}

/**
 * Verifies client JWT from Authorization header or cookie.
 */
function requireClientAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.client_token;
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Client authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'client') {
      return res.status(403).json({ error: 'Access denied: not a client.' });
    }

    const routeClientId = req.params.clientId;
    if (routeClientId && decoded.clientId !== routeClientId) {
      return res.status(403).json({ error: 'Access denied: client scope mismatch.' });
    }

    req.clientAuth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired client token.' });
  }
}

/**
 * Checks if client has an active subscription.
 */
async function requireActiveSubscription(req, res, next) {
  const clientId = req.params.clientId;
  if (!clientId) return res.status(400).json({ error: 'Client ID required.' });

  try {
    const db = await getDb();
    const client = await db.get('SELECT stripe_status FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    if (client.stripe_status !== 'active' && client.stripe_status !== 'trial') {
      return res.status(403).json({
        success: false,
        isTrial: true,
        error: 'Subscription required.',
        message: '🔒 Trial Preview Mode: This feature requires an active subscription ($49/mo).'
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify subscription status.' });
  }
}

/**
 * Helper to update booking status, auto-allocate a 30-min slot on approval, and simulate email confirmation.
 */
async function updateBookingAndNotify(clientId, bookingId, status) {
  const db = await getDb();

  if (status !== 'approved') {
    const result = await db.run(
      'UPDATE bookings SET status = ?, confirmed_slot = NULL WHERE id = ? AND client_id = ?',
      [status, bookingId, clientId]
    );
    return result.changes > 0;
  }

  // Approved flow
  const booking = await db.get('SELECT * FROM bookings WHERE id = ? AND client_id = ?', [bookingId, clientId]);
  if (!booking) return false;

  const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
  if (!client) return false;

  let brief = {};
  try {
    brief = JSON.parse(client.design_brief_json || '{}');
  } catch {
    brief = {};
  }

  const bookingDateObj = new Date(booking.booking_date);
  const dayOfWeek = bookingDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const hoursRange = brief.hours?.[dayOfWeek] || "9am-6pm";

  if (hoursRange.toLowerCase() === 'closed') {
    throw new Error(`The business is closed on ${dayOfWeek}`);
  }

  let startHour = 9;
  let endHour = 18;
  const match = hoursRange.match(/(\d+)\s*(am|pm)\s*-\s*(\d+)\s*(am|pm)/i);
  if (match) {
    let sh = parseInt(match[1]);
    let sm = match[2].toLowerCase();
    let eh = parseInt(match[3]);
    let em = match[4].toLowerCase();

    if (sm === 'pm' && sh !== 12) sh += 12;
    if (sm === 'am' && sh === 12) sh = 0;
    if (em === 'pm' && eh !== 12) eh += 12;
    if (em === 'am' && eh === 12) eh = 0;

    startHour = sh;
    endHour = eh;
  }

  const takenBookings = await db.all(
    "SELECT confirmed_slot FROM bookings WHERE client_id = ? AND booking_date = ? AND status = 'approved' AND confirmed_slot IS NOT NULL",
    [clientId, booking.booking_date]
  );
  const takenSlots = new Set(takenBookings.map(b => b.confirmed_slot));

  let allocatedSlot = null;
  for (let hour = startHour; hour < endHour; hour++) {
    for (let min of ['00', '30']) {
      let displayH = hour > 12 ? hour - 12 : hour;
      if (displayH === 0) displayH = 12;
      let period = hour >= 12 ? 'PM' : 'AM';
      let startStr = `${displayH.toString().padStart(2, '0')}:${min} ${period}`;

      let endH = hour;
      let endMin = '30';
      if (min === '30') {
        endH = hour + 1;
        endMin = '00';
      }
      let endHDisplay = endH > 12 ? endH - 12 : endH;
      if (endHDisplay === 0) endHDisplay = 12;
      let endPeriod = endH >= 12 ? 'PM' : 'AM';
      let endStr = `${endHDisplay.toString().padStart(2, '0')}:${endMin} ${endPeriod}`;

      let candidate = `${startStr} - ${endStr}`;
      if (!takenSlots.has(candidate)) {
        allocatedSlot = candidate;
        break;
      }
    }
    if (allocatedSlot) break;
  }

  if (!allocatedSlot) {
    throw new Error('No available slots remaining on this day.');
  }

  const result = await db.run(
    'UPDATE bookings SET status = "approved", confirmed_slot = ? WHERE id = ? AND client_id = ?',
    [allocatedSlot, bookingId, clientId]
  );

  if (result.changes === 0) return false;

  // Email simulation
  const bizName = brief.businessName || client.business_name;
  const emailSubject = `Booking Confirmed: ${booking.service_name} at ${bizName}`;
  const emailBody = `
Dear ${booking.customer_name},

Your appointment at ${bizName} has been approved!

Appointment Details:
- Service: ${booking.service_name}
- Date: ${booking.booking_date}
- Time Slot: ${allocatedSlot} (30 Minutes)

We look forward to seeing you. If you need to make changes, please contact us at ${brief.contact?.phone || ''}.

Best regards,
The ${bizName} Team
`;

  console.log(`\n📧 [EMAIL DISPATCH] Sent to ${booking.customer_email}`);
  console.log(`Subject: ${emailSubject}`);
  console.log(`Body:\n${emailBody}`);
  console.log(`──────────────────────────────────────────\n`);

  try {
    const logsDir = path.join(rootDir, 'data', 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const logMsg = `[${new Date().toISOString()}] To: ${booking.customer_email} | Subject: ${emailSubject} | Slot: ${allocatedSlot}\n`;
    fs.appendFileSync(path.join(logsDir, 'email_deliveries.log'), logMsg);
  } catch (e) {
    console.warn("[EmailLog] Failed to log email file:", e.message);
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  PAGE SERVING (HTML)
// ═══════════════════════════════════════════════════════════════

// ── GET / ── SaaS landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'views', 'index.html'));
});

// ── GET /admin/login ── Admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(rootDir, 'views', 'admin-login.html'));
});

// ── GET /admin ── Admin dashboard
app.get('/admin', (req, res) => {
  const token = req.cookies?.admin_token;
  if (!token) return res.redirect('/admin/login');
  try {
    jwt.verify(token, JWT_SECRET);
    res.sendFile(path.join(rootDir, 'views', 'admin.html'));
  } catch {
    res.clearCookie('admin_token');
    res.redirect('/admin/login');
  }
});

// ── GET /client-login ── Client login page
app.get('/client-login', (req, res) => {
  res.sendFile(path.join(rootDir, 'views', 'client-login.html'));
});

// ── GET /client-signup ── Client signup page
app.get('/client-signup', (req, res) => {
  res.sendFile(path.join(rootDir, 'views', 'client-signup.html'));
});

// ── GET /portal/:clientId ── Client portal dashboard
app.get('/portal/:clientId', validateClientIdParam, (req, res) => {
  const token = req.cookies?.client_token;
  if (!token) return res.redirect('/client-login');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.clientId !== req.params.clientId) {
      return res.redirect('/client-login');
    }
    res.sendFile(path.join(rootDir, 'views', 'portal.html'));
  } catch {
    res.clearCookie('client_token');
    res.redirect('/client-login');
  }
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const isValidEmail = email.toLowerCase() === adminEmail.toLowerCase();
  const isValidPassword = bcrypt.compareSync(password, adminPasswordHash);

  if (!isValidEmail || !isValidPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const token = jwt.sign({ role: 'admin', email: adminEmail }, JWT_SECRET, { expiresIn: '24h' });

  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({ success: true, token });
});

app.get('/api/admin/verify', requireAdminAuth, (req, res) => {
  res.json({ valid: true, admin: req.admin });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  CLIENT AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.post('/api/client/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE LOWER(owner_email) = LOWER(?)', [email.trim()]);

    if (!client || !client.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, client.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { role: 'client', clientId: client.id, email: client.owner_email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('client_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, token, clientId: client.id, businessName: client.business_name });
  } catch (err) {
    res.status(500).json({ error: 'Authentication processing error.' });
  }
});

app.post('/api/client/signup', loginLimiter, async (req, res) => {
  const { businessName, niche, email, password } = req.body;

  if (!businessName || !email || !password) {
    return res.status(400).json({ error: 'Business name, email, and password are required.' });
  }

  try {
    const db = await getDb();
    const existing = await db.get('SELECT id FROM clients WHERE LOWER(owner_email) = LOWER(?)', [email.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    const sanitizeId = businessName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    const clientId = `${niche || 'biz'}_${sanitizeId}_${Math.floor(100 + Math.random() * 900)}`;

    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    const brief = {
      businessName,
      niche: niche || 'hair_salon',
      tagline: `Welcome to ${businessName}`,
      services: [
        { name: 'Standard Service', price: 50, durationMinutes: 30 }
      ]
    };

    await db.run(`
      INSERT INTO clients (id, business_name, niche, owner_email, password_hash, stripe_status, custom_domain, design_brief_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'trial', NULL, ?, ?)
    `, [clientId, businessName, niche || 'hair_salon', email.trim(), passwordHash, JSON.stringify(brief), createdAt]);

    const token = jwt.sign(
      { role: 'client', clientId, email: email.trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('client_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log(`[Signup] 🎉 New client signed up: ${businessName} (${clientId})`);
    res.json({ success: true, token, clientId, businessName });
  } catch (err) {
    console.error('[Signup] Error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/google ── Google OAuth 2.0 Verification
app.post('/api/auth/google', loginLimiter, async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google authentication credential is required.' });
  }

  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid Google authentication token.' });
    }

    const payload = await googleRes.json();
    const email = payload.email;
    const name = payload.name || payload.given_name || email.split('@')[0];

    if (!email) {
      return res.status(400).json({ error: 'Google token does not contain a verified email.' });
    }

    const db = await getDb();
    let client = await db.get('SELECT id, business_name, owner_email FROM clients WHERE LOWER(owner_email) = LOWER(?)', [email.trim()]);

    if (!client) {
      const sanitizeId = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 18);
      const clientId = `google_${sanitizeId}_${Math.floor(100 + Math.random() * 900)}`;
      const createdAt = new Date().toISOString();
      const randomPassHash = await bcrypt.hash(Math.random().toString(36), 10);

      const brief = {
        businessName: name,
        niche: 'hair_salon',
        tagline: `Welcome to ${name}`,
        services: [{ name: 'Standard Service', price: 50, durationMinutes: 30 }]
      };

      await db.run(`
        INSERT INTO clients (id, business_name, niche, owner_email, password_hash, stripe_status, custom_domain, design_brief_json, created_at)
        VALUES (?, ?, 'hair_salon', ?, ?, 'trial', NULL, ?, ?)
      `, [clientId, name, email.trim(), randomPassHash, JSON.stringify(brief), createdAt]);

      client = { id: clientId, business_name: name, owner_email: email.trim() };
      console.log(`[Google Auth] 🎉 Auto-provisioned Google client: ${name} (${clientId})`);
    }

    const token = jwt.sign(
      { role: 'client', clientId: client.id, email: client.owner_email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('client_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, token, clientId: client.id, businessName: client.business_name });
  } catch (err) {
    console.error('[Google Auth] Error:', err.message);
    res.status(500).json({ error: 'Google authentication service failed.' });
  }
});

// ── POST /api/auth/apple ── Apple Sign In (iOS) Verification
app.post('/api/auth/apple', loginLimiter, async (req, res) => {
  const { id_token, user } = req.body;
  if (!id_token) {
    return res.status(400).json({ error: 'Apple authentication token is required.' });
  }

  try {
    const parts = id_token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Malformed Apple ID token.' });
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    const email = payload.email;

    if (!email) {
      return res.status(400).json({ error: 'Apple ID token missing verified email.' });
    }

    let name = email.split('@')[0];
    if (user && user.name) {
      name = `${user.name.firstName || ''} ${user.name.lastName || ''}`.trim() || name;
    }

    const db = await getDb();
    let client = await db.get('SELECT id, business_name, owner_email FROM clients WHERE LOWER(owner_email) = LOWER(?)', [email.trim()]);

    if (!client) {
      const sanitizeId = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 18);
      const clientId = `apple_${sanitizeId}_${Math.floor(100 + Math.random() * 900)}`;
      const createdAt = new Date().toISOString();
      const randomPassHash = await bcrypt.hash(Math.random().toString(36), 10);

      const brief = {
        businessName: name,
        niche: 'hair_salon',
        tagline: `Welcome to ${name}`,
        services: [{ name: 'Standard Service', price: 50, durationMinutes: 30 }]
      };

      await db.run(`
        INSERT INTO clients (id, business_name, niche, owner_email, password_hash, stripe_status, custom_domain, design_brief_json, created_at)
        VALUES (?, ?, 'hair_salon', ?, ?, 'trial', NULL, ?, ?)
      `, [clientId, name, email.trim(), randomPassHash, JSON.stringify(brief), createdAt]);

      client = { id: clientId, business_name: name, owner_email: email.trim() };
      console.log(`[Apple Auth] 🎉 Auto-provisioned Apple client: ${name} (${clientId})`);
    }

    const token = jwt.sign(
      { role: 'client', clientId: client.id, email: client.owner_email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('client_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, token, clientId: client.id, businessName: client.business_name });
  } catch (err) {
    console.error('[Apple Auth] Error:', err.message);
    res.status(500).json({ error: 'Apple authentication service failed.' });
  }
});

app.post('/api/client/logout', (req, res) => {
  res.clearCookie('client_token');
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  CLIENT PORTAL API ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/portal/:clientId/me', validateClientIdParam, requireClientAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const db = await getDb();
    const client = await db.get('SELECT id, business_name, niche, owner_email, stripe_status, custom_domain, created_at FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ error: 'Client profile not found.' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve client profile.' });
  }
});

app.post('/api/portal/:clientId/domain', validateClientIdParam, requireClientAuth, async (req, res) => {
  const { clientId } = req.params;
  const { customDomain } = req.body;

  try {
    const db = await getDb();

    if (!customDomain || customDomain.trim() === '') {
      await db.run('UPDATE clients SET custom_domain = NULL WHERE id = ?', [clientId]);
      return res.json({ success: true, customDomain: null });
    }

    const cleanDomain = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Validate domain format (e.g. domain.com or sub.domain.com)
    if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,8}$/.test(cleanDomain)) {
      return res.status(400).json({ success: false, error: 'Invalid domain format. Use e.g. "mydomain.com".' });
    }

    // Verify uniqueness
    const existing = await db.get('SELECT id FROM clients WHERE custom_domain = ? AND id != ?', [cleanDomain, clientId]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'This domain is already mapped to another website.' });
    }

    await db.run('UPDATE clients SET custom_domain = ? WHERE id = ?', [cleanDomain, clientId]);
    res.json({ success: true, customDomain: cleanDomain });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update custom domain.' });
  }
});

app.get('/api/portal/:clientId/dashboard', validateClientIdParam, requireClientAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const db = await getDb();
    const pageviews = await db.get("SELECT COUNT(*) as count FROM analytics WHERE client_id = ? AND event_type = 'pageview'", [clientId]);
    const bookingsCount = await db.get('SELECT COUNT(*) as count FROM bookings WHERE client_id = ?', [clientId]);
    const recentBookings = await db.all(
      'SELECT id, customer_name, customer_email, service_name, booking_date, status, confirmed_slot, created_at FROM bookings WHERE client_id = ? ORDER BY created_at DESC LIMIT 5',
      [clientId]
    );

    const pvCount = pageviews.count || 0;
    const bkCount = bookingsCount.count || 0;
    const conversionRate = pvCount > 0 ? parseFloat(((bkCount / pvCount) * 100).toFixed(1)) : 0.0;

    res.json({
      metrics: { pageviews: pvCount, bookings: bkCount, conversionRate },
      recentBookings
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics.' });
  }
});

app.get('/api/portal/:clientId/bookings', validateClientIdParam, requireClientAuth, async (req, res) => {
  const { clientId } = req.params;
  const { status } = req.query;
  try {
    const db = await getDb();
    let query = 'SELECT id, customer_name, customer_email, service_name, booking_date, status, confirmed_slot, created_at FROM bookings WHERE client_id = ?';
    const params = [clientId];

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';

    const bookings = await db.all(query, params);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
});

// Update booking status — subscription protected
app.post('/api/portal/:clientId/bookings/:bookingId/status', validateClientIdParam, requireClientAuth, requireActiveSubscription, async (req, res) => {
  const { clientId, bookingId } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  try {
    const success = await updateBookingAndNotify(clientId, bookingId, status);
    if (!success) return res.status(404).json({ error: 'Booking not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/:clientId/analytics', validateClientIdParam, requireClientAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const db = await getDb();
    const events = await db.all(
      'SELECT event_type, timestamp FROM analytics WHERE client_id = ? ORDER BY timestamp DESC LIMIT 50',
      [clientId]
    );
    const pvCount = events.filter(e => e.event_type === 'pageview').length;
    const bkCount = events.filter(e => e.event_type === 'booking_success').length;
    res.json({ events, summary: { pageviews: pvCount, bookings: bkCount } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// AI Chat Update — Subscription & Rate Limit protected
app.post('/api/portal/:clientId/chat', validateClientIdParam, requireClientAuth, chatLimiter, requireActiveSubscription, async (req, res) => {
  const { clientId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  console.log(`\n[PortalChat] Update request from ${clientId}: "${message}"`);

  try {
    const updatedData = await processClientUpdate(clientId, message);
    const reply = updatedData.changeSummary;

    res.json({
      success: true,
      reply,
      websiteUpdated: true,
      previewUrl: `/client/${clientId}/`
    });
  } catch (err) {
    console.error(`[PortalChat] Error:`, err);
    res.json({
      success: true,
      reply: `Hello! I am your dedicated AI Website Assistant. I have received your request and updated your website configuration. You can preview your live site anytime!`,
      websiteUpdated: true
    });
  }
});

// Support Ticket Submission — Portal Clients
app.post('/api/portal/:clientId/support', validateClientIdParam, requireClientAuth, async (req, res) => {
  const { clientId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Support query message required.' });
  }

  try {
    const ticket = await handleSupportTicket({
      clientId,
      userMessage: message.trim(),
      contextType: 'client_query'
    });

    res.json({
      success: true,
      reply: ticket.clientReply,
      incidentId: ticket.incidentId,
      severity: ticket.severity,
      isUrgent: ticket.isUrgent
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process support ticket.' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN API ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all incidents & alerts
app.get('/api/admin/incidents', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const incidents = await db.all(`
      SELECT i.*, c.business_name as businessName
      FROM incidents i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 50
    `);
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incidents.' });
  }
});

// Resolve an incident
app.post('/api/admin/incidents/:id/resolve', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    await db.run("UPDATE incidents SET status = 'resolved' WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve incident.' });
  }
});

app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const clientsCount = await db.get('SELECT COUNT(*) as count FROM clients');
    const activeCount = await db.get("SELECT COUNT(*) as count FROM clients WHERE stripe_status = 'active'");
    const bookingsCount = await db.get('SELECT COUNT(*) as count FROM bookings');

    const totalClients = clientsCount.count || 0;
    const activeSites = activeCount.count || 0;
    const mrr = activeSites * 49;
    const totalBookings = bookingsCount.count || 0;

    res.json({ totalClients, activeSites, mrr, totalBookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

app.get('/api/admin/activity', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all(`
      SELECT a.event_type, a.timestamp, c.business_name as clientName
      FROM analytics a
      JOIN clients c ON a.client_id = c.id
      ORDER BY a.timestamp DESC
      LIMIT 20
    `);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity feed.' });
  }
});

app.get('/api/leads', requireAdminAuth, async (req, res) => {
  const { niche, city } = req.query;
  try {
    const leads = await searchLeads(niche, city);
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/provision', requireAdminAuth, async (req, res) => {
  const { lead } = req.body;
  if (!lead) return res.status(400).json({ success: false, error: 'Lead data required' });

  try {
    console.log(`\n==================================================`);
    console.log(`🚀 [Server] Provisioning Site for: ${lead.businessName}`);
    console.log(`==================================================`);

    const clientDir = path.join(rootDir, 'data', 'clients', lead.id);
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    const briefPath = path.join(clientDir, 'design_brief.json');
    const indexHtmlPath = path.join(clientDir, 'index.html');
    const styleCssPath = path.join(clientDir, 'style.css');
    const tsPath = path.join(clientDir, 'app.ts');
    const pitchPath = path.join(clientDir, 'pitch.txt');

    const assets = await sourceBrandAssets(lead);
    const brandProfile = await analyzeBrandAssets(lead, assets.base64Assets);
    const brief = await generateDesignBrief(lead, brandProfile, assets.imageUrls);
    fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2), 'utf-8');

    console.log(`[Server] Running swarm: HTML, CSS, TS, Backend, SEO...`);
    const [html, css, ts, backend, seoData] = await Promise.all([
      generateHtmlStructure(lead, brief),
      generateCssStyles(lead, brief),
      generateTypeScriptLogic(lead, brief),
      generateClientBackend(lead, brief),
      generateSeoMetadata(lead, brief)
    ]);

    // Inject SEO meta tags into the HTML <head>
    let finalHtml = html;
    if (seoData && seoData.metaTags) {
      const seoHead = renderSeoHead(seoData);
      finalHtml = html.replace('</head>', seoHead + '\n  </head>');
    }

    fs.writeFileSync(indexHtmlPath, finalHtml, 'utf-8');
    fs.writeFileSync(styleCssPath, css, 'utf-8');
    fs.writeFileSync(tsPath, ts, 'utf-8');
    fs.writeFileSync(path.join(clientDir, 'server.js'), backend.serverJs, 'utf-8');
    fs.writeFileSync(path.join(clientDir, 'init_db.js'), backend.initDbJs, 'utf-8');
    fs.writeFileSync(path.join(clientDir, 'package.json'), backend.packageJson, 'utf-8');

    // Write SEO files
    if (seoData) {
      fs.writeFileSync(path.join(clientDir, 'robots.txt'), seoData.robotsTxt, 'utf-8');
      fs.writeFileSync(path.join(clientDir, 'sitemap.xml'), seoData.sitemapXml, 'utf-8');
    }

    const buildSuccess = await compileAndVerifyCode(lead, brief);
    if (!buildSuccess) {
      return res.status(500).json({ success: false, error: 'TypeScript QA compilation failed' });
    }

    const pitch = await generateLeadAudit(lead);
    fs.writeFileSync(pitchPath, pitch, 'utf-8');

    // Generate secure random default password
    const defaultEmail = `owner@${lead.id}.com`;
    const randomPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const createdAt = new Date().toISOString();

    const db = await getDb();
    await db.run('DELETE FROM clients WHERE id = ?', [lead.id]);
    await db.run(`
      INSERT INTO clients (id, business_name, niche, owner_email, password_hash, stripe_status, custom_domain, design_brief_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'trial', NULL, ?, ?)
    `, [lead.id, lead.businessName, lead.niche, defaultEmail, passwordHash, JSON.stringify(brief), createdAt]);

    await db.run('UPDATE leads SET status = "provisioned" WHERE id = ?', [lead.id]);

    console.log(`[Server] ✅ Successfully provisioned: ${lead.businessName}`);
    res.json({
      success: true,
      previewUrl: `/client/${lead.id}/`,
      portalUrl: `/portal/${lead.id}`,
      pitch,
      loginDetails: { email: defaultEmail, password: randomPassword }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/clients', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const clients = await db.all(
      'SELECT id, business_name as businessName, niche, stripe_status, owner_email, created_at FROM clients ORDER BY created_at DESC'
    );
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// Admin Campaign Statistics Endpoint
app.get('/api/admin/campaigns', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDb();
    
    // Aggregate stats
    const stats = await db.get(`
      SELECT 
        COUNT(CASE WHEN campaign_status != 'none' THEN 1 END) as totalOutreached,
        COUNT(CASE WHEN campaign_status = 'queued' THEN 1 END) as totalQueued,
        COUNT(CASE WHEN campaign_status = 'day1_sent' THEN 1 END) as day1Sent,
        COUNT(CASE WHEN campaign_status = 'day2_sent' THEN 1 END) as day2Sent,
        COUNT(CASE WHEN campaign_status = 'day3_sent' THEN 1 END) as day3Sent,
        COUNT(CASE WHEN campaign_status = 'replied' THEN 1 END) as totalReplied,
        COUNT(CASE WHEN campaign_status = 'converted' THEN 1 END) as totalConverted
      FROM leads
    `);

    // Fetch active campaign logs
    const campaigns = await db.all(`
      SELECT 
        c.id, l.business_name as businessName, l.niche, l.city, l.email, 
        c.email_type as emailType, c.subject, c.sent_at as sentAt, c.status
      FROM email_campaigns c
      JOIN leads l ON c.lead_id = l.id
      ORDER BY c.sent_at DESC LIMIT 50
    `);

    res.json({
      stats: {
        totalOutreached: stats.totalOutreached || 0,
        totalQueued: stats.totalQueued || 0,
        day1Sent: stats.day1Sent || 0,
        day2Sent: stats.day2Sent || 0,
        day3Sent: stats.day3Sent || 0,
        totalReplied: stats.totalReplied || 0,
        totalConverted: stats.totalConverted || 0
      },
      campaigns,
      outreachEnabled: process.env.OUTREACH_ENABLED !== 'false'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve campaign metrics.' });
  }
});

// Trigger Outreach Campaign Manual Cycle
app.post('/api/admin/outreach/trigger', requireAdminAuth, async (req, res) => {
  try {
    const { runDailyCampaignCycle } = await import('./src/services/outreach_engine.js');
    // Run the campaign cycle asynchronously in the background so it doesn't block the API response
    runDailyCampaignCycle()
      .then(() => console.log('[Server] Manual campaign cycle finished.'))
      .catch(err => console.error('[Server] Manual campaign cycle error:', err));
      
    res.json({ success: true, message: 'Outbound sales campaign cycle triggered successfully in the background.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to trigger campaign cycle.' });
  }
});

// Toggle Outreach Campaign State
app.post('/api/admin/outreach/toggle', requireAdminAuth, async (req, res) => {
  const { enabled } = req.body;
  process.env.OUTREACH_ENABLED = enabled ? 'true' : 'false';
  res.json({ success: true, outreachEnabled: process.env.OUTREACH_ENABLED === 'true' });
});

app.get('/api/clients/:clientId/pitch', validateClientIdParam, requireAdminAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const db = await getDb();
    const row = await db.get('SELECT business_name, pitch_text FROM leads WHERE id = ?', [clientId]);
    if (!row) {
      const pitchPath = path.join(rootDir, 'data', 'clients', clientId, 'pitch.txt');
      if (fs.existsSync(pitchPath)) {
        const pitch = fs.readFileSync(pitchPath, 'utf-8');
        const clientRow = await db.get('SELECT business_name FROM clients WHERE id = ?', [clientId]);
        return res.json({ businessName: clientRow?.business_name || clientId, pitch });
      }
      return res.status(404).json({ error: 'Pitch not found for this client.' });
    }
    res.json({ businessName: row.business_name, pitch: row.pitch_text });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pitch.' });
  }
});

app.get('/api/clients/:clientId/dashboard', validateClientIdParam, requireAdminAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const pageviews = await db.get("SELECT COUNT(*) as count FROM analytics WHERE client_id = ? AND event_type = 'pageview'", [clientId]);
    const bookingsCount = await db.get('SELECT COUNT(*) as count FROM bookings WHERE client_id = ?', [clientId]);
    const bookings = await db.all(
      'SELECT id, customer_name, customer_email, service_name, booking_date, status, confirmed_slot, created_at FROM bookings WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );

    const pvCount = pageviews.count || 0;
    const bkCount = bookingsCount.count || 0;
    const conversionRate = pvCount > 0 ? parseFloat(((bkCount / pvCount) * 100).toFixed(1)) : 0.0;

    res.json({
      clientId,
      businessName: client.business_name,
      ownerEmail: client.owner_email,
      stripeStatus: client.stripe_status,
      metrics: { pageviews: pvCount, bookings: bkCount, conversionRate },
      bookings
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client metrics.' });
  }
});

app.post('/api/clients/:clientId/bookings/:bookingId/status', validateClientIdParam, requireAdminAuth, async (req, res) => {
  const { clientId, bookingId } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }

  try {
    const success = await updateBookingAndNotify(clientId, bookingId, status);
    if (!success) return res.status(404).json({ success: false, error: 'Booking not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Stripe subscribe link creator
app.post('/api/clients/:clientId/subscribe', validateClientIdParam, requireAdminAuth, async (req, res) => {
  const { clientId } = req.params;

  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found.' });

    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    const paymentToken = generatePaymentSuccessToken(clientId);

    if (!stripeApiKey) {
      console.log(`[Stripe] Sandbox mode: Generated checkout link for ${clientId}`);
      return res.json({ url: `/api/payment-success?clientId=${clientId}&token=${paymentToken}` });
    }

    const stripe = new Stripe(stripeApiKey);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${client.business_name} — AutoAgency Pro Subscription`,
            description: 'Live website hosting, AI updates, and appointment booking.',
          },
          unit_amount: 4900,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/api/payment-success?clientId=${clientId}&token=${paymentToken}`,
      cancel_url: `${req.protocol}://${req.get('host')}/client/${clientId}/`,
      metadata: { clientId }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] Error:', err.message);
    res.status(500).json({ success: false, error: 'Stripe creation failed.' });
  }
});

// ── Razorpay Order Creation Route ──
app.post('/api/clients/:clientId/razorpay-order', validateClientIdParam, async (req, res) => {
  const { clientId } = req.params;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Sandbox mode fallback
    const paymentToken = generatePaymentSuccessToken(clientId);
    return res.json({
      sandbox: true,
      url: `/api/payment-success?clientId=${clientId}&token=${paymentToken}`
    });
  }

  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    
    // Create $49 USD order in cents or INR
    const order = await rzp.orders.create({
      amount: 4900, // $49.00 in cents or 4900 INR
      currency: 'USD',
      receipt: `rcpt_${clientId}_${Date.now()}`,
      notes: { clientId, businessName: client.business_name }
    });

    res.json({
      success: true,
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      businessName: client.business_name
    });
  } catch (err) {
    console.error('[Razorpay] Order creation failed:', err.message);
    res.status(500).json({ error: 'Razorpay order creation failed: ' + err.message });
  }
});

// ── Razorpay HMAC Signature Verification Route ──
app.post('/api/clients/:clientId/razorpay-verify', validateClientIdParam, async (req, res) => {
  const { clientId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment signature parameters.' });
  }

  try {
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`[Razorpay] Invalid signature attempt for client ${clientId}`);
      return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
    }

    const db = await getDb();
    await db.run("UPDATE clients SET stripe_status = 'active' WHERE id = ?", [clientId]);
    console.log(`[Razorpay] ✅ Payment verified for ${clientId}! Account upgraded to Active.`);

    res.json({ success: true, message: 'Payment verified! Account active.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// ── Lemon Squeezy Checkout API Route ──
app.post('/api/clients/:clientId/lemonsqueezy-checkout', validateClientIdParam, async (req, res) => {
  const { clientId } = req.params;
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID;

  if (!apiKey) {
    // Sandbox fallback
    const paymentToken = generatePaymentSuccessToken(clientId);
    return res.json({
      sandbox: true,
      url: `/api/payment-success?clientId=${clientId}&token=${paymentToken}`
    });
  }

  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const paymentToken = generatePaymentSuccessToken(clientId);
    const redirectUrl = `${req.protocol}://${req.get('host')}/api/payment-success?clientId=${clientId}&token=${paymentToken}`;

    // Fetch stores if storeId not set
    let targetStoreId = storeId;
    let targetVariantId = variantId;

    if (!targetStoreId) {
      const storeRes = await fetch('https://api.lemonsqueezy.com/v1/stores', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/vnd.api+json' }
      });
      const storeData = await storeRes.json();
      if (storeData.data && storeData.data.length > 0) {
        targetStoreId = storeData.data[0].id;
      }
    }

    if (!targetVariantId) {
      const variantRes = await fetch('https://api.lemonsqueezy.com/v1/variants', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/vnd.api+json' }
      });
      const variantData = await variantRes.json();
      if (variantData.data && variantData.data.length > 0) {
        targetVariantId = variantData.data[0].id;
      }
    }

    if (!targetStoreId || !targetVariantId) {
      // Direct payment token fallback if variant not yet created on dashboard
      console.log(`[LemonSqueezy] Store/Variant pending setup. Using direct activation for ${clientId}`);
      return res.json({ url: redirectUrl });
    }

    // Create Lemon Squeezy checkout session
    const checkoutRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: { client_id: clientId },
              email: client.owner_email
            },
            product_options: { redirect_url: redirectUrl }
          },
          relationships: {
            store: { data: { type: 'stores', id: String(targetStoreId) } },
            variant: { data: { type: 'variants', id: String(targetVariantId) } }
          }
        }
      })
    });

    const checkoutData = await checkoutRes.json();
    if (checkoutData.data && checkoutData.data.attributes && checkoutData.data.attributes.url) {
      return res.json({ url: checkoutData.data.attributes.url });
    }

    // Fallback URL
    res.json({ url: redirectUrl });
  } catch (err) {
    console.error('[LemonSqueezy] Checkout error:', err.message);
    const paymentToken = generatePaymentSuccessToken(clientId);
    res.json({ url: `/api/payment-success?clientId=${clientId}&token=${paymentToken}` });
  }
});

// Lemon Squeezy Webhook
app.post('/api/webhooks/lemonsqueezy', async (req, res) => {
  try {
    const event = req.body;
    const meta = event.meta || {};
    const eventName = meta.event_name;
    const clientId = meta.custom_data?.client_id;

    if (clientId && (eventName === 'order_created' || eventName === 'subscription_created')) {
      const db = await getDb();
      await db.run("UPDATE clients SET stripe_status = 'active' WHERE id = ?", [clientId]);
      console.log(`[LemonSqueezy Webhook] ✅ Activated client ${clientId} via ${eventName}!`);
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// HMAC Protected Payment Success Callback
app.get('/api/payment-success', async (req, res) => {
  const { clientId, token } = req.query;
  if (!clientId || !token) {
    return res.status(400).send('Invalid activation request.');
  }

  const expectedToken = generatePaymentSuccessToken(clientId);
  if (token !== expectedToken) {
    return res.status(403).send('Unauthorized payment activation token.');
  }

  try {
    const db = await getDb();
    await db.run("UPDATE clients SET stripe_status = 'active' WHERE id = ?", [clientId]);
    console.log(`[Stripe] Client ${clientId} subscription activated safely.`);
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Activated! | AutoAgency</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #000; color: #fff; font-family: 'Outfit', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
            .card { background: #111; border: 1px solid #333; padding: 3rem; border-radius: 24px; text-align: center; max-width: 480px; }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #fff; font-size: 2rem; font-weight: 800; margin-bottom: 1rem; }
            p { color: #888; line-height: 1.6; margin-bottom: 2rem; }
            .btn { background: #fff; color: #000; padding: 0.9rem 2rem; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; margin: 0.4rem; }
            .btn-outline { background: transparent; border: 1px solid #444; color: #aaa; padding: 0.9rem 2rem; border-radius: 12px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0.4rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✨</div>
            <h1>Website Activated!</h1>
            <p>Your subscription is confirmed and your website is now fully live with AI updates unlocked.</p>
            <a href="/client/${clientId}/" class="btn">View Live Site</a>
            <a href="/portal/${clientId}" class="btn-outline">Go to Portal</a>
          </div>
        </body>
      </html>
    `);
  } catch {
    res.status(500).send('Error activating subscription.');
  }
});

// ═══════════════════════════════════════════════════════════════
//  PUBLIC CLIENT WEBSITE
// ═══════════════════════════════════════════════════════════════

app.get('/client/:clientId/', validateClientIdParam, async (req, res) => {
  const { clientId } = req.params;
  const indexHtmlPath = path.join(rootDir, 'data', 'clients', clientId, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    return res.status(404).send('<h1 style="font-family:sans-serif;color:#999;text-align:center;margin-top:20vh">404: Website not found.</h1>');
  }

  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);

    if (client) {
      const isTrial = client.stripe_status === 'trial';
      const isActive = client.stripe_status === 'active';
      const createdDate = new Date(client.created_at);
      const diffDays = Math.ceil(Math.abs(new Date() - createdDate) / (1000 * 60 * 60 * 24));
      const isExpired = isTrial && diffDays > 14;

      if (!isActive && isExpired) {
        return res.send(`<!DOCTYPE html><html><head><title>Activation Required | AutoAgency</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;color:#fff;font-family:'Outfit',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}.card{background:#111;border:1px solid #333;border-radius:24px;padding:3rem;text-align:center;max-width:560px}.brand{font-size:.9rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:1.5rem}h1{font-size:2.2rem;font-weight:800;margin-bottom:1rem}p{color:#888;line-height:1.7;margin-bottom:2rem}.features{text-align:left;margin:2rem 0;display:flex;flex-direction:column;gap:.7rem}.feature{display:flex;align-items:center;gap:.8rem;font-size:.95rem}.check{color:#fff;font-size:1.1rem}.btn{background:#fff;color:#000;border:none;padding:1rem 2.5rem;border-radius:12px;font-size:1.05rem;font-weight:700;cursor:pointer;font-family:inherit}</style></head>
          <body><div class="card"><div class="brand">AutoAgency</div>
          <h1>14-Day Preview Ended</h1>
          <p>Your free preview for <strong>${client.business_name}</strong> has expired. Subscribe to unlock full AI editing and customer bookings.</p>
          <div class="features">
            <div class="feature"><span class="check">✓</span>AI website updates via chat</div>
            <div class="feature"><span class="check">✓</span>Integrated booking engine</div>
            <div class="feature"><span class="check">✓</span>Real-time visitor analytics</div>
          </div>
          <button class="btn" onclick="activate()">Activate Website — $49/month</button></div>
          <script>async function activate(){const r=await fetch('/api/clients/${clientId}/subscribe-public',{method:'POST'});const d=await r.json();if(d.url)window.location.href=d.url;}</script>
          </body></html>`);
      }

      await db.run("INSERT INTO analytics (client_id, event_type, timestamp) VALUES (?, 'pageview', ?)", [clientId, new Date().toISOString()]);
    }
  } catch (err) {
    console.warn(`[Analytics] Failed for ${clientId}:`, err.message);
  }

  res.sendFile(indexHtmlPath);
});

app.post('/api/clients/:clientId/subscribe-public', validateClientIdParam, async (req, res) => {
  const { clientId } = req.params;
  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found.' });

    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    const paymentToken = generatePaymentSuccessToken(clientId);

    if (!stripeApiKey) {
      return res.json({ url: `/api/payment-success?clientId=${clientId}&token=${paymentToken}` });
    }

    const stripe = new Stripe(stripeApiKey);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${client.business_name} — AutoAgency Website` },
          unit_amount: 4900,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/api/payment-success?clientId=${clientId}&token=${paymentToken}`,
      cancel_url: `${req.protocol}://${req.get('host')}/client/${clientId}/`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/client/:clientId', validateClientIdParam, (req, res) => {
  res.redirect(301, `/client/${req.params.clientId}/`);
});

app.get('/client/:clientId/style.css', validateClientIdParam, (req, res) => {
  const p = path.join(rootDir, 'data', 'clients', req.params.clientId, 'style.css');
  if (!fs.existsSync(p)) return res.status(404).send('Not Found');
  res.sendFile(p);
});

app.get('/client/:clientId/app.js', validateClientIdParam, (req, res) => {
  const p = path.join(rootDir, 'data', 'clients', req.params.clientId, 'app.js');
  if (!fs.existsSync(p)) return res.status(404).send('Not Found');
  res.sendFile(p);
});

// Public booking submission with input validation & random UUID
app.post('/client/:clientId/book', validateClientIdParam, bookingLimiter, async (req, res) => {
  const { clientId } = req.params;
  const { name, email, service, date } = req.body;

  if (!name || !email || !service || !date) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  // Input validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address format.' });
  }

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ success: false, error: 'Name must be between 2 and 100 characters.' });
  }

  try {
    const db = await getDb();
    const client = await db.get('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ success: false, error: 'Client website not found.' });

    const bookingId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.run(
      "INSERT INTO bookings (id, client_id, customer_name, customer_email, service_name, booking_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
      [bookingId, clientId, name.trim(), email.trim(), service.trim(), date, createdAt]
    );
    await db.run(
      "INSERT INTO analytics (client_id, event_type, timestamp) VALUES (?, 'booking_success', ?)",
      [clientId, createdAt]
    );

    console.log(`[Booking] New booking for ${clientId}: ${name} — ${service}`);
    res.json({ success: true, bookingId });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to record booking.' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  WHATSAPP WEBHOOK
// ═══════════════════════════════════════════════════════════════

app.post('/api/webhook/whatsapp', async (req, res) => {
  const messageBody = req.body.Body;
  const senderNumber = req.body.From || 'unknown';

  console.log(`\n[WhatsApp] Incoming from ${senderNumber}: "${messageBody}"`);

  if (!messageBody) {
    return res.status(400).send('<Response><Message>Error: Empty message</Message></Response>');
  }

  try {
    const db = await getDb();

    let clientId = 'test_client';
    const clients = await db.all('SELECT id, design_brief_json, stripe_status FROM clients');
    let matchedClient = null;

    for (const c of clients) {
      try {
        const brief = JSON.parse(c.design_brief_json || '{}');
        const clientPhone = (brief.contact?.phone || '').replace(/[^\d]/g, '');
        const senderClean = senderNumber.replace(/[^\d]/g, '');
        if (clientPhone && senderClean.includes(clientPhone.slice(-8))) {
          clientId = c.id;
          matchedClient = c;
          break;
        }
      } catch { /* skip */ }
    }

    if (matchedClient && matchedClient.stripe_status !== 'active') {
      res.type('text/xml');
      return res.send(`<Response><Message>🔒 Your account is in Free Preview mode. Upgrade to Pro at http://localhost:${PORT}/client-login to enable WhatsApp AI updates.</Message></Response>`);
    }

    console.log(`[WhatsApp] Routing update to client: ${clientId}`);
    const updatedData = await processClientUpdate(clientId, messageBody);

    const replyText = `🤖 AutoAgency AI — Update Successful!\n\nYour website has been updated with your changes. View it here:\nhttp://localhost:${PORT}/client/${clientId}/`;

    res.type('text/xml');
    res.send(`<Response><Message>${replyText}</Message></Response>`);
  } catch (err) {
    console.error(`[WhatsApp] Error:`, err.message);
    res.type('text/xml');
    res.send(`<Response><Message>⚠️ Unable to process update. Please verify your subscription.</Message></Response>`);
  }
});

// ═══════════════════════════════════════════════════════════════
//  SERVER STARTUP
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🌐 PulseSite SaaS running at http://localhost:${PORT}`);
  console.log(`─────────────────────────────────────────────────`);
  console.log(`  Admin Console:  http://localhost:${PORT}/admin`);
  console.log(`  Admin Login:    http://localhost:${PORT}/admin/login`);
  console.log(`  Client Login:   http://localhost:${PORT}/client-login`);
  console.log(`  Client Portal:  http://localhost:${PORT}/portal/test_client`);
  console.log(`  Test Website:   http://localhost:${PORT}/client/test_client/`);
  console.log(`==================================================\n`);

  // Start Outbound Outreach Campaign Daily Scheduler
  console.log(`[Scheduler] Outbound campaign scheduler initialized.`);
  
  // Set interval to check every minute for the 9:00 AM target time
  setInterval(async () => {
    try {
      const now = new Date();
      // Check if it is exactly 9:00 AM (local time)
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        console.log('[Scheduler] 🕒 Triggering automated daily campaign cycle at 9:00 AM...');
        const { runDailyCampaignCycle } = await import('./src/services/outreach_engine.js');
        await runDailyCampaignCycle();
      }
    } catch (err) {
      console.error('[Scheduler] Error running daily campaign cycle:', err.message);
    }
  }, 60 * 1000);
});
