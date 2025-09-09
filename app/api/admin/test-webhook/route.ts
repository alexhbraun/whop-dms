// app/api/admin/test-webhook/route.ts
import { NextResponse } from "next/server";
import { logInfo, logError } from "@/lib/log";
import { sendWelcomeDM } from "@/lib/dm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function getAdminSecret(req: Request): string | null {
  // Try headers first
  const headerSecret1 = req.headers.get("x-admin-secret");
  const headerSecret2 = req.headers.get("x-admin-dash-secret");
  
  // Try query param
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  
  // Return first non-empty value
  return headerSecret1?.trim() || headerSecret2?.trim() || querySecret?.trim() || null;
}

function checkAuth(req: Request): { ok: boolean; error?: string } {
  const supplied = getAdminSecret(req);
  const env = process.env.ADMIN_DASH_SECRET?.trim();
  
  if (!supplied || !env || supplied !== env) {
    return { ok: false, error: "unauthorized" };
  }
  
  return { ok: true };
}

export async function GET(req: Request) {
  const supplied = getAdminSecret(req);
  const env = process.env.ADMIN_DASH_SECRET?.trim();
  
  return NextResponse.json({
    ok: true,
    haveEnv: Boolean(env),
    haveHeader: Boolean(supplied),
    match: Boolean(supplied && env && supplied === env),
    note: "No secrets leaked; values trimmed before compare."
  });
}

export async function POST(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
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
      context: "debug"
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
