import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Enforce Vertex AI Client with location='global' and model='gemini-3.5-flash'
export const vertexAi = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'web-automations-496916',
  location: 'global'
});

// Export default ai instance
export const ai = vertexAi;

/**
 * Robust wrapper around generateContent using Vertex AI (location='global') and model='gemini-3.5-flash'.
 */
export async function generateContentWithRetry(options, retries = 3, delay = 1500) {
  // Always enforce gemini-3.5-flash on global location
  const modelName = 'gemini-3.5-flash';
  const reqOptions = { ...options, model: modelName };

  for (let i = 0; i < retries; i++) {
    try {
      return await vertexAi.models.generateContent(reqOptions);
    } catch (err) {
      console.warn(`[AI-Helper] Vertex AI (global gemini-3.5-flash) call failed (Attempt ${i + 1}/${retries}): ${err.message || err}`);
      if (i === retries - 1) {
        throw new Error(`AI generation failed after ${retries} attempts: ${err.message || err}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/**
 * Resolves the public application base URL for outreach emails, links, and callbacks.
 * Prioritizes APP_URL, RENDER_EXTERNAL_URL (Render live domain), falling back to localhost.
 */
export function getAppBaseUrl() {
  const url = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`;
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
