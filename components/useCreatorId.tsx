'use client';
import { useEffect, useState } from 'react';

export default function useCreatorId(searchParams?: any) {
  const qId = searchParams?.community_id || searchParams?.business_id || null;
  const host = typeof window !== 'undefined' ? window.location.host : '';

  const [creatorId, setCreatorId] = useState<string|null>(qId || null);
  const [source, setSource] = useState('unknown');
  const [unresolved, setUnresolved] = useState(false);

  useEffect(() => {
    if (!host) return;

    // 1. Query param present
    if (qId) {
      setCreatorId(qId);
      setSource('query');
      fetch('/api/resolve/host', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ host, business_id: qId }),
      });
      return;
    }

    // 2. Try resolver
    (async () => {
      try {
        const res = await fetch(`/api/resolve/host?host=${encodeURIComponent(host)}`).then(r=>r.json());
        if (res.ok && res.business_id) {
          setCreatorId(res.business_id);
          setSource('resolver:cache');
          return;
        }
      } catch {} // Silent fail on network error, proceed to fallback

      // 3. Fallback to env var
      if (process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
        setCreatorId(process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
        setSource('env_fallback');
        setUnresolved(true); // Mark as unresolved since it's a fallback
      } else {
        setCreatorId(null);
        setUnresolved(true);
        setSource('unresolved'); // Explicitly mark as unresolved if no fallback
      }
    })();
  }, [host, qId]);

  return { creatorId, host, source, unresolved };
}
