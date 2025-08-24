'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const KEY = 'whop_creator_id';

export default function useCreatorId() {
  const searchParams = useSearchParams();
  const q = searchParams?.get('community_id') || searchParams?.get('business_id') || null;
  const [id, setId] = useState<string | null>(q);

  useEffect(() => {
    // Priority 1: From query params (if present, always update localStorage and state)
    if (q) {
      try { localStorage.setItem(KEY, q); } catch (e) { console.warn('localStorage set error:', e); }
      setId(q);
      return;
    }

    // Priority 2: From localStorage (if no query param, try to load from storage)
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        setId(saved);
        return;
      }
    } catch (e) { console.warn('localStorage get error:', e); }

    // Priority 3: From environment variable (final fallback)
    if (process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
      setId(process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
      // Optionally store env fallback to localStorage if it's considered stable
      // try { localStorage.setItem(KEY, process.env.NEXT_PUBLIC_WHOP_COMPANY_ID); } catch {} 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]); // Re-run effect only when `q` (query params) changes

  return id;
}
