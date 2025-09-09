// app/api/debug/test-dm-simple/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { requireAdminSecret } from "@/lib/admin-auth";
import { sendWelcomeDM } from "@/lib/dm";

export async function POST(req: Request) {
  requireAdminSecret(req);
  
  const { toUserIdOrUsername, businessId } = await req.json();
  
  if (!toUserIdOrUsername || !businessId) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing toUserIdOrUsername or businessId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await sendWelcomeDM({
      businessId,
      toUserIdOrUsername,
      templateOverride: "🎉 Test DM from Nexo! This is a test message to verify DM functionality.",
      eventId: `test_${Date.now()}`
    });
    
    return new Response(
      JSON.stringify({ ok: true, result }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
