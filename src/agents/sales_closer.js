import { ai, generateContentWithRetry, getAppBaseUrl } from '../utils/ai_helper.js';
import { getDb } from '../db/connection.js';
import { buildWebsitePreviewForLead } from '../services/outreach_engine.js';

/**
 * Handles incoming client responses (via WhatsApp or Email) and generates an AI Sales Agent reply.
 * Automatically builds website preview when client shows interest, or provides Lemon Squeezy link to close.
 * 
 * @param {string} leadId
 * @param {string} incomingMessage
 * @param {string} channel - 'whatsapp' | 'email'
 * @returns {Promise<{reply: string, previewUrl?: string, checkoutUrl?: string}>}
 */
export async function handleClientSalesChat(leadId, incomingMessage, channel = 'whatsapp') {
  const db = await getDb();
  const lead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]);

  if (!lead) {
    throw new Error(`Client lead not found: ${leadId}`);
  }

  // Load conversation history
  const history = await db.all('SELECT sender, message, timestamp FROM conversations WHERE lead_id = ? ORDER BY timestamp ASC', [leadId]);
  
  // Format history for context
  const historyText = history.map(h => `${h.sender.toUpperCase()}: ${h.message}`).join('\n');

  // Check if client is requesting a website preview
  const isRequestingPreview = /yes|show|preview|link|demo|see|build|website|sample|look/i.test(incomingMessage);
  let generatedPreviewUrl = null;

  if (isRequestingPreview) {
    console.log(`[SalesCloser] ⚡ Client requested site preview! Triggering Agent Swarm for: ${lead.business_name}`);
    const leadObj = {
      id: lead.id,
      businessName: lead.business_name,
      niche: lead.niche,
      rating: lead.rating || 4.8,
      email: lead.email,
      phone: lead.phone
    };
    try {
      generatedPreviewUrl = await buildWebsitePreviewForLead(leadObj);
    } catch (err) {
      console.warn(`[SalesCloser] Website preview build error:`, err.message);
      generatedPreviewUrl = `${getAppBaseUrl()}/client/${lead.id}/`;
    }
  }

  const prompt = `
You are Alex, Lead Digital Growth Partner at AutoAgency.
You are chatting with ${lead.business_name}, a local ${lead.niche.replace('_', ' ')} business owner.

Conversation History:
${historyText || 'No prior history.'}

Latest Message from Business Owner: "${incomingMessage}"

Business Context:
- Name: ${lead.business_name}
- Niche: ${lead.niche}
- Preview URL Available: ${generatedPreviewUrl || 'Not built yet'}
- Subscription Pricing: $49/month (Includes hosting, SSL, domain connection, and 24/7 AI updates)

Instructions:
1. Act as a friendly, sharp, zero-fluff growth consultant talking to a peer.
2. If the user said "YES" or asked for a preview/demo: Highlight that you just built their live custom website, and share this link: ${generatedPreviewUrl || `${getAppBaseUrl()}/client/${lead.id}/`}
3. If the user asks about price, features, or how to buy: Explain that it's a flat $49/month with no contract, and invite them to activate their site using this link: ${getAppBaseUrl()}/api/clients/${lead.id}/subscribe-public
4. If the user has doubts or technical questions: Address them clearly and invite them to view their preview.
5. Format for ${channel.toUpperCase()} (use bullet points and emojis appropriately, keep under 150 words).

Return ONLY the response text to send back to the business owner.
`;

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        temperature: 0.7
      }
    });

    const reply = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    const now = new Date().toISOString();

    // Log user message
    await db.run(`
      INSERT INTO conversations (id, lead_id, channel, sender, message, timestamp)
      VALUES (?, ?, ?, 'lead', ?, ?)
    `, [`CONV-IN-${Date.now()}`, leadId, channel, incomingMessage, now]).catch(() => {});

    // Log AI reply
    await db.run(`
      INSERT INTO conversations (id, lead_id, channel, sender, message, timestamp)
      VALUES (?, ?, ?, 'ai', ?, ?)
    `, [`CONV-OUT-${Date.now()}`, leadId, channel, reply, new Date().toISOString()]).catch(() => {});

    // Update lead campaign status to 'replied'
    await db.run(`
      UPDATE leads SET campaign_status = 'replied' WHERE id = ?
    `, [leadId]).catch(() => {});

    console.log(`[SalesCloser] ✅ AI response generated for ${lead.business_name} via ${channel}`);

    return {
      reply,
      previewUrl: generatedPreviewUrl,
      checkoutUrl: `${getAppBaseUrl()}/api/clients/${lead.id}/subscribe-public`
    };
  } catch (err) {
    console.error(`[SalesCloser] Error generating response:`, err.message);
    const fallbackReply = `Hi! Thanks for reaching out. We built a custom live website preview for ${lead.business_name} right here: ${getAppBaseUrl()}/client/${lead.id}/ - It includes your online booking widget, review gallery, and custom branding! Would you like help connecting your domain?`;
    
    return {
      reply: fallbackReply,
      previewUrl: `${getAppBaseUrl()}/client/${lead.id}/`,
      checkoutUrl: `${getAppBaseUrl()}/api/clients/${lead.id}/subscribe-public`
    };
  }
}
