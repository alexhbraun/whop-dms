type: 'client';

import { useSearchParams } from 'next/navigation';

export default function useCreatorId() {
  const sp = useSearchParams();
  return sp.get('community_id') || sp.get('business_id') || 'unknown';
}
