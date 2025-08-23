import type { NextApiRequest, NextApiResponse } from "next";
import { sendWhopDM } from "../../../lib/whopClient";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type SuccessResponse = {
  ok: true;
};

type ErrorResponse = {
  ok: false;
  reason?: string; // Make reason optional or remove if not always present
  diagnostics?: any[]; // Make diagnostics optional or remove if not always present
  error?: string;
  status?: number;
  body?: string;
};

function diag(label: string, data: any) {
  const safe = JSON.stringify(data, null, 2);
  console.log(`[WHOP_INSTALL] ${label}: ${safe.length > 1800 ? safe.slice(0, 1800) + '...<truncated>' : safe}`);
}

// --- Main Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, reason: 'method_not_allowed' });
  }

  const code = req.query.code as string | undefined;
  if (!code) {
    return res.status(400).json({ ok: false, reason: 'missing_code' });
  }
  console.log(`[WHOP_INSTALL] Received authorization code: ${code ? `${code.substring(0, 8)}...${code.substring(code.length - 8)}` : 'N/A'}`);

  const REDIRECT_URI = process.env.WHOP_REDIRECT_URI || `https://${req.headers.host}/api/whop/install`;

  const client_id_log = process.env.WHOP_CLIENT_ID ? `${process.env.WHOP_CLIENT_ID.substring(0, 4)}...${process.env.WHOP_CLIENT_ID.substring(process.env.WHOP_CLIENT_ID.length - 4)}` : 'N/A';
  const client_secret_log = process.env.WHOP_CLIENT_SECRET ? `${process.env.WHOP_CLIENT_SECRET.substring(0, 4)}...${process.env.WHOP_CLIENT_SECRET.substring(process.env.WHOP_CLIENT_SECRET.length - 4)}` : 'N/A';
  const basicAuthString = Buffer.from(`${process.env.WHOP_CLIENT_ID!}:${process.env.WHOP_CLIENT_SECRET!}`).toString('base64');
  const maskedBasicAuthString = basicAuthString ? `${basicAuthString.substring(0, 8)}...${basicAuthString.substring(basicAuthString.length - 8)}` : 'N/A';
  console.log(`[WHOP_INSTALL] Attempting token exchange with: client_id=${client_id_log}, client_secret=${client_secret_log}, redirect_uri=${REDIRECT_URI}, Basic Auth Header (masked): Basic ${maskedBasicAuthString}`);

  const tokenResponse = await fetch('https://whop.com/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.WHOP_CLIENT_ID!}:${process.env.WHOP_CLIENT_SECRET!}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code, // the authorization code from URL params
      redirect_uri: REDIRECT_URI
    })
  });

  // Log the response for debugging
  console.log('Token exchange response:', tokenResponse.status);
  const responseBody = await tokenResponse.text();
  console.log('Response body:', responseBody);

  if (!tokenResponse.ok) {
    return res.status(500).json({
      ok: false,
      error: 'Token exchange failed',
      status: tokenResponse.status,
      body: responseBody
    });
  }

  // Parse the successful response
  const tokenData = JSON.parse(responseBody);
  console.log('Token received:', tokenData.access_token ? 'YES' : 'NO');

  if (!tokenData.access_token) {
    console.error('[WHOP_INSTALL] Token exchange did not return an access_token.', tokenData);
    return res.status(500).json({ ok: false, error: 'Token exchange failed: No access token.', body: responseBody });
  }

  // --- 2. Fetch Creator Profile ---
  console.log('[WHOP_INSTALL] Fetching creator profile...');
  const meResponse = await fetch('https://whop.com/api/v2/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
    },
  });

  const meData = await meResponse.json();
  console.log('[WHOP_INSTALL] Whop /v2/me response:', meData);

  if (!meResponse.ok || !meData.member || !meData.member.id || !meData.member.community_id) {
    console.error('[WHOP_INSTALL] Failed to fetch creator profile or missing required data.', meData);
    return res.status(500).json({
      ok: false,
      error: 'Failed to retrieve creator profile or community info.',
      status: meResponse.status,
      body: JSON.stringify(meData),
    });
  }

  const memberId = meData.member.id;
  const communityId = meData.member.community_id;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString(); // Calculate expiry

  // --- 3. Save Installation Data to Supabase ---
  console.log('[WHOP_INSTALL] Saving installation data to Supabase...');
  const { data: installData, error: installError } = await supabaseAdmin
    .from('whop_installations')
    .upsert(
      {
        community_id: communityId,
        member_id: memberId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: 'member_id', ignoreDuplicates: false }
    )
    .select('*')
    .single();

  if (installError) {
    console.error('[WHOP_INSTALL] Supabase installation save error:', installError);
    return res.status(500).json({ ok: false, error: 'Failed to save installation data.' });
  }
  console.log('[WHOP_INSTALL] Installation data saved to Supabase.', installData);

  // --- 4. Construct and Send Questions via Whop DM ---
  const questionsMessage = `Welcome to the community! To help us get to know you better, please answer a few questions:\n\n1. What's your #1 goal?\n2. What would make this community a win for you?\n3. Anything else?`;

  console.log(`[WHOP_INSTALL] Sending welcome DM to member ${memberId}...`);
  const dmResult = await sendWhopDM({
    toMemberId: memberId,
    text: questionsMessage,
  });

  if (!dmResult.ok) {
    console.error('[WHOP_INSTALL] Failed to send welcome DM:', dmResult.error);
    // Decide if this should be a fatal error or just logged
  }
  console.log('[WHOP_INSTALL] Welcome DM send result:', dmResult);

  // --- 5. Redirect ---
  console.log('[WHOP_INSTALL] Redirecting to dashboard...');
  res.setHeader('Location', `/dashboard/settings?installed=1&community_id=${communityId}`);
  return res.status(302).json({ ok: true });
}
