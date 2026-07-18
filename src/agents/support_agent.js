import crypto from 'crypto';
import { getDb } from '../db/connection.js';
import { generateContentWithRetry } from '../utils/ai_helper.js';
import { sendUrgentAlert } from '../services/notifier.js';

/**
 * AI Support Team Agent for AutoAgency SaaS.
 * Diagnoses customer queries and system errors, logs incidents, and alerts owner if CRITICAL or HIGH.
 * 
 * @param {object} param0 
 * @param {string} param0.clientId Client ID associated with request
 * @param {string} param0.userMessage Message or error description
 * @param {string} [param0.contextType] 'client_query' | 'system_error' | 'security_alert'
 * @returns {Promise<object>} Support analysis & action result
 */
export async function handleSupportTicket({ clientId, userMessage, contextType = 'client_query' }) {
  const db = await getDb();

  // Fetch client info if available
  const clientRow = await db.get('SELECT business_name, owner_email, stripe_status FROM clients WHERE id = ?', [clientId]).catch(() => null);
  const bizName = clientRow?.business_name || clientId;

  const prompt = `
You are the Senior AI Technical Support & Incident Response Agent for AutoAgency SaaS.
Your job is to analyze incoming customer support queries or system diagnostic alerts, classify their severity, construct a helpful resolution reply, and determine if an emergency alert to the founder is needed.

Client Business Name: "${bizName}"
Client ID: "${clientId}"
Context Type: "${contextType}"
User/System Report:
"${userMessage}"

Instructions:
1. Categorize severity strictly as one of:
   - "LOW": Simple questions, general inquiry, feature feedback
   - "MEDIUM": Minor website alignment request, non-blocking bug
   - "HIGH": Site failed to recompile, payment processing glitch, broken booking form
   - "CRITICAL": Complete site outage, security threat, repeated system compilation crash, unauthorized access attempt
2. Formulate a polite, professional, and reassuring "clientReply" to show to the customer.
3. Provide a concise "technicalDetails" summary for the engineering logs.
4. Output raw JSON ONLY (no markdown blocks, no \`\`\`json wrappers) with fields:
   - "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
   - "category": "billing" | "bug" | "site_compilation" | "security" | "general"
   - "clientReply": string
   - "technicalDetails": string
   - "isUrgent": boolean
`;

  console.log(`[SupportAgent] Analyzing ticket for client ${clientId} (${contextType})...`);

  let responseText = '';
  try {
    const response = await generateContentWithRetry({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: { temperature: 0.1 }
    });
    responseText = response.text.trim();
  } catch (err) {
    console.error(`[SupportAgent] Gemini API failure during support analysis:`, err.message);
    responseText = JSON.stringify({
      severity: "HIGH",
      category: "general",
      clientReply: "We have received your request and assigned a senior support engineer to inspect it immediately.",
      technicalDetails: `Support agent model error: ${err.message}`,
      isUrgent: true
    });
  }

  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }

  let parsed = {};
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = {
      severity: "HIGH",
      category: "general",
      clientReply: "Your support request has been logged and escalated to technical operations.",
      technicalDetails: userMessage,
      isUrgent: true
    };
  }

  const incidentId = `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const severity = parsed.severity || 'MEDIUM';
  const createdAt = new Date().toISOString();

  // Store incident in SQLite database
  try {
    await db.run(
      `INSERT INTO incidents (id, client_id, title, severity, status, message, resolution, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incidentId,
        clientId,
        parsed.technicalDetails?.slice(0, 100) || userMessage.slice(0, 100),
        severity,
        severity === 'CRITICAL' || severity === 'HIGH' ? 'investigating' : 'open',
        userMessage,
        parsed.clientReply,
        createdAt
      ]
    );
  } catch (dbErr) {
    console.warn(`[SupportAgent] Failed to save incident to SQLite:`, dbErr.message);
  }

  // Auto-Dispatch urgent alert email if severity is HIGH or CRITICAL
  if (severity === 'HIGH' || severity === 'CRITICAL' || parsed.isUrgent) {
    await sendUrgentAlert({
      title: `[${bizName}] ${parsed.technicalDetails || userMessage.slice(0, 80)}`,
      severity,
      clientOrSource: `${bizName} (${clientId})`,
      details: `Customer Inquiry / Incident:\n"${userMessage}"\n\nAI Diagnostic Response:\n"${parsed.clientReply}"`
    });
  }

  return {
    incidentId,
    severity,
    category: parsed.category || 'general',
    clientReply: parsed.clientReply,
    technicalDetails: parsed.technicalDetails,
    isUrgent: severity === 'HIGH' || severity === 'CRITICAL'
  };
}
