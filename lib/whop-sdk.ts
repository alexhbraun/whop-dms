import { WhopServerSdk } from "@whop/api";

const APP_API_KEY = (process.env.WHOP_API_KEY ?? "").trim();
if (!APP_API_KEY) console.error("❌ Missing WHOP_API_KEY");

export const whopSdk = WhopServerSdk({
  appApiKey: APP_API_KEY,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || "default",
});
