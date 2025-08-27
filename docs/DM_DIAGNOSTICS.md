# Whop DM Diagnostic API

This document describes the diagnostic API endpoints for testing Whop DM functionality.

## Overview

The diagnostic API provides isolated testing of Whop DM capabilities without depending on the UI. It's designed to help debug and verify that your app can successfully send DMs to Whop users.

## Endpoints

### 1. POST `/api/diagnostics/try-dm`

Tests the ability to send a DM to a specific user.

#### Request Body

```json
{
  "bizId": "biz_XXX",           // Required: Whop business ID
  "recipientUserId": "user_YYY", // Required: Recipient user ID
  "senderUserId": "user_ZZZ",    // Optional: Override sender (if not provided, uses stored default)
  "body": "Test message"         // Optional: Message content (defaults to test message)
}
```

#### Response

```json
{
  "ok": true,                    // Whether Whop returned 2xx status
  "status": 200,                 // HTTP status from Whop
  "sent": {                      // What was actually sent
    "senderUserId": "user_ZZZ",
    "recipientUserId": "user_YYY", 
    "bizId": "biz_XXX",
    "body": "Test message"
  },
  "diagnostics": {               // Environment and configuration info
    "usedKey": true,             // Whether WHOP_API_KEY was present
    "endpoint": "https://whop.com/v2/messages",
    "bindingFound": false,       // Whether host binding exists
    "environment": "production"
  },
  "raw": {                       // Raw response from Whop
    "ok": true,
    "status": 200,
    "data": { ... }
  }
}
```

#### Example Usage

```bash
curl -X POST https://whop-dms.vercel.app/api/diagnostics/try-dm \
  -H "content-type: application/json" \
  -d '{
    "bizId": "biz_123",
    "recipientUserId": "user_abc", 
    "senderUserId": "user_sender",
    "body": "Test from diagnostics"
  }'
```

### 2. GET `/api/diagnostics/me`

Returns current user identity information (placeholder implementation).

#### Response

```json
{
  "message": "Current user identity endpoint",
  "note": "This endpoint would return the current authenticated user ID",
  "usage": "Use this to get your user ID for setting as sender in community settings",
  "example": "In a real implementation, this would return your user_XXX ID from Whop",
  "placeholder": "user_placeholder_123"
}
```

## Environment Variables

### Required

- `WHOP_API_KEY`: Your Whop API key for sending DMs

### Optional

- `WHOP_API_BASE`: Whop API base URL (defaults to `https://whop.com`)
- `MOCK_DM`: Set to `1` or `true` to enable mock DM mode for testing

## Database Schema

The API expects a `sender_user_id` field in the `community_settings` table:

```sql
-- Add sender_user_id field to community_settings table
ALTER TABLE community_settings 
ADD COLUMN IF NOT EXISTS sender_user_id text;

COMMENT ON COLUMN community_settings.sender_user_id IS 'User ID of the default sender for DMs (e.g., user_123)';
```

## Testing

### 1. Run the test script

```bash
node scripts/test-dm-api.js
```

### 2. Test with real IDs

1. **Get your business ID**: Look at your Whop business dashboard URL
2. **Get recipient user ID**: Find a member in your business
3. **Get sender user ID**: Use your own user ID or set one in community settings
4. **Test the API**: Use the curl command above with real IDs

### 3. Test scenarios

- ✅ **Valid request**: All required fields provided
- ❌ **Missing bizId**: Should return 400 error
- ❌ **Missing recipientUserId**: Should return 400 error  
- ❌ **Invalid format**: IDs must start with `biz_` and `user_`
- ❌ **No stored sender**: Should return 400 if no senderUserId provided and none stored
- ❌ **Whop API error**: Should return Whop's error status and body

## Error Handling

The API handles various error scenarios:

- **400 Bad Request**: Missing or invalid required fields
- **500 Internal Server Error**: Missing WHOP_API_KEY or unexpected errors
- **Whop API errors**: Returns Whop's actual HTTP status and error body

## Logging

Server-side logging includes:

```
[try-dm] biz=biz_123 sender=user_sender recipient=user_abc status=200
```

## Implementation Details

- **Reuses existing code**: Uses the `sendWhopDM` function from `lib/whopClient.ts`
- **Separate insert/update**: Handles new vs existing questions properly
- **Mock mode support**: Respects MOCK_DM environment variable
- **Type safety**: Full TypeScript types for request/response
- **No UI dependencies**: Pure API endpoint for testing

## Troubleshooting

### Common Issues

1. **"Missing WHOP_API_KEY"**: Ensure `WHOP_API_KEY` is set in your environment
2. **"No sender set for this business"**: Set `sender_user_id` in community settings or pass `senderUserId` in request
3. **Whop API errors**: Check the `raw` field in response for Whop's error details
4. **Database errors**: Ensure the `sender_user_id` column exists in `community_settings`

### Debug Steps

1. Check environment variables are set
2. Verify database schema has required columns
3. Test with mock mode enabled (`MOCK_DM=1`)
4. Check server logs for detailed error information
5. Use the test script to verify basic functionality
