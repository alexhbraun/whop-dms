# Whop DM Diagnostic API

This document describes the diagnostic API endpoints for testing Whop DM functionality using GraphQL.

## Overview

The diagnostic API provides isolated testing of Whop DM capabilities without depending on the UI. It uses Whop's GraphQL endpoint with `X-API-KEY` header for authentication.

## Endpoints

### 1. GET `/api/diagnostics/ping-whop`

Sanity check endpoint to verify Whop API configuration.

#### Response

```json
{
  "ok": true,
  "hasKey": true,
  "headerNameUsed": "X-API-KEY",
  "timestamp": "2025-08-27T09:56:21.724Z"
}
```

### 2. GET `/api/diagnostics/try-dm`

Returns reachability info.

#### Response

```json
{
  "ok": true,
  "info": "GET reachable; POST to attempt a DM"
}
```

### 3. POST `/api/diagnostics/try-dm`

Tests the ability to send a DM to a specific user by username.

#### Request Body

```json
{
  "recipientUsername": "AlexPaintingleads",
  "message": "Welcome to the community! 🎉 (diagnostics)"
}
```

#### Response (Success)

```json
{
  "ok": true,
  "status": 200,
  "recipientUsername": "AlexPaintingleads",
  "message": "Welcome to the community! 🎉 (diagnostics)",
  "result": { ... }
}
```

#### Response (Error)

```json
{
  "ok": false,
  "status": 401,
  "error": "Whop DM failed 401: Unauthorized",
  "recipientUsername": "AlexPaintingleads",
  "message": "Welcome to the community! 🎉 (diagnostics)"
}
```

## Environment Variables

### Required

- `WHOP_API_KEY`: Your Whop app API key (used in `X-API-KEY` header)

## Implementation Details

### Whop DM Helper (`lib/whopDm.ts`)

```typescript
export async function sendWhopDmByUsername(username: string, message: string) {
  const res = await fetch("https://api.whop.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.WHOP_API_KEY!,
    },
    body: JSON.stringify({
      operation: "sendDirectMessageToUser",
      variables: {
        toUserIdOrUsername: username,
        message,
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Whop DM failed:", text);
    throw new Error(`Whop DM failed ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}
```

## Testing

### 1. Run the test script

```bash
node scripts/test-dm-api.js
```

### 2. Test with real username

```bash
curl -X POST "https://whop-dms.vercel.app/api/diagnostics/try-dm" \
  -H "Content-Type: application/json" \
  -d '{"recipientUsername":"AlexPaintingleads","message":"Hello from diagnostics!"}'
```

### 3. PowerShell testing

```powershell
(Invoke-WebRequest `
  -Uri "https://whop-dms.vercel.app/api/diagnostics/try-dm" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"recipientUsername":"AlexPaintingleads","message":"Hello from diagnostics!"}' `
).Content
```

### 4. Test ping endpoint

```bash
curl https://whop-dms.vercel.app/api/diagnostics/ping-whop
```

## Error Handling

The API handles various error scenarios:

- **400 Bad Request**: Missing or invalid required fields
- **401 Unauthorized**: Whop API authentication/authorization failed
- **500 Internal Server Error**: Missing WHOP_API_KEY or unexpected errors

## Security Features

- **API Key Masking**: `WHOP_API_KEY` is never logged or exposed in responses
- **Server-only**: All DM logic runs server-side, no client exposure
- **GraphQL Endpoint**: Uses Whop's official GraphQL API

## Troubleshooting

### Common Issues

1. **"Missing WHOP_API_KEY"**: Ensure `WHOP_API_KEY` is set in Vercel environment variables
2. **"Whop DM failed 401"**: Your API key lacks permission or is invalid
3. **"Whop DM failed 404"**: Invalid/unknown recipient username
4. **"Whop DM failed 422"**: Payload shape mismatch with Whop's GraphQL schema

### Debug Steps

1. Check `/api/diagnostics/ping-whop` to verify API key presence
2. Verify `WHOP_API_KEY` is set in Vercel project settings
3. Test with a known valid username
4. Check Vercel function logs for detailed error information
