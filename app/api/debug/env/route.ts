// app/api/debug/env/route.ts
export async function GET() {
  const raw = process.env.DM_ONBOARDING_ENABLED ?? "(undefined)";
  const normalized = String(raw).toLowerCase().trim();

  return new Response(
    JSON.stringify({
      DM_ONBOARDING_ENABLED: { raw, normalized, enabled: normalized === "true" },
      // Optionally confirm presence (not values) of other critical envs:
      has_WHOP_API_KEY: Boolean(process.env.WHOP_API_KEY ?? "").valueOf(),
      has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL ?? "").valueOf(),
      has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").valueOf(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
