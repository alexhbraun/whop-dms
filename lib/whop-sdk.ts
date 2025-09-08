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

// For DM sending, we need to use withUser() to set the x-on-behalf-of header
export function getWhopSdkWithAgent() {
  const sdk = getWhopSdk();
  const { agentUserId } = getAgentAndCompany();
  return sdk.withUser(agentUserId);
}
