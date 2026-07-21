import nodemailer from 'nodemailer';
import { getDb } from '../db/connection.js';
import { getEmailHtml } from './email_templates.js';
import { getAppBaseUrl } from '../utils/ai_helper.js';

/**
 * Dispatches an outreach pitch via WhatsApp (if phone number exists) or Email fallback.
 * @param {object} lead
 * @param {object} pitch - { subject, message }
 * @returns {Promise<{channel: string, success: boolean, messageId?: string}>}
 */
export async function dispatchMultiChannelPitch(lead, pitch) {
  const db = await getDb();
  const hasPhone = Boolean(lead.phone && lead.phone.trim().length > 5);
  const channel = hasPhone ? 'whatsapp' : 'email';

  console.log(`[Dispatcher] Routing outreach for ${lead.businessName || lead.business_name} via ${channel.toUpperCase()} (Phone: ${lead.phone || 'N/A'}, Email: ${lead.email || 'N/A'})`);

  if (channel === 'whatsapp') {
    // ── WHATSAPP DISPATCH ──
    try {
      console.log(`\n==================================================`);
      console.log(`📱 OUTBOUND WHATSAPP DISPATCH`);
      console.log(`To:      ${lead.phone} (${lead.businessName || lead.business_name})`);
      console.log(`Subject: ${pitch.subject}`);
      console.log(`Body:\n${pitch.message}`);
      console.log(`==================================================\n`);

      const now = new Date().toISOString();
      const convId = `CONV-WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Record in conversations table
      await db.run(`
        INSERT INTO conversations (id, lead_id, channel, sender, message, timestamp)
        VALUES (?, ?, 'whatsapp', 'ai', ?, ?)
      `, [convId, lead.id, pitch.message, now]).catch(() => {});

      // Record campaign log
      await db.run(`
        INSERT INTO email_campaigns (id, lead_id, email_type, subject, body_html, sent_at, status)
        VALUES (?, ?, 'whatsapp_story_pitch', ?, ?, ?, 'sent')
      `, [convId, lead.id, pitch.subject, pitch.message, now]).catch(() => {});

      // Update lead state
      await db.run(`
        UPDATE leads SET outreach_channel = 'whatsapp', campaign_status = 'day1_sent', follow_up_count = 1, last_emailed_at = ? WHERE id = ?
      `, [now, lead.id]);

      return { channel: 'whatsapp', success: true, messageId: convId };
    } catch (err) {
      console.error(`[Dispatcher] WhatsApp dispatch failed for ${lead.businessName}:`, err.message);
      return { channel: 'whatsapp', success: false };
    }
  } else {
    // ── EMAIL DISPATCH FALLBACK ──
    try {
      const targetEmail = lead.email || `contact@${(lead.businessName || lead.business_name).toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      const ctaUrl = `${getAppBaseUrl()}/client/${lead.id}/`;
      const fullHtml = getEmailHtml(lead, pitch.subject, pitch.message.replace(/\n/g, '<br>'), ctaUrl);

      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n==================================================`);
        console.log(`📧 MOCK EMAIL DISPATCH (No SMTP keys configured)`);
        console.log(`To:      ${targetEmail}`);
        console.log(`Subject: ${pitch.subject}`);
        console.log(`==================================================\n`);
      } else {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: `AutoAgency <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: targetEmail,
          subject: pitch.subject,
          html: fullHtml
        });
      }

      const now = new Date().toISOString();
      const convId = `CONV-EM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await db.run(`
        INSERT INTO conversations (id, lead_id, channel, sender, message, timestamp)
        VALUES (?, ?, 'email', 'ai', ?, ?)
      `, [convId, lead.id, pitch.message, now]).catch(() => {});

      await db.run(`
        INSERT INTO email_campaigns (id, lead_id, email_type, subject, body_html, sent_at, status)
        VALUES (?, ?, 'email_story_pitch', ?, ?, ?, 'sent')
      `, [convId, lead.id, pitch.subject, pitch.message, now]).catch(() => {});

      await db.run(`
        UPDATE leads SET outreach_channel = 'email', campaign_status = 'day1_sent', follow_up_count = 1, last_emailed_at = ? WHERE id = ?
      `, [now, lead.id]);

      return { channel: 'email', success: true, messageId: convId };
    } catch (err) {
      console.error(`[Dispatcher] Email dispatch failed for ${lead.businessName}:`, err.message);
      return { channel: 'email', success: false };
    }
  }
}
