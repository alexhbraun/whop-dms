import { getWhopSdk } from "@/lib/whop-sdk";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Make a tiny authenticated call that requires the App key.
    // We'll try listing DM conversations with a tiny limit.
    const whop = getWhopSdk();
    const res = await whop.messages.listDirectMessageConversations({
      limit: 1,
    });
    return new Response(JSON.stringify({ ok: true, sample: res ?? null }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: e?.message ?? String(e),
        stack: e?.stack ?? null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
