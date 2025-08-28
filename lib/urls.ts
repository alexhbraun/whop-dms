// lib/urls.ts
// URL generation helpers for the application

export function onboardingUrl(params: { memberId?: string; username?: string }) {
  const base = '/welcome';
  const q = new URLSearchParams();
  if (params.memberId) q.set('member', params.memberId);
  if (params.username) q.set('u', params.username);
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://whop-dms.vercel.app';
}

export function getFullOnboardingUrl(params: { memberId?: string; username?: string }): string {
  return `${getBaseUrl()}${onboardingUrl(params)}`;
}

export function getDashboardUrl(): string {
  return '/dashboard';
}

export function getQuestionsUrl(): string {
  return '/dashboard/questions';
}

export function getLeadsUrl(): string {
  return '/dashboard/leads';
}

export function getSettingsUrl(): string {
  return '/dashboard/settings';
}

export function getDmTemplatesUrl(): string {
  return '/dashboard/dm-templates';
}
