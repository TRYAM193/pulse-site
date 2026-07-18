import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'web-automations-496916',
  location: process.env.GCP_LOCATION || 'us-central1'
});

/**
 * Brand Analyst Agent: Ingests base64 brand photos and analyzes them using Multimodal Gemini.
 * @param {object} lead
 * @param {Array<object>} base64Assets - Array of base64 image inline data objects
 * @returns {Promise<object>} Analysed branding JSON details
 */
export async function analyzeBrandAssets(lead, base64Assets) {
  console.log(`[BrandAnalyst] Analyzing branding colors and style for: ${lead.businessName}`);

  const promptText = `
You are the Multimodal Brand Analyst Agent for AutoAgency.
Your task is to analyze the attached business photos (interior, work, or branding) and extract a cohesive, premium visual style design profile.

Instructions:
1. Examine the dominant colors in the images. Decide on a professional color palette in HSL format:
   - "bgMain": Background color. It should be a very dark or very clean shade matching the mood.
   - "cardBg": Card backgrounds (semi-translucent for glassmorphic elements, e.g. hsla(...)).
   - "borderColor": Accent borders.
   - "primaryGlow": Primary brand color. A vibrant accent color (e.g. glowing emerald, rich gold, copper, electric indigo).
   - "accentGlow": Secondary glow accent (providing depth in gradients).
   - "textMain": Main typography color (light grey/white or dark grey depending on background).
   - "textMuted": Subtexts and labels.
2. Define a brand mood tone statement (e.g. "Sleek industrial loft salon featuring brushed brass trims and warm amber glow" or "Ultra-clean modern dental suite with minimalist ice blue gradients").
3. Determine a Google Font pair suggestion (e.g. Syne + DM Sans, Outfit + Inter, cabinet-grotesk + Space Grotesk).
4. Output a single, structured JSON string matching the schema.
5. Return ONLY the raw JSON string. Do NOT wrap the JSON inside markdown blocks (e.g. do not use \`\`\`json).

Output JSON Schema:
{
  "colors": {
    "bgMain": "hsl(...) or hex",
    "cardBg": "hsla(...) or hex",
    "borderColor": "hsla(...) or hex",
    "primaryGlow": "hsl(...) or hex",
    "accentGlow": "hsl(...) or hex",
    "textMain": "hsl(...) or hex",
    "textMuted": "hsl(...) or hex"
  },
  "mood": "Brand style mood statement",
  "fontSuggestion": {
    "header": "Syne",
    "body": "DM Sans",
    "importUrl": "@import url('...');"
  }
}
`;

  // Combine image payloads and the text prompt
  const contents = [
    ...base64Assets,
    promptText
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: contents,
    config: {
      temperature: 0.2
    }
  });

  let responseText = response.text.trim();
  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }

  try {
    const brandProfile = JSON.parse(responseText);
    console.log(`[BrandAnalyst] Successfully extracted brand profile for: ${lead.businessName}`);
    return brandProfile;
  } catch (err) {
    console.error(`[BrandAnalyst] Failed to parse brand analyst output: ${responseText}`);
    // Fallback brand profile in case of failure
    return {
      colors: {
        bgMain: "hsl(220, 18%, 8%)",
        cardBg: "hsla(220, 15%, 12%, 0.5)",
        borderColor: "hsla(165, 70%, 50%, 0.1)",
        primaryGlow: "hsl(165, 85%, 45%)",
        accentGlow: "hsl(260, 90%, 75%)",
        textMain: "hsl(210, 30%, 96%)",
        textMuted: "hsl(210, 15%, 65%)"
      },
      mood: "Modern minimalist styling with clean cyan glows",
      fontSuggestion: {
        header: "Outfit",
        body: "Inter",
        importUrl: "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Outfit:wght@700;800&display=swap');"
      }
    };
  }
}
