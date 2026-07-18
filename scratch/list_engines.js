import { execSync } from 'child_process';

async function listEngines() {
  console.log("Listing Discovery Engine (Agent Builder) engines...");
  try {
    const token = execSync('gcloud auth print-access-token').toString().trim();
    const projectId = 'web-automations-496916';
    const url = `https://discoveryengine.googleapis.com/v1/projects/${projectId}/locations/global/collections/default_collection/engines`;
    
    console.log(`Fetching from: ${url}`);
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-goog-user-project': projectId
      }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP Error ${res.status}: ${errText}`);
    }
    
    const data = await res.json();
    console.log("Engines found:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to list engines:", err.message);
  }
}

listEngines();
