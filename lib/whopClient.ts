// lib/whopClient.ts
import { whopConfig } from './whopConfig';

export type SendDMInput = {
  toMemberId: string;
  companyId: string;
  agentUserId?: string;
  text: string;
};

export type SendDMResult = { ok: boolean; status: number; mock: boolean; body?: any };

export async function sendWhopDM(input: SendDMInput): Promise<SendDMResult> {
  if (whopConfig.mockDM || !whopConfig.apiKey) {
    console.log('[MOCK DM]', { to: input.toMemberId, text: input.text.slice(0, 160) });
    return { ok: true, status: 200, mock: true };
  }

  // Placeholder external call — replace with official Whop Messages API endpoint when finalized.
  // For now we call our internal API `/api/send-welcome?dryRun=1` which should return 200 if the message composes OK.
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-welcome?dryRun=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${whopConfig.apiKey}` },
    body: JSON.stringify({
      memberId: input.toMemberId,
      companyId: input.companyId,
      agentUserId: input.agentUserId ?? whopConfig.agentUserId,
      text: input.text,
    }),
  });
  const body = await res.text().catch(() => undefined);
  return { ok: res.ok, status: res.status, mock: false, body };
}






