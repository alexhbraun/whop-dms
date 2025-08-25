export function extractCommunitySlugFromUrl(urlString: string): string | null {
  console.log('[extractCommunitySlugFromUrl] Input URL string:', urlString);
  try {
    const url = new URL(urlString);
    console.log('[extractCommunitySlugFromUrl] Parsed URL object:', url);
    const parts = url.pathname.split('/').filter(Boolean);
    console.log('[extractCommunitySlugFromUrl] Pathname:', url.pathname, 'Parts:', parts);
    // look for ".../joined/<slug>/<app-slug>/app"
    const idx = parts.indexOf('joined');
    if (idx !== -1 && parts.length >= idx + 2) {
      console.log('[extractCommunitySlugFromUrl] Found "joined" at index', idx, ', returning slug:', parts[idx + 1]);
      return parts[idx + 1] || null;
    }
    console.log('[extractCommunitySlugFromUrl] "joined" not found or insufficient parts.');
  } catch (e) {
    console.warn('[extractCommunitySlugFromUrl] Error parsing URL:', e);
  }
  return null;
}
