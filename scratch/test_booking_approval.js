import fetch from 'node-fetch'; // global fetch in Node 18+

const runTest = async () => {
  console.log("Starting Booking Slot Allocation test...");
  try {
    // 1. Login as client
    const loginRes = await fetch('http://localhost:4000/api/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@test_client.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // 2. Create a test booking (we can trigger this via the client's public booking endpoint /client/:clientId/book)
    console.log("Creating test booking...");
    const bookRes = await fetch('http://localhost:4000/client/test_client/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer Slot',
        email: 'customer@slot-test.com',
        service: 'Hair Coloring',
        date: '2026-07-20'
      })
    });
    const bookData = await bookRes.json();
    console.log("Booking created:", bookData);

    const bookingId = bookData.bookingId;

    // 3. Approve the booking via Portal API
    console.log(`Approving booking ${bookingId} via Portal API...`);
    const approveRes = await fetch(`http://localhost:4000/api/portal/test_client/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'approved'
      })
    });
    const approveData = await approveRes.json();
    console.log("Approve response:", approveData);

    // 4. Fetch the bookings list to verify confirmed_slot
    console.log("Fetching bookings list to verify confirmed slot details...");
    const listRes = await fetch(`http://localhost:4000/api/portal/test_client/bookings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const bookings = await listRes.json();
    const approvedBooking = bookings.find(b => b.id === bookingId);
    console.log("Approved Booking details from DB:", approvedBooking);

  } catch (err) {
    console.error("Test error:", err.message);
  }
};

runTest();
