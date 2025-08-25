'use client';
import { useEffect, useState } from 'react';
import { extractCommunitySlugFromUrl } from '@/lib/whopUrl'; // client-safe
import { ReadonlyURLSearchParams } from 'next/navigation';

interface CreatorIdHookResponse {
  creatorId: string | null;
  context: { source: string; slug: string | null; };
}

const KEY_ID   = 'whop_creator_business_id'; // canonical id to use everywhere
const KEY_SLUG = 'whop_creator_slug';        // useful for debug

export default function useCreatorId(searchParams: ReadonlyURLSearchParams | null): CreatorIdHookResponse {
  // 1) direct query param "community_id" / "business_id"
  const qId = searchParams?.get('community_id') || searchParams?.get('business_id') || null;

  const [creatorId, setCreatorId] = useState<string | null>(qId);
  const [context, setContext] = useState<{ source: string; slug: string | null; }>({
    source: qId ? 'query' : 'unknown',
    slug: null
  });

  useEffect(() => {
    console.log('[useCreatorId] Initializing useEffect. qId:', qId);
    // If query provided, persist & stop
    if (qId) {
      try { localStorage.setItem(KEY_ID, qId); } catch (e) { console.warn('localStorage set error (qId):', e); }
      setContext(c => ({ ...c, source: 'query' }));
      console.log('[useCreatorId] Resolved from query:', qId);
      return;
    }

   (async function resolve() {
      // 2) Parse community slug from URL (embedded iframe)
      // Prefer parent referrer; fallback to current location.
      let slug: string | null = null;
      try {
        if (typeof document !== 'undefined' && document.referrer) {
          slug = extractCommunitySlugFromUrl(document.referrer);
          console.log('[useCreatorId] Slug from referrer:', slug);
        }
      } catch (e) { console.warn('Error getting slug from referrer:', e); }

      if (!slug) {
        try {
          if (typeof window !== 'undefined' && window.location.href) {
            slug = extractCommunitySlugFromUrl(window.location.href);
            console.log('[useCreatorId] Slug from window.location:', slug);
          }
        } catch (e) { console.warn('Error getting slug from window.location:', e); }
      }

      if (slug) {
        setContext(c => ({ ...c, source: 'slug', slug }));
        try { localStorage.setItem(KEY_SLUG, slug); } catch (e) { console.warn('localStorage set error (slug):', e); }
        // ask server to resolve slug -> business_id
        try {
          const res = await fetch(`/api/resolve/community?slug=${encodeURIComponent(slug)}`);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          console.log('[useCreatorId] Resolver API response for slug', slug, ':', data);

          if (data?.ok && data?.business_id) {
            setCreatorId(data.business_id);
            try { localStorage.setItem(KEY_ID, data.business_id); } catch (e) { console.warn('localStorage set error (resolved ID):', e); }
            setContext({ source: `resolver:${data.source || 'cache'}`, slug });
            console.log('[useCreatorId] Resolved from slug resolver:', data.business_id);
            return;
          }
        } catch (e) { console.warn('Error resolving slug to business_id:', e); }
      }

      // 3) localStorage (already resolved before) - now a fallback
      try {
        const savedId = localStorage.getItem(KEY_ID);
        const savedSlug = localStorage.getItem(KEY_SLUG);
        console.log('[useCreatorId] Falling back to localStorage: savedId:', savedId, 'savedSlug:', savedSlug);
        if (savedId) {
          setCreatorId(savedId);
          setContext({ source: 'local', slug: savedSlug });
          console.log('[useCreatorId] Resolved from localStorage:', savedId);
          return;
        }
      } catch (e) { console.warn('localStorage get error:', e); }

      // 4) Final fallback: env default
      if (process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
        console.log('[useCreatorId] Falling back to env variable:', process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
        setCreatorId(process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
        setContext(c => ({ ...c, source: 'env_fallback' }));
        console.log('[useCreatorId] Resolved from env fallback:', process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
      } else {
        console.log('[useCreatorId] No creatorId resolved, setting to null.');
        setCreatorId(null);
        setContext(c => ({ ...c, source: 'none', slug: null }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qId]); // Depend on qId to re-run if it changes

  return { creatorId, context }; // creatorId is business_id (preferred)
}
