// app/api/admin/test-webhook/route.ts
import { NextResponse } from "next/server";
import { sendAndLogDM } from '@/lib/dm';

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function checkSecret(req: Request): { ok: boolean; error?: string; status?: number } {
  const envSecret = process.env.ADMIN_DASH_SECRET;
  
  if (!envSecret) {
    return { ok: false, error: "ADMIN_DASH_SECRET not set", status: 500 };
  }
  
  // Check header first, then query param
  const headerSecret = req.headers.get("x-admin-secret");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  
  const providedSecret = headerSecret || querySecret;
  
  if (!providedSecret) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  
  if (envSecret.trim() !== providedSecret.trim()) {
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

  const { businessId, username, userId, message, dryRun = false } = await req.json();
  
  // Validate required fields
  if (!businessId) {
    return NextResponse.json({ ok: false, error: "businessId is required" }, { status: 400 });
  }
  
  if (!username && !userId) {
    return NextResponse.json({ ok: false, error: "username or userId is required" }, { status: 400 });
  }

  // Generate eventId
  const eventId = `admin_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  // Log request details (excluding secret)
  console.log("admin/test-webhook POST", {
    businessId,
    username,
    userId,
    eventId,
    dryRun
  });

  if (dryRun === true) {
    return Response.json({
      ok: true,
      mode: "dry",
      preview: {
        businessId,
        to: username || userId,
        message,
        eventId
      }
    });
  }

  // Real send
  try {
    const result = await sendAndLogDM({
      businessId,
      toUser: { username, id: userId },
      message,
      eventId,
      source: 'admin'
    });

    return Response.json({
      ok: true,
      mode: "real",
      result
    });
  } catch (err: any) {
    console.error("admin/test-webhook send error", { err });
    return NextResponse.json({
      ok: false,
      error: String(err?.message || err)
    }, { status: 500 });
  }
}