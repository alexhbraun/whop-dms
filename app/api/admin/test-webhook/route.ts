// app/api/admin/test-webhook/route.ts
import { NextResponse } from "next/server";
import { sendWelcomeDM } from '@/lib/dm';

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function checkSecret(req: Request): { ok: boolean; error?: string; status?: number } {
  const envSecret = process.env.ADMIN_DASH_SECRET;
  
  if (!envSecret) {
    return { ok: false, error: "ADMIN_DASH_SECRET not set", status: 500 };
  }
  
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  
  if (!querySecret) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  
  if (envSecret.trim() !== querySecret.trim()) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  
  return { ok: true };
}

export async function GET(req: Request) {
  const auth = checkSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  
  return Response.json({ ok: true, probe: true, ts: Date.now() });
}

export async function POST(req: Request) {
  const auth = checkSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { businessId, username, userId, message, eventId, dryRun = false, templateOverride } = await req.json();
  
  // Validate required fields
  if (!businessId) {
    return NextResponse.json({ ok: false, error: "businessId is required" }, { status: 400 });
  }
  
  if (!username && !userId) {
    return NextResponse.json({ ok: false, error: "username or userId is required" }, { status: 400 });
  }

  // Log request details (excluding secret)
  console.log("admin/test-webhook POST", {
    businessId,
    username,
    userId,
    eventId,
    dryRun,
    hasTemplateOverride: !!templateOverride
  });

  // Build toUser param - prefer userId if both present
  const toUser = userId ? { id: userId } : { username };
  const finalEventId = eventId || `admin_test_${Date.now()}`;

  if (dryRun === true) {
    return Response.json({
      ok: true,
      mode: "dryRun",
      preview: {
        businessId,
        toUser,
        message,
        eventId: finalEventId,
        templateOverride
      }
    });
  }

  // Real send
  try {
    const result = await sendWelcomeDM({
      businessId,
      toUser: toUser.id ? toUser.id : toUser.username,
      customMessage: message,
      templateOverride,
      eventId: finalEventId
    });

    // Return only relevant fields
    return Response.json({
      ok: true,
      mode: "send",
      result: {
        ok: result.ok,
        status: result.status,
        error: result.error,
        templateId: result.templateId,
        businessId: result.businessId
      }
    });
  } catch (err: any) {
    console.error("admin/test-webhook send error", { err });
    return new Response(JSON.stringify({
      ok: false,
      mode: "send",
      error: String(err?.message || err)
    }), { status: 500, headers: { "content-type": "application/json" }});
  }
}