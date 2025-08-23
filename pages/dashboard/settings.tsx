import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCommunitySettings } from '../../pages/_app'; // Corrected import path for useCommunitySettings
import { updateCommunitySettings } from '../../lib/supabaseUtils'; // Kept for updateCommunitySettings

const DashboardSettings = () => {
  console.log('[DashboardSettings] Component rendered.');
  const router = useRouter();
  const communitySettings = useCommunitySettings();
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [welcomeMessageTitle, setWelcomeMessageTitle] = useState('');
  const [welcomeMessageBody, setWelcomeMessageBody] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (communitySettings) {
      setLogoUrl(communitySettings.logo_url || '');
      setPrimaryColor(communitySettings.primary_color || '');
      setSecondaryColor(communitySettings.secondary_color || '');
      setWelcomeMessageTitle(communitySettings.welcome_message_title || '');
      setWelcomeMessageBody(communitySettings.welcome_message_body || '');
    }
  }, [communitySettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DashboardSettings] Save button clicked, handleSubmit initiated.');
    setMessage('');
    setError('');

    const { community_id } = router.query;
    if (typeof community_id !== 'string' || !community_id) {
      setError('Community ID not found.');
      console.error('[DashboardSettings] Community ID not found or invalid:', community_id);
      return;
    }

    try {
      const settingsToUpdate = {
        logo_url: logoUrl || null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
        welcome_message_title: welcomeMessageTitle || null,
        welcome_message_body: welcomeMessageBody || null,
      };
      console.log('[DashboardSettings] Attempting to update settings for communityId:', community_id);
      console.log('[DashboardSettings] Settings payload:', settingsToUpdate);

      const updatedSettings = await updateCommunitySettings(community_id, settingsToUpdate);

      if (updatedSettings) {
        console.log('[DashboardSettings] Settings saved successfully:', updatedSettings);
        setMessage('Settings saved successfully!');
        // Optionally, re-fetch settings in _app.tsx or update context directly
      } else {
        console.error('[DashboardSettings] Failed to save settings. updateCommunitySettings returned null.');
        setError('Failed to save settings. Check Vercel logs for details.');
      }
    } catch (err) {
      console.error('[DashboardSettings] An unexpected error occurred during save:', err);
      setError('An unexpected error occurred. Check Vercel logs for details.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>Community Settings</h1>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="logoUrl">Logo URL:</label>
          <input
            type="text"
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label htmlFor="primaryColor">Primary Color (Hex):</label>
          <input
            type="text"
            id="primaryColor"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label htmlFor="secondaryColor">Secondary Color (Hex):</label>
          <input
            type="text"
            id="secondaryColor"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label htmlFor="welcomeMessageTitle">Welcome Message Title:</label>
          <input
            type="text"
            id="welcomeMessageTitle"
            value={welcomeMessageTitle}
            onChange={(e) => setWelcomeMessageTitle(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label htmlFor="welcomeMessageBody">Welcome Message Body:</label>
          <textarea
            id="welcomeMessageBody"
            value={welcomeMessageBody}
            onChange={(e) => setWelcomeMessageBody(e.target.value)}
            rows={5}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer' }}>
          Save Settings
        </button>
      </form>
    </div>
  );
};

export default DashboardSettings;
