// app/api/diagnostics/ping-whop/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  console.log('[ping-whop.GET] Endpoint accessed');
  
  const hasKey = !!process.env.WHOP_API_KEY;
  console.log('[ping-whop.GET] Environment check:', {
    WHOP_API_KEY: hasKey ? 'present' : 'missing',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  });
  
  const response = {
    ok: true,
    hasKey,
    headerNameUsed: "X-API-KEY",
    timestamp: new Date().toISOString(),
  };
  
  console.log('[ping-whop.GET] Returning response:', response);
  return NextResponse.json(response);
}
