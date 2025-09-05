// lib/whop-sdk.ts
import { WhopServerSdk } from "@whop/api";

// Load the key from env
const APP_API_KEY =
  process.env.WHOP_API_KEY ??
  process.env.WHOP_APP_API_KEY ?? // optional fallback
  "";

if (!APP_API_KEY) {
  console.warn("⚠️ WHOP API key not set in environment");
}

export const whopSdk = WhopServerSdk({
  appApiKey: APP_API_KEY, // ✅ IMPORTANT: must be appApiKey
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || "default",
});
