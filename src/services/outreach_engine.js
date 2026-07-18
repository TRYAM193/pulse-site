import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';
import { GoogleGenAI } from '@google/genai';
import { NICHE_PAIN_POINTS, getEmailHtml } from './email_templates.js';

// Swarm Agent Imports for Auto-Building Website Previews
import { sourceBrandAssets } from '../agents/brand_sourcer.js';
import { analyzeBrandAssets } from '../agents/brand_analyst.js';
import { generateDesignBrief } from '../agents/designer_agent.js';
import { generateHtmlStructure } from '../agents/structure_agent.js';
import { generateCssStyles } from '../agents/style_agent.js';
import { generateTypeScriptLogic } from '../agents/coder_agent.js';
import { compileAndVerifyCode } from '../agents/qa_agent.js';
import { generateClientBackend } from '../agents/backend_agent.js';
import { generateSeoMetadata, renderSeoHead } from '../agents/seo_agent.js';
import { searchLeads } from './lead_prospector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(path.join(__dirname, '..', '..'));

dotenv.config({ path: path.join(rootDir, '.env') });

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'web-automations-496916',
  location: process.env.GCP_LOCATION || 'us-central1'
});

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const SENDER_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'pulsesite.support@gmail.com';

/**
 * Orchestrates the full website generation swarm for a newly discovered lead.
 * @param {object} lead
 * @returns {Promise<string>} Preview URL
 */
async function buildWebsitePreviewForLead(lead) {
  const clientDir = path.join(rootDir, 'data', 'clients', lead.id);
  const briefPath = path.join(clientDir, 'brief.json');
  const indexHtmlPath = path.join(clientDir, 'index.html');
  const styleCssPath = path.join(clientDir, 'style.css');
  const tsPath = path.join(clientDir, 'app.ts');

  // Create directory if not exists
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }

  // Check if preview already compiled to save resources
  if (fs.existsSync(indexHtmlPath) && fs.existsSync(styleCssPath)) {
    console.log(`[OutreachEngine] Preview already built for lead: ${lead.businessName}`);
    return `http://localhost:${process.env.PORT || 4000}/client/${lead.id}/`;
  }

  console.log(`[OutreachEngine] 🚀 Triggering Agent Swarm to auto-build website preview for: ${lead.businessName}`);

  // Step 1: Sourcing Brand Assets
  const assets = await sourceBrandAssets(lead);

  // Step 2: Multimodal Asset Analysis
  const brandProfile = await analyzeBrandAssets(lead, assets.base64Assets);

  // Step 3: Designer Agent Briefing
  const brief = await generateDesignBrief(lead, brandProfile, assets.imageUrls);
  fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2), 'utf-8');

  // Step 4-8: Run parallel structural, styling, scripting, and backend generation
  const [html, css, ts, backend, seoData] = await Promise.all([
    generateHtmlStructure(lead, brief),
    generateCssStyles(lead, brief),
    generateTypeScriptLogic(lead, brief),
    generateClientBackend(lead, brief),
    generateSeoMetadata(lead, brief)
  ]);

  // Inject SEO headers
  let finalHtml = html;
  if (seoData && seoData.metaTags) {
    const seoHead = renderSeoHead(seoData);
    finalHtml = html.replace('</head>', seoHead + '\n  </head>');
  }

  // Write files
  fs.writeFileSync(indexHtmlPath, finalHtml, 'utf-8');
  fs.writeFileSync(styleCssPath, css, 'utf-8');
  fs.writeFileSync(tsPath, ts, 'utf-8');
  fs.writeFileSync(path.join(clientDir, 'server.js'), backend.serverJs, 'utf-8');
  fs.writeFileSync(path.join(clientDir, 'package.json'), backend.packageJson, 'utf-8');

  if (seoData) {
    fs.writeFileSync(path.join(clientDir, 'robots.txt'), seoData.robotsTxt, 'utf-8');
    fs.writeFileSync(path.join(clientDir, 'sitemap.xml'), seoData.sitemapXml, 'utf-8');
  }

  // Step 9: QA Verification & Build compilation
  const buildSuccess = await compileAndVerifyCode(lead, brief);
  if (!buildSuccess) {
    throw new Error(`QA self-healing compilation failed for lead: ${lead.businessName}`);
  }

  // Save client profile in local database
  const db = await getDb();
  const passwordHash = crypto.randomBytes(16).toString('hex'); // Random default password
  
  await db.run(`
    INSERT OR IGNORE INTO clients (id, business_name, niche, owner_email, password_hash, stripe_status, custom_domain, design_brief_json, created_at)
    VALUES (?, ?, ?, ?, ?, 'trial', NULL, ?, ?)
  `, [
    lead.id,
    lead.businessName,
    lead.niche,
    lead.email,
    passwordHash,
    JSON.stringify(brief),
    new Date().toISOString()
  ]);

  console.log(`[OutreachEngine] ✅ Website preview built and client registered for: ${lead.businessName}`);
  return `http://localhost:${process.env.PORT || 4000}/client/${lead.id}/`;
}

