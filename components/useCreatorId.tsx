'use client';
import { useEffect, useState } from 'react';
import { extractCommunitySlugFromUrl } from '@/lib/whopUrl'; // client-safe
import { ReadonlyURLSearchParams } from 'next/navigation';

interface CreatorIdHookResponse {
  creatorId: string | null;
  context: { source: string; host: string | null; slug: string | null; };
}

const KEY_ID   = 'whop_creator_business_id'; // canonical id to use everywhere
const KEY_SLUG = 'whop_creator_slug';        // useful for debug

export default function useCreatorId(searchParams: ReadonlyURLSearchParams | null): CreatorIdHookResponse {
  const qId = searchParams?.get('community_id') || searchParams?.get('business_id') || null;

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [context, setContext] = useState<{ source: string; host: string | null; slug: string | null; }>({
    source: 'unknown',
    host: typeof window !== 'undefined' ? window.location.host : null,
    slug: null
  });

  useEffect(() => {
    console.log('[useCreatorId] Initializing useEffect. qId:', qId);

    const resolveCreatorId = async () => {
      const currentHost = typeof window !== 'undefined' ? window.location.host : null;
      setContext(c => ({ ...c, host: currentHost }));
      console.log('[useCreatorId] Current host:', currentHost);

      // 1) direct query param "community_id" / "business_id"
      if (qId) {
        try { localStorage.setItem(KEY_ID, qId); } catch (e) { console.warn('localStorage set error (qId):', e); }
        setCreatorId(qId);
        setContext(c => ({ ...c, source: 'query' }));
        console.log('[useCreatorId] Resolved from query:', qId);

        // If qId is present, try to bind it to the current host
        if (currentHost) {
          try {
            await fetch('/api/resolve/host', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host: currentHost, business_id: qId }),
            });
            console.log('[useCreatorId] Host-business_id mapping updated for host:', currentHost, 'id:', qId);
          } catch (e) {
            console.warn('[useCreatorId] Error POSTing host_map:', e);
          }
        }
        return;
      }

      // 2) Resolve from embed host
      if (currentHost) {
        console.log('[useCreatorId] Attempting to resolve from host resolver:', currentHost);
        try {
          const res = await fetch(`/api/resolve/host?host=${encodeURIComponent(currentHost)}`);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          console.log('[useCreatorId] Host resolver API response for host', currentHost, ':', data);

          if (data?.ok && data?.business_id) {
            setCreatorId(data.business_id);
            try { localStorage.setItem(KEY_ID, data.business_id); } catch (e) { console.warn('localStorage set error (resolved ID from host):', e); }
            setContext({ source: `host_resolver:${data.source || 'cache'}`, host: currentHost, slug: null });
            console.log('[useCreatorId] Resolved from host resolver:', data.business_id);
            return;
          }
        } catch (e) { console.warn('Error resolving host to business_id:', e); }
      }
      
      // 3) localStorage (already resolved before) - now a fallback
      try {
        const savedId = localStorage.getItem(KEY_ID);
        const savedSlug = localStorage.getItem(KEY_SLUG);
        console.log('[useCreatorId] Falling back to localStorage: savedId:', savedId, 'savedSlug:', savedSlug);
        if (savedId) {
          setCreatorId(savedId);
          setContext(c => ({ ...c, source: 'local', slug: savedSlug }));
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
        setContext(c => ({ ...c, source: 'none' }));
      }
    };

    resolveCreatorId();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qId]); // Depend on qId to re-run if it changes

  return { creatorId, context }; // creatorId is business_id (preferred)
}
