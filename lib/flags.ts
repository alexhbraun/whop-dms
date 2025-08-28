// lib/flags.ts
// Feature flags and configuration for the application

export const DM_ENABLED = process.env.DM_ENABLED === 'true';
export const DM_MODE = process.env.DM_MODE ?? 'none';
export const DM_ROLLOUT_PCT = Number(process.env.DM_ROLLOUT_PCT ?? '0');

export function dmAllowedForUser(seed: string) {
  // deterministic rollout gating; stable per user/username
  if (!DM_ENABLED) return false;
  const h = [...seed].reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0) >>> 0;
  return (h % 100) < DM_ROLLOUT_PCT;
}

// Environment validation helpers
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

// Feature flag checks
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isVercel(): boolean {
  return !!process.env.VERCEL;
}

export function shouldLogToConsole(): boolean {
  // Log to console in development, or when not on Vercel
  return !isProduction() || !isVercel();
}
