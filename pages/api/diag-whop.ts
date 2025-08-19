// pages/api/diag-whop.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { whopConfig, logWhopConfigSummary } from '../../lib/whopConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const mask = (v?: string) => (v ? `${v.length} chars` : 'MISSING');
  logWhopConfigSummary();
  const summary = {
    apiKey: mask(whopConfig.apiKey),
    webhookSecret: mask(whopConfig.webhookSecret),
    appIdPresent: !!whopConfig.appId,
    agentUserIdPresent: !!whopConfig.agentUserId,
    companyIdPresent: !!whopConfig.companyId,
    mockDM: whopConfig.mockDM,
  };
  res.status(200).json({ ok: true, summary });
}




