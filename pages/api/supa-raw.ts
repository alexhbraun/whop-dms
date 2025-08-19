import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const keyHadWhitespace = /\s/.test(key);

  let status = 0, body: any = null, error: string | null = null;

  try {
    const r = await fetch(`${url}/rest/v1/settings?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    status = r.status;
    body = await r.text();
  } catch (e: any) {
    error = e?.message || String(e);
  }

  res.status(200).json({
    url,
    keyLength: key.length,
    keyHadWhitespace,
    status,
    error,
    body,
  });
}
