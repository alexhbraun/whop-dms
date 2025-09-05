export const runtime = "nodejs";
import { whopSdk } from "@/lib/whop-sdk";

export async function GET() {
  try {
    // Make a tiny authenticated call that requires the App key.
    // We'll try listing DM conversations with a tiny limit.
    const res = await whopSdk.messages.listDirectMessageConversations({
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
