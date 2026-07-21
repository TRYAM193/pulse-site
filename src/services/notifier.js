import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getAppBaseUrl } from '../utils/ai_helper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(path.join(__dirname, '..', '..'));

// Ensure env vars are loaded
dotenv.config({ path: path.join(rootDir, '.env') });

export const ADMIN_ALERT_EMAIL = 'shreyaskumarswamy2007@gmail.com';

/**
 * Dispatches an urgent incident notification / real email alert to the system owner.
 * @param {object} param0 
 * @param {string} param0.title Summary title of the alert/incident
 * @param {string} param0.severity 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 * @param {string} param0.clientOrSource Client ID or system component name
 * @param {string} param0.details Detailed description of the error or user report
 * @param {string} [param0.stackTrace] Optional error stack trace
 * @returns {Promise<object>} Returns alert dispatch receipt
 */
export async function sendUrgentAlert({ title, severity = 'HIGH', clientOrSource = 'SYSTEM', details, stackTrace = '' }) {
  const timestamp = new Date().toISOString();
  const alertId = `ALERT-${Date.now()}`;

  const emailSubject = `🚨 [PulseSite ${severity} ALERT] ${title}`;
  const emailBody = `
================================================================================
🚨 PULSESITE EMERGENCY INCIDENT REPORT 🚨
================================================================================
Timestamp: ${timestamp}
Alert ID:  ${alertId}
Recipient: ${ADMIN_ALERT_EMAIL}
Severity:  ${severity}
Source:    ${clientOrSource}

Summary:
${title}

Diagnostic Details:
${details}

${stackTrace ? `Stack Trace:\n${stackTrace}\n` : ''}
================================================================================
Action Required: Please inspect the admin console at ${getAppBaseUrl()}/admin
================================================================================
`;

  console.log(`\n🚨 [URGENT EMERGENCY ALERT DISPATCH]`);
  console.log(`To:      ${ADMIN_ALERT_EMAIL}`);
  console.log(`Subject: ${emailSubject}`);
  console.log(`Body:\n${emailBody}`);
  console.log(`────────────────────────────────────────────────────────────────\n`);

  // Log to local file
  try {
    const logsDir = path.join(rootDir, 'data', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, 'urgent_alerts.log');
    fs.appendFileSync(logPath, emailBody + '\n\n', 'utf-8');
  } catch (err) {
    console.warn(`[NotifierLog] Failed to log alert to disk:`, err.message);
  }

  // Real SMTP Email Dispatch via Nodemailer if credentials are configured
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'pulsesite.support@gmail.com';

  let emailSent = false;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: `"PulseSite Alerts" <${smtpFrom}>`,
        to: ADMIN_ALERT_EMAIL,
        subject: emailSubject,
        text: emailBody,
        html: `<div style="font-family:sans-serif;background:#000;color:#fff;padding:20px;border-radius:10px;max-width:600px;">
          <div style="font-size:1.4rem;font-weight:bold;color:#fff;margin-bottom:10px;">PulseSite <span style="font-size:0.8rem;background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px;">EMERGENCY</span></div>
          <h2 style="color:#ef4444;margin-top:0;">🚨 PulseSite ${severity} Incident Alert</h2>
          <p><strong>Alert ID:</strong> ${alertId}</p>
          <p><strong>Source Client:</strong> ${clientOrSource}</p>
          <div style="background:#111;padding:15px;border-left:4px solid #ef4444;margin:15px 0;border-radius:6px;">
            <pre style="color:#eee;white-space:pre-wrap;font-family:monospace;font-size:0.9rem;">${details}</pre>
          </div>
          <p><a href="${getAppBaseUrl()}/admin" style="background:#fff;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Open Admin Console</a></p>
        </div>`
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Notifier] 📧 REAL EMAIL SENT SUCCESSFULLY to ${ADMIN_ALERT_EMAIL}! Message ID: ${info.messageId}`);
      emailSent = true;
    } catch (mailErr) {
      console.error(`[Notifier] ❌ Failed to send real email via SMTP:`, mailErr.message);
    }
  } else {
    console.log(`[Notifier] ℹ️ Real email dispatch requires SMTP_USER and SMTP_PASS in .env.`);
  }

  return {
    success: true,
    alertId,
    recipient: ADMIN_ALERT_EMAIL,
    timestamp,
    emailSent
  };
}
