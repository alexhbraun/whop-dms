import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js'; // Not needed for server-side webhook, using supabaseAdmin
import Mustache from 'mustache'; // For template rendering

import { getServerSupabase } from '../../../../lib/supabaseServer'; // Adjust path as needed

const APP_BASE_URL = process.env.APP_BASE_URL;
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET;

// Placeholder for DM Template (can fetch from DB later)
const DEFAULT_DM_TEMPLATE = {
  name: "Welcome Onboarding DM",
  subject: "Welcome to {{community_name}}! Complete your onboarding.",
  body: "Hello {{member_name}},\n\nWelcome to the {{community_name}} community! To help you get started, please complete your onboarding by clicking this link:\n\n{{onboarding_link}}\n\nLooking forward to having you!\n",
};

export async function POST(req: Request) {
  const payload = await req.json();

  // Whop webhook authentication (simplified for now, implement actual signature verification)
  // const whopSignature = req.headers.get('whop-signature');
  // if (!verifyWhopSignature(payload, whopSignature)) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  console.log('[WHOP_WEBHOOK] Received webhook payload:', payload);

  if (payload.type === 'member.created' || payload.type === 'member.joined') {
    const creatorId = payload.data.community_id || payload.data.business_id;
    const memberId = payload.data.id;
    const memberName = payload.data.name || 'New Member';
    const communityName = payload.data.community_name || 'Our Community';

    if (!creatorId || !memberId) {
      console.error('[WHOP_WEBHOOK] Missing creator_id or member_id in payload.', payload.data);
      return NextResponse.json({ error: 'Missing creator_id or member_id' }, { status: 400 });
    }

    if (!APP_BASE_URL) {
      console.error('[WHOP_WEBHOOK] APP_BASE_URL environment variable is not set.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (!MAGIC_LINK_SECRET) {
      console.error('[WHOP_WEBHOOK] MAGIC_LINK_SECRET environment variable is not set.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const supabase = getServerSupabase();
      const { data: insertData, error: insertError } = await supabase
        .from('onboarding_invites')
        .insert({
          creator_id: creatorId,
          member_id: memberId,
          token: token,
          expires_at: expiresAt,
        })
        .select();

      if (insertError) {
        console.error('[WHOP_WEBHOOK] Error inserting onboarding invite:', insertError);
        return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
      }

      console.log('[WHOP_WEBHOOK] Onboarding invite created:', insertData);

      const onboardingLink = `${APP_BASE_URL}/onboarding/${creatorId}?memberId=${memberId}&t=${token}`;

      let dmTemplate = DEFAULT_DM_TEMPLATE;

      const view = {
        member_name: memberName,
        community_name: communityName,
        onboarding_link: onboardingLink,
      };
      const dmSubject = Mustache.render(dmTemplate.subject, view);
      const dmBody = Mustache.render(dmTemplate.body, view);

      console.log(`[WHOP_WEBHOOK][DM to ${memberName}] Subject: ${dmSubject}`);
      console.log(`[WHOP_WEBHOOK][DM to ${memberName}] Body: ${dmBody}`);
      console.log(`[WHOP_WEBHOOK][DM to ${memberName}] Magic Link: ${onboardingLink}`);

      return NextResponse.json({ success: true, message: 'Webhook processed, invite issued, DM logged.' });
    } catch (error) {
      console.error('[WHOP_WEBHOOK] Unexpected error processing webhook:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'Webhook received, no action taken for this event type.' });
}