/**
 * Dispatches an outreach email and logs the activity.
 * @param {object} lead
 * @param {string} emailType - 'cold_intro' | 'follow_up_1' | 'follow_up_2'
 * @param {string} subject
 * @param {string} bodyHtml
 * @returns {Promise<boolean>}
 */
async function sendOutreachEmail(lead, emailType, subject, bodyHtml) {
  const ctaUrl = `http://localhost:${process.env.PORT || 4000}/client/${lead.id}`;
  const fullHtml = getEmailHtml(lead, subject, bodyHtml, ctaUrl);

  console.log(`[OutreachEngine] Preparing email dispatch [Type: ${emailType}] to ${lead.email}`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n==================================================`);
    console.log(`📧 MOCK OUTREACH EMAIL DISPATCH (No SMTP configuration)`);
    console.log(`To:      ${lead.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Type:    ${emailType}`);
    console.log(`==================================================\n`);
    
    // Log campaign entry to DB anyway
    const db = await getDb();
    const campaignId = `CAMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    await db.run(`
      INSERT INTO email_campaigns (id, lead_id, email_type, subject, body_html, sent_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'sent')
    `, [campaignId, lead.id, emailType, subject, fullHtml, new Date().toISOString()]);
    
    return true;
  }

  try {
    const mailOptions = {
      from: `"AutoAgency Outreach" <${SENDER_EMAIL}>`,
      to: lead.email,
      subject,
      html: fullHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[OutreachEngine] Email sent successfully to ${lead.email}! MsgID: ${info.messageId}`);

    const db = await getDb();
    const campaignId = `CAMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    await db.run(`
      INSERT INTO email_campaigns (id, lead_id, email_type, subject, body_html, sent_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'sent')
    `, [campaignId, lead.id, emailType, subject, fullHtml, new Date().toISOString()]);

    return true;
  } catch (err) {
    console.error(`[OutreachEngine] Failed to dispatch email to ${lead.email}:`, err.message);
    return false;
  }
}

/**
 * Generates outreach pitch content with Gemini focusing on specific business pain points.
 * @param {object} lead
 * @param {string} emailType - 'cold_intro' | 'follow_up_1' | 'follow_up_2'
 * @returns {Promise<{subject: string, body: string}>} Generated email subject and body
 */
async function generateOutreachPitch(lead, emailType) {
  const painPoints = NICHE_PAIN_POINTS[lead.niche] || NICHE_PAIN_POINTS.default;
  const targetUrl = `http://localhost:${process.env.PORT || 4000}/client/${lead.id}/`;

  let prompt = '';
  
  if (emailType === 'cold_intro') {
    prompt = `
You are the Outreach Coordinator for AutoAgency. Write a warm, professional, but deeply urgent introductory cold email targeting ${lead.businessName}, a local ${lead.niche.replace('_', ' ')} business.
They currently do NOT have a website.

Business Context:
- Rating: ${lead.rating} stars
- Niche Average Ticket Price: $${painPoints.avgTicket}
- Estimated Missed Revenue: $${lead.lost_revenue}/month (due to lack of online booking/presence)

Email Angle (Pain-Point Focus):
- Include a small structured "GOOGLE LISTING AUDIT REPORT:" block formatted like this:
  📊 GOOGLE LISTING AUDIT REPORT:
  - Website: Missing ❌
  - Online Bookings: Not Integrated ❌
  - Mobile Speed: Not Optimized ❌
  - Reputation: Strong (${lead.rating} Stars) ✅
- Commend their excellent Google review score.
- Highlight their major business pain point: "${painPoints.painPoint}"
- Back this up with this statistic: "${painPoints.statistic}"
- Tell them we wanted to show them what's possible, so we used our automated agent engine to **already build a fully functioning custom website preview** for them.
- Direct them to click the review button to preview their live booking engine: ${targetUrl}
- Invite them to reply if they want to adjust the hours, services, or launch it live on their own custom domain.

Tone: Professional, direct, highly personalized, zero corporate fluff. Keep it under 180 words.
`;
  } else if (emailType === 'follow_up_1') {
    prompt = `
You are the Outreach Coordinator for AutoAgency. Write a short, friendly Day 3 follow-up email to ${lead.businessName}.
We sent them a custom website preview a couple days ago.

Business Context:
- Niche: ${lead.niche.replace('_', ' ')}
- Lost Revenue: $${lead.lost_revenue}/month
- Review URL: ${targetUrl}

Email Angle (Social Proof):
- Remind them of the website preview we built for them at ${targetUrl}.
- Focus on the opportunity cost: "${painPoints.opportunity}"
- Provide social proof of results: "Over 90% of local businesses that launched their portal with us saw new client bookings within the first 48 hours."
- Keep it extremely brief (under 100 words).
`;
  } else {
    prompt = `
You are the Outreach Coordinator for AutoAgency. Write a final Day 5 outreach email to ${lead.businessName}.
This is the last contact.

Business Context:
- Niche: ${lead.niche.replace('_', ' ')}
- Lost Revenue: $${lead.lost_revenue}/month
- Review URL: ${targetUrl}

Email Angle (Scarcity & Direct Offer):
- Mention that their temporary preview site at ${targetUrl} will expire in 48 hours to free up server resources.
- Note that they are losing out on an estimated $${lead.lost_revenue}/month without online client scheduling.
- Provide a direct list of features ready to go: ${painPoints.features.join(', ')}.
- Give a final call to action to connect their domain.
- Keep it direct and helpful (under 90 words).
`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: { temperature: 0.7 }
  });

  const text = response.text.trim();
  
  // Basic parser to split subject and body if LLM outputs both, or create a default subject
  let subject = '';
  let body = text;

  const subjectMatch = text.match(/subject:\s*(.*)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].replace(/["']/g, '').trim();
    body = text.replace(/subject:\s*(.*)/i, '').trim();
  } else {
    // Generate niche-specific fallback subjects
    if (emailType === 'cold_intro') {
      subject = `Missing website costing ${lead.businessName} an estimated $${lead.lost_revenue}/mo?`;
    } else if (emailType === 'follow_up_1') {
      subject = `Quick follow up regarding ${lead.businessName}'s website preview`;
    } else {
      subject = `Final notice: ${lead.businessName}'s preview expires soon`;
    }
  }

  return { subject, body: body.replace(/\n/g, '<br>') };
}

/**
 * Core daily campaign cycle. Discovers leads, builds site previews, and runs the follow-up drip campaign.
 */
export async function runDailyCampaignCycle() {
  console.log(`[OutreachEngine] 🕒 Initializing daily campaign cycle...`);
  const db = await getDb();

  // Safety switch check
  if (process.env.OUTREACH_ENABLED === 'false') {
    console.log(`[OutreachEngine] Campaign execution is disabled in .env (OUTREACH_ENABLED = false). Skipping cycle.`);
    return;
  }

  // 1. Process Day 3 & Day 5 Follow-ups first (maintain existing sequences)
  const activeCampaignLeads = await db.all(`
    SELECT * FROM leads 
    WHERE campaign_status IN ('day1_sent', 'day2_sent') 
      AND last_emailed_at < datetime('now', '-24 hours')
  `);

  console.log(`[OutreachEngine] Found ${activeCampaignLeads.length} leads due for follow-ups.`);

  for (const lead of activeCampaignLeads) {
    try {
      const nextStatus = lead.campaign_status === 'day1_sent' ? 'day2_sent' : 'day3_sent';
      const emailType = lead.campaign_status === 'day1_sent' ? 'follow_up_1' : 'follow_up_2';

      console.log(`[OutreachEngine] Running follow-up for lead: ${lead.business_name} (${lead.id})`);
      
      const pitch = await generateOutreachPitch(lead, emailType);
      const emailSent = await sendOutreachEmail(lead, emailType, pitch.subject, pitch.body);

      if (emailSent) {
        await db.run(`
          UPDATE leads 
          SET campaign_status = ?, last_emailed_at = ?, follow_up_count = follow_up_count + 1 
          WHERE id = ?
        `, [nextStatus, new Date().toISOString(), lead.id]);
      }
    } catch (err) {
      console.error(`[OutreachEngine] Error processing follow-up for ${lead.business_name}:`, err.message);
    }
  }

  // 2. Discover new leads and queue them
  const configNiches = (process.env.OUTREACH_NICHES || 'hair_salon,restaurant').split(',');
  const configCities = (process.env.OUTREACH_CITIES || 'Seattle').split(',');
  const dailyLimit = parseInt(process.env.OUTREACH_DAILY_LIMIT || '10', 10);

  console.log(`[OutreachEngine] Scanning niches [${configNiches}] in cities [${configCities}]`);
  
  let newLeads = [];
  for (const niche of configNiches) {
    for (const city of configCities) {
      if (newLeads.length >= dailyLimit) break;
      try {
        const discovered = await searchLeads(niche.trim(), city.trim());
        newLeads = [...newLeads, ...discovered];
      } catch (err) {
        console.error(`[OutreachEngine] Discovery error in ${niche}/${city}:`, err.message);
      }
    }
  }

  // Slice to daily limits
  const targetNewLeads = newLeads.slice(0, dailyLimit);
  console.log(`[OutreachEngine] Selected ${targetNewLeads.length} new leads for initial cold outreach today.`);

  for (const lead of targetNewLeads) {
    try {
      // Step A: Auto-generate their live site preview first!
      await buildWebsitePreviewForLead(lead);

      // Step B: Draft personalized email with pain points
      const pitch = await generateOutreachPitch(lead, 'cold_intro');
      
      // Step C: Send the cold intro email
      const emailSent = await sendOutreachEmail(lead, 'cold_intro', pitch.subject, pitch.body);

      if (emailSent) {
        await db.run(`
          UPDATE leads 
          SET campaign_status = 'day1_sent', last_emailed_at = ?, follow_up_count = 1 
          WHERE id = ?
        `, [new Date().toISOString(), lead.id]);
      }
    } catch (err) {
      console.error(`[OutreachEngine] Failed initial outreach workflow for ${lead.businessName}:`, err.message);
    }
  }

  console.log(`[OutreachEngine] Campaign cycle completed successfully.`);
}
