import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

const execPromise = util.promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(path.join(__dirname, '..', '..'));

/**
 * Parses app.ts for referenced DOM IDs and verifies they exist in index.html.
 * @param {string} tsContent
 * @param {string} htmlContent
 * @returns {Array<string>} List of missing element IDs
 */
function verifyDomIds(tsContent, htmlContent) {
  const getElementByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  const querySelectorIdRegex = /querySelector\(['"]#([^'"]+)['"]\)/g;

  const referencedIds = new Set();
  let match;

  while ((match = getElementByIdRegex.exec(tsContent)) !== null) {
    referencedIds.add(match[1]);
  }
  while ((match = querySelectorIdRegex.exec(tsContent)) !== null) {
    referencedIds.add(match[1]);
  }

  const missingIds = [];
  for (const id of referencedIds) {
    // Escape special characters in ID for regex safety
    const escapedId = id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const idPattern = new RegExp(`id=['"]${escapedId}['"]`, 'i');
    if (!idPattern.test(htmlContent)) {
      missingIds.push(id);
    }
  }

  return missingIds;
}

/**
 * QA Agent: Compiles app.ts, checks DOM ID alignments, and self-heals files.
 * @param {object} lead
 * @param {object} brief - The Design Brief JSON
 * @returns {Promise<boolean>} True if compilation succeeds
 */
export async function compileAndVerifyCode(lead, brief) {
  const clientDir = path.join(rootDir, 'data', 'clients', lead.id);
  const tsPath = path.join(clientDir, 'app.ts');
  const htmlPath = path.join(clientDir, 'index.html');
  const jsPath = path.join(clientDir, 'app.js');

  const compileCmd = `npx tsc "${tsPath}" --noEmitOnError --target es2022 --module esnext --lib dom,es2022`;
  
  let loopCount = 0;
  const maxRetries = 3;

  while (loopCount < maxRetries) {
    loopCount++;
    console.log(`\n[QAAgent] [Attempt ${loopCount}/${maxRetries}] Verifying DOM element IDs and TypeScript compilation for ${lead.id}...`);

    const tsContent = fs.readFileSync(tsPath, 'utf-8');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // 1. Check DOM ID alignment
    const missingIds = verifyDomIds(tsContent, htmlContent);

    if (missingIds.length > 0) {
      console.warn(`[QAAgent] ⚠️ DOM ID Alignment verification failed. Missing element IDs in HTML: ${missingIds.join(', ')}`);
      
      if (loopCount === maxRetries) {
        console.error(`[QAAgent] ❌ Max retries reached. DOM Alignment failed.`);
        return false;
      }

      // Invoke Coder to heal the TypeScript selectors or instruct HTML updates
      console.log(`[QAAgent] Invoking logic coder to self-heal ID selectors...`);
      const healingPrompt = `
You are the Lead Frontend Developer Agent. Your TypeScript code (app.ts) references DOM element IDs that do NOT exist in your index.html.
Your task is to fix these selectors so they match the actual index.html file, or use valid elements.

Here is the index.html content for reference:
${htmlContent}

Missing element IDs in index.html that your script tried to select:
${missingIds.join(', ')}

Here is the current invalid code in app.ts:
${tsContent}

Instructions:
1. Modify your script selectors or DOM queries to match the actual IDs present in the HTML (e.g. check the form ID, button types, modal container IDs).
2. Ensure correct TypeScript DOM castings (e.g. HTMLFormElement, HTMLButtonElement).
3. Return ONLY the raw, corrected TypeScript code string. Do NOT wrap it in markdown code blocks.
`;

      const response = await generateContentWithRetry({
        model: 'gemini-2.5-pro',
        contents: healingPrompt,
        config: {
          temperature: 0.1
        }
      });

      let responseText = response.text.trim();
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```typescript\s*/, '').replace(/```$/, '').trim();
      }

      fs.writeFileSync(tsPath, responseText, 'utf-8');
      continue; // Re-verify healed code
    }

    // 2. Check TypeScript compilation syntax
    try {
      const { stdout, stderr } = await execPromise(compileCmd);
      console.log(`[QAAgent] ✅ TypeScript compilation successful. compiled app.js created.`);
      return true;
    } catch (err) {
      const errorLogs = err.stdout || err.stderr || err.message;
      console.warn(`[QAAgent] ⚠️ TypeScript compilation failed on attempt ${loopCount}:\n${errorLogs}`);

      if (loopCount === maxRetries) {
        console.error(`[QAAgent] ❌ Max retries reached. Compilation failed.`);
        return false;
      }

      // Invoke Coder to heal syntax compile errors, passing the index.html for tag context
      console.log(`[QAAgent] Invoking logic coder to self-heal compile errors...`);
      const healingPrompt = `
You are the Lead Frontend Developer Agent. Your TypeScript code (app.ts) failed to compile.
Your task is to fix the compiler errors and write a corrected, error-free version of app.ts.

Here is the index.html content for tag context:
${htmlContent}

Here is the TypeScript compilation error logs:
${errorLogs}

Here is the current invalid code in app.ts:
${tsContent}

Instructions:
1. Resolve all compilation errors mentioned in the logs (ensure correct DOM element typing, cast selectors, fix variable types).
2. Return ONLY the raw, corrected TypeScript code string. Do NOT wrap it in markdown code blocks.
`;

      const response = await generateContentWithRetry({
        model: 'gemini-2.5-pro',
        contents: healingPrompt,
        config: {
          temperature: 0.1
        }
      });

      let responseText = response.text.trim();
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```typescript\s*/, '').replace(/```$/, '').trim();
      }

      fs.writeFileSync(tsPath, responseText, 'utf-8');
    }
  }

  return false;
}
