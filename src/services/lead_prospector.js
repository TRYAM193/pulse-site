import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getDb } from '../db/connection.js';

dotenv.config();

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'web-automations-496916',
  location: process.env.GCP_LOCATION || 'us-central1'
});

// A dictionary of average monthly revenue and ticket prices by business niche
const NICHE_METRICS = {
  hair_salon: { avgTicket: 60, multiplier: 12 },
  plumber: { avgTicket: 150, multiplier: 8 },
  dentist: { avgTicket: 200, multiplier: 15 },
  restaurant: { avgTicket: 30, multiplier: 30 },
  default: { avgTicket: 50, multiplier: 10 }
};

/**
 * Searches local business leads using Maps API or generates high-fidelity mock data if no key is set.
 * Reads/writes from SQLite DB for caching.
 * @param {string} niche - e.g. "hair_salon", "plumber", "dentist", "restaurant"
 * @param {string} city - e.g. "Seattle", "Chicago", "Miami"
 * @returns {Promise<Array<object>>} List of leads
 */
export async function searchLeads(niche, city) {
  console.log(`[LeadProspector] Scouting leads for '${niche}' in '${city}'...`);

  const db = await getDb();

  // Check SQLite cache first
  const cachedLeads = await db.all('SELECT * FROM leads WHERE niche = ? AND city = ?', [niche, city]);
  
  if (cachedLeads.length > 0) {
    console.log(`[LeadProspector] Retrieved ${cachedLeads.length} cached leads from SQLite.`);
    return cachedLeads.map(lead => ({
      id: lead.id,
      businessName: lead.business_name,
      niche: lead.niche,
      city: lead.city,
      phone: lead.phone,
      address: lead.address,
      rating: lead.rating,
      estimatedMissedRevenue: lead.lost_revenue,
      status: lead.status,
      pitchText: lead.pitch_text
    }));
  }

  const placesKey = process.env.PLACES_API_KEY;
  let targetLeads = [];
  const metrics = NICHE_METRICS[niche] || NICHE_METRICS.default;

  if (placesKey) {
    console.log(`[LeadProspector] Querying real Google Places API for: ${niche} in ${city}...`);
    try {
      const searchQuery = encodeURIComponent(`${niche.replace('_', ' ')} in ${city}`);
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${placesKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (searchData.status === 'OK' && searchData.results && searchData.results.length > 0) {
        console.log(`[LeadProspector] Google Places API returned ${searchData.results.length} live results.`);
        const candidates = searchData.results.slice(0, 10);

        for (const place of candidates) {
          let resName = place.name;
          let resAddr = place.formatted_address || 'Address on Google Maps';
          let resRating = place.rating || 4.5;
          let resReviews = place.user_ratings_total || 25;
          let resPhone = 'Available on Google Maps';
          let hasWebsite = false;

          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,rating,user_ratings_total,website&key=${placesKey}`;
            const detailsRes = await fetch(detailsUrl);
            const detailsData = await detailsRes.json();

            if (detailsData.status === 'OK' && detailsData.result) {
              const dRes = detailsData.result;
              resName = dRes.name || resName;
              resAddr = dRes.formatted_address || resAddr;
              resRating = dRes.rating || resRating;
              resReviews = dRes.user_ratings_total || resReviews;
              resPhone = dRes.formatted_phone_number || resPhone;
              hasWebsite = Boolean(dRes.website && dRes.website.trim());
            }
          } catch {
            // Use Text Search properties
          }

          if (!hasWebsite) {
            const estimatedMissedRevenue = Math.floor(resReviews * (resRating - 3.5) * metrics.avgTicket * 0.15) || 1250;

            targetLeads.push({
              id: place.place_id,
              businessName: resName,
              niche,
              city,
              rating: resRating,
              reviews: resReviews,
              phone: resPhone,
              address: resAddr,
              website: 'None',
              estimatedMissedRevenue
            });
          }
        }
      } else {
        console.warn(`[LeadProspector] Google Places API returned status: ${searchData.status}. Falling back to templates.`);
      }
    } catch (err) {
      console.error(`[LeadProspector] Google Places API request failed:`, err.message);
    }
  }

  // If Places API Key is missing or failed, fall back to mock templates
  if (targetLeads.length === 0) {
    console.log(`[LeadProspector] Using template mock data fallback.`);
    const businessTemplates = {
      hair_salon: ["Emerald City Cuts", "Vibe Hair Lounge", "Classic Styles", "Luxe Glow Salon", "Radiant Cuts"],
      plumber: ["Cascade Plumbing Co.", "Rapid Rooter Bros", "Northwest Leak Fixers", "Jet Plumbers", "Reliable Pipe Techs"],
      dentist: ["Metro Dental Care", "Family Smile Clinic", "Bright Dental", "Parkside Orthodontics", "Apex Dental Group"],
      restaurant: ["Olive & Vine Bistro", "Grizzly Burger Bar", "Noodle Haven", "Spice Route Grill", "The Daily Grind Cafe"]
    };

    const selectedNames = businessTemplates[niche] || ["Local Service Hub", "Elite Business Pros", "Pro Active Services"];

    const leads = selectedNames.map((name, index) => {
      const rating = parseFloat((4.0 + Math.random() * 0.9).toFixed(1));
      const reviews = Math.floor(15 + Math.random() * 120);
      
      const hasWebsite = index >= 3;
      const website = hasWebsite ? `http://www.example-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : 'None';
      const estimatedMissedRevenue = Math.floor(reviews * (rating - 3.5) * metrics.avgTicket * 0.15);

      return {
        id: `${niche}_${city.toLowerCase()}_${index + 1}`,
        businessName: `${name} ${city}`,
        niche,
        city,
        rating,
        reviews,
        phone: `+1 (${Math.floor(200 + Math.random() * 700)}) 555-${String(Math.floor(1000 + Math.random() * 9000))}`,
        address: `${100 + index * 45} Grand Ave, ${city}, WA`,
        website,
        estimatedMissedRevenue
      };
    });

    targetLeads = leads.filter(l => l.website === 'None');
  }

  // Insert into SQLite database
  console.log(`[LeadProspector] Caching ${targetLeads.length} target leads missing websites into SQLite...`);
  const stmt = await db.prepare(`
    INSERT INTO leads (id, business_name, niche, city, phone, address, rating, lost_revenue, status, pitch_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `);

  for (const lead of targetLeads) {
    try {
      await stmt.run(
        lead.id,
        lead.businessName,
        lead.niche,
        lead.city,
        lead.phone,
        lead.address,
        lead.rating,
        lead.estimatedMissedRevenue,
        'discovered'
      );
    } catch (err) {
      // Catch duplicates gracefully (in case of primary key collisions)
      console.warn(`[LeadProspector] Could not insert lead: ${lead.businessName} (maybe already exists)`);
    }
  }
  await stmt.finalize();

  console.log(`[LeadProspector] Found and cached ${targetLeads.length} target leads.`);
  return targetLeads;
}

/**
 * Uses Gemini to generate a personalized audit message for the lead. Caches inside SQLite leads table.
 * @param {object} lead
 * @returns {Promise<string>} The audit message
 */
export async function generateLeadAudit(lead) {
  const db = await getDb();

  // Check if we already have the pitch cached in the database
  const leadRow = await db.get('SELECT pitch_text FROM leads WHERE id = ?', [lead.id]);
  if (leadRow && leadRow.pitch_text) {
    console.log(`[LeadProspector] Retrieved cached audit pitch for: ${lead.businessName}`);
    return leadRow.pitch_text;
  }

  const prompt = `
You are the Outreach Manager for AutoAgency, an AI web development agency.
Write a highly compelling, personalized sales outreach message targeting a local business owner who does not have a website.

Here are the details of the business:
- Business Name: ${lead.businessName || lead.business_name}
- Niche: ${lead.niche.replace('_', ' ')}
- Rating: ${lead.rating} stars (on Google Maps)
- Estimated Missed Revenue: $${lead.estimatedMissedRevenue || lead.lost_revenue}/month (due to not having online presence/booking)

Draft a message that:
1. Praises their strong Google Maps reputation (mentioning their rating).
2. Explains clearly, without being pushy, how not having a website is costing them an estimated $${lead.estimatedMissedRevenue || lead.lost_revenue} in bookings/sales every month.
3. Mentions that we have already built a fully functioning custom website preview for them: http://localhost:4000/client/${lead.id}
4. Asks them if they'd like to activate it on their custom domain.
5. Keep the tone friendly, professional, and helpful. Do not use corporate fluff. Keep it under 150 words.
`;

  console.log(`[LeadProspector] Generating personalized AI audit for: ${lead.businessName || lead.business_name}`);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      temperature: 0.7
    }
  });

  const pitchText = response.text.trim();

  // Cache back to database
  await db.run('UPDATE leads SET pitch_text = ? WHERE id = ?', [pitchText, lead.id]);
  console.log(`[LeadProspector] Cached audit pitch in SQLite database for: ${lead.businessName || lead.business_name}`);

  return pitchText;
}
