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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true); // New loading state

  useEffect(() => {
    if (communitySettings) {
      setLogoUrl(communitySettings.logo_url || '');
      setPrimaryColor(communitySettings.primary_color || '');
      setSecondaryColor(communitySettings.secondary_color || '');
      setWelcomeMessageTitle(communitySettings.welcome_message_title || '');
      setWelcomeMessageBody(communitySettings.welcome_message_body || '');
      setIsLoadingSettings(false); // Settings loaded
    } else if (router.isReady && !router.query.community_id) {
      // If router is ready and no community_id, then we're done trying to load
      setIsLoadingSettings(false);
      setError('Community ID is missing from the URL. Please ensure you access this page with a valid community_id.');
    }
  }, [communitySettings, router.isReady, router.query.community_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DashboardSettings] Save button clicked, handleSubmit initiated.');
    setMessage('');
    setError('');
    setIsSaving(true);

    const { community_id } = router.query;
    if (typeof community_id !== 'string' || !community_id) {
      setError('Community ID not found. Cannot save settings.');
      console.error('[DashboardSettings] Community ID not found or invalid:', community_id);
      setIsSaving(false);
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
          setIsSaving(false);
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
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <p className="text-neutral-700 text-lg">Loading app settings...</p>
      </div>
    );
  }

  if (error && error.includes('Community ID is missing')) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <p className="mt-2">Please go back to the landing page and click "Configurar" to include the community ID.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <main className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-center text-4xl font-serif font-bold text-neutral-900 mb-8">Community Settings</h1>

        {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert"><span className="block sm:inline">{message}</span></div>}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert"><span className="block sm:inline">{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo Settings */}
          <section className="p-6 border border-neutral-200 rounded-lg shadow-sm bg-neutral-50">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Logo & Branding</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="logoUpload" className="block text-neutral-700 text-sm font-medium mb-2">Upload New Logo:</label>
                <input
                  type="file"
                  id="logoUpload"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {logoFile && <p className="mt-2 text-sm text-neutral-600">Selected: {logoFile.name}</p>}
              </div>
              <div>
                <label htmlFor="logoUrl" className="block text-neutral-700 text-sm font-medium mb-2">Or Current Logo URL:</label>
                <input
                  type="text"
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Enter URL for your logo"
                />
                {logoUrl && <img src={logoUrl} alt="Current Logo" className="mt-4 max-w-[150px] h-auto rounded-lg border border-neutral-200 shadow-sm mx-auto" />}
              </div>
            </div>
          </section>

          {/* Color Settings */}
          <section className="p-6 border border-neutral-200 rounded-lg shadow-sm bg-neutral-50">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Color Palette</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="primaryColor" className="block text-neutral-700 text-sm font-medium mb-2">Primary Color:</label>
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full h-12 border border-neutral-300 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="secondaryColor" className="block text-neutral-700 text-sm font-medium mb-2">Secondary Color:</label>
                <input
                  type="color"
                  id="secondaryColor"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full h-12 border border-neutral-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* Welcome Message Settings */}
          <section className="p-6 border border-neutral-200 rounded-lg shadow-sm bg-neutral-50">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Welcome Message</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="welcomeMessageTitle" className="block text-neutral-700 text-sm font-medium mb-2">Message Title:</label>
                <input
                  type="text"
                  id="welcomeMessageTitle"
                  value={welcomeMessageTitle}
                  onChange={(e) => setWelcomeMessageTitle(e.target.value)}
                  placeholder="e.g., Welcome to Our Community!"
                />
              </div>
              <div>
                <label htmlFor="welcomeMessageBody" className="block text-neutral-700 text-sm font-medium mb-2">Message Body:</label>
                <textarea
                  id="welcomeMessageBody"
                  value={welcomeMessageBody}
                  onChange={(e) => setWelcomeMessageBody(e.target.value)}
                  rows={5}
                  placeholder="Tell your new members what to expect."
                />
              </div>
            </div>
          </section>

          <button type="submit" disabled={isSaving} className="btn w-full text-lg px-8 py-3 transform hover:scale-105 transition-transform duration-200">
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default DashboardSettings;
