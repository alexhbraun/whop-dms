// app/api/debug/dm-status/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { requireAdminSecret } from "@/lib/admin-auth";
import { DM_ENABLED } from "@/lib/feature-flags";

export async function GET(req: Request) {
  requireAdminSecret(req);
  
  const raw = process.env.DM_ONBOARDING_ENABLED ?? "(undefined)";
  const normalized = String(raw).toLowerCase().trim();
  const enabled = normalized === "true";
  
  return new Response(
    JSON.stringify({
      dmOnboardingEnabled: {
        raw,
        normalized,
        enabled,
        flagValue: DM_ENABLED
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL
      },
      whop: {
        hasApiKey: !!process.env.WHOP_API_KEY,
        hasAgentId: !!process.env.WHOP_AGENT_USER_ID,
        hasCompanyId: !!process.env.WHOP_COMPANY_ID
      }
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
