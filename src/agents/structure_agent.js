import { ai, generateContentWithRetry } from '../utils/ai_helper.js';
import { getNicheTemplate, getNicheSectionPrompt } from './niche_templates.js';

/**
 * HTML Structure Architect Agent: Generates custom, production-grade Tailwind v4 HTML structures.
 * @param {object} lead
 * @param {object} brief - The Design Brief JSON
 * @returns {Promise<string>} Full HTML string
 */
export async function generateHtmlStructure(lead, brief) {
  console.log(`[StructureAgent] Architecting semantic HTML structure using Tailwind v4 for: ${lead.businessName}`);

  const serviceCount = Array.isArray(brief.services) ? brief.services.length : Object.keys(brief.services || {}).length;
  const servicesGridCols = serviceCount <= 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl' : serviceCount === 3 ? 'grid-cols-1 md:grid-cols-3 max-w-5xl' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  // Get niche-specific template for industry-appropriate layout
  const nicheTemplate = getNicheTemplate(lead.niche);
  const nicheSectionPrompt = getNicheSectionPrompt(lead.niche, nicheTemplate);

  const prompt = `
You are the HTML Structure Architect Agent for AutoAgency.
Your task is to write a premium, custom, fully loaded HTML5 landing page.
The layout must be responsive, semantic, and styled with **Tailwind CSS v4** classes.

Here is the Design Brief:
${JSON.stringify(brief, null, 2)}

---
CRITICAL LAYOUT RULES (follow every single one — these prevent visual bugs):

## A. GLOBAL CONTAINER RULES
- Every section MUST use <div class="max-w-7xl mx-auto px-6 md:px-10"> as the inner wrapper.
- The <body> tag MUST have: class="overflow-x-hidden" to prevent horizontal overflow.
- Every section MUST have class="w-full" — never let content exceed the viewport width.

## B. ABOUT SECTION (Two-Column)
- Use a flex-based layout for the About section: <div class="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
- The LEFT copy column must be: class="w-full lg:w-2/5 shrink-0"
- The RIGHT detail grid column must be: class="w-full lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-6"
- NEVER use lg:col-span-5 / lg:col-span-7 — use flex widths instead.
- All text in both columns must wrap naturally; add overflow-hidden to each column container.

## C. SERVICES SECTION
- Use exactly this responsive grid for services: class="${servicesGridCols} mx-auto gap-8"
- Ensure no service card overflows its column. Cards must be: class="flex flex-col justify-between h-full"
- Each service card must have: min-height: 0 and overflow: visible (no clipping).
- If a service card has a 'Recommended' or 'Popular' badge, position it with: class="absolute -top-3 right-6"

## D. CONTACT & HOURS SECTION
- Use a flex-based layout: <div class="flex flex-col lg:flex-row gap-12 items-start">
- Hours column: class="w-full lg:w-1/2 shrink-0"
- Contact column: class="w-full lg:w-1/2 shrink-0"
- NEVER let these two panels overlap — they must each take exactly 50% width on desktop.
- Each contact item row uses: class="flex items-center gap-4 py-4"

## E. TESTIMONIALS SECTION  
- Use: class="grid grid-cols-1 md:grid-cols-3 gap-8" for 3 testimonials.
- Each testimonial card: class="flex flex-col justify-between p-8 rounded-2xl bg-card-bg border border-border-color h-full"

## F. BOOKING FORM SECTION
- The booking widget card must be: class="relative p-8 md:p-12 rounded-3xl bg-card-bg border border-border-color max-w-3xl mx-auto"
- The success overlay must be: class="hidden absolute inset-0 bg-card-bg/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-8 text-center z-20"

## G. SCROLLBARS
- NEVER render visible scrollbars. Add this in the <style type="text/tailwindcss"> block:
  * { scrollbar-width: none; -ms-overflow-style: none; }
  *::-webkit-scrollbar { display: none; }

---
Requirements:
1. **Script/Style Linking & Custom Theme Configuration:**
   - Link the official Tailwind CSS v4 browser runtime script in the HTML head EXACTLY as:
     <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
   - Directly underneath it, define the Tailwind CSS v4 theme configuration inside a style block using Tailwind v4 syntax:
      <style type="text/tailwindcss">
        @theme {
          --color-bg-main: ${brief.colors?.bgMain || '#090d16'};
          --color-card-bg: ${brief.colors?.cardBg || '#151a26'};
          --color-border-color: ${brief.colors?.borderColor || 'rgba(226,232,240,0.12)'};
          --color-primary-glow: ${brief.colors?.primaryGlow || '#38bdf8'};
          --color-accent-glow: ${brief.colors?.accentGlow || '#818cf8'};
          --color-text-main: ${brief.colors?.textMain || '#f8fafc'};
          --color-text-muted: ${brief.colors?.textMuted || '#94a3b8'};
          
          --font-header: ${brief.fontPairing?.headerFont || 'Outfit'}, sans-serif;
          --font-body: ${brief.fontPairing?.bodyFont || 'Plus Jakarta Sans'}, sans-serif;
        }

        /* Hide all scrollbars globally */
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
      </style>
   - Link the local supplement stylesheet:
     <link rel="stylesheet" href="style.css">
   - Link the compiled TypeScript app script:
     <script type="module" src="app.js"></script>
2. **Sections Layout (apply the CRITICAL LAYOUT RULES above to each section):**
   - **Header:** Sticky navbar with glassmorphic blurred backdrop, business initials as logo, nav links, and a glowing CTA "${nicheTemplate.ctaText}" button.
   - **Hero Section:** Full-viewport centered layout, large gradient headline: "${brief.hero.title}" with "${brief.hero.accentText}" as gradient accent text, premium description subtext, and two CTA buttons. Primary CTA: "${nicheTemplate.ctaText}". Secondary CTA: "Learn More".
   - **About Studio:** Flex two-column layout (follow Rule B strictly) with copy "${brief.nicheCopy.aboutBody}" on the left and a 2x2 feature cards grid on the right.
   - **Bespoke Services Grid:** Grid layout using exactly ${servicesGridCols} (follow Rule C) presenting all ${serviceCount} services: ${JSON.stringify(brief.services)} with premium pricing display.
   - **Visual Gallery Section:** A 4-column masonry-style grid displaying the business's actual images: ${JSON.stringify(brief.brandImages)}. Use Tailwind hover:scale-110 animations.
   - **Testimonials Section:** 3-column grid (follow Rule E) presenting the reviews: ${JSON.stringify(brief.testimonials)}.
   - **Schedule & Location Grid:** Flex two-column (follow Rule D STRICTLY — no overlap!) displaying hours: ${JSON.stringify(brief.hours)} on the left and contact details: ${JSON.stringify(brief.contact)} on the right.
   - **Glow Booking Widget:** Premium booking form (follow Rule F) with styled inputs and a hidden success overlay. Use "${nicheTemplate.bookingLabel}" as the form heading.
   - **Footer:** Simple footer with business name in gradient, copyright, and Privacy Policy + Terms links.

${nicheSectionPrompt}

3. **Strict DOM Element IDs Contract (CRITICAL):**
   - Booking Form element: id="booking-form"
   - Booking Form Inputs: name="name", name="email", name="service", name="date"
   - Success Overlay container: id="success-overlay" (with the "hidden" Tailwind class by default)
   - Close button inside success overlay: id="close-success-overlay"
4. **Custom Feature Integrations:**
   - Inspect the "customFeatures" array: ${JSON.stringify(brief.customFeatures || [])}.
   - If the client requests specific dynamic features (e.g., booking slots, custom alert messages), adjust the HTML layout beautifully.
5. **Quality Rules:**
   - Write the complete HTML from <!DOCTYPE html> to </html>.
   - Do NOT truncate code or use placeholders.
   - Return ONLY the raw HTML string. Do NOT wrap in markdown code blocks.
`;

  const response = await generateContentWithRetry({
    model: 'gemini-3.5-flash',
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
