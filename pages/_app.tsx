// import '../styles/globals.css'; // Removed as global CSS is now in app/globals.css
import type { AppProps } from 'next/app';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
// import { getCommunitySettings, CommunitySettings } from '../lib/supabaseUtils'; // Removed direct import

export type CommunitySettings = {
  id: number;
  community_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  welcome_message_title: string | null;
  welcome_message_body: string | null;
  created_at: string;
  updated_at: string;
};

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
        // Call the API route instead of direct function
        fetch(`/api/community/settings?community_id=${community_id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.settings) {
              setCommunitySettings(data.settings);
            } else {
              console.error('Failed to fetch community settings from API:', data.error);
              setCommunitySettings(null);
            }
          })
          .catch((err) => {
            console.error('Error fetching community settings API:', err);
            setCommunitySettings(null);
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

