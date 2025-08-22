import type { NextApiRequest, NextApiResponse } from "next";

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

  // CORRECT - NO Authorization header for token exchange
  const client_id_log = process.env.WHOP_CLIENT_ID ? `${process.env.WHOP_CLIENT_ID.substring(0, 4)}...${process.env.WHOP_CLIENT_ID.substring(process.env.WHOP_CLIENT_ID.length - 4)}` : 'N/A';
  const client_secret_log = process.env.WHOP_CLIENT_SECRET ? `${process.env.WHOP_CLIENT_SECRET.substring(0, 4)}...${process.env.WHOP_CLIENT_SECRET.substring(process.env.WHOP_CLIENT_SECRET.length - 4)}` : 'N/A';
  const redirect_uri_log = 'https://whop-dms.vercel.app/api/whop/install'; // This is hardcoded in the body
  const basicAuthString = Buffer.from(`${process.env.WHOP_CLIENT_ID!}:${process.env.WHOP_CLIENT_SECRET!}`).toString('base64');
  const maskedBasicAuthString = basicAuthString ? `${basicAuthString.substring(0, 8)}...${basicAuthString.substring(basicAuthString.length - 8)}` : 'N/A';
  console.log(`[WHOP_INSTALL] Attempting token exchange with: client_id=${client_id_log}, client_secret=${client_secret_log}, redirect_uri=${redirect_uri_log}, Basic Auth Header (masked): Basic ${maskedBasicAuthString}`);

  const tokenResponse = await fetch('https://whop.com/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.WHOP_CLIENT_ID!}:${process.env.WHOP_CLIENT_SECRET!}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code, // the authorization code from URL params
      redirect_uri: 'https://whop-dms.vercel.app/api/whop/install'
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

  // Return success
  return res.status(200).json({ ok: true });
}
