import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

/**
 * Backend Coder Agent: Generates a complete standalone backend suite (server.js, init_db.js, package.json)
 * for the client, so they can host their business site independently.
 * @param {object} lead
 * @param {object} brief - Design Brief JSON
 * @returns {Promise<{serverJs: string, initDbJs: string, packageJson: string}>} Generated files
 */
export async function generateClientBackend(lead, brief) {
  console.log(`[BackendAgent] Generating standalone server & database setup for: ${lead.businessName || lead.business_name}`);

  const prompt = `
You are the Backend Architect Agent for AutoAgency.
Your task is to generate a standalone full-stack Node.js/Express backend and SQLite database configuration for a local business website.
This client wants to host their website completely independently of our SaaS platform.

Here is the business's Design Brief JSON:
${JSON.stringify(brief, null, 2)}

You must generate three files, returned inside a single, valid JSON object matching this structure exactly:
{
  "serverJs": "Express server script text here",
  "initDbJs": "SQLite database initialization script text here",
  "packageJson": "package.json file content string here"
}

---
### Specifications for generated files:

1. **package.json:**
   - ES Module type (\`"type": "module"\`).
   - dependencies: express, sqlite, sqlite3, bcryptjs.
   - scripts: \`"start": "node server.js"\`, \`"init-db": "node init_db.js"\`.

2. **init_db.js:**
   - Initializes a local database named \`bookings.sqlite\` (using \`sqlite\` and \`sqlite3\`).
   - Creates a table \`bookings\` with columns: \`id\` (TEXT PK), \`customer_name\` (TEXT), \`customer_email\` (TEXT), \`service_name\` (TEXT), \`booking_date\` (TEXT), \`status\` (TEXT, default 'pending'), \`created_at\` (TEXT).
   - Creates a table \`analytics\` with columns: \`id\` (INTEGER PK AUTOINCREMENT), \`event_type\` (TEXT), \`timestamp\` (TEXT).
   - Creates a table \`users\` with columns: \`email\` (TEXT PK), \`password_hash\` (TEXT).
   - Hashes a default password 'admin123' using \`bcryptjs\` and inserts an admin user (email: 'admin@${lead.id}.com') into \`users\`.

3. **server.js:**
   - Initializes an Express app serving the static directory \`public\` (which will contain index.html, style.css, app.js).
   - API endpoints:
     - \`POST /api/book\`: Receives booking body (name, email, service, date) and inserts it into the local SQL \`bookings\` table. It should also insert a 'booking_success' event into the \`analytics\` table. Returns \`{ success: true, bookingId }\`.
     - \`POST /api/login\`: Receives user credentials (email, password), queries the \`users\` table, compares hashes using \`bcryptjs\`, and returns a login response.
     - \`GET /api/dashboard/stats\`: Returns booking count, total page views, and booking conversion rate.
     - \`GET /api/bookings\`: Returns all bookings ordered by date.
     - \`POST /api/bookings/:id/status\`: Updates a booking's status (approved/rejected).
     - \`POST /api/analytics/track\`: Receives event type (e.g., 'pageview') and logs it to \`analytics\`.
     - Tracks pageviews on serving the main route by writing directly to \`analytics\`.
   - Simple, robust error handling, port configuration (uses \`process.env.PORT || 3000\`).
   - Custom Feature Integrations: Inspect the "customFeatures" array in the brief: ${JSON.stringify(brief.customFeatures || [])}. If the client requests specific backend behaviors (like 30-min scheduling slots, automatic email notification templates on booking, custom databases), make sure the generated \`server.js\` and \`init_db.js\` files fully implement those features natively.

---
Instructions:
- Return ONLY the raw JSON string with the three keys: "serverJs", "initDbJs", "packageJson".
- Do NOT wrap the JSON inside markdown blocks (e.g. no \`\`\`json).
- Ensure all quotes inside file strings are properly escaped to prevent invalid JSON parse errors.
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
    responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(responseText);
    if (!parsed.serverJs || !parsed.initDbJs || !parsed.packageJson) {
      throw new Error("Missing required backend file keys from model response");
    }
    return parsed;
  } catch (err) {
    console.error("[BackendAgent] Failed to parse model output as JSON. Output was:", responseText);
    throw new Error(`Failed to generate valid client backend configuration: ${err.message}`);
  }
}
