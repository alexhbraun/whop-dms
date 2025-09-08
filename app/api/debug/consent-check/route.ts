import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  const leaks = Object.keys(process.env).filter(k => k.startsWith("NEXT_PUBLIC_WHOP"));
  return NextResponse.json({
    ok: leaks.length === 0,
    nextPublicLeaks: leaks,
    advice: "No user scopes. Ensure Whop app has no member.* scopes."
  });
}
