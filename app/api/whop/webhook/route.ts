export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";
import { sendAndLogDM } from "@/lib/dm";
import { getServiceDb } from "@/lib/db/client";
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

    // Immediately persist into webhook_events
    try {
      const db = getServiceDb();
      await db.from("webhook_events").insert({
        event_type: payload.type || 'unknown',
        received_at: new Date().toISOString(),
        raw: payload,
        business_id: payload.data?.business_id || payload.data?.company_id
      });
    } catch (dbError) {
      console.error("Failed to persist webhook event:", dbError);
      // Continue processing even if logging fails
    }

    // Handle specific event types
    const isOnboardingEvent = payload.type === "membership_experience_claimed" || 
                             payload.type === "membership_went_valid" || 
                             payload.type === "app_membership_went_valid";
    
    if (isOnboardingEvent) {
      logInfo("dm.onboarding.trigger", { 
        eventType: payload.type, 
        eventId: payload.id,
        businessId: payload.data?.business_id || payload.data?.company_id 
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
      const businessId = payload.data?.business_id || payload.data?.company_id;
      const memberId = payload.data?.member_id || payload.data?.membership_id;
      
      const rawUser = payload.data?.user || payload.data?.member || {};
      const username = rawUser.username?.toString().trim();
      const userId = rawUser.id?.toString().trim();

      if (!username && !userId) {
        logError("dm.onboarding.no_recipient", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId 
        });
        return NextResponse.json({ ok: true, note: "no recipient" });
      }

      if (!businessId) {
        logError("dm.onboarding.no_business_id", { 
          eventType: payload.type,
          eventId: payload.id 
        });
        return NextResponse.json({ ok: true, note: "no business_id" });
      }

      if (!memberId) {
        logError("dm.onboarding.no_member_id", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId 
        });
        return NextResponse.json({ ok: true, note: "no member_id" });
      }

      try {
        // Build welcome message
        const baseUrl = getBaseUrl();
        const onboardingUrl = `${baseUrl}/onboarding/${businessId}?member=${memberId}`;
        const message = `🎉 Welcome to the community! Complete your onboarding here: ${onboardingUrl}`;

        // Send DM using new sendAndLogDM function
        const result = await sendAndLogDM({
          businessId,
          toUser: { username, id: userId },
          message,
          eventId: payload.id || `webhook_${Date.now()}`,
          source: 'webhook'
        });
        
        logInfo("dm.onboarding.success", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId,
          result 
        });
        return NextResponse.json({ ok: true, result });
      } catch (e: any) {
        logError("dm.onboarding.failed", { 
          eventType: payload.type,
          eventId: payload.id,
          businessId,
          error: e?.message 
        });
        return NextResponse.json({ ok: true, error: "send failed" });
      }
    }

    // For other event types, simply return success
    return NextResponse.json({ ok: true, ignored: true });
  } catch (error) {
    console.error("[WHOP-WEBHOOK] Unexpected error:", error);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}