import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'web-automations-496916',
  location: process.env.GCP_LOCATION || 'us-central1'
});

/**
 * Niche Designer Agent: Formulates copy, sections, and compiles the unified Design Brief.
 * @param {object} lead
 * @param {object} brandProfile - The Brand Profile JSON from BrandAnalyst
 * @param {Array<string>} imageUrls - Sourced Unsplash brand image URLs
 * @returns {Promise<object>} The unified Design Brief
 */
export async function generateDesignBrief(lead, brandProfile, imageUrls) {
  console.log(`[DesignerAgent] Crafting copywriting and content sections for: ${lead.businessName}`);

  const prompt = `
You are the Lead Art Director and Copywriter for AutoAgency.
Your task is to write high-converting, professional copy and section structure for a landing page.
The copy must feel authentic, premium, and specifically tailored to the brand style mood.

Business Details:
- Name: ${lead.businessName}
- Niche: ${lead.niche.replace('_', ' ')}
- Location: ${lead.city}
- Brand Mood Style: "${brandProfile.mood}"

Instructions:
1. Write a highly compelling, professional Hero headline (with one accent word to highlight), and an engaging subtext.
2. Write a detailed "About Us" section story that perfectly matches the brand style mood. Make it sound like it was written by an elite copywriter.
3. Create a list of 4 core services and their pricing matching their niche.
4. Create a list of 3 highly realistic, positive testimonials from customers matching their niche and city.
5. Compile this copywriting layout together with the colors and fonts from the Brand Profile.
6. Output a single, structured JSON string matching the schema.
7. Return ONLY the raw JSON string. Do NOT include markdown code blocks (e.g. \`\`\`json).

Output JSON Schema:
{
  "businessName": "${lead.businessName}",
  "niche": "${lead.niche}",
  "fontPairing": {
    "headerFont": "${brandProfile.fontSuggestion.header}",
    "bodyFont": "${brandProfile.fontSuggestion.body}",
    "importUrl": "${brandProfile.fontSuggestion.importUrl}"
  },
  "colors": {
    "bgMain": "${brandProfile.colors.bgMain}",
    "cardBg": "${brandProfile.colors.cardBg}",
    "borderColor": "${brandProfile.colors.borderColor}",
    "primaryGlow": "${brandProfile.colors.primaryGlow}",
    "accentGlow": "${brandProfile.colors.accentGlow}",
    "textMain": "${brandProfile.colors.textMain}",
    "textMuted": "${brandProfile.colors.textMuted}"
  },
  "hero": {
    "title": "Hero Headline",
    "accentText": "Highlighted Accent Word",
    "subtext": "Hero subtext/pitch"
  },
  "nicheCopy": {
    "aboutHeading": "About Us Header",
    "aboutBody": "About Us Story",
    "serviceIntro": "Short intro to services"
  },
  "services": {
    "Service Name 1": 45,
    "Service Name 2": 95,
    "Service Name 3": 35,
    "Service Name 4": 120
  },
  "hours": {
    "Monday": "9 AM - 6 PM",
    "Tuesday": "9 AM - 6 PM",
    "Wednesday": "9 AM - 6 PM",
    "Thursday": "9 AM - 6 PM",
    "Friday": "9 AM - 8 PM",
    "Saturday": "10 AM - 6 PM",
    "Sunday": "Closed"
  },
  "contact": {
    "phone": "${lead.phone}",
    "email": "contact@${lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com",
    "address": "${lead.address}"
  },
  "testimonials": [
    { "name": "Name", "text": "Review text...", "rating": 5 },
    { "name": "Name", "text": "Review text...", "rating": 5 },
    { "name": "Name", "text": "Review text...", "rating": 5 }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      temperature: 0.7
    }
  });

  let responseText = response.text.trim();
  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }

  try {
    const brief = JSON.parse(responseText);
    // Attach the sourced image URLs directly to the brief so the HTML can render them!
    brief.brandImages = imageUrls;
    console.log(`[DesignerAgent] Successfully compiled Design Brief for: ${lead.businessName}`);
    return brief;
  } catch (err) {
    console.error(`[DesignerAgent] Failed to parse design brief output: ${responseText}`);
    throw new Error(`Designer Agent failed: ${err.message}`);
  }
}
