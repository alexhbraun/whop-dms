import { WhopServerSdk } from "@whop/api";

export function getWhopSdk() {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error("WHOP_API_KEY missing");
  return WhopServerSdk({ 
    appApiKey: apiKey,
    appId: "default" // Use default app ID
  }); // server-side app key only
}

// Helper to get agent & company ids (server-side)
export function getAgentAndCompany() {
  const agentUserId = process.env.WHOP_AGENT_USER_ID; // e.g., user_XXXX
  const companyId   = process.env.WHOP_COMPANY_ID;    // e.g., biz_XXXX
  if (!agentUserId || !companyId)
    throw new Error("WHOP_AGENT_USER_ID or WHOP_COMPANY_ID missing");
  return { agentUserId, companyId };
}

// Legacy export for backward compatibility (will be removed)
export const whopSdk = {
  withUser: () => {
    throw new Error("withUser() is deprecated. Use getWhopSdk() instead.");
  }
};
