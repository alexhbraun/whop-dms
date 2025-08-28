# Direct Messaging (DM) Implementation Guide

This document explains how the Direct Messaging system works, how to control it with feature flags, and how to re-enable it when Whop provides API access.

## 🚀 Quick Start

### Current Status
- **DMs are DISABLED by default** (`DM_ENABLED=false`)
- **Fallback to welcome links** is active
- **No code changes needed** to re-enable when Whop allows

### Environment Variables
```bash
# Required for DMs to work
DM_ENABLED=false                    # Feature flag; keep false in prod for now
DM_MODE=graph                       # Future: graph | internal | none
WHOP_API_KEY=<already set>          # Keep existing
ADMIN_KEY=<create a random long value>  # For diagnostics endpoints

# Optional
DM_ROLLOUT_PCT=0                    # 0–100 gradual rollout
```

## 🔧 Feature Flags

### Core Flags
- **`DM_ENABLED`**: Master switch for DM functionality
- **`DM_MODE`**: Provider selection (`graph`, `internal`, `none`)
- **`DM_ROLLOUT_PCT`**: Percentage of users who get DMs (0-100)

### Rollout Strategy
```typescript
// Deterministic rollout based on user identifier
export function dmAllowedForUser(seed: string) {
  if (!DM_ENABLED) return false;
  const h = [...seed].reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0) >>> 0;
  return (h % 100) < DM_ROLLOUT_PCT;
}
```

## 🏗️ Architecture

### Service Boundary
```typescript
// Single entry point for all DM operations
import { sendDirectMessage } from '@/lib/messaging';

const result = await sendDirectMessage({
  toUserId: 'user_123',
  toUsername: 'username',
  message: 'Hello!'
});
```

### Provider System
- **`whop-graphql`**: Whop GraphQL API (current)
- **`internal`**: Future internal messaging system
- **`none`**: Disabled state

### Fallback Strategy
1. **Try DM first** (if enabled and provider available)
2. **Fallback to welcome link** if DM fails
3. **Always provide onboarding path** regardless of DM success

## 🧪 Testing & Diagnostics

### Schema Probe
```bash
# Check available Whop mutations
curl -s -X POST https://your-app.com/api/diagnostics/whop-schema \
  -H "x-admin-key: YOUR_ADMIN_KEY" | jq '.dmCandidates'
```

### DM Testing
```bash
# Test DM functionality
curl -s -X POST https://your-app.com/api/diagnostics/try-dm \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"recipientUsername":"testuser","message":"Hello!"}' | jq
```

### Health Check
```bash
# Check system health
curl -s https://your-app.com/api/diagnostics/health \
  -H "x-admin-key: YOUR_ADMIN_KEY" | jq '.env'
```

## 📊 Monitoring

### Vercel Logs
All DM operations are logged with structured data:
- `[messaging.sendDirectMessage]` - Main service calls
- `[whopGraph.send]` - Whop API interactions
- `[welcome.welcomeNewMember]` - Welcome flow

### Key Metrics
- DM success rate
- Fallback usage
- Provider availability
- Response times

## 🚦 Re-enabling DMs

### Step 1: Verify Whop API Access
```bash
# Check if mutations are available
curl -s -X POST https://your-app.com/api/diagnostics/whop-schema \
  -H "x-admin-key: YOUR_ADMIN_KEY" | jq '.dmCandidates'
```

Expected output:
```json
{
  "dmCandidates": {
    "sendDirectMessageToUser": true,
    "messagesSendDirectMessageToUser": true,
    "sendDirectMessage": false,
    "sendMessageToUser": false
  }
}
```

### Step 2: Enable Feature Flag
```bash
# In Vercel environment variables
DM_ENABLED=true
DM_MODE=graph
```

### Step 3: Test End-to-End
```bash
# Send a test DM
curl -s -X POST https://your-app.com/api/diagnostics/try-dm \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"recipientUsername":"testuser","message":"Test DM"}' | jq
```

Expected success:
```json
{
  "ok": true,
  "recipient": { "type": "username", "value": "testuser" },
  "result": {
    "ok": true,
    "id": "msg_123",
    "provider": "whop-graphql"
  }
}
```

## 🔒 Security

### Admin Key Protection
All diagnostics endpoints require `x-admin-key` header:
```bash
x-admin-key: YOUR_RANDOM_LONG_VALUE
```

### Environment Variable Security
- Never commit `ADMIN_KEY` to version control
- Use Vercel's encrypted environment variables
- Rotate keys regularly in production

## 🐛 Troubleshooting

### Common Issues

#### "Field doesn't exist on type 'Mutation'"
- **Cause**: Whop API schema doesn't include DM mutations
- **Solution**: Wait for Whop to enable app DM access
- **Workaround**: Use welcome link fallback

#### "Missing WHOP_API_KEY"
- **Cause**: Environment variable not set
- **Solution**: Set `WHOP_API_KEY` in Vercel
- **Check**: Use `/api/diagnostics/health` endpoint

#### "All GraphQL mutations failed"
- **Cause**: Whop API errors or rate limiting
- **Solution**: Check Vercel logs for specific errors
- **Workaround**: System automatically falls back to welcome links

### Debug Steps
1. **Check environment variables** with health endpoint
2. **Verify Whop API key** with ping endpoint
3. **Test schema introspection** for available mutations
4. **Review Vercel logs** for detailed error information
5. **Test DM functionality** with try-dm endpoint

## 📈 Rollout Strategy

### Phase 1: Disabled (Current)
- `DM_ENABLED=false`
- `DM_ROLLOUT_PCT=0`
- All users get welcome links
- System logs fallback usage

### Phase 2: Gradual Rollout
- `DM_ENABLED=true`
- `DM_ROLLOUT_PCT=10` (start with 10%)
- Monitor success rates
- Gradually increase percentage

### Phase 3: Full Rollout
- `DM_ENABLED=true`
- `DM_ROLLOUT_PCT=100`
- All users get DMs
- Fallback still available for errors

## 🔮 Future Enhancements

### Planned Features
- **Internal messaging system** (`DM_MODE=internal`)
- **Message templates** with personalization
- **Delivery tracking** and analytics
- **Rate limiting** and spam protection
- **Multi-provider support** (Whop + internal)

### Migration Path
- **No breaking changes** planned
- **Backward compatibility** maintained
- **Gradual migration** between providers
- **Feature flags** for all new functionality

## 📚 Additional Resources

### API Documentation
- [Whop GraphQL API](https://docs.whop.com/)
- [Diagnostics Endpoints](./DIAGNOSTICS.md)
- [Messaging Service](./MESSAGING.md)

### Code Examples
- [Welcome Flow](./WELCOME.md)
- [Settings Integration](./SETTINGS.md)
- [Testing Guide](./TESTING.md)

### Support
- **Internal**: Check Vercel logs and diagnostics
- **Whop**: Contact Whop support for API access
- **Development**: Use feature flags for testing
