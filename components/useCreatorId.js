'use client';
import { useEffect, useState } from 'react';

const KEY = 'whop_creator_id';

export default function useCreatorId(searchParams) {
  const q = searchParams?.community_id || searchParams?.business_id || null;
  const [id, setId] = useState(q || null);

  useEffect(() => {
    if (q) {
      try { localStorage.setItem(KEY, q); } catch {}
      setId(q);
      return;
    }
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) { setId(saved); return; }
    } catch {}
    // final fallback: env (Next.js exposes NEXT_PUBLIC_* on client)
    if (process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
      setId(process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return id;
}
