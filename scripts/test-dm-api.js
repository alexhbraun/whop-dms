#!/usr/bin/env node

/*
 * Test script for the updated Whop DM diagnostic API
 * Run with: node scripts/test-dm-api.js
 */

const API_BASE = process.env.API_BASE || 'https://whop-dms.vercel.app';

async function testDMAPI() {
  console.log('🧪 Testing Updated Whop DM Diagnostic API...\n');

  // Test 1: Ping Whop endpoint
  console.log('1️⃣ Testing /api/diagnostics/ping-whop...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/ping-whop`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 2: Whop Schema Diagnostics (NEW)
  console.log('2️⃣ Testing /api/diagnostics/whop-schema (POST)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/whop-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 3: Whop Schema Diagnostics (GET)
  console.log('3️⃣ Testing /api/diagnostics/whop-schema (GET)...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/whop-schema`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 4: GraphQL Introspection
  console.log('4️⃣ Testing /api/diagnostics/graphql-introspect...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/graphql-introspect`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 5: Missing required fields
  console.log('5️⃣ Testing missing required fields...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 6: Valid request with username
  console.log('6️⃣ Testing valid request with username...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // Test 7: Valid request with user ID
  console.log('7️⃣ Testing valid request with user ID...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // Test 8: GraphQL DM Testing with username
  console.log('8️⃣ Testing /api/diagnostics/try-dm-graph with username...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // Test 9: GraphQL DM Testing with user ID
  console.log('9️⃣ Testing /api/diagnostics/try-dm-graph with user ID...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recipientUserId: 'user_test123',
        message: 'Hello from GraphQL diagnostics (user ID)! 🎉'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 10: GET /api/diagnostics/try-dm
  console.log('🔟 Testing GET /api/diagnostics/try-dm...');
  try {
    const response = await fetch(`${API_BASE}/api/diagnostics/try-dm`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('✅ Testing complete!');
  console.log('\n📝 To test with real username, use:');
  console.log(`curl -X POST ${API_BASE}/api/diagnostics/try-dm \\`);
  console.log('  -H "content-type: application/json" \\');
  console.log('  -d \'{"recipientUsername":"AlexPaintingleads","message":"Hello from diagnostics!"}\'');
  
  console.log('\n📝 To test with real user ID, use:');
  console.log(`curl -X POST ${API_BASE}/api/diagnostics/try-dm \\`);
  console.log('  -H "content-type: application/json" \\');
  console.log('  -d \'{"recipientUserId":"user_XXXXXX","message":"Hello from diagnostics!"}\'');
  
  console.log('\n🔍 To introspect GraphQL schema:');
  console.log(`curl ${API_BASE}/api/diagnostics/graphql-introspect`);
  
  console.log('\n🧪 To test GraphQL DM mutations:');
  console.log(`curl -X POST ${API_BASE}/api/diagnostics/try-dm-graph \\`);
  console.log('  -H "content-type: application/json" \\');
  console.log('  -d \'{"recipientUsername":"AlexPaintingleads","message":"Hello from GraphQL diagnostics!"}\'');
  
  console.log('\n📊 To check Whop schema and DM candidates:');
  console.log(`curl -s -X POST ${API_BASE}/api/diagnostics/whop-schema | jq`);
  console.log(`curl -s -X POST ${API_BASE}/api/diagnostics/whop-schema | jq '.dmCandidates'`);
}

// Run the tests
testDMAPI().catch(console.error);
