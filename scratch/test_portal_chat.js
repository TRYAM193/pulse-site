import fetch from 'node-fetch'; // Wait, node-fetch is not in package.json. Let's use global fetch (Node 18+)
import dotenv from 'dotenv';

const runTest = async () => {
  console.log("Starting Portal Chat API test...");
  try {
    // 1. Login to get token
    const loginRes = await fetch('http://localhost:4000/api/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@test_client.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    console.log("Login result:", loginData);

    if (!loginData.token) {
      console.error("Login failed. Check server.js default user setups.");
      return;
    }

    const token = loginData.token;

    // 2. Send chat request
    console.log("Sending chat update request...");
    const chatRes = await fetch('http://localhost:4000/api/portal/test_client/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: 'Change Monday hours to 8am-8pm'
      })
    });

    console.log("Chat API Response Status:", chatRes.status);
    const chatData = await chatRes.json();
    console.log("Chat API Response Body:", chatData);

  } catch (err) {
    console.error("Test error:", err.message);
  }
};

runTest();
