import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { getCommunitySettings, CommunitySettings } from '../lib/supabaseUtils';

// Create a context for community settings
export const CommunitySettingsContext = createContext<CommunitySettings | null>(null);

export function useCommunitySettings() {
  return useContext(CommunitySettingsContext);
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [communitySettings, setCommunitySettings] = useState<CommunitySettings | null>(null);

  useEffect(() => {
    if (router.isReady) {
      const { community_id } = router.query;
      if (typeof community_id === 'string' && community_id) {
        setCommunityId(community_id);
        getCommunitySettings(community_id).then((settings) => {
          setCommunitySettings(settings);
        });
      }
    }
  }, [router.isReady, router.query]);

  return (
    <CommunitySettingsContext.Provider value={communitySettings}>
      <Component {...pageProps} />
    </CommunitySettingsContext.Provider>
  );
}

export default MyApp;

