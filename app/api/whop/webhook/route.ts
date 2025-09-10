export const runtime = "nodejs";

/*
Debug SQL helpers for post-deploy testing:

-- Recent webhook events
select external_event_id, event_type, community_id, received_at
from public.webhook_events
order by received_at desc
limit 10;

-- Recent DM sends
select event_id, business_id as community_id, to_user, status, error, message_preview, source, created_at
from public.dm_send_log
order by created_at desc
limit 10;
*/

import { NextRequest, NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";
import { sendWelcomeDM } from "@/lib/dm";
import { getServiceClient } from "@/lib/supabase/service";
import { getBaseUrl } from "@/lib/urls";
import { DM_ENABLED } from "@/lib/feature-flags";
import { hasSentForEvent } from "@/lib/dm-db";
import { logInfo, logError } from "@/lib/log";

type WebhookEvent = {
  id: string;
  type: string;
  data: {
    business_id?: string;
    company_id?: string;
    community_id?: string;
    experience_id?: string;
    member_id?: string;
    membership_id?: string;
    user?: { id?: string; username?: string };
    member?: { id?: string; username?: string };
  };
};

export async function POST(req: NextRequest) {
  try {
    console.log(`[WHOP-WEBHOOK] Webhook called at ${new Date().toISOString()}`);
    
    // Read raw JSON body as text, parse into payload
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody) as WebhookEvent;
    
    console.log(`[WHOP-WEBHOOK] Received event: ${payload.type} (${payload.id})`);
    console.log(`[WHOP-WEBHOOK] Event data:`, JSON.stringify(payload, null, 2));

    // LOG FIRST - Immediately persist into webhook_events using service client
    try {
      const sb = getServiceClient();
      const communityId = payload.data?.community_id || payload.data?.business_id || payload.data?.company_id;
      
      const webhookRow = {
        external_event_id: payload?.id ?? `manual_${Date.now()}`,
        event_type: payload?.type ?? 'unknown',
        community_id: communityId,
        payload: payload,
        received_at: new Date().toISOString(),
      };

      const { error } = await sb.from("webhook_events").insert(webhookRow);
      
      if (error) {
        // Check if it's a duplicate external_event_id error
        if (error.code === '23505' && error.message?.includes('external_event_id')) {
          console.log("WEBHOOK_DUPLICATE", { 
            ts: Date.now(), 
            event: payload?.type, 
            externalEventId: payload?.id,
            communityId: communityId
          });
          // Return success for duplicate events (retry/duplicate)
          return NextResponse.json({ ok: true, debug: 'duplicate-event' }, { status: 200 });
        }
        console.error("WEBHOOK_INSERT_FAIL", error);
      } else {
        console.log("WEBHOOK_HIT", { 
          ts: Date.now(), 
          event: payload?.type, 
          communityId: communityId,
          externalEventId: payload?.id,
          inserted: true 
        });
      }
    } catch (dbError) {
      console.error("WEBHOOK_INSERT_EXCEPTION", dbError);
      // Continue processing even if logging fails
    }

    // Handle specific event types
    const isOnboardingEvent = payload.type === "membership_experience_claimed" || 
                             payload.type === "membership_went_valid" || 
                             payload.type === "app_membership_went_valid";
    
    if (isOnboardingEvent) {
      const communityId = payload.data?.community_id || payload.data?.business_id || payload.data?.company_id;
      
      logInfo("dm.onboarding.trigger", { 
        eventType: payload.type, 
        eventId: payload.id,
        businessId: communityId 
      });
      
      const already = await hasSentForEvent(payload.id);
      if (already) {
        logInfo("dm.onboarding.skip", { 
          reason: "already_processed", 
          eventType: payload.type,
          eventId: payload.id 
        });
        return NextResponse.json({ ok: true, skipped: "duplicate_event_id" });
      }

      // Check if DM onboarding is enabled
      if (!DM_ENABLED) {
        logInfo("dm.onboarding.skip", { 
          reason: "flag_disabled", 
          eventType: payload.type,
          eventId: payload.id 
        });
        return NextResponse.json({ ok: true, note: "DM disabled by flag" });
      }

      // Extract data
      const memberId = payload.data?.member_id || payload.data?.membership_id;
      
      const rawUser = payload.data?.user || payload.data?.member || {};
      const username = rawUser.username?.toString().trim();
      const userId = rawUser.id?.toString().trim();

      if (!username && !userId) {
        logError("dm.onboarding.no_recipient", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId: communityId 
        });
        return NextResponse.json({ ok: true, note: "no recipient" });
      }

      if (!communityId) {
        logError("dm.onboarding.no_community_id", { 
          eventType: payload.type,
          eventId: payload.id 
        });
        return NextResponse.json({ ok: true, note: "no community_id" });
      }

      if (!memberId) {
        logError("dm.onboarding.no_member_id", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId: communityId 
        });
        return NextResponse.json({ ok: true, note: "no member_id" });
      }

      try {
        // Build welcome message
        const baseUrl = getBaseUrl();
        const onboardingUrl = `${baseUrl}/onboarding/${communityId}?member=${memberId}`;
        const message = `🎉 Welcome to the community! Complete your onboarding here: ${onboardingUrl}`;

        // Send DM using sendWelcomeDM function
        const result = await sendWelcomeDM({
          businessId: communityId,
          communityId: communityId,
          toUserIdOrUsername: username || userId,
          templateOverride: message,
          eventId: payload.id || `webhook_${Date.now()}`, // Use Whop's event ID for consistency
          context: "onboarding"
        });
        
        logInfo("dm.onboarding.success", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId: communityId,
          result 
        });
        return NextResponse.json({ ok: true, result });
      } catch (e: any) {
        logError("dm.onboarding.failed", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId: communityId,
          error: e?.message 
        });
        return NextResponse.json({ ok: true, error: "send failed" });
      }
    }

    // TEMPORARY FOR DEBUG: regardless of downstream logic, end the handler with debug return
    return NextResponse.json({ ok: true, debug: 'logged-first' }, { status: 200 });
  } catch (error) {
    console.error("[WHOP-WEBHOOK] Unexpected error:", error);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}