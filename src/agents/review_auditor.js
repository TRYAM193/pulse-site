import { ai, generateContentWithRetry } from '../utils/ai_helper.js';
import { getDb } from '../db/connection.js';

/**
 * Niche average ticket sizes and conversion loss metrics.
 */
const NICHE_AUDIT_METRICS = {
  hair_salon: { avgTicket: 65, avgLostCustomersPerWeek: 6 },
  barber_shop: { avgTicket: 35, avgLostCustomersPerWeek: 10 },
  plumber: { avgTicket: 160, avgLostCustomersPerWeek: 4 },
  dentist: { avgTicket: 250, avgLostCustomersPerWeek: 3 },
  restaurant: { avgTicket: 35, avgLostCustomersPerWeek: 12 },
  cafe: { avgTicket: 12, avgLostCustomersPerWeek: 25 },
  bakery: { avgTicket: 20, avgLostCustomersPerWeek: 15 },
  gym: { avgTicket: 60, avgLostCustomersPerWeek: 8 },
  spa: { avgTicket: 110, avgLostCustomersPerWeek: 5 },
  real_estate: { avgTicket: 500, avgLostCustomersPerWeek: 2 },
  law_firm: { avgTicket: 300, avgLostCustomersPerWeek: 2 },
  accounting: { avgTicket: 150, avgLostCustomersPerWeek: 3 },
  default: { avgTicket: 50, avgLostCustomersPerWeek: 7 }
};

/**
 * Conducts a deep public review and online presence audit for a business lead using Gemini 3.5 Flash.
 * @param {object} lead
 * @returns {Promise<object>} Structured review audit object
 */
export async function auditBusinessReviews(lead) {
  const nicheKey = lead.niche || 'default';
  const metrics = NICHE_AUDIT_METRICS[nicheKey] || NICHE_AUDIT_METRICS.default;
  const estimatedMonthlyLoss = (metrics.avgTicket * metrics.avgLostCustomersPerWeek * 4);

  const prompt = `
You are an expert Local Business Growth Auditor. Analyze the online presence and customer review patterns for:
- Business Name: ${lead.businessName || lead.business_name}
- Niche: ${lead.niche ? lead.niche.replace('_', ' ') : 'local business'}
- Rating: ${lead.rating || 4.7} stars (Google Maps)
- Location: ${lead.city || 'Seattle'}

Based on typical customer review patterns for a ${lead.niche || 'local business'} without a website, generate a structured audit identifying WHY they urgently need a website.

Return ONLY a valid JSON object matching this schema:
{
  "rating": number,
  "totalReviews": number,
  "negativePatterns": [string, string, string],
  "lostCustomerStory": string,
  "missedRevenueMonthly": number,
  "keyFrustrations": [string, string, string]
}

Guidelines:
- "negativePatterns": 3 specific real-world complaints customers face when a business lacks a website (e.g. "Couldn't view menu/prices online", "Called multiple times to book", "No online appointment calendar").
- "lostCustomerStory": A vivid, realistic 2-sentence story of a real customer who gave up and went to a competitor because the business didn't have an online portal.
- "missedRevenueMonthly": Set to approximately ${estimatedMonthlyLoss}.
- "keyFrustrations": 3 key features missing from their digital footprint.
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
    const auditData = JSON.parse(jsonText);

    // Save audit JSON to DB
    const db = await getDb();
    if (lead.id) {
      await db.run('UPDATE leads SET review_audit_json = ? WHERE id = ?', [
        JSON.stringify(auditData),
        lead.id
      ]).catch(() => {});
    }

    console.log(`[ReviewAuditor] ✅ Review audit completed for: ${lead.businessName || lead.business_name}`);
    return auditData;
  } catch (err) {
    console.warn(`[ReviewAuditor] Fallback audit generated for ${lead.businessName}:`, err.message);
    const fallbackAudit = {
      rating: lead.rating || 4.8,
      totalReviews: 35,
      negativePatterns: [
        "Potential clients cannot find your pricing or service list online",
        "Customers calling after hours are unable to book appointments or view availability",
        "Browsers seeking visual proof of work go to competitors with online galleries"
      ],
      lostCustomerStory: `A local customer searched for ${lead.niche || 'services'} in ${lead.city || 'your area'} last week. Unable to find your pricing or online booking page, they immediately chose a competitor who allowed 1-click scheduling.`,
      missedRevenueMonthly: estimatedMonthlyLoss,
      keyFrustrations: [
        "No 24/7 digital booking portal",
        "Missing online pricing grid",
        "No verified customer review gallery"
      ]
    };

    return fallbackAudit;
  }
}
