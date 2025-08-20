// /pages/api/lead-submit.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const Body = z.object({
  member_id: z.string().optional(),
  member_name: z.string().optional(),
  email: z.string().email(),
  q1_response: z.string().optional().nullable(),
  q2_response: z.string().optional().nullable(),
  q3_response: z.string().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() });
  }

  // ✅ all variables now exist in scope
  const { member_id, member_name, email, q1_response, q2_response, q3_response } = parsed.data;

  const payload = {
    member_id: member_id ?? null,
    member_name: member_name ?? null,
    email,
    q1_response: q1_response ?? null,
    q2_response: q2_response ?? null,
    q3_response: q3_response ?? null,
  };

  // TODO: persist payload (DB/API)
  // await saveLead(payload);

  return res.status(200).json({ ok: true });
}

// Ensure body parsing is enabled (remove this if you intentionally disabled it elsewhere)
export const config = { api: { bodyParser: true } };
