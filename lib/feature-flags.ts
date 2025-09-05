// lib/feature-flags.ts
export const DM_ENABLED =
  String(process.env.DM_ONBOARDING_ENABLED ?? "")
    .toLowerCase()
    .trim() === "true";
