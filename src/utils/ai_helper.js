import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'web-automations-496916',
  location: process.env.GCP_LOCATION || 'us-central1'
});

/**
 * Robust wrapper around generateContent that performs retries with exponential backoff
 * to handle transient network drops (fetch failed) or rate limits (429).
 */
export async function generateContentWithRetry(options, retries = 4, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(options);
    } catch (err) {
      console.warn(`[AI-Helper] Vertex AI call failed (Attempt ${i + 1}/${retries}): ${err.message || err}`);
      if (i === retries - 1) {
        throw new Error(`Vertex AI request failed after ${retries} attempts: ${err.message || err}`);
      }
      console.log(`[AI-Helper] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}
