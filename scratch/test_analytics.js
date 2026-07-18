// Using global native fetch (Node 18+)

async function testAnalytics() {
  console.log(`==================================================`);
  console.log(`🧪 Testing Database Analytics & Bookings Integration`);
  console.log(`==================================================\n`);

  try {
    const baseUrl = 'http://localhost:4000';

    // 1. Visit client page to trigger pageview
    console.log(`[Step 1] Visiting client page...`);
    const visitRes = await fetch(`${baseUrl}/client/test_client/`);
    console.log(`- Status: ${visitRes.status}`);

    // 2. Submit a booking form
    console.log(`\n[Step 2] Submitting booking request...`);
    const bookRes = await fetch(`${baseUrl}/client/test_client/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Smith',
        email: 'jane@example.com',
        service: 'Premium Facial',
        date: '2026-07-22'
      })
    });
    const bookData = await bookRes.json();
    console.log(`- Status: ${bookRes.status}`);
    console.log(`- Response:`, bookData);

    // 3. Query client dashboard metrics
    console.log(`\n[Step 3] Querying client dashboard metrics...`);
    const dashRes = await fetch(`${baseUrl}/api/clients/test_client/dashboard`);
    const dashData = await dashRes.json();
    console.log(`- Status: ${dashRes.status}`);
    console.log(`- Metrics:`, dashData.metrics);
    console.log(`- Bookings Count: ${dashData.bookings.length}`);
    console.log(`- First Booking status: "${dashData.bookings[0]?.status}"`);

    // 4. Update booking status
    if (dashData.bookings[0]) {
      const bookingId = dashData.bookings[0].id;
      console.log(`\n[Step 4] Approving booking: ${bookingId}...`);
      const statusRes = await fetch(`${baseUrl}/api/clients/test_client/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      console.log(`- Status: ${statusRes.status}`);
      const rawText = await statusRes.text();
      console.log(`- Raw Response Body:`, rawText);
      const statusData = JSON.parse(rawText);
      console.log(`- Response:`, statusData);

      // Re-verify dashboard status
      const verifyRes = await fetch(`${baseUrl}/api/clients/test_client/dashboard`);
      const verifyData = await verifyRes.json();
      console.log(`- Updated Booking status: "${verifyData.bookings[0]?.status}"`);
    }

    console.log(`\n✅ Integration check completed successfully!`);
  } catch (err) {
    console.error(`❌ Integration check failed:`, err.message);
  }
}

testAnalytics();
