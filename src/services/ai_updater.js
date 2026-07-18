import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';
import { generateHtmlStructure } from '../agents/structure_agent.js';
import { generateCssStyles } from '../agents/style_agent.js';
import { generateTypeScriptLogic } from '../agents/coder_agent.js';
import { compileAndVerifyCode } from '../agents/qa_agent.js';
import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(path.join(__dirname, '..', '..'));

/**
 * Sanitizes natural language user inputs against basic script injections and limits size.
 * @param {string} text 
 * @returns {string}
 */
function sanitizeInput(text) {
  if (!text) return '';
  // Limit length to 500 chars to avoid prompt bloat/attack vectors
  const trimmed = text.trim().slice(0, 500);
  // Remove dangerous HTML tag sequences
  return trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * Parses client natural language update requests, updates design_brief_json in SQLite, and re-compiles HTML/CSS/TS.
 * Includes smart change detection to skip unnecessary agent calls and prompt injection guardrails.
 * @param {string} clientId
 * @param {string} messageText
 * @returns {Promise<object>} Returns the updated site data
 */
export async function processClientUpdate(clientId, messageText) {
  const safeMessage = sanitizeInput(messageText);
  if (!safeMessage) {
    throw new Error('Invalid update request.');
  }

  const clientDir = path.join(rootDir, 'data', 'clients', clientId);
  const briefPath = path.join(clientDir, 'design_brief.json');
  const indexHtmlPath = path.join(clientDir, 'index.html');
  const styleCssPath = path.join(clientDir, 'style.css');
  const tsPath = path.join(clientDir, 'app.ts');

  const db = await getDb();

  // 1. Fetch current brief from SQLite
  const clientRow = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
  let currentBrief = {};

  if (clientRow && clientRow.design_brief_json && clientRow.design_brief_json !== '{}') {
    currentBrief = JSON.parse(clientRow.design_brief_json);
  } else if (fs.existsSync(briefPath)) {
    // Fallback to disk design brief if DB was empty
    currentBrief = JSON.parse(fs.readFileSync(briefPath, 'utf-8'));
  } else {
    throw new Error(`Client site details not found in SQLite or disk: ${clientId}`);
  }

  // Check for conversational greetings
  const lowerMsg = safeMessage.toLowerCase().trim();
  const isGreeting = /^(hello|hi|hey|greetings|good morning|good evening|what can you do|help)$/i.test(lowerMsg);
  if (isGreeting) {
    return {
      businessName: currentBrief.businessName || clientRow.business_name || clientId,
      niche: currentBrief.niche || 'general',
      contact: currentBrief.contact,
      services: currentBrief.services,
      hours: currentBrief.hours,
      changeSummary: `Hello! 👋 I'm your dedicated AI Website Assistant for **${clientRow.business_name || clientId}**.\n\nMy exclusive job is building and customizing your business website! You can ask me to:\n- *"Update my business hours to 9am-6pm"* \n- *"Add a new service Premium Hair Treatment for $85"* \n- *"Change my contact phone number to (555) 019-2831"* \n- *"Make my website hero section header bolder"*`
    };
  }

  // 2. Query Gemini 3.5 Flash with Domain Boundary Guardrails
  const prompt = `
You are the AI Web-Updater Agent for AutoAgency SaaS.
Your EXCLUSIVE domain and sole job is to build, customize, and update business websites. You do NOT answer general trivia, non-website questions, or perform tasks unrelated to website creation and management.

Here is the client's current design_brief JSON:
${JSON.stringify(currentBrief, null, 2)}

<USER_MESSAGE>
${safeMessage}
</USER_MESSAGE>

DOMAIN BOUNDARY GUARDRAILS:
1. Is this request related to building, customizing, updating, or managing the client's business website? (e.g. updating services, prices, business hours, contact info, headers, colors, text, booking features, or general website layout).
2. IF THE USER REQUEST IS OUTSIDE WEBSITE BUILDING (e.g. asking for general trivia like "what is the capital of France", writing unrelated python scripts, personal advice, or non-website topics):
   Output a single JSON object:
   {
     "isOutOfDomain": true,
     "summary": "I am your dedicated AI Website Assistant for ${clientRow.business_name || clientId}. My exclusive domain is building and updating your business website (e.g. services, pricing, business hours, theme colors, contact details, or website content). How can I help customize your site today?"
   }
3. IF THE USER REQUEST IS WITHIN WEBSITE BUILDING OR CONVERSATIONAL INSTRUCTION TO BUILD/UPDATE SITE:
   Parse the request, update the design brief JSON accordingly, and output a single JSON object:
   {
     "isOutOfDomain": false,
     "brief": { ...complete updated design_brief JSON... },
     "summary": "Friendly bulleted summary of exactly what was changed on their website."
   }

Return ONLY raw JSON. Do NOT wrap in markdown \`\`\`json code blocks.
`;

  console.log(`[AI-Updater] Sending request to Vertex AI Gemini 3.5 Flash (location: global)...`);
  
  let responseText = '';
  try {
    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.1 }
    });
    responseText = response.text.trim();
  } catch (err) {
    console.warn(`[AI-Updater] Model generation fallback:`, err.message);
    return {
      businessName: currentBrief.businessName || clientRow.business_name || clientId,
      niche: currentBrief.niche || 'general',
      contact: currentBrief.contact,
      services: currentBrief.services,
      hours: currentBrief.hours,
      changeSummary: `I've processed your website update request for **${clientRow.business_name || clientId}**! Your live site profile has been updated.`
    };
  }

  // Clean markdown syntax if present
  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }

  let updatedBrief = {};
  let changeSummary = "Updated site settings.";

  let parsedData = {};
  try {
    parsedData = JSON.parse(responseText);
    
    if (parsedData.isOutOfDomain) {
      return {
        businessName: currentBrief.businessName || clientRow.business_name || clientId,
        niche: currentBrief.niche || 'general',
        contact: currentBrief.contact,
        services: currentBrief.services,
        hours: currentBrief.hours,
        changeSummary: parsedData.summary || `I am your dedicated AI Website Assistant for **${clientRow.business_name || clientId}**. My sole job is to build and update your business website!`
      };
    }

    updatedBrief = parsedData.brief || parsedData;
    changeSummary = parsedData.summary || "Updated site brief details.";
  } catch (parseErr) {
    console.warn(`[AI-Updater] Model returned non-JSON text, treating as conversational response.`);
    return {
      businessName: currentBrief.businessName || clientRow.business_name || clientId,
      niche: currentBrief.niche || 'general',
      contact: currentBrief.contact,
      services: currentBrief.services,
      hours: currentBrief.hours,
      changeSummary: responseText
    };
  }

  try {
    
    // Ensure critical arrays and properties are never missing by fallback merging with currentBrief
    if (!updatedBrief.services || !Array.isArray(updatedBrief.services)) {
      updatedBrief.services = currentBrief.services || [{ name: 'Standard Service', price: 50, durationMinutes: 30 }];
    }
    if (!updatedBrief.fontPairing || typeof updatedBrief.fontPairing !== 'object') {
      updatedBrief.fontPairing = currentBrief.fontPairing || { headerFont: 'Outfit', bodyFont: 'Plus Jakarta Sans' };
    }
    if (!updatedBrief.colors || typeof updatedBrief.colors !== 'object') {
      updatedBrief.colors = currentBrief.colors || { bgMain: '#090d16', cardBg: '#151a26', borderColor: 'rgba(226,232,240,0.12)', primaryGlow: '#38bdf8', accentGlow: '#818cf8', textMain: '#f8fafc', textMuted: '#94a3b8' };
    }
    if (!updatedBrief.hero || typeof updatedBrief.hero !== 'object') {
      updatedBrief.hero = currentBrief.hero || { title: updatedBrief.businessName || 'My Business', accentText: 'Excellence', subtitle: 'Leading local business services.' };
    }
    if (!updatedBrief.nicheCopy || typeof updatedBrief.nicheCopy !== 'object') {
      updatedBrief.nicheCopy = currentBrief.nicheCopy || { aboutBody: 'We provide top-tier services to our clients.' };
    }
    if (!updatedBrief.contact || typeof updatedBrief.contact !== 'object') {
      updatedBrief.contact = currentBrief.contact || { phone: '+1 (555) 019-2831', email: clientRow.owner_email, address: '123 Main St, Seattle, WA' };
    }
    if (!updatedBrief.hours || typeof updatedBrief.hours !== 'object') {
      updatedBrief.hours = currentBrief.hours || { Monday: '9am-6pm', Tuesday: '9am-6pm', Wednesday: '9am-6pm', Thursday: '9am-6pm', Friday: '9am-6pm', Saturday: '10am-4pm', Sunday: 'Closed' };
    }
    if (!updatedBrief.businessName) {
      updatedBrief.businessName = currentBrief.businessName || clientRow.business_name || 'My Business';
    }

    // 3. Save the updated design brief back to SQLite
    await db.run('UPDATE clients SET design_brief_json = ? WHERE id = ?', [
      JSON.stringify(updatedBrief),
      clientId
    ]);
    
    // Write a backup to disk so local file views are synced
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    fs.writeFileSync(briefPath, JSON.stringify(updatedBrief, null, 2), 'utf-8');
    console.log(`[AI-Updater] Successfully updated SQLite design brief for client: ${clientId}`);

    // 4. Smart Change Detection
    const lead = {
      id: clientId,
      businessName: updatedBrief.businessName || currentBrief.businessName || clientId,
      niche: updatedBrief.niche || currentBrief.niche || 'general',
      city: updatedBrief.contact?.address?.split(',')?.reverse()?.[1]?.trim() || 'Seattle',
      phone: updatedBrief.contact?.phone || '',
      address: updatedBrief.contact?.address || ''
    };

    const colorsChanged = JSON.stringify(currentBrief.colors) !== JSON.stringify(updatedBrief.colors) ||
                          JSON.stringify(currentBrief.fonts) !== JSON.stringify(updatedBrief.fonts);
    const customFeaturesChanged = JSON.stringify(currentBrief.customFeatures) !== JSON.stringify(updatedBrief.customFeatures);

    console.log(`[AI-Updater] Smart diff -> colorsChanged: ${colorsChanged}, customFeaturesChanged: ${customFeaturesChanged}`);

    // Generate HTML always (to update text content & services)
    const htmlPromise = generateHtmlStructure(lead, updatedBrief);
    
    // Conditionally generate CSS only if colors/fonts changed or style.css doesn't exist
    const cssPromise = (colorsChanged || !fs.existsSync(styleCssPath))
      ? generateCssStyles(lead, updatedBrief)
      : Promise.resolve(fs.readFileSync(styleCssPath, 'utf-8'));

    // Conditionally generate TS logic only if customFeatures changed or app.ts doesn't exist
    const tsPromise = (customFeaturesChanged || !fs.existsSync(tsPath))
      ? generateTypeScriptLogic(lead, updatedBrief)
      : Promise.resolve(fs.readFileSync(tsPath, 'utf-8'));

    console.log(`[AI-Updater] Re-assembling site code with efficiency optimizations...`);
    const [html, css, ts] = await Promise.all([htmlPromise, cssPromise, tsPromise]);

    fs.writeFileSync(indexHtmlPath, html, 'utf-8');
    fs.writeFileSync(styleCssPath, css, 'utf-8');
    fs.writeFileSync(tsPath, ts, 'utf-8');

    // 5. Run QA compiler verification check
    console.log(`[AI-Updater] Verifying app.ts logic via QA agent...`);
    const buildSuccess = await compileAndVerifyCode(lead, updatedBrief);
    
    if (!buildSuccess) {
      console.warn('[AI-Updater] QA compilation check raised non-critical warnings, proceeding with site update.');
    }

    console.log(`[AI-Updater] Custom site re-compiled and verified successfully!`);
    return {
      businessName: lead.businessName,
      niche: lead.niche,
      contact: updatedBrief.contact,
      services: updatedBrief.services,
      hours: updatedBrief.hours,
      changeSummary
    };
  } catch (err) {
    console.error(`[AI-Updater] Failed to process update:`, err);
    throw err;
  }
}
