import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

/**
 * Logic Coder Agent: Generates strict, type-safe client-side TypeScript code (app.ts).
 * @param {object} lead
 * @param {object} brief - The Design Brief JSON
 * @returns {Promise<string>} Full TypeScript string
 */
export async function generateTypeScriptLogic(lead, brief) {
  console.log(`[CoderAgent] Coding client-side TypeScript logic for: ${lead.businessName}`);

  const prompt = `
You are the Logic Coder Agent for AutoAgency.
Your task is to write strict, production-ready client-side **TypeScript** code (app.ts) for the website.
The code must compile with the TypeScript compiler (tsc) with ZERO errors or warnings.

Here is the Design Brief:
${JSON.stringify(brief, null, 2)}

Requirements:
1. **Strict TypeScript Typing:**
   - Always cast DOM elements correctly (e.g., \`document.getElementById(...) as HTMLFormElement\`, \`HTMLInputElement\`, \`HTMLSelectElement\`, \`HTMLElement\`).
   - Define clear interfaces or types if needed.
   - Do NOT use \`any\` types. Keep all variables strongly typed.
2. **Form Interaction & Booking API (Strict Contract matching structure_agent.js):**
   - Intercept the booking form submit event using \`document.getElementById('booking-form') as HTMLFormElement\`.
   - On submit, disable the submit button and set its text to "Processing...". Select the submit button directly inside the form element using \`form.querySelector('button[type="submit"]') as HTMLButtonElement | null\` (Do NOT look for a separate button ID).
   - Collect booking inputs from the form elements matching names exactly: name, email, service, date (use \`new FormData(form)\` to extract them).
   - Send a \`fetch()\` POST request with JSON headers and body. Compute the booking endpoint dynamically to support both SaaS live previews and standalone hosting:
     \`const bookingUrl = window.location.pathname.includes('/client/') ? window.location.pathname.replace(/\\/$/, '') + '/book' : '/api/book';\`
     Use this dynamic URL in your fetch call.
   - On success: show the success overlay modal (\`document.getElementById('success-overlay')\`) by removing the "hidden" class and adding the "flex" class, and reset the form.
   - Add click listener to the close button (\`document.getElementById('close-success-overlay') as HTMLButtonElement\`) to hide the success overlay (add "hidden", remove "flex" class).
   - If any of these DOM elements do not exist (e.g. form, success-overlay, close-success-overlay), handle it gracefully by printing a console warning and returning early, ensuring the script does NOT throw uncaught exceptions.
3. **Interactive Features & Micro-Animations:**
   - Implement smooth scrolling for all anchor links (\`href^="#"\`).
   - Create a clean Scroll Reveal effect using \`IntersectionObserver\` to fade in and slide up cards (\`.service-card\`, \`.testimonial-card\`, \`.gallery-item\`) as they enter the viewport.
   - Implement simple, interactive testimonial switching/tabs if required by the structure.
 4. **Custom Feature Integrations:**
    - Inspect the "customFeatures" array in the brief: ${JSON.stringify(brief.customFeatures || [])}.
    - Implement any custom interactive logic, slot selection validation, email request parameters, or customized status messages requested in the custom features list.
 5. **Quality Rules:**
    - Do NOT truncate code or write outline comments. Write the COMPLETE, compiling script.
    - Return ONLY the raw TypeScript string. Do NOT wrap it in markdown code blocks (e.g. no \`\`\`typescript).
`;

  const response = await generateContentWithRetry({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      temperature: 0.1
    }
  });

  let responseText = response.text.trim();
  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```typescript\s*/, '').replace(/```$/, '').trim();
  }

  return responseText;
}
