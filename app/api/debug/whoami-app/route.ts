import { NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sdk = getWhopSdk();
    // lightweight ping (replace with a cheap call if needed)
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}