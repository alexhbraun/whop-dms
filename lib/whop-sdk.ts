// lib/whop-sdk.ts
import { WhopServerSdk } from "@whop/api";

const APP_API_KEY = process.env.WHOP_API_KEY ?? "";

if (!APP_API_KEY) {
  console.error("❌ Missing WHOP_API_KEY env variable");
}

export const whopSdk = WhopServerSdk({
  appApiKey: APP_API_KEY,  // ✅ Must use appApiKey, not apiKey
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || "default",
});
