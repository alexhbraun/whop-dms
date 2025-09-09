// app/api/admin/test-webhook/route.ts
import { NextResponse } from "next/server";
import { logInfo, logError } from "@/lib/log";
import { sendWelcomeDM } from "@/lib/dm";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const OPEN = process.env.ADMIN_TEST_OPEN === 'true';

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
  const url = new URL(req.url);
  
  // Probe mode
  if (url.searchParams.get('probe') === '1') {
    return Response.json({
      ok: true,
      open: OPEN,
      hasSecret: !!process.env.ADMIN_DASH_SECRET
    });
  }
  
  // Secret check mode
  const secretParam = url.searchParams.get('secret');
  if (secretParam) {
    const env = (process.env.ADMIN_DASH_SECRET || "").trim();
    return Response.json({
      ok: true,
      match: env === secretParam.trim(),
      haveEnv: !!env,
      haveParam: true
    });
  }
  
  // Default behavior
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
  const { businessId, username, message } = await req.json();
  if (!businessId || !username) {
    return NextResponse.json({ ok: false, error: "missing businessId/username" }, { status: 400 });
  }

  if (OPEN) {
    // Open mode - skip auth checks
    try {
      const eventId = `test_webhook_${Date.now()}`;
      
      await sendWelcomeDM({
        businessId,
        toUser: username,
        customMessage: message,
        eventId
      });

      return NextResponse.json({ 
        ok: true, 
        mode: 'open', 
        businessId, 
        username 
      });
    } catch (e: any) {
      logError("admin test webhook open mode error", { 
        error: e?.message,
        businessId,
        username 
      });
      return NextResponse.json({ 
        ok: false, 
        error: e?.message || "error" 
      }, { status: 500 });
    }
  } else {
    // Secured mode - check auth
    const reqHeader = req.headers.get("x-admin-secret");
    const env = process.env.ADMIN_DASH_SECRET;
    
    if (!env || !reqHeader || env !== reqHeader) {
      return NextResponse.json({ 
        ok: false, 
        error: 'unauthorized', 
        diag: { 
          haveEnv: !!env, 
          haveHeader: !!reqHeader, 
          envLen: (env || '').length, 
          hdrLen: (reqHeader || '').length 
        } 
      }, { status: 401 });
    }

    try {
      const eventId = `admin_test_${Date.now()}`;
      
      await sendWelcomeDM({
        businessId,
        toUser: username,
        customMessage: message,
        eventId
      });

      return NextResponse.json({ 
        ok: true, 
        mode: 'secured', 
        businessId, 
        username 
      });
    } catch (e: any) {
      logError("admin test webhook secured mode error", { 
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
}
