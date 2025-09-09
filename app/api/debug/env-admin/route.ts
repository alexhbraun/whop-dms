// app/api/debug/env-admin/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      ADMIN_TEST_OPEN: process.env.ADMIN_TEST_OPEN || null,
      ADMIN_DASH_SECRET_len: (process.env.ADMIN_DASH_SECRET || '').length
    }
  });
}
