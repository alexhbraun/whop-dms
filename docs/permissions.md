# Whop App Permissions

## Required Permissions

This app requires **NO user scopes**. All functionality is server-side using the App API key.

### Whop Dashboard Configuration

1. Go to **Whop Developer Dashboard → Your App → Permissions**
2. **Remove/Uncheck** all user scopes:
   - ❌ `member.basic:read`
   - ❌ `member.stats:read`
   - ❌ Any other `member.*` scopes
3. **Keep only** app-level permissions for:
   - ✅ `messages.send` (for sending DMs)
   - ✅ `business.read` (for business context)

### Why No User Scopes?

- **No consent popup**: Users won't see "Approve permissions" dialogs
- **Server-only**: All DM sending happens server-side with App API key
- **Agent-based**: Messages are sent by the configured agent user
- **Business-scoped**: All data is isolated by `business_id`

### Environment Variables

**Required (server-side only):**
```bash
WHOP_API_KEY=your_app_api_key
WHOP_AGENT_USER_ID=user_xxxxx
WHOP_COMPANY_ID=biz_xxxxx
```

**Do NOT use:**
- ❌ `NEXT_PUBLIC_WHOP_*` (exposes secrets to client)
- ❌ User tokens or `withUser()` calls
- ❌ Client-side Whop SDK usage

### Testing

Use the debug endpoints to verify no user token dependencies:
- `GET /api/debug/consent-check` - Check for leaked public env vars
- `GET /api/debug/whoami-app` - Test app API key works
- `POST /api/debug/send-dm-raw` - Test DM sending without user token
