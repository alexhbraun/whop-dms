import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast, { Toaster } from 'react-hot-toast';
// import { DMTemplate, DMTemplateStep } from '../api/dm-templates'; // Removed DMTemplate types
import useCreatorId from '@/components/useCreatorId'; // Import the new hook

interface AppSettings {
  requireEmail?: boolean;
  forwardWebhookUrl?: string;
  // Add other settings here as needed
}

export default function WhopSettingsPage() {
  const router = useRouter();
  const creatorId = useCreatorId(); // Use the new hook
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const [token, setToken] = useState<string | null>(null);
  // const [communityId, setCommunityId] = useState<string | null>(null); // Removed, now using creatorId

  // Removed: State for DM Templates
  // const [dmTemplates, setDmTemplates] = useState<DMTemplate[]>([]);
  // const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  // const [editingTemplate, setEditingTemplate] = useState<DMTemplate | null>(null);
  // const [newTemplateName, setNewTemplateName] = useState('');
  // const [isTemplateSaving, setIsTemplateSaving] = useState(false);

  useEffect(() => {
    const { token: queryToken, community_id: queryCommunityId } = router.query;

    if (typeof queryToken === 'string' && queryToken) {
      setToken(queryToken);
    }

    // Using creatorId from hook now
    if (creatorId && creatorId !== 'unknown') {
      // Placeholder for fetching app settings using creatorId
      // fetchAppSettings(creatorId);
      setLoading(false); // Assume loaded for now until actual fetch is implemented
    } else {
      setLoading(false);
      toast.error('Community ID not found. Cannot load app settings.');
    }
  }, [router.query, creatorId]);

  // Removed: fetchDmTemplates function

  const handleSaveAppSettings = async () => {
    if (!token) {
      toast.error('Authentication token is missing.');
      return;
    }
    if (!creatorId || creatorId === 'unknown') {
      toast.error('Community ID is missing. Cannot save app settings.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: appSettings, community_id: creatorId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save settings.');
      }

      toast.success('App Settings saved successfully!');
    } catch (e: any) {
      console.error('Error saving app settings:', e);
      toast.error(e.message || 'Error saving app settings.');
    } finally {
      setLoading(false);
    }
  };

  // Removed: DM Template Handlers

  if (loading || creatorId === 'unknown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600 text-lg">Loading app settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster />
      <main className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-8">App Settings</h1>

        {/* General App Settings */}
        <section className="bg-white shadow rounded-lg p-6 space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">General Settings</h2>
          <div>
            <label htmlFor="requireEmail" className="flex items-center cursor-pointer mb-2">
              <input
                type="checkbox"
                id="requireEmail"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                checked={appSettings.requireEmail || false}
                onChange={(e) => setAppSettings({ ...appSettings, requireEmail: e.target.checked })}
              />
              <span className="ml-3 text-sm font-medium text-neutral-800">Require email for lead forms</span>
            </label>
            <p className="text-xs text-neutral-500 ml-7">If enabled, users will always be prompted for their email address in lead capture forms.</p>
          </div>

          <div>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-neutral-800 mb-2">
              Forward leads to webhook URL:
            </label>
            <input
              type="text"
              id="webhookUrl"
              value={appSettings.forwardWebhookUrl || ''}
              onChange={(e) => setAppSettings({ ...appSettings, forwardWebhookUrl: e.target.value })}
              placeholder="e.g., https://your-crm.com/webhook"
              className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-neutral-500 mt-2">All captured leads will be automatically forwarded to this endpoint.</p>
          </div>

          <button
            onClick={handleSaveAppSettings}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-4 py-2 w-full mt-4"
          >
            {loading ? 'Saving App Settings...' : 'Save App Settings'}
          </button>
        </section>

        {/* Removed: DM Templates Management */}
      </main>
    </div>
  );
}

