export function extractCommunitySlugFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const parts = url.pathname.split('/').filter(Boolean);
    // look for ".../joined/<slug>/<app-slug>/app"
    const idx = parts.indexOf('joined');
    if (idx !== -1 && parts.length >= idx + 2) {
      return parts[idx + 1] || null;
    }
  } catch (e) {
    console.warn('Error extracting community slug from URL:', e);
  }
  return null;
}
