# Whop DM Diagnostics API

This document describes the diagnostic endpoints for testing Whop Direct Message functionality.

## Endpoints

### 1. `/api/diagnostics/ping-whop` (GET)
Basic health check to verify Whop API key presence.

**Response:**
```json
{
  "ok": true,
  "hasKey": true,
  "headerNameUsed": "X-API-KEY",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. `/api/diagnostics/try-dm` (POST)
Tests the original REST-based DM sending (legacy endpoint).

**Request Body:**
```json
{
  "recipientUsername": "AlexPaintingleads",
  "message": "Hello from diagnostics!"
}
```

**Response:**
```json
{
  "ok": true,
  "recipient": "AlexPaintingleads",
  "result": { "id": "msg_123456" }
}
```

### 3. `/api/diagnostics/graphql-introspect` (GET) ⭐ NEW
Introspects the Whop GraphQL schema to discover available mutations and queries.

**Response:**
```json
{
  "ok": true,
  "status": 200,
  "mutations": ["sendDirectMessageToUser", "createUser", ...],
  "queries": ["user", "company", ...]
}
```

**Purpose:** Discover what mutations are actually available in the Whop API schema for your app key.

### 4. `/api/diagnostics/try-dm-graph` (POST) ⭐ NEW
Systematically tests different GraphQL mutation candidates to find the correct one for sending DMs.

**Request Body:**
```json
{
  "recipientUsername": "AlexPaintingleads",
  "message": "Hello from GraphQL diagnostics!"
}
```

**Response:**
```json
{
  "ok": true,
  "recipient": { "type": "username", "value": "AlexPaintingleads" },
  "messageLength": 35,
  "tried": [
    {
      "name": "sendDirectMessageToUser",
      "success": false,
      "httpStatus": 200,
      "hasErrors": true,
      "dataKeys": [],
      "errorMessages": ["Field 'sendDirectMessageToUser' doesn't exist on type 'Mutation'"]
    },
    {
      "name": "messagesSendDirectMessageToUser",
      "success": true,
      "httpStatus": 200,
      "hasErrors": false,
      "dataKeys": ["messagesSendDirectMessageToUser"],
      "id": "msg_123456"
    }
  ],
  "winner": { "name": "messagesSendDirectMessageToUser", "id": "msg_123456" }
}
```

**Purpose:** Find the correct mutation name and structure by testing multiple candidates.

## Testing Strategy

### Step 1: Schema Discovery
```bash
curl https://whop-dms.vercel.app/api/diagnostics/graphql-introspect
```

This will show you all available mutations and queries in the Whop API schema.

### Step 2: Mutation Testing
```bash
curl -X POST https://whop-dms.vercel.app/api/diagnostics/try-dm-graph \
  -H "content-type: application/json" \
  -d '{"recipientUsername":"AlexPaintingleads","message":"Hello from diagnostics!"}'
```

This will systematically test different mutation candidates and tell you which one works.

### Step 3: Use the Working Mutation
Once you find the working mutation, update your production code to use that specific mutation name and structure.

## Mutation Candidates Tested

The system tests these mutations in order:

1. **`sendDirectMessageToUser`** - Standard mutation name
2. **`messagesSendDirectMessageToUser`** - Namespaced mutation name
3. **`sendDirectMessage(input)`** - Input object pattern
4. **`sendMessageToUser`** - Alternative naming

## Environment Variables

- `WHOP_API_KEY` - Required for all endpoints
- `NODE_ENV` - Logged for debugging

## Logging

All endpoints include comprehensive logging with prefixes:
- `[introspect]` - GraphQL introspection endpoint
- `[try-dm-graph]` - GraphQL mutation testing endpoint
- `[try-dm]` - Original REST endpoint
- `[ping-whop]` - Health check endpoint

## Troubleshooting

### Common Issues

1. **"Field doesn't exist on type 'Mutation'"** - The mutation name is incorrect
2. **"No query string was present"** - GraphQL request format is wrong
3. **"Uh-oh... (3301)"** - Unknown Whop API error, check schema

### Debugging Steps

1. Check Vercel logs for detailed request/response information
2. Use introspection to see available mutations
3. Test mutation candidates systematically
4. Verify environment variables are set correctly

## Security Notes

- API keys are never logged in full
- All endpoints are production-safe
- No sensitive data is exposed in responses
