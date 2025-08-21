// lib/whopClient.ts
import whopConfig from './whopConfig';

export type SendDMInput = { toMemberId: string; text: string };
export type SendDMResult = { ok: boolean; status: number; mock?: boolean; error?: string };

export async function sendWhopDM(input: SendDMInput): Promise<SendDMResult> {
  const mock = !!whopConfig.mockDM && !whopConfig.apiKey;

  if (mock) {
    console.log('[MOCK DM]', { to: input.toMemberId, text: input.text.slice(0, 160) });
    return { ok: true, status: 200, mock: true };
  }

  const apiKey = whopConfig.apiKey || process.env.WHOP_API_KEY || '';
  if (!apiKey) return { ok: false, status: 0, error: 'WHOP_API_KEY missing' };

  const res = await fetch(`${whopConfig.WHOP_API_BASE}/v2/dms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to_member_id: input.toMemberId,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text || 'sendWhopDM failed' };
  }
  return { ok: true, status: res.status };
}







