// pages/api/whop/install.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseServer';

// Helper: obtain redirect_uri exactly like registered on Whop
function getRedirectUri(req: NextApiRequest) {
  const base = process.env.APP_BASE_URL || `https://${req.headers.host}`;
  return `${base.replace(/\/$/, '')}/api/whop/install`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Whop will call this with ?code=...&state=... (GET). Accept POST fallback too.
    const code =
      (typeof req.query.code === 'string' && req.query.code) ||
      (typeof (req.body as any)?.code === 'string' && (req.body as any).code) ||
      '';

    const state =
      (typeof req.query.state === 'string' && req.query.state) ||
      (typeof (req.body as any)?.state === 'string' && (req.body as any).state) ||
      undefined;

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const client_id = process.env.WHOP_CLIENT_ID || process.env.WHOP_APP_ID || '';
    const client_secret = process.env.WHOP_CLIENT_SECRET || '';
    const apiBase = (process.env.WHOP_API_BASE || 'https://api.whop.com').replace(/\/$/, '');
    const redirect_uri = getRedirectUri(req);

    if (!client_id || !client_secret) {
      return res.status(500).json({ error: 'Missing WHOP client credentials on server' });
    }

    // Exchange authorization code for token
    const tokenResp = await fetch(`${apiBase}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      console.error('Whop token exchange failed', tokenResp.status, text);
      return res.status(401).json({ error: 'Token exchange failed', details: text });
    }

    const tok: any = await tokenResp.json();

    // Try to extract identifiers Whop may provide (names can vary)
    const community_id =
      tok.community_id ??
      tok.company_id ??
      tok.biz_id ??
      tok.business_id ??
      tok.data?.community_id ??
      tok.data?.company_id;

    const creator_email =
      tok.creator_email ?? tok.user?.email ?? tok.email ?? tok.data?.creator_email ?? null;

    const plan = tok.plan ?? tok.tier ?? tok.data?.plan ?? null;

    // Compute expiry (if provided)
    const expires_at =
      typeof tok.expires_in === 'number'
        ? new Date(Date.now() + tok.expires_in * 1000).toISOString()
        : null;

    // Persist installation. We only write columns that surely exist in your schema.
    // Tokens vão dentro de settings.auth (JSONB) para não quebrar o schema.
    const settingsPatch = {
      auth: {
        access_token: tok.access_token ?? null,
        refresh_token: tok.refresh_token ?? null,
        token_type: tok.token_type ?? null,
        scope: tok.scope ?? null,
        expires_at,
        state: state ?? null,
      },
    };

    if (!community_id) {
      // Sem ID ainda? Crie um registro "parcial" e os webhooks completarão depois.
      // Usamos uma chave derivada para não bloquear o fluxo.
      const tempId = `pending_${Date.now()}`;
      await supabase.from('installations').upsert(
        {
          community_id: tempId,
          creator_email,
          plan,
          active: true,
          settings: settingsPatch,
        },
        { onConflict: 'community_id' }
      );
      console.warn('OAuth install without community_id; saved as temp row', tempId);
    } else {
      await supabase.from('installations').upsert(
        {
          community_id,
          creator_email,
          plan,
          active: true,
          settings: settingsPatch,
        },
        { onConflict: 'community_id' }
      );
    }

    // UX: manda o criador pro painel do app
    res.redirect(302, '/app');
  } catch (e: any) {
    console.error('whop/oauth install error', e);
    return res.status(500).json({ error: 'server error', details: String(e?.message || e) });
  }
}
