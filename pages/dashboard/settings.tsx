import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCommunitySettings, CommunitySettings } from '../../pages/_app'; // Use the type from _app
// import { updateCommunitySettings } from '../../lib/supabaseUtils'; // Removed direct import

const DashboardSettings = () => {
  console.log('[DashboardSettings] Component rendered.');
  const router = useRouter();
  const communitySettings = useCommunitySettings();
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null); // New state for file upload
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
      let newLogoUrl = logoUrl; // Start with existing or manually entered URL

      if (logoFile) {
        console.log('[DashboardSettings] Logo file detected, attempting upload...');
        const formData = new FormData();
        formData.append('logo', logoFile);
        formData.append('communityId', community_id);

        const uploadRes = await fetch('/api/upload-logo', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (uploadData.success && uploadData.imageUrl) {
          console.log('[DashboardSettings] Logo uploaded successfully:', uploadData.imageUrl);
          newLogoUrl = uploadData.imageUrl; // Update logo URL with the uploaded one
        } else {
          console.error('[DashboardSettings] Logo upload failed:', uploadData.error);
          setError(`Logo upload failed: ${uploadData.error || 'Unknown error'}`);
          return; // Stop if logo upload fails
        }
      }

      const settingsToUpdate = {
        logo_url: newLogoUrl || null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
        welcome_message_title: welcomeMessageTitle || null,
        welcome_message_body: welcomeMessageBody || null,
      };
      console.log('[DashboardSettings] Attempting to update settings for communityId:', community_id);
      console.log('[DashboardSettings] Settings payload:', settingsToUpdate);

      // Call the API route instead of direct function
      const res = await fetch(`/api/community/settings?community_id=${community_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToUpdate),
      });

      const data = await res.json();

      if (data.success && data.settings) {
        console.log('[DashboardSettings] Settings saved successfully:', data.settings);
        setMessage('Settings saved successfully!');
        // Optionally, re-fetch settings in _app.tsx or update context directly
      } else {
        console.error('[DashboardSettings] Failed to save settings. API returned:', data.error);
        setError(`Failed to save settings: ${data.error || 'Unknown error'}. Check Vercel logs for API details.`);
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
          <label htmlFor="logoUrl">Current Logo URL:</label>
          <input
            type="text"
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
            placeholder="Enter URL or upload a new logo"
          />
          {logoUrl && <img src={logoUrl} alt="Current Logo" style={{ maxWidth: '100px', marginTop: '10px' }} />}
        </div>
        <div>
          <label htmlFor="logoUpload">Upload New Logo:</label>
          <input
            type="file"
            id="logoUpload"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label htmlFor="primaryColor">Primary Color (Hex):</label>
          <input
            type="color"
            id="primaryColor"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label htmlFor="secondaryColor">Secondary Color (Hex):</label>
          <input
            type="color"
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
