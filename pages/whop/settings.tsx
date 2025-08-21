import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

interface Settings {
  requireEmail?: boolean;
  forwardWebhookUrl?: string;
  // Add other settings here as needed
}

export default function WhopSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({});
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you'd get the token from an auth context or URL param
    // For this example, let's assume token is passed via query for simplicity/testing
    const { token: queryToken } = router.query;
    if (typeof queryToken === 'string' && queryToken) {
      setToken(queryToken);
      // In a real app, you'd fetch current settings here first using this token
      // fetchSettings(queryToken);
    } else {
      // No token, maybe redirect to an error or login page
      setLoading(false);
      toast.error('Missing authentication token.');
    }
  }, [router.query]);

  const handleSave = async () => {
    if (!token) {
      toast.error('Authentication token is missing.');
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
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save settings.');
      }

      toast.success('Settings saved successfully!');
    } catch (e: any) {
      console.error('Error saving settings:', e);
      toast.error(e.message || 'Error saving settings.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !token) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">App Settings</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-blue-600"
              checked={settings.requireEmail || false}
              onChange={(e) => setSettings({ ...settings, requireEmail: e.target.checked })}
            />
            <span className="ml-2 text-gray-700">Require email for lead forms</span>
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="webhookUrl">
            Forward leads to webhook URL:
          </label>
          <input
            type="text"
            id="webhookUrl"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={settings.forwardWebhookUrl || ''}
            onChange={(e) => setSettings({ ...settings, forwardWebhookUrl: e.target.value })}
            placeholder="e.g., https://your-crm.com/webhook"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

