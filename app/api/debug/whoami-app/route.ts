export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";

export async function GET() {
  try {
    // pick a harmless call that only needs the app key; if not available, list app installations or similar
    // we use messages.listDirectMessageConversations with limit=1 as a minimal authenticated call; if app key is bad, it will throw.
    const sample = await whopSdk.messages.listDirectMessageConversations({ limit: 1 });
    return NextResponse.json({ ok: true, sample });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
