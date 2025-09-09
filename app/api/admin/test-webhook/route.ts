// app/api/admin/test-webhook/route.ts
import { NextResponse } from "next/server";
import { logInfo, logError } from "@/lib/log";
import { sendWelcomeDM } from "@/lib/dm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.NEXT_PUBLIC_ADMIN_DASH_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { businessId, username, message } = await req.json();
  if (!businessId || !username) {
    return NextResponse.json({ ok: false, error: "missing businessId/username" }, { status: 400 });
  }

  try {
    const eventId = `admin_test_${Date.now()}`;
    
    // Use the existing sendWelcomeDM helper for end-to-end simulation
    const result = await sendWelcomeDM({
      businessId,
      toUserIdOrUsername: username,
      templateOverride: message, // Use custom message if provided
      eventId,
      context: "admin-test"
    });

    logInfo("admin test webhook success", { 
      eventId, 
      username, 
      businessId, 
      result 
    });

    return NextResponse.json({ 
      ok: true, 
      eventId, 
      toUser: username 
    });
  } catch (e: any) {
    logError("admin test webhook error", { 
      error: e?.message,
      businessId,
      username 
    });
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "error" 
    }, { status: 500 });
  }
}
