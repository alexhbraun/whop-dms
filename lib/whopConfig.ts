// lib/whopConfig.ts
export const APP_BASE_URL =
  process.env.APP_BASE_URL || 'http://localhost:3000';

export const WHOP_API_BASE =
  process.env.WHOP_API_BASE || 'https://api.whop.com';

export const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID || '';
export const WHOP_CLIENT_SECRET = process.env.WHOP_CLIENT_SECRET || '';

export const WHOP_API_KEY = process.env.WHOP_API_KEY || '';
export const MOCK_DM =
  (process.env.MOCK_DM ?? '').toLowerCase() === 'true' ||
  process.env.MOCK_DM === '1';

export type WhopConfig = {
  APP_BASE_URL: string;
  WHOP_API_BASE: string;
  WHOP_CLIENT_ID: string;
  WHOP_CLIENT_SECRET: string;
  apiKey?: string;
  mockDM?: boolean;
};

export const whopConfig: WhopConfig = {
  APP_BASE_URL,
  WHOP_API_BASE,
  WHOP_CLIENT_ID,
  WHOP_CLIENT_SECRET,
  apiKey: WHOP_API_KEY || undefined,
  mockDM: MOCK_DM || undefined,
};

export default whopConfig;







