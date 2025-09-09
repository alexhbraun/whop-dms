// app/api/admin/test-webhook/route.ts
import { NextResponse } from "next/server";
import { logInfo, logError } from "@/lib/log";
import { sendWelcomeDM } from "@/lib/dm";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function getIncomingSecret(req: Request) {
  const h = (name: string) => req.headers.get(name) || "";
  const q = new URL(req.url).searchParams.get("secret") || "";
  // Prefer header, fall back to query
  return (h("x-admin-secret") || h("x-admin-dash-secret") || q).trim();
}

function sha256Base64(str: string) {
  return crypto.createHash("sha256").update(str, "utf8").digest("base64");
}

export async function GET(req: Request) {
  const supplied = getIncomingSecret(req);
  const env = (process.env.ADMIN_DASH_SECRET || "").trim();
  
  return Response.json({
    ok: true,
    haveEnv: Boolean(env),
    haveHeader: Boolean(supplied),
    match: Boolean(env && supplied && env === supplied),
    diag: { envLen: env.length, hdrLen: supplied.length, envHash: env ? sha256Base64(env) : null, hdrHash: supplied ? sha256Base64(supplied) : null },
  });
}

export async function POST(req: Request) {
  const supplied = getIncomingSecret(req);
  const env = (process.env.ADMIN_DASH_SECRET || "").trim();
  const authorized = Boolean(env && supplied && env === supplied);
  if (!authorized) {
    return new Response(JSON.stringify({
      ok: false,
      error: "unauthorized",
      diag: {
        haveEnv: Boolean(env),
        haveHeader: Boolean(supplied),
        envLen: env.length,
        hdrLen: supplied.length,
        envHash: env ? sha256Base64(env) : null,
        hdrHash: supplied ? sha256Base64(supplied) : null
      }
    }), { status: 401, headers: { "content-type": "application/json" }});
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
