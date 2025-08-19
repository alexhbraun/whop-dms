import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const sk = process.env.SUPABASE_SERVICE_ROLE || '';
  res.status(200).json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)',
    serviceKey: sk ? `Loaded (length=${sk.length})` : '(missing)',
  });
}
