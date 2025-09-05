# Whop DM Diagnostics

This document describes the diagnostic endpoints for testing and debugging Whop Direct Message functionality.

## Quick Start

### 1. Check API Key Presence
```bash
curl -s https://<your-app-domain>/api/diagnostics/ping-whop | jq
```

### 2. Introspect Whop GraphQL Schema
```bash
curl -s -X POST https://<your-app-domain>/api/diagnostics/whop-schema | jq
```

### 3. Test DM Mutations Systematically
```bash
curl -s -X POST https://<your-app-domain>/api/diagnostics/try-dm-graph \
  -H "content-type: application/json" \
  -d '{"recipientUsername":"AlexPaintingleads","message":"Hello from diagnostics!"}' | jq
```

## Endpoints Reference

### `/api/diagnostics/ping-whop` (GET)
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

### `/api/diagnostics/whop-schema` (POST) ⭐ NEW
Comprehensive Whop GraphQL schema introspection and DM mutation discovery.

**Response:**
```json
{
  "ok": true,
  "hasKey": true,
  "schemaProbe": {
    "status": 200,
    "ok": true
  },
  "mutationFieldsCount": 45,
  "mutationsSample": [
    "createUser",
    "updateUser",
    "sendDirectMessageToUser",
    "messagesSendDirectMessageToUser",
    "sendDirectMessage",
    "sendMessageToUser"
  ],
  "dmCandidates": {
    "sendDirectMessageToUser": true,
    "messagesSendDirectMessageToUser": true,
    "sendDirectMessage": false,
    "sendMessageToUser": false
  }
}
```

**How to read the `dmCandidates` flags:**

- **`sendDirectMessageToUser: true`** - This mutation exists and can be used
- **`messagesSendDirectMessageToUser: true`** - Alternative namespaced mutation available
- **`sendDirectMessage: false`** - This mutation doesn't exist in your schema
- **`sendMessageToUser: false`** - This mutation doesn't exist in your schema

**Usage with curl:**
```bash
# Basic call
curl -s -X POST https://<your-app-domain>/api/diagnostics/whop-schema | jq

# With pretty formatting
curl -s -X POST https://<your-app-domain>/api/diagnostics/whop-schema | jq '.'

# Check just the DM candidates
curl -s -X POST https://<your-app-domain>/api/diagnostics/whop-schema | jq '.dmCandidates'

# Count total mutations
curl -s -X POST https://<your-app-domain>/api/diagnostics/whop-schema | jq '.mutationFieldsCount'
```

### `/api/diagnostics/graphql-introspect` (GET)
Legacy introspection endpoint for discovering available mutations and queries.

### `/api/diagnostics/try-dm-graph` (POST)
Systematically tests different GraphQL mutation candidates to find the correct one for sending DMs.

### `/api/diagnostics/try-dm` (POST)
Tests the original REST-based DM sending (legacy endpoint).

## Testing Strategy

### Step 1: Verify API Key
```bash
curl -s https://<your-app-domain>/api/diagnostics/ping-whop | jq '.hasKey'
```

### Step 2: Discover Available Mutations
```bash
curl -s -X POST https://<your-app-domain>/api/diagnostics/whop-schema | jq '.dmCandidates'
```

### Step 3: Test Working Mutations
```bash
curl -s -X POST https://<your-app-domain>/api/diagnostics/try-dm-graph \
  -H "content-type: application/json" \
  -d '{"recipientUsername":"AlexPaintingleads","message":"Hello from diagnostics!"}' | jq
```

## Environment Variables

- `WHOP_API_KEY` - Required for all endpoints
- `NODE_ENV` - Logged for debugging

## Logging

All endpoints include comprehensive logging with prefixes:
- `[whop-schema]` - Schema introspection endpoint
- `[introspect]` - GraphQL introspection endpoint
- `[try-dm-graph]` - GraphQL mutation testing endpoint
- `[try-dm]` - Original REST endpoint
- `[ping-whop]` - Health check endpoint

## Troubleshooting

### Common Issues

1. **"Missing WHOP_API_KEY"** - Set the environment variable in Vercel
2. **"Field doesn't exist on type 'Mutation'"** - Use schema introspection to find correct names
3. **"Uh-oh... (3301)"** - Unknown Whop API error, check schema and permissions

### Debugging Steps

1. Check Vercel logs for detailed request/response information
2. Use `/api/diagnostics/whop-schema` to see available mutations
3. Test mutation candidates systematically with `/api/diagnostics/try-dm-graph`
4. Verify environment variables are set correctly

## Security Notes

- API keys are never logged in full
- All endpoints are production-safe
- No sensitive data is exposed in responses
- All GraphQL requests use `X-API-KEY` header authentication



