// app/api/diagnostics/ping-whop/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const hasKey = !!process.env.WHOP_API_KEY;
  
  return NextResponse.json({
    ok: true,
    hasKey,
    headerNameUsed: "X-API-KEY",
    timestamp: new Date().toISOString(),
  });
}
