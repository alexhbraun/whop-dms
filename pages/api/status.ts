import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseServer';
import { logWhopConfigSummary } from '../../lib/whopConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  logWhopConfigSummary();

  const rawAnonServer = process.env.SUPABASE_ANON_KEY_SERVER || '';
  const rawAnonPublic = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const anonServer = rawAnonServer.trim();
  const anonPublic = rawAnonPublic.trim();

  let using = "none";
  if (anonServer) {
    using = "SUPABASE_ANON_KEY_SERVER";
  } else if (anonPublic) {
    using = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  }

  let ping: any = null;
  try {
    const { data, error } = await supabase.from('settings').select('id').limit(1);
    ping = { ok: !error, error: error?.message || null, data };
  } catch (e: any) {
    ping = { ok: false, thrown: e?.message || String(e) };
  }

  res.status(200).json({
    env: {
      using,
      SERVER_keyLength: anonServer.length,
      NEXT_PUBLIC_keyLength: anonPublic.length,
    },
    ping,
  });
}
