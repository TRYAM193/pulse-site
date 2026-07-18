import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

/**
 * CSS Stylist Agent: Compiles premium, custom supplementary stylesheets.
 * @param {object} lead
 * @param {object} brief - The Design Brief JSON
 * @returns {Promise<string>} Full CSS string
 */
export async function generateCssStyles(lead, brief) {
  console.log(`[StyleAgent] Styling custom CSS sheet for: ${lead.businessName}`);

  const prompt = `
You are the CSS Stylist Agent for AutoAgency.
Your task is to write a premium, custom CSS stylesheet (style.css) to supplement the Tailwind classes.
The styles must provide rich visual depth, custom animations, typography imports, and glassmorphic variables.

Here is the Design Brief:
${JSON.stringify(brief, null, 2)}

Requirements:
1. **Typography & Imports:**
   - Include the Google Fonts import URL at the top: ${brief.fontPairing.importUrl}
   - Define custom CSS variables in :root:
     - \`--bg-main\`: ${brief.colors.bgMain}
     - \`--card-bg\`: ${brief.colors.cardBg}
     - \`--border-color\`: ${brief.colors.borderColor}
     - \`--primary-glow\`: ${brief.colors.primaryGlow}
     - \`--accent-glow\`: ${brief.colors.accentGlow}
     - \`--text-main\`: ${brief.colors.textMain}
     - \`--text-muted\`: ${brief.colors.textMuted}
     - \`--header-font\`: "${brief.fontPairing.headerFont}", sans-serif;
     - \`--body-font\`: "${brief.fontPairing.bodyFont}", sans-serif;
2. **Ambient Animations & Spheres:**
   - Write style rules for \`.glow-sphere\` class. They must be fixed background elements with a heavy blur (150px-200px), a low opacity (0.15-0.25), and a smooth drifting keyframe animation.
   - Define \`@keyframes drift\` to translate and rotate spheres in the background over 20-30 seconds.
3. **Glassmorphism & Component styling:**
   - Write custom definitions for glassmorphic cards (\`backdrop-filter: blur(12px)\`, custom borders using \`var(--border-color)\`).
   - Add responsive grid gap stylings, custom scrollbar tracks, and styled selections.
   - Ensure the styles mesh perfectly with Tailwind v4 utilities.
4. **Quality Rules:**
   - Write the complete CSS code. Do NOT truncate or use placeholders.
   - Return ONLY the raw CSS string. Do NOT wrap it in markdown code blocks.
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
    responseText = responseText.replace(/^```css\s*/, '').replace(/```$/, '').trim();
  }

  return responseText;
}
