import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '../../../lib/supabaseAdmin';
import { verifyToken } from '../../../lib/token'; // Assuming you have a token verification utility

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Robust token extraction (works on Vercel + Node)
  const rawAuth =
    (Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization) ||
    (Array.isArray((req.headers as any)['x-authorization'])
      ? (req.headers as any)['x-authorization'][0]
      : (req.headers as any)['x-authorization']) ||
    (typeof req.query.token === 'string' ? req.query.token : '') ||
    (typeof (req.body as any)?.token === 'string' ? (req.body as any).token : '');

  const auth = typeof rawAuth === 'string' ? rawAuth : '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;

  if (!token) {
    return res.status(400).json({ ok: false, error: 'no token' });
  }

  const payloadResult = verifyToken(token);

  if (!payloadResult.ok) {
    return res.status(401).json({ message: `Invalid or expired token: ${payloadResult.reason}.` });
  }

  // Assuming the token payload contains community_id or similar identifier
  const community_id = (payloadResult.data as any)?.community_id; // Adjust type as per your TokenPayload

  if (!community_id) {
    return res.status(400).json({ error: 'Token missing community ID' });
  }

  const { settings } = req.body; // Expecting a 'settings' object in the request body

  if (typeof settings !== 'object' || settings === null) {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }

  try {
    const { data, error } = await supabaseAdmin.from('installations').update(
      { settings: settings }
    ).eq('community_id', community_id);

    if (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ message: 'Failed to update settings', details: error.message });
    }

    return res.status(200).json({ ok: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('Exception updating settings:', error);
    return res.status(500).json({ message: 'Internal server error', details: error.message });
  }
}

