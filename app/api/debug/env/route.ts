import { NextResponse } from 'next/server';

export async function GET() {
  const urlOk = !!process.env.SUPABASE_URL;
  const keyLen = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0;
  return NextResponse.json({
    ok: urlOk && keyLen > 25,
    supabaseUrl: urlOk ? 'set' : 'missing',
    serviceKeyLen: keyLen,                // length only (safe to print)
    dmOnboardingEnabled: process.env.DM_ONBOARDING_ENABLED ?? null,
  });
}