import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
let db; // Database connection object

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database connection
async function initializeDb() {
  try {
    db = await open({
      filename: './bookings.sqlite',
      driver: sqlite3.Database
    });
    console.log('Connected to SQLite database.');
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1); // Exit if database connection fails
  }
}

// Track pageviews for the main route before serving static files
app.get('/', async (req, res, next) => {
  try {
    await db.run('INSERT INTO analytics (event_type) VALUES (?)', 'pageview');
    console.log('Pageview tracked for /');
  } catch (error) {
    console.error('Error tracking pageview:', error);
  }
  next(); // Continue to serve static files
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints

/**
 * @route POST /api/book
 * @desc Book a service
 * @body {string} customer_name, {string} customer_email, {string} service_name, {string} booking_date
 */
app.post('/api/book', async (req, res) => {
  const { customer_name, customer_email, service_name, booking_date } = req.body;

  if (!customer_name || !customer_email || !service_name || !booking_date) {
    return res.status(400).json({ success: false, message: 'All booking fields are required.' });
  }

  try {
    const bookingId = uuidv4();
    await db.run(
      'INSERT INTO bookings (id, customer_name, customer_email, service_name, booking_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      bookingId,
      customer_name,
      customer_email,
      service_name,
      booking_date,
      'pending'
    );

    await db.run('INSERT INTO analytics (event_type) VALUES (?)', 'booking_success');

    res.status(201).json({ success: true, message: 'Booking created successfully.', bookingId });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking.', error: error.message });
  }
});

/**
 * @route POST /api/login
 * @desc User login
 * @body {string} email, {string} password
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (isMatch) {
      // In a real app, you'd generate a JWT or session token here
      res.json({ success: true, message: 'Login successful.', user: { email: user.email } });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Login failed.', error: error.message });
  }
});

/**
 * @route GET /api/dashboard/stats
 * @desc Get dashboard statistics (booking count, page views, conversion rate)
 */
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const bookingCountResult = await db.get('SELECT COUNT(*) AS count FROM bookings');
    const pageviewCountResult = await db.get('SELECT COUNT(*) AS count FROM analytics WHERE event_type = ?', 'pageview');
    const bookingSuccessCountResult = await db.get('SELECT COUNT(*) AS count FROM analytics WHERE event_type = ?', 'booking_success');

    const bookingCount = bookingCountResult.count;
    const pageviewCount = pageviewCountResult.count;
    const bookingSuccessCount = bookingSuccessCountResult.count;

    let conversionRate = 0;
    if (pageviewCount > 0) {
      conversionRate = (bookingSuccessCount / pageviewCount) * 100;
    }

    res.json({
      bookingCount,
      pageviewCount,
      bookingSuccessCount,
      conversionRate: conversionRate.toFixed(2) // Format to 2 decimal places
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.', error: error.message });
  }
});

/**
 * @route GET /api/bookings
 * @desc Get all bookings, ordered by booking date
 */
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await db.all('SELECT * FROM bookings ORDER BY booking_date ASC, created_at DESC');
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings.', error: error.message });
  }
});

/**
 * @route POST /api/bookings/:id/status
 * @desc Update a booking's status
 * @param {string} id - Booking ID
 * @body {string} status - New status (e.g., 'approved', 'rejected', 'completed')
 */
app.post('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await db.run('UPDATE bookings SET status = ? WHERE id = ?', status, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    res.json({ success: true, message: `Booking ${id} status updated to ${status}.` });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking status.', error: error.message });
  }
});

/**
 * @route POST /api/analytics/track
 * @desc Track custom events
 * @body {string} eventType
 */
app.post('/api/analytics/track', async (req, res) => {
  const { eventType } = req.body;

  if (!eventType) {
    return res.status(400).json({ success: false, message: 'Event type is required.' });
  }

  try {
    await db.run('INSERT INTO analytics (event_type) VALUES (?)', eventType);
    res.status(201).json({ success: true, message: `Event '${eventType}' tracked.` });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ success: false, message: 'Failed to track event.', error: error.message });
  }
});

// Start the server after database initialization
initializeDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

// Basic error handling for unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the error, but don't exit unless it's critical for the app state
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // For uncaught exceptions, it's safer to exit and let a process manager restart the app
  process.exit(1);
});
