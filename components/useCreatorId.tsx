'use client';
import { useEffect, useState } from 'react';
import { extractCommunitySlugFromUrl } from '@/lib/whopUrl'; // client-safe
import { ReadonlyURLSearchParams } from 'next/navigation';

interface CreatorIdHookResponse {
  creatorId: string | null;
  host: string | null; // Add host to the response
  source: string; // Add source to the response
  unresolved: boolean; // Add unresolved to the response
}

const KEY_ID   = 'whop_creator_business_id'; // canonical id to use everywhere
const KEY_SLUG = 'whop_creator_slug';        // useful for debug
const KEY_HOST = 'whop_creator_host';        // useful for debug (new)

export default function useCreatorId(searchParams: ReadonlyURLSearchParams | null): CreatorIdHookResponse {
  const qId = searchParams?.get('community_id') || searchParams?.get('business_id') || null;

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(typeof window !== 'undefined' ? window.location.host : null);
  const [source, setSource] = useState<string>('unknown');
  const [unresolved, setUnresolved] = useState<boolean>(true);

  useEffect(() => {
    console.log('[useCreatorId] Initializing useEffect. qId:', qId);

    const resolveCreatorId = async () => {
      const currentHost = typeof window !== 'undefined' ? window.location.host : null;
      setHost(currentHost);
      console.log('[useCreatorId] Current host:', currentHost);

      // 1) direct query param "community_id" / "business_id"
      if (qId) {
        try {
          localStorage.setItem(KEY_ID, qId);
          if (currentHost) localStorage.setItem(KEY_HOST, currentHost);
        } catch (e) { console.warn('localStorage set error (qId):', e); }
        setCreatorId(qId);
        setSource('query');
        setUnresolved(false);
        console.log('[useCreatorId] Resolved from query:', qId);

        // If qId is present, try to POST to bind it to the current host
        if (currentHost) {
          try {
            await fetch('/api/resolve/host', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host: currentHost, business_id: qId }),
            });
            console.log('[useCreatorId] Host-business_id mapping POSTed for host:', currentHost, 'id:', qId);
          } catch (e) {
            console.warn('[useCreatorId] Error POSTing host_map:', e);
          }
        }
        return;
      }

      // 2) Resolve from embed host via GET /api/resolve/host
      if (currentHost) {
        console.log('[useCreatorId] Attempting to resolve from host resolver:', currentHost);
        try {
          const res = await fetch(`/api/resolve/host?host=${encodeURIComponent(currentHost)}`);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          console.log('[useCreatorId] Host resolver API response for host', currentHost, ':', data);

          if (data?.ok && data?.business_id) {
            setCreatorId(data.business_id);
            try {
              localStorage.setItem(KEY_ID, data.business_id);
              localStorage.setItem(KEY_HOST, currentHost);
            } catch (e) { console.warn('localStorage set error (resolved ID from host):', e); }
            setSource(`host_resolver:${data.source || 'cache'}`);
            setUnresolved(false);
            console.log('[useCreatorId] Resolved from host resolver:', data.business_id);
            return;
          }
        } catch (e) { console.warn('Error resolving host to business_id:', e); }
      }
      
      // 3) Fallback to localStorage
      try {
        const savedId = localStorage.getItem(KEY_ID);
        const savedHost = localStorage.getItem(KEY_HOST);
        console.log('[useCreatorId] Falling back to localStorage: savedId:', savedId, 'savedHost:', savedHost);
        if (savedId && savedHost === currentHost) {
          setCreatorId(savedId);
          setSource('local');
          setUnresolved(false);
          console.log('[useCreatorId] Resolved from localStorage:', savedId);
          return;
        }
      } catch (e) { console.warn('localStorage get error:', e); }

      // 4) Final fallback: env default
      if (process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
        console.log('[useCreatorId] Falling back to env variable:', process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
        setCreatorId(process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
        setSource('env_fallback');
        setUnresolved(true); // Mark as unresolved since it's a fallback
        console.log('[useCreatorId] Resolved from env fallback:', process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
      } else {
        console.log('[useCreatorId] No creatorId resolved, setting to null.');
        setCreatorId(null);
        setSource('none');
        setUnresolved(true);
      }
    };

    resolveCreatorId();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qId]); // Depend on qId to re-run if it changes

  return { creatorId, host, source, unresolved }; // Include host and unresolved in return
}
