// lib/whopClient.ts

import { whopConfig } from './whopConfig';

export type SendDMInput = {
  toMemberId: string;
  text: string;
};

export type SendDMResult = { ok: boolean; status: number; mock?: boolean; error?: string };

export async function sendWhopDM(input: SendDMInput): Promise<SendDMResult> {
  const mock = !!whopConfig.mockDM && !whopConfig.apiKey;

  if (mock) {
    console.log('[MOCK DM]', { to: input.toMemberId, text: input.text.slice(0, 160) });
    return { ok: true, status: 200, mock: true };
  }

  if (!whopConfig.apiKey) return { ok: false, status: 400, error: 'Missing API key' };

  try {
    const res = await fetch(`${whopConfig.WHOP_API_BASE}/api/dms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${whopConfig.apiKey}`,
      },
      body: JSON.stringify({ to: input.toMemberId, text: input.text }),
    });

    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, status: 500, error: e?.message || 'sendWhopDM failed' };
  }
}







