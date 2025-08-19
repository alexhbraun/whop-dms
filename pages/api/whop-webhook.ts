import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import getRawBody from 'raw-body';
import { signToken } from '../../lib/token';
import supabaseAdmin from '../../lib/supabaseAdmin';

export const config = { api: { bodyParser: false }, runtime: 'nodejs' };

const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  let rawBodyBuffer: Buffer;
  try {
    rawBodyBuffer = await getRawBody(req);
  } catch (err) {
    console.error('Error reading raw body:', err);
    return res.status(400).json({ message: 'Error reading request body' });
  }

  let body: any; // This will hold the parsed JSON object

  // --- MOCK switch (bypass signature) ---
  if (process.env.MOCK_WEBHOOK === '1') {
    try {
      body = JSON.parse(rawBodyBuffer.toString('utf8')); // Always parse from rawBodyBuffer
      console.log('[MOCK WEBHOOK] raw keys:', Object.keys(body || {}));
      console.log('[MOCK WEBHOOK] has data wrapper:', !!body?.data);
    } catch (error) {
      console.error('Error parsing mock webhook body:', error);
      return res.status(400).json({ message: 'Invalid JSON body for mock webhook' });
    }
  } else {
    // --- REAL WEBHOOK path (existing raw-body + signature verification) ---
    const signature = req.headers['whop-signature'];
    if (!signature) {
      return res.status(400).json({ message: 'Webhook signature missing' });
    }

    const hmac = crypto.createHmac('sha256', WHOP_WEBHOOK_SECRET);
    hmac.update(rawBodyBuffer);
    const digest = hmac.digest('hex');

    if (digest !== signature) {
      console.error('Webhook signature mismatch', { provided: signature, expected: digest });
      return res.status(401).json({ message: 'Webhook signature mismatch' });
    }

    try {
      body = JSON.parse(rawBodyBuffer.toString('utf8')); // Parse from rawBodyBuffer after verification
    } catch (error) {
      console.error('Error parsing webhook body:', error);
      return res.status(400).json({ message: 'Invalid JSON body' });
    }
  }

  // --- ALWAYS normalize exactly like above: ---
  const raw = body; // 'body' is already the parsed JSON object
  const type = raw?.type || raw?.event; // support older 'event' key
  const data = raw?.data ?? raw ?? {};       // if no data wrapper, use raw
  const { community_id, member_id, member_name } = data as {
    community_id?: string;
    member_id?: string;
    member_name?: string;
  };

  // Guard and continue…
  if (!type) {
    console.log('[WEBHOOK] missing type. raw:', raw);
    return res.status(400).json({ message: 'missing type' });
  }
  if (!community_id || !member_id) {
    console.log('[WEBHOOK] missing fields', { community_id, member_id, member_name, data });
    return res.status(400).json({ message: 'missing required fields' });
  }

  console.log('[WEBHOOK] normalized event:', { type, community_id, member_id, member_name });

  if (type !== 'membership.went_valid') {
    return res.status(200).json({ message: `Event type ${type} not handled` });
  }

  // 1. Load settings (by community_id) for welcome_template and template_version
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('settings')
    .select('welcome_template, questions, template_version')
    .eq('community_id', community_id)
    .single();

  if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching settings:', settingsError);
    return res.status(500).json({ message: 'Error fetching settings' });
  }

  if (!settings) {
    console.warn('[WEBHOOK] Settings not found for community_id:', community_id, 'Using fallback values.');
  }

  const templateVersion = settings?.template_version || 'v1';
  const welcomeTemplate = settings?.welcome_template || 'Welcome {{memberName}} to {{communityName}}!';
  const questions = settings?.questions || [];

  console.log('[WEBHOOK] using version:', templateVersion, 'community:', community_id, 'member:', member_id);

  // 2. Deduplicate via dm_sends
  const { data: existingDm, error: dmError } = await supabaseAdmin
    .from('dm_sends')
    .select('id')
    .eq('community_id', community_id)
    .eq('member_id', member_id)
    .eq('template_version', templateVersion) // Dedupe based on template version
    .single();

  if (dmError && dmError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error checking existing DM send:', dmError);
    return res.status(500).json({ message: 'Error checking DM sends' });
  }

  if (existingDm) {
    return res.status(200).json({ message: 'DM already sent for this member and template version.' });
  }

  // 3. Build magic link token
  const payload = { community_id, member_id, exp: Math.floor(Date.now() / 1000) + (60 * 60) }; // Token valid for 1 hour
  console.log('[MAGIC PAYLOAD KEYS]', Object.keys(payload));
  const token = signToken(payload, WHOP_WEBHOOK_SECRET);
  const hdrProto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const hdrHost  = (req.headers.host as string) || 'localhost:3000';
  const envBase  = process.env.NEXT_PUBLIC_BASE_URL; // e.g. http://localhost:3000 in dev
  const baseUrl  = envBase ?? `${hdrProto}://${hdrHost}`;
  console.log('[BASE URL]', { envBase, hdrProto, hdrHost, baseUrl });

  const sendWelcomeUrl = `${baseUrl}/api/send-welcome`;

  const magicLink = `${baseUrl}/welcome?token=${token}`;
  console.log('[MAGIC LINK]', magicLink);

  // 4. Render welcome message
  const renderedMessage = welcomeTemplate
    .replace(/\{\{memberName\}\}/g, member_name || 'there')
    .replace(/\{\{communityName\}\}/g, community_id); // Assuming community_id can serve as communityName for now

  const messageWithLink = `${renderedMessage}\n\nClick here to get started: ${magicLink}`;

  // 5. Call internal /api/send-welcome
  try {
    const sendWelcomeResponse = await fetch(sendWelcomeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id,
        community_id,
        message: messageWithLink,
        template_version: templateVersion,
      }),
    });

    if (!sendWelcomeResponse.ok) {
      const errorText = await sendWelcomeResponse.text();
      throw new Error(`Failed to send welcome DM: ${errorText}`);
    }

    // 6. On success, insert into dm_sends
    const { error: insertDmError } = await supabaseAdmin.from('dm_sends').insert([
      {
        community_id,
        member_id,
        template_version: templateVersion,
      },
    ]);

    if (insertDmError) {
      console.error('Error inserting DM send record:', insertDmError);
      // Note: We proceed with success even if DM record insert fails, as the DM was likely sent.
    }

    res.status(200).json({ message: 'Webhook processed, welcome DM triggered.' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Internal server error processing webhook.' });
  }
}
