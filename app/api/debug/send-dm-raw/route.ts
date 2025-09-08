import { NextResponse } from "next/server";
import { sendWelcomeDM } from "@/lib/dm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { toUserIdOrUsername, message, businessId } = await req.json();
  if (!toUserIdOrUsername || !message || !businessId)
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

  try {
    const r = await sendWelcomeDM({
      businessId,
      toUserIdOrUsername,
      templateOverride: message,
      eventId: `debug_${Date.now()}`,
    });
    return NextResponse.json({ ok: true, result: r });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
