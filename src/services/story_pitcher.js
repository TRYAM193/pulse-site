import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

/**
 * Crafts a personalized storytelling pitch focusing on fear of missing out (FOMO) and review findings.
 * @param {object} lead
 * @param {object} auditData
 * @param {string} channel - 'whatsapp' | 'email'
 * @returns {Promise<{subject: string, message: string}>}
 */
export async function generateStoryPitch(lead, auditData, channel = 'whatsapp') {
  const prompt = `
You are a senior digital growth consultant. Write a highly compelling, personalized outreach message targeting ${lead.businessName || lead.business_name}, a ${lead.niche ? lead.niche.replace('_', ' ') : 'local business'} in ${lead.city || 'Seattle'}.

Business Context:
- Rating: ${auditData.rating} stars
- Monthly Missed Revenue: $${auditData.missedRevenueMonthly}/month
- Negative Review Pattern: "${auditData.negativePatterns?.[0] || 'No website available online'}"
- Lost Customer Story: "${auditData.lostCustomerStory}"

Output Channel: ${channel.toUpperCase()}

Instructions:
1. Start with a warm compliment on their high Google rating (${auditData.rating} ⭐).
2. Tell the "Lost Customer Story" in a vivid, realistic narrative style. Make the business owner feel the exact moment a high-paying customer gave up and spent money at a local competitor because they didn't have a website or online booking page.
3. Show the hard math: Explain how not having a 24/7 online portal is costing them an estimated $${auditData.missedRevenueMonthly}/month in lost bookings.
4. Offer a simple, zero-risk solution: Reply "YES" and our AI will build their complete custom website in 60 seconds with zero upfront cost.
${channel === 'whatsapp' ? '5. Format for WhatsApp with clean bolding (*word*), bullet points, and appropriate emojis. Keep it under 200 words.' : '5. Include a punchy Subject Line and clean paragraphs. Keep it under 250 words.'}

Return ONLY a JSON object:
{
  "subject": "Email subject line (or short headline for WhatsApp)",
  "message": "Full text body formatted appropriately"
}
`;

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const jsonText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(jsonText);
  } catch (err) {
    console.warn(`[StoryPitcher] Fallback pitch generated for ${lead.businessName}:`, err.message);
    const story = auditData.lostCustomerStory || `A customer searched for your business last week, but couldn't find your menu or pricing online. They gave up and went to a competitor.`;

    if (channel === 'whatsapp') {
      return {
        subject: `⚠️ Revenue alert for ${lead.businessName}`,
        message: `Hi team at *${lead.businessName}*! 👋\n\nCongrats on your *${auditData.rating} ⭐* rating on Google! You built a great local reputation, but here's something urgent:\n\n📖 *A quick story from last week:*\n"${story}"\n\n💸 *The Hidden Cost:* Without an online booking portal, you're missing an estimated *$${auditData.missedRevenueMonthly}/month* in revenue to local competitors.\n\n⚡ *Solution:* We built an AI system that generates your complete custom website in 60 seconds.\n\nReply *YES* right here on WhatsApp if you want to see a free preview of your site!`
      };
    } else {
      return {
        subject: `Urgent: Customer booking gap at ${lead.businessName}`,
        message: `Hi team at ${lead.businessName},\n\nCongratulations on maintaining a strong ${auditData.rating} ⭐ rating on Google Maps!\n\nHowever, our digital audit revealed a critical gap costing your business real money every week:\n\n"${story}"\n\nBased on your niche, not having a 24/7 online booking page is costing an estimated $${auditData.missedRevenueMonthly} per month in lost sales.\n\nWe can build a complete, custom website for ${lead.businessName} in 60 seconds.\n\nSimply reply "YES" to this email and we'll send you a free, interactive preview link right away!`
      };
    }
  }
}
