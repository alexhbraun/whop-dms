// app/api/debug/test-webhook-manual/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { requireAdminSecret } from "@/lib/admin-auth";

export async function POST(req: Request) {
  requireAdminSecret(req);
  
  const { username, businessId } = await req.json();
  
  if (!username || !businessId) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing username or businessId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Simulate a membership_went_valid webhook event
    const webhookPayload = {
      id: `test_webhook_${Date.now()}`,
      type: "membership_went_valid",
      data: {
        business_id: businessId,
        experience_id: "exp_test",
        member_id: `mem_test_${Date.now()}`,
        user: { username: username }
      }
    };

    // Call our own webhook endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whop/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.json();
    
    return new Response(
      JSON.stringify({
        ok: true,
        webhookResponse: result,
        status: response.status,
        payload: webhookPayload
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
