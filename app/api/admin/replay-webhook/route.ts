import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { sendWelcomeDM } from "@/lib/dm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function checkSecret(req: NextRequest): { ok: boolean; error?: string; status?: number } {
  const envSecret = process.env.ADMIN_DASH_SECRET;
  if (!envSecret) {
    return { ok: false, error: "ADMIN_DASH_SECRET not set", status: 500 };
  }

  const headerSecret = req.headers.get("x-admin-secret");
  if (!headerSecret) {
    return { ok: false, error: "x-admin-secret header required", status: 401 };
  }

  if (envSecret.trim() !== headerSecret.trim()) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const auth = checkSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const { externalEventId, id } = await req.json();
    
    if (!externalEventId && !id) {
      return NextResponse.json({ 
        ok: false, 
        error: "Either externalEventId or id is required" 
      }, { status: 400 });
    }

    const sb = getServiceClient();
    
    // Load the webhook row
    let query = sb.from("webhook_events").select("*");
    if (externalEventId) {
      query = query.eq("external_event_id", externalEventId);
    } else {
      query = query.eq("id", id);
    }
    
    const { data: webhookRow, error: fetchError } = await query.single();
    
    if (fetchError || !webhookRow) {
      return NextResponse.json({ 
        ok: false, 
        error: "Webhook event not found",
        diag: { externalEventId, id, fetchError: fetchError?.message }
      }, { status: 404 });
    }

    // Validate event type
    const supportedEventTypes = ["membership.went_valid", "app_membership.went_valid", "membership_experience_claimed"];
    if (!supportedEventTypes.includes(webhookRow.event_type)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Event type not supported for replay",
        diag: { eventType: webhookRow.event_type, supportedTypes: supportedEventTypes }
      }, { status: 400 });
    }

    // Extract user info from payload
    const payload = webhookRow.payload;
    const data = payload?.data || {};
    
    // Handle both nested {user:{id,username}} and flat legacy payloads
    const user = data.user || {};
    const userId = user.id || data.user_id;
    const username = user.username || data.username;
    
    if (!userId && !username) {
      return NextResponse.json({ 
        ok: false, 
        error: "No user ID or username found in webhook payload",
        diag: { 
          payload: JSON.stringify(payload, null, 2),
          extractedUser: { userId, username }
        }
      }, { status: 400 });
    }

    const communityId = webhookRow.community_id;
    if (!communityId) {
      return NextResponse.json({ 
        ok: false, 
        error: "No community_id found in webhook",
        diag: { webhookRow }
      }, { status: 400 });
    }

    // Call the same helper used by the real webhook handler
    try {
      console.log("DM_PIPELINE_REPLAY_START", { 
        communityId, 
        toUser: userId || username, 
        eventId: webhookRow.external_event_id,
        eventType: webhookRow.event_type
      });

      const result = await sendWelcomeDM({
        businessId: communityId,
        communityId: communityId,
        toUserIdOrUsername: userId || username,
        eventId: webhookRow.external_event_id,
        context: "replay"
      });

      console.log("DM_PIPELINE_REPLAY_OK", { 
        communityId, 
        toUser: userId || username, 
        eventId: webhookRow.external_event_id,
        result
      });

      return NextResponse.json({
        ok: true,
        replayed: true,
        eventId: webhookRow.external_event_id,
        communityId,
        toUser: userId || username,
        result
      });

    } catch (replayError: any) {
      console.error("DM_PIPELINE_REPLAY_FAIL", { 
        communityId, 
        toUser: userId || username, 
        eventId: webhookRow.external_event_id,
        error: replayError?.message
      });

      return NextResponse.json({
        ok: false,
        error: "Replay failed",
        diag: {
          communityId,
          toUser: userId || username,
          eventId: webhookRow.external_event_id,
          error: replayError?.message,
          stack: replayError?.stack
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("REPLAY_WEBHOOK_ERROR", error);
    return NextResponse.json({
      ok: false,
      error: "Internal server error",
      diag: { error: error?.message }
    }, { status: 500 });
  }
}
