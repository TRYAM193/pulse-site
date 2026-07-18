import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

// Parse directories
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(path.join(__dirname, '..'));

const dataPath = path.join(rootDir, 'data', 'clients', 'test_client', 'site_data.json');

async function run() {
  console.log(`==================================================`);
  console.log(`🤖 AutoAgency WhatsApp Webhook Update Simulator`);
  console.log(`==================================================\n`);

  if (!fs.existsSync(dataPath)) {
    console.error(`Error: test_client site_data.json not found!`);
    process.exit(1);
  }

  // 1. Show current config
  const originalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`[Before Update] Aura Hair Salon & Spa Configuration:`);
  console.log(`- Services:`, originalData.services);
  console.log(`- Sunday Hours: "${originalData.hours.Sunday}"`);
  console.log(`--------------------------------------------------\n`);

  // 2. Define the simulated text message
  const updateMessage = "Can you change our Sunday hours to Closed, change the price of 'Classic Haircut' to $40, and add a new service 'Premium Facial' for $65?";
  console.log(`[Simulating WhatsApp Text]:`);
  console.log(`"${updateMessage}"\n`);

  // 3. Post to the webhook
  console.log(`Sending webhook request to server...`);
  
  try {
    const response = await fetch('http://localhost:4000/api/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: '+15558889999',
        Body: updateMessage
      })
    });

    const responseText = await response.text();
    console.log(`\n[Server Webhook Response (TwiML XML)]:\n`);
    console.log(responseText);
    console.log(`--------------------------------------------------\n`);

    // 4. Show updated config
    const updatedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`[After Update] Updated Aura Hair Salon & Spa Configuration:`);
    console.log(`- Services:`, updatedData.services);
    console.log(`- Sunday Hours: "${updatedData.hours.Sunday}"`);
    console.log(`\n✅ Webhook simulation complete! Check http://localhost:4000/client/test_client to see it rendered live.`);
    console.log(`==================================================`);

  } catch (err) {
    console.error(`Simulation failed! Make sure your server is running (npm start) first.`, err);
  }
}

run();
