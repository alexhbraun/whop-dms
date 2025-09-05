export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const eventId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { toUserIdOrUsername, message } = await req.json();

    if (!toUserIdOrUsername || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing toUserIdOrUsername or message" },
        { status: 400 }
      );
    }

    // Log to Supabase for traceability
    const supabase = getSupabaseClient();
    
    try {
      await supabase.from("dm_send_log").insert({
        event_id: eventId,
        business_id: "debug_test",
        to_user: toUserIdOrUsername,
        status: "attempting",
        message_preview: message.slice(0, 240),
        error: null,
      });
    } catch (logError) {
      console.warn("Failed to log to Supabase:", logError);
    }

    // Attempt DM send using SDK
    const result = await whopSdk.messages.sendDirectMessageToUser({
      toUserIdOrUsername,
      message,
    });

    // Update log with success
    try {
      await supabase
        .from("dm_send_log")
        .update({ 
          status: "success",
          error: null
        })
        .eq("event_id", eventId);
    } catch (logError) {
      console.warn("Failed to update log with success:", logError);
    }

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("DM send error:", err);
    
    // Update log with error
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from("dm_send_log")
        .update({ 
          status: "failed",
          error: err.message || "Unknown error"
        })
        .eq("event_id", eventId);
    } catch (logError) {
      console.warn("Failed to update log with error:", logError);
    }

    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
