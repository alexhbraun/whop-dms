// lib/whopConfig.ts

export type WhopConfig = {
  APP_BASE_URL: string;
  WHOP_API_BASE: string;
  WHOP_CLIENT_ID: string;
  WHOP_CLIENT_SECRET: string;
  apiKey?: string;       // if you keep an app-level key
  mockDM?: boolean;      // used by lib/whopClient.ts
};

export const whopConfig: WhopConfig = {
  APP_BASE_URL: process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || '',
  WHOP_API_BASE: process.env.WHOP_API_BASE || 'https://whop.com',
  WHOP_CLIENT_ID: process.env.WHOP_CLIENT_ID || '',
  WHOP_CLIENT_SECRET: process.env.WHOP_CLIENT_SECRET || '',
  apiKey: process.env.WHOP_API_KEY,
  mockDM: process.env.MOCK_DM === '1' || process.env.MOCK_DM === 'true',
};

export function logWhopConfigSummary(): void {
  // keep values safe—don’t print secrets
  console.log('[whopConfig]', {
    APP_BASE_URL: whopConfig.APP_BASE_URL,
    WHOP_API_BASE: whopConfig.WHOP_API_BASE,
    WHOP_CLIENT_ID: whopConfig.WHOP_CLIENT_ID ? 'set' : 'missing',
    WHOP_CLIENT_SECRET: whopConfig.WHOP_CLIENT_SECRET ? 'set' : 'missing',
    apiKey: whopConfig.apiKey ? 'set' : 'missing',
    mockDM: !!whopConfig.mockDM,
  });
}







