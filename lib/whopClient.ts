// lib/whopClient.ts

import { whopConfig } from './whopConfig';

export type SendDMInput = {
  toMemberId: string;
  text: string;
  senderUserId?: string;
  bizId?: string;
};

export type SendDMResult = { 
  ok: boolean; 
  status: number; 
  mock?: boolean; 
  error?: string;
  data?: any;
};

export async function sendWhopDM(input: SendDMInput): Promise<SendDMResult> {
  const mock = !!whopConfig.mockDM && !whopConfig.apiKey;

  if (mock) {
    console.log('[MOCK DM]', { 
      to: input.toMemberId, 
      from: input.senderUserId || 'default',
      text: input.text.slice(0, 160) 
    });
    return { ok: true, status: 200, mock: true };
  }

  if (!whopConfig.apiKey) return { ok: false, status: 400, error: 'Missing API key' };

  try {
    // Prepare payload based on Whop API requirements
    const payload: any = {
      recipient_user_id: input.toMemberId,
      body: input.text,
    };

    // Add sender if provided
    if (input.senderUserId) {
      payload.sender_user_id = input.senderUserId;
    }

    // Add business context if provided
    if (input.bizId) {
      payload.business_id = input.bizId;
    }

    const res = await fetch(`${whopConfig.WHOP_API_BASE}/v2/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${whopConfig.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }

    return { 
      ok: res.ok, 
      status: res.status,
      data
    };
  } catch (e: any) {
    return { ok: false, status: 500, error: e?.message || 'sendWhopDM failed' };
  }
}







