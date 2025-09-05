#!/usr/bin/env node

/**
 * Test script for DM webhook functionality
 * Usage: node scripts/test-dm-webhook.js [baseUrl] [adminKey]
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';
const adminKey = process.argv[3] || process.env.ADMIN_KEY;

if (!adminKey) {
  console.error('❌ ADMIN_KEY required. Set as env var or pass as second argument.');
  process.exit(1);
}

// Simulate a member.created webhook event
const testEvent = {
  id: `test_event_${Date.now()}`,
  type: "member.created",
  data: {
    business_id: "test_business_123",
    experience_id: "test_experience_456",
    member_id: "test_member_789",
    user: {
      id: "user_test123",
      username: "testuser"
    }
  }
};

async function testWebhook() {
  console.log('🧪 Testing DM Webhook...');
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`📋 Event ID: ${testEvent.id}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/whop/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': adminKey
      },
      body: JSON.stringify(testEvent)
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook test completed');
    } else {
      console.log('❌ Webhook test failed');
    }
    
  } catch (error) {
    console.error('💥 Error testing webhook:', error.message);
  }
}

async function testRetry() {
  console.log('\n🔄 Testing DM Retry...');
  
  try {
    const response = await fetch(`${baseUrl}/api/jobs/dm-retry`, {
      method: 'GET',
      headers: {
        'X-API-KEY': adminKey
      }
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Retry test completed');
    } else {
      console.log('❌ Retry test failed');
    }
    
  } catch (error) {
    console.error('💥 Error testing retry:', error.message);
  }
}

async function testHealth() {
  console.log('\n🏥 Testing Health Check...');
  
  try {
    const response = await fetch(`${baseUrl}/api/diagnostics/health`, {
      method: 'GET',
      headers: {
        'X-API-KEY': adminKey
      }
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Health check completed');
    } else {
      console.log('❌ Health check failed');
    }
    
  } catch (error) {
    console.error('💥 Error testing health:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting DM Webhook Tests\n');
  
  await testHealth();
  await testWebhook();
  await testRetry();
  
  console.log('\n✨ All tests completed!');
}

main().catch(console.error);
