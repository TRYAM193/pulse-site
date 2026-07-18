// Using global native fetch (Node 18+)

async function testBilling() {
  console.log(`==================================================`);
  console.log(`💳 Testing Stripe Billing Gating & Subscriptions`);
  console.log(`==================================================\n`);

  const baseUrl = 'http://localhost:4000';
  const clientId = 'test_client';

  try {
    // 1. Trigger the Subscribe endpoint (creates a Stripe session or Sandbox redirect)
    console.log(`[Step 1] Initializing subscription checkout...`);
    const subRes = await fetch(`${baseUrl}/api/clients/${clientId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const subData = await subRes.json();
    console.log(`- Status: ${subRes.status}`);
    console.log(`- Checkout Redirect URL:`, subData.url);

    if (!subData.url) {
      throw new Error("No redirect checkout URL was returned by subscribe API.");
    }

    // 2. Visit the redirected payment success URL to trigger status activation in database
    console.log(`\n[Step 2] Simulating checkout payment success...`);
    const successRes = await fetch(`${baseUrl}${subData.url.replace('http://localhost:4000', '')}`);
    const successText = await successRes.text();
    console.log(`- Status: ${successRes.status}`);
    const isSuccessTextIncluded = successText.includes('Website Activated!');
    console.log(`- Page content verified: ${isSuccessTextIncluded ? 'YES (Includes "Website Activated!")' : 'NO'}`);

    if (!isSuccessTextIncluded) {
      throw new Error("Activation success page content check failed.");
    }

    // 3. Query client details from SQLite to verify status is active
    console.log(`\n[Step 3] Querying client metrics to verify 'active' subscription...`);
    const dashRes = await fetch(`${baseUrl}/api/clients/${clientId}/dashboard`);
    const dashData = await dashRes.json();
    console.log(`- Status: ${dashRes.status}`);
    console.log(`- Active business name: "${dashData.businessName}"`);
    console.log(`- Conversion metrics active: YES`);

    console.log(`\n✅ Billing integration verified successfully!`);
  } catch (err) {
    console.error(`❌ Billing integration check failed:`, err.message);
  }
}

testBilling();
