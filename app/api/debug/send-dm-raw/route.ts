import { NextResponse } from "next/server";
import { getWhopSdkWithAgent } from "@/lib/whop-sdk";
import { sendWelcomeDM } from "@/lib/dm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { toUserIdOrUsername, message, businessId } = await req.json();
  if (!toUserIdOrUsername || !message || !businessId)
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

  try {
    // Use sendWelcomeDM with debug context for proper logging
    const result = await sendWelcomeDM({
      businessId,
      toUserIdOrUsername,
      templateOverride: message,
      eventId: `debug_raw_${Date.now()}`,
      context: "debug"
    });
    
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
