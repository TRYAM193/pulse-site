import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

/**
 * HTML Structure Architect Agent: Generates custom, production-grade Tailwind v4 HTML structures.
 * @param {object} lead
 * @param {object} brief - The Design Brief JSON
 * @returns {Promise<string>} Full HTML string
 */
export async function generateHtmlStructure(lead, brief) {
  console.log(`[StructureAgent] Architecting semantic HTML structure using Tailwind v4 for: ${lead.businessName}`);

  const prompt = `
You are the HTML Structure Architect Agent for AutoAgency.
Your task is to write a premium, custom, fully loaded HTML5 landing page.
The layout must be responsive, semantic, and styled with **Tailwind CSS v4** classes.

Here is the Design Brief:
${JSON.stringify(brief, null, 2)}

Requirements:
1. **Script/Style Linking & Custom Theme Configuration:**
   - Link the official Tailwind CSS v4 browser runtime script in the HTML head EXACTLY as:
     <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
   - Directly underneath it, define the Tailwind CSS v4 theme configuration inside a style block using Tailwind v4 syntax:
     <style type="text/tailwindcss">
       @theme {
         --color-bg-main: ${brief.colors.bgMain};
         --color-card-bg: ${brief.colors.cardBg};
         --color-border-color: ${brief.colors.borderColor};
         --color-primary-glow: ${brief.colors.primaryGlow};
         --color-accent-glow: ${brief.colors.accentGlow};
         --color-text-main: ${brief.colors.textMain};
         --color-text-muted: ${brief.colors.textMuted};
         
         --font-header: ${brief.fontPairing.headerFont}, sans-serif;
         --font-body: ${brief.fontPairing.bodyFont}, sans-serif;
       }
     </style>
   - Link the local supplement stylesheet:
     <link rel="stylesheet" href="style.css">
   - Link the compiled TypeScript app script:
     <script type="module" src="app.js"></script>
2. **Sections Layout:**
   - **Header:** Sticky navbar, glassmorphic blurred backdrop, business initials as logo, links, and a glowing CTA "Book Now" button.
   - **Hero Section:** Centered or split layout, bold Syne font pairing, title: "${brief.hero.title}" (with "${brief.hero.accentText}" styled as a glowing linear-gradient text), a premium description, and action buttons.
   - **About Studio:** Columns separating their copy: "${brief.nicheCopy.aboutBody}" with a styled detail grid.
   - **Bespoke Services Grid:** Grid layout presenting all services: ${JSON.stringify(brief.services)} with individual HSL glow badges.
   - **Visual Gallery Section:** A grid displaying the business's actual images: ${JSON.stringify(brief.brandImages)}. Use Tailwind hover scale animations to zoom images.
   - **Testimonials Section:** Slider or grid layouts presenting the reviews: ${JSON.stringify(brief.testimonials)}.
   - **Schedule & Location Grid:** Side-by-side layout displaying hours: ${JSON.stringify(brief.hours)} and contact details: ${JSON.stringify(brief.contact)}.
   - **Glow Booking Widget:** A form with styled inputs, validation tags, and a hidden success overlay.
3. **Strict DOM Element IDs Contract (CRITICAL):**
   You MUST use the exact IDs listed below in the generated HTML. Do not deviate.
   - Booking Form element: id="booking-form"
   - Booking Form Inputs: name="name", name="email", name="service", name="date" (Must match these names exactly)
   - Success Overlay container: id="success-overlay" (Must contain the "hidden" Tailwind class by default)
   - Close button inside success overlay: id="close-success-overlay"
4. **Custom Feature Integrations:**
   - Inspect the "customFeatures" array in the brief: ${JSON.stringify(brief.customFeatures || [])}.
   - If the client requests specific dynamic features (e.g., booking slots, custom alert messages, extra fields, confirmation labels), adjust the HTML layout or form inputs to display these features beautifully (for example, adding slot selector boxes or custom status displays).
5. **Quality Rules:**
   - Ensure the HTML is fully written from <!DOCTYPE html> to </html>.
   - Do NOT truncate code or use placeholders. Write the complete, production-grade code.
   - Return ONLY the raw HTML string. Do NOT wrap it in markdown code blocks.
`;

  const response = await generateContentWithRetry({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      temperature: 0.2
    }
  });

  let responseText = response.text.trim();
  if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```html\s*/, '').replace(/```$/, '').trim();
  }

  // Force post-process rewrite to ensure the correct Tailwind v4 browser runtime script is used
  responseText = responseText.replace(/https:\/\/cdn\.tailwindcss\.com\/[0-9.]+/g, 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4');
  responseText = responseText.replace(/https:\/\/cdn\.tailwindcss\.com(?!.*@tailwindcss\/browser)/g, 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4');

  return responseText;
}
