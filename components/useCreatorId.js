'use client';
import { useEffect, useState } from 'react';

const KEY = 'whop_creator_id';

export default function useCreatorId(searchParams) {
  const qId = searchParams?.community_id || searchParams?.business_id || null;
  const [id, setId] = useState(qId || null);

  // On mount, if query has id: save to localStorage
  useEffect(() => {
    if (qId) {
      try { localStorage.setItem(KEY, qId); } catch {}
      setId(qId);
    } else {
      // Recover from localStorage if missing
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) setId(saved);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return id; // may be null briefly; pages should guard
}
