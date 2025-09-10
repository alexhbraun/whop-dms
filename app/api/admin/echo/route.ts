import { NextRequest, NextResponse } from "next/server";

function checkSecret(req: NextRequest): { ok: boolean; error?: string; status?: number } {
  const envSecret = process.env.ADMIN_DASH_SECRET;
  if (!envSecret) {
    return { ok: false, error: "ADMIN_DASH_SECRET not set", status: 500 };
  }
  const headerSecret = req.headers.get("x-admin-secret");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const providedSecret = headerSecret || querySecret;
  if (!providedSecret) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  if (envSecret.trim() !== providedSecret.trim()) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  try {
    const auth = checkSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (e: any) {
    console.error("ADMIN_ECHO_EXCEPTION", e);
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
