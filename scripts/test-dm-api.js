#!/usr/bin/env node

/*
 * Test script for the updated Whop DM diagnostic API with admin protection
 * Run with: node scripts/test-dm-api.js
 * 
 * Note: Requires ADMIN_KEY environment variable or x-admin-key header
 */

const API_BASE = process.env.API_BASE || 'https://whop-dms.vercel.app';
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-only-key';

async function testDMAPI() {
  console.log('🧪 Testing Updated Whop DM Diagnostic API (Admin Protected)...\n');

  // Test 1: Health Check (Admin Protected)
  console.log('1️⃣ Testing /api/diagnostics/health (Admin Protected)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/health`, {
      headers: { 'x-admin-key': ADMIN_KEY }
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 2: Whop Schema Diagnostics (Admin Protected)
  console.log('2️⃣ Testing /api/diagnostics/whop-schema (Admin Protected)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/whop-schema`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY
      }
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 3: Whop Schema Diagnostics (GET - No Admin Required)
  console.log('3️⃣ Testing /api/diagnostics/whop-schema (GET - Public)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/whop-schema`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 4: GraphQL Introspection (Admin Protected)
  console.log('4️⃣ Testing /api/diagnostics/graphql-introspect (Admin Protected)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/graphql-introspect`, {
      headers: { 'x-admin-key': ADMIN_KEY }
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 5: Try DM (Admin Protected)
  console.log('5️⃣ Testing /api/diagnostics/try-dm (Admin Protected)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY
      },
      body: JSON.stringify({ 
        recipientUsername: 'AlexPaintingleads',
        message: 'Hello from diagnostics! 🎉'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 6: Try DM with User ID (Admin Protected)
  console.log('6️⃣ Testing /api/diagnostics/try-dm with User ID (Admin Protected)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY
      },
      body: JSON.stringify({ 
        recipientUserId: 'user_test123',
        message: 'Hello from diagnostics (user ID)! 🎉'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 7: GraphQL DM Testing (Admin Protected)
  console.log('7️⃣ Testing /api/diagnostics/try-dm-graph (Admin Protected)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm-graph`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY
      },
      body: JSON.stringify({ 
        recipientUsername: 'AlexPaintingleads',
        message: 'Hello from GraphQL diagnostics! 🎉'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 8: Welcome Page (Public)
  console.log('8️⃣ Testing /welcome page (Public)...');
  try {
    const response = await fetch(`${API_BASE}/welcome`);
    const data = await response.text();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response Length: ${data.length} characters`);
    console.log(`   Has Welcome Content: ${data.includes('Welcome') ? 'Yes' : 'No'}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 9: Welcome Page with Parameters (Public)
  console.log('9️⃣ Testing /welcome with query params (Public)...');
  try {
    const response = await fetch(`${API_BASE}/welcome?member=123&u=testuser`);
    const data = await response.text();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response Length: ${data.length} characters`);
    console.log(`   Has Personalized Content: ${data.includes('testuser') ? 'Yes' : 'No'}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 10: Unauthorized Access (Should Fail)
  console.log('🔟 Testing unauthorized access (Should Fail)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/health`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('✅ Testing complete!');
  console.log('\n📝 To test with admin access, set ADMIN_KEY environment variable:');
  console.log('export ADMIN_KEY="your-random-long-value"');
  console.log('node scripts/test-dm-api.js');
  
  console.log('\n📝 To test with real username, use:');
  console.log(`curl -X POST ${API_BASE}/api/diagnostics/try-dm \\`);
  console.log('  -H "x-admin-key: YOUR_ADMIN_KEY" \\');
  console.log('  -H "content-type: application/json" \\');
  console.log('  -d \'{"recipientUsername":"AlexPaintingleads","message":"Hello from diagnostics!"}\'');
  
  console.log('\n📝 To check Whop schema and DM candidates:');
  console.log(`curl -s -X POST ${API_BASE}/api/diagnostics/whop-schema \\`);
  console.log('  -H "x-admin-key: YOUR_ADMIN_KEY" | jq');
  
  console.log('\n📝 To check system health:');
  console.log(`curl -s ${API_BASE}/api/diagnostics/health \\`);
  console.log('  -H "x-admin-key: YOUR_ADMIN_KEY" | jq');
  
  console.log('\n📝 To test welcome page:');
  console.log(`curl -s ${API_BASE}/welcome | grep -i welcome`);
  
  console.log('\n🔒 Security Note: All diagnostics endpoints now require x-admin-key header');
  console.log('💡 Set ADMIN_KEY in Vercel environment variables for production use');
}

// Run the tests
testDMAPI().catch(console.error);
