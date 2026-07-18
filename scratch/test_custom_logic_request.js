import fetch from 'node-fetch';

const runTest = async () => {
  console.log("Starting custom logic chat request test...");
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

    // 2. Send custom logic request
    console.log("Sending custom logic chat request...");
    const chatRes = await fetch('http://localhost:4000/api/portal/test_client/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: 'whenever i approve bookings allocate a 30 mins slot and send them a mail confirmation'
      })
    });
    const chatData = await chatRes.json();
    console.log("Chat response:", chatData);

  } catch (err) {
    console.error("Test error:", err.message);
  }
};

runTest();
