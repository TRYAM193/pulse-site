import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchLeads, generateLeadAudit } from '../src/services/lead_prospector.js';
import { sourceBrandAssets } from '../src/agents/brand_sourcer.js';
import { analyzeBrandAssets } from '../src/agents/brand_analyst.js';
import { generateDesignBrief } from '../src/agents/designer_agent.js';
import { generateHtmlStructure } from '../src/agents/structure_agent.js';
import { generateCssStyles } from '../src/agents/style_agent.js';
import { generateTypeScriptLogic } from '../src/agents/coder_agent.js';
import { compileAndVerifyCode } from '../src/agents/qa_agent.js';

// Parse directories
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(path.join(__dirname, '..'));

async function run() {
  console.log(`==================================================`);
  console.log(`🔎 AutoAgency Multi-Agent TypeScript Swarm Explorer`);
  console.log(`==================================================\n`);

  try {
    const niche = "hair_salon";
    const city = "Seattle";
    
    // 1. Explore leads
    const leads = await searchLeads(niche, city);
    
    if (leads.length === 0) {
      console.log("No targets found missing websites.");
      return;
    }

    const selectedLead = leads[0];
    console.log(`[Action] Selected target: "${selectedLead.businessName}"`);

    const clientDir = path.join(rootDir, 'data', 'clients', selectedLead.id);
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    const dataPath = path.join(clientDir, 'site_data.json');
    const briefPath = path.join(clientDir, 'design_brief.json');
    const indexHtmlPath = path.join(clientDir, 'index.html');
    const styleCssPath = path.join(clientDir, 'style.css');
    const tsPath = path.join(clientDir, 'app.ts');
    const pitchPath = path.join(clientDir, 'pitch.txt');

    // 2. Call Brand Sourcer Agent
    console.log(`\n[Swarm 1/6] Running Brand Sourcer Agent...`);
    const assets = await sourceBrandAssets(selectedLead);
    console.log(`- Sourced imageUrls: ${JSON.stringify(assets.imageUrls)}`);

    // 3. Call Multimodal Brand Analyst
    console.log(`\n[Swarm 2/6] Running Multimodal Brand Analyst...`);
    const brandProfile = await analyzeBrandAssets(selectedLead, assets.base64Assets);
    console.log(`Extracted Brand Mood: "${brandProfile.mood}"`);
    console.log(`Colors: Primary = ${brandProfile.colors.primaryGlow}, Accent = ${brandProfile.colors.accentGlow}`);

    // 4. Call Niche Designer Agent
    console.log(`\n[Swarm 3/6] Running Designer Agent...`);
    const brief = await generateDesignBrief(selectedLead, brandProfile, assets.imageUrls);
    fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2), 'utf-8');

    // 5. Parallel Developers Code Generation
    console.log(`\n[Swarm 4/6] Generating HTML structure, CSS styling, and TS logic in parallel...`);
    const [html, css, ts] = await Promise.all([
      generateHtmlStructure(selectedLead, brief),
      generateCssStyles(selectedLead, brief),
      generateTypeScriptLogic(selectedLead, brief)
    ]);

    fs.writeFileSync(indexHtmlPath, html, 'utf-8');
    fs.writeFileSync(styleCssPath, css, 'utf-8');
    fs.writeFileSync(tsPath, ts, 'utf-8');
    console.log(`✅ Bespoke HTML structure generated.`);
    console.log(`✅ Supplement CSS stylesheet generated.`);
    console.log(`✅ Client TypeScript logic generated (app.ts).`);

    // Save site metadata config (services list + details) so bookings can work
    const siteConfig = {
      businessName: selectedLead.businessName,
      niche: selectedLead.niche,
      contact: brief.contact,
      services: brief.services,
      bookings: []
    };
    fs.writeFileSync(dataPath, JSON.stringify(siteConfig, null, 2), 'utf-8');

    // 6. Call QA Builder Agent (TypeScript verification)
    console.log(`\n[Swarm 5/6] Invoking QA Builder Agent (compile verification)...`);
    const buildSuccess = await compileAndVerifyCode(selectedLead, brief);
    
    if (buildSuccess) {
      console.log(`✅ QA Verification passed: app.js compiled successfully.`);
    } else {
      console.error(`❌ QA Verification failed.`);
    }

    // 7. Audit outreach pitch
    console.log(`\n[Swarm 6/6] Generating personalized sales outreach pitch...`);
    const pitch = await generateLeadAudit(selectedLead);
    fs.writeFileSync(pitchPath, pitch, 'utf-8');
    console.log(`✅ Outreach Pitch compiled: ${pitchPath}`);

    console.log(`\n==================================================`);
    console.log(`🎉 Pipeline execution completed successfully!`);
    console.log(`==================================================`);

  } catch (err) {
    console.error(`❌ Swarm failed with error:`, err);
  }
}

run();
