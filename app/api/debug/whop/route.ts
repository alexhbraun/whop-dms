export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// app/api/debug/whop/route.ts
import { getWhopSdk } from "@/lib/whop-sdk";
import { requireAdminSecret } from "@/lib/admin-auth";

export async function GET(req: Request) {
  requireAdminSecret(req);
  try {
    const key = process.env.WHOP_API_KEY ?? process.env.WHOP_APP_API_KEY ?? "";
    const preview = key ? `${key.slice(0, 4)}…(${key.length})` : "(missing)";

    // Light SDK check
    let sdkReady = false;
    try {
      getWhopSdk();
      sdkReady = true;
    } catch {
      sdkReady = false;
    }

    return new Response(
      JSON.stringify({
        sdkReady,
        keyPresent: Boolean(key),
        keyPreview: preview,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
