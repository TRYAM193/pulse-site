import { compileAndVerifyCode } from '../src/agents/qa_agent.js';

async function run() {
  console.log(`==================================================`);
  console.log(`🔬 Testing Autonomous QA Self-Healing Loop`);
  console.log(`==================================================\n`);

  const lead = {
    id: 'test_client',
    businessName: 'Aura Hair Salon & Spa',
    niche: 'hair_salon',
    city: 'Seattle',
    phone: '+15551234567',
    address: '123 Beauty Lane, Seattle, WA 98101'
  };

  const brief = {
    colors: {
      bgMain: "hsl(220, 10%, 12%)",
      cardBg: "hsla(220, 10%, 18%, 0.5)",
      borderColor: "hsla(0, 0%, 100%, 0.1)",
      primaryGlow: "hsl(38, 85%, 65%)",
      accentGlow: "hsl(28, 60%, 55%)",
      textMain: "hsl(0, 0%, 94%)",
      textMuted: "hsl(220, 5%, 65%)"
    }
  };

  console.log(`[Test] Running compileAndVerifyCode on test_client...`);
  const success = await compileAndVerifyCode(lead, brief);
  
  if (success) {
    console.log(`\n🎉 Test Passed! The code compiles successfully.`);
  } else {
    console.error(`\n❌ Test Failed! Code failed to compile.`);
  }
}

run();
