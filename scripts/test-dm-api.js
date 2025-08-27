#!/usr/bin/env node

/*
 * Test script for the DM diagnostic API
 * Run with: node scripts/test-dm-api.js
 */

const API_BASE = process.env.API_BASE || 'https://whop-dms.vercel.app';

async function testDMAPI() {
  console.log('🧪 Testing Whop DM Diagnostic API...\n');

  // Test 1: Missing required fields
  console.log('1️⃣ Testing missing required fields...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bizId: 'biz_test' })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 2: Invalid bizId format
  console.log('2️⃣ Testing invalid bizId format...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bizId: 'invalid_id',
        recipientUserId: 'user_test'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 3: Valid request (will fail without proper IDs)
  console.log('3️⃣ Testing valid request format...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bizId: 'biz_test123',
        recipientUserId: 'user_test123',
        senderUserId: 'user_sender123',
        body: 'Test message from diagnostic API'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 4: GET /api/diagnostics/me
  console.log('4️⃣ Testing /api/diagnostics/me endpoint...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/me`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('✅ Testing complete!');
  console.log('\n📝 To test with real IDs, use:');
  console.log(`curl -X POST ${API_BASE}/api/diagnostics/try-dm \\`);
  console.log('  -H "content-type: application/json" \\');
  console.log('  -d \'{"bizId":"biz_XXX","recipientUserId":"user_YYY","senderUserId":"user_ZZZ","body":"Test from diagnostics"}\'');
}

// Run the tests
testDMAPI().catch(console.error);
