export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";
import { sendWelcomeDM } from "@/lib/dm";
import { createClient } from "@supabase/supabase-js";
import { getBaseUrl } from "@/lib/urls";
import { DM_ENABLED } from "@/lib/feature-flags";
import { hasSentForEvent } from "@/lib/dm-db";

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type MemberCreated = {
  id: string;
  type: "member.created" | "membership_went_valid";
  data: {
    business_id: string;
    experience_id?: string;
    member_id: string;
    user?: { id?: string; username?: string };
  };
};

export async function POST(req: NextRequest) {
  try {
    console.log(`[WHOP-WEBHOOK] Webhook called at ${new Date().toISOString()}`);
    console.log(`[WHOP-WEBHOOK] Headers:`, Object.fromEntries(req.headers.entries()));
    
    const event = (await req.json()) as MemberCreated;
    
    console.log(`[WHOP-WEBHOOK] Received event: ${event.type} (${event.id})`);
    console.log(`[WHOP-WEBHOOK] Event data:`, JSON.stringify(event, null, 2));

    // Idempotency check
    const supabase = getSupabaseClient();
    const { data: existing } = await supabase
      .from("dm_send_log")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existing) {
      console.log(`[WHOP-WEBHOOK] Event ${event.id} already processed, skipping`);
      return NextResponse.json({ ok: true, note: "already processed" });
    }

    const { business_id, experience_id, member_id } = event.data;

    // Handle member.created events OR membership_went_valid events
    if (event.type === "member.created" || event.type === "membership_went_valid") {
      const already = await hasSentForEvent(event.id);
      if (already) {
        console.log(`[WHOP-WEBHOOK] Event ${event.id} already processed, skipping`);
        return NextResponse.json({ ok: true, skipped: "duplicate_event_id" });
      }

      const rawUser = event.data?.user || {};
      const recipient =
        (rawUser.username ?? "").toString().trim() ||
        (rawUser.id ?? "").toString().trim();

      if (!recipient) {
        console.log(`[WHOP-WEBHOOK] No recipient found for event ${event.id}`);
        return NextResponse.json({ ok: true, note: "no recipient" });
      }

      if (!DM_ENABLED) {
        console.log(`[WHOP-WEBHOOK] DM disabled by flag for event ${event.id}`);
        return NextResponse.json({ ok: true, note: "DM disabled by flag" });
      }

      try {
        const result = await sendWelcomeDM({
          businessId: business_id,
          toUserIdOrUsername: recipient,
          templateOverride: buildWelcomeDm({ business_id, member_id }),
          eventId: event.id
        });
        
        console.log(`[WHOP-WEBHOOK] DM sent successfully for event ${event.id}:`, result);
        return NextResponse.json({ ok: true, result });
      } catch (e: any) {
        console.error(`[WHOP-WEBHOOK] DM send failed for event ${event.id}:`, e?.message);
        return NextResponse.json({ ok: true, error: "send failed" });
      }
    }

    // Legacy handling for other event types (if any)
    return NextResponse.json({ ok: true, note: "event type not handled" });
  } catch (error) {
    console.error("[WHOP-WEBHOOK] Unexpected error:", error);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}

function buildWelcomeDm({ business_id, member_id }: { business_id: string; member_id: string }) {
  const baseUrl = getBaseUrl();
  const onboardingUrl = `${baseUrl}/onboarding/${business_id}?member=${member_id}`;
  
  return `🎉 Welcome to the community! Complete your onboarding here: ${onboardingUrl}`;
}

async function lookupCachedUser(business_id: string, member_id: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("user_identity_map")
    .select("user_id, username")
    .eq("business_id", business_id)
    .eq("member_id", member_id)
    .maybeSingle();
  
  return data?.user_id ?? data?.username ?? null;
}

async function cacheUser(business_id: string, member_id: string, toUser: string) {
  const supabase = getSupabaseClient();
  const patch = toUser.startsWith("user_")
    ? { user_id: toUser, username: null }
    : { user_id: null, username: toUser };

  await supabase
    .from("user_identity_map")
    .upsert(
      { business_id, member_id, ...patch },
      { onConflict: "business_id,member_id" }
    );
}

async function lookupViaExperience(experience_id: string, member_id: string) {
  try {
    const whop = getWhopSdk();
    const result = await whop.experiences.listUsersForExperience({
      experienceId: experience_id,
      searchQuery: member_id, // heuristic: try member_id
      first: 5,
    });
    
    const node = result?.users?.nodes?.[0];
    return node?.id ?? node?.username ?? null;
    } catch (error) {
    console.warn(`[WHOP-WEBHOOK] Failed to lookup user via experience ${experience_id}:`, error);
    return null;
  }
}

async function log(
  event_id: string,
  business_id: string,
  to_user: string,
  status: string,
  message_preview?: string,
  error?: string
) {
  const supabase = getSupabaseClient();
  await supabase.from("dm_send_log").insert({
    event_id,
    business_id,
    to_user,
    status,
    message_preview: message_preview?.slice(0, 240),
    error,
  });
}

async function logDm({
  event_id,
  business_id,
  to_user,
  status,
  error,
  message_preview,
  template_id,
}: {
  event_id: string;
  business_id: string;
  to_user: string;
  status: string;
  error?: string | null;
  message_preview?: string;
  template_id?: string | null;
}) {
  const supabase = getSupabaseClient();
  await supabase.from("dm_send_log").insert({
    event_id,
    business_id,
    to_user,
    status,
    message_preview: message_preview?.slice(0, 240),
    error,
    template_id,
  });
}