import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { whopConfig, logWhopConfigSummary } from '../../lib/whopConfig';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  logWhopConfigSummary();

  const { data: ping, error } = await supabaseAdmin.rpc('ping'); // optional if you have it
  return res.status(200).json({
    ok: true,
    env: {
      APP_BASE_URL: whopConfig.APP_BASE_URL,
      WHOP_REDIRECT_URI: `${whopConfig.APP_BASE_URL}/api/whop/install`,
      mockDM: Boolean(whopConfig.mockDM),
    },
    db: error ? { ok: false, error: error.message } : { ok: true, ping },
  });
}
