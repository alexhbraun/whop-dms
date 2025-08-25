import { NextApiRequest, NextApiResponse } from 'next';
import { URLSearchParams } from 'url';
import { logWhopConfigSummary } from '../../../lib/whopConfig';
import { getServerSupabase } from "../../../lib/supabaseServer";

interface WhopInstallation {
  community_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  creator_profile: any; // Store the entire creator profile as JSONB
  created_at?: string;
  updated_at?: string;
}

interface WhopCreatorProfile {
  id: string;
  username: string;
  name: string;
  profile_pic_url: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  logWhopConfigSummary();

  const { code, error: authError, error_description } = req.query;

  if (authError) {
    console.error('[WHOP_INSTALL] OAuth Error:', authError, error_description);
    return res.status(400).send(`OAuth Error: ${error_description || authError}`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code.');
  }

  const { WHOP_CLIENT_ID, WHOP_CLIENT_SECRET, WHOP_REDIRECT_URI } = process.env;

  if (!WHOP_CLIENT_ID || !WHOP_CLIENT_SECRET || !WHOP_REDIRECT_URI) {
    console.error('[WHOP_INSTALL] Missing environment variables for Whop OAuth.');
    return res.status(500).send('Server configuration error. Missing Whop API credentials.');
  }

  try {
    // 1. Exchange authorization code for tokens
    const params = new URLSearchParams({
      client_id: WHOP_CLIENT_ID,
      client_secret: WHOP_CLIENT_SECRET,
      code,
      redirect_uri: WHOP_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://whop.com/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Basic Auth header has been problematic, trying without for now as per previous debugging.
        // Authorization: `Basic ${Buffer.from(`${WHOP_CLIENT_ID}:${WHOP_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[WHOP_INSTALL] Token exchange failed:', errorData);
      // Log all headers for debugging
      Array.from(tokenResponse.headers.entries()).forEach(([key, value]) => {
        console.error(`[WHOP_INSTALL] Token Response Header - ${key}: ${value}`);
      });
      return res.status(tokenResponse.status).send(`Failed to exchange token: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope, token_type } = tokenData;

    if (!access_token) {
      console.error('[WHOP_INSTALL] Access token not received:', tokenData);
      return res.status(500).send('Access token not received from Whop.');
    }

    // 2. Fetch creator profile using the access token
    const creatorProfileResponse = await fetch('https://whop.com/api/v2/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!creatorProfileResponse.ok) {
      const errorData = await creatorProfileResponse.json();
      console.error('[WHOP_INSTALL] Failed to fetch creator profile:', errorData);
      return res.status(creatorProfileResponse.status).send(`Failed to fetch creator profile: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const creatorProfile: WhopCreatorProfile = await creatorProfileResponse.json();
    const community_id = creatorProfile.id; // Whop's 'me' endpoint returns the creator's ID which is effectively the community_id for a single creator app

    if (!community_id) {
      console.error('[WHOP_INSTALL] Creator ID (community_id) not found in profile:', creatorProfile);
      return res.status(500).send('Creator ID not found in Whop profile.');
    }

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 3. Save installation data to Supabase
    const supabase = getServerSupabase();
    const { data: installData, error: installError } = await supabase
      .from('whop_installations')
      .upsert(
        {
          community_id: community_id,
          access_token: access_token,
          refresh_token: refresh_token,
          token_expires_at: tokenExpiresAt,
          creator_profile: creatorProfile, // Store entire profile
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'community_id' }
      )
      .select();

    if (installError) {
      console.error('[WHOP_INSTALL] Supabase upsert error:', installError);
      return res.status(500).send(`Failed to save installation data: ${installError.message}`);
    }

    console.log('[WHOP_INSTALL] Installation successful for community:', community_id);

    // 4. Redirect to the app dashboard
    res.redirect(302, `/app?community_id=${community_id}`);

  } catch (error: any) {
    console.error('[WHOP_INSTALL] Unexpected error during installation:', error);
    return res.status(500).send(`Installation failed: ${error.message || 'Unknown error'}`);
  }
}
