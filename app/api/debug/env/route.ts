// app/api/debug/env/route.ts
import { requireAdminSecret } from "@/lib/admin-auth";

export async function GET(req: Request) {
  requireAdminSecret(req);
  const raw = process.env.DM_ONBOARDING_ENABLED ?? "(undefined)";
  const normalized = String(raw).toLowerCase().trim();
  const enabled = normalized === "true";

  return new Response(
    JSON.stringify({
      raw,
      normalized,
      enabled,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
