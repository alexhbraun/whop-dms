// lib/whopConfig.ts
export type WhopConfig = {
  apiKey: string | undefined;
  webhookSecret: string | undefined;
  appId: string | undefined;
  agentUserId: string | undefined;
  companyId: string | undefined;
  mockDM: boolean;
};

export const whopConfig: WhopConfig = {
  apiKey: process.env.WHOP_API_KEY,
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  agentUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  mockDM: process.env.MOCK_DM === '1',
};

export function logWhopConfigSummary() {
  const mask = (v?: string) => (v ? `${v.length} chars` : 'MISSING');
  console.log('[WHOP CONFIG]', {
    apiKey: mask(whopConfig.apiKey),
    webhookSecret: mask(whopConfig.webhookSecret),
    appIdPresent: !!whopConfig.appId,
    agentUserIdPresent: !!whopConfig.agentUserId,
    companyIdPresent: !!whopConfig.companyId,
    mockDM: whopConfig.mockDM,
  });
}




