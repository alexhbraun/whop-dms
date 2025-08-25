'use client';
import { useEffect, useState } from 'react';
import useCreatorId from '@/components/useCreatorId';
import Link from 'next/link';

export default function SettingsPage({ searchParams }: { searchParams?: any }) {
  const { creatorId, unresolved } = useCreatorId(searchParams);
  const [requireEmail, setRequireEmail] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [webhookUrlError, setWebhookUrlError] = useState<string|null>(null); // New state for webhook URL error
  const [ok, setOk] = useState(false);

  async function load() {
    if (!creatorId) return;
    setLoading(true);
    setError(null);
    setWebhookUrlError(null); // Clear webhook error on load
    try {
      const r = await fetch(`/api/settings/${encodeURIComponent(creatorId)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.error || `Load failed (${r.status})`);
      setRequireEmail(Boolean(j.settings?.require_email));
      setWebhookUrl(j.settings?.webhook_url || '');
    } catch (e:any) {
      setError(e.message || 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [creatorId]);

  async function save() {
    if (!creatorId) return;
    setSaving(true); setError(null); setOk(false); setWebhookUrlError(null); // Clear errors on save attempt
    try {
      const r = await fetch(`/api/settings/${encodeURIComponent(creatorId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ require_email: requireEmail, webhook_url: webhookUrl || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) {
        // Handle specific webhook URL error
        if (r.status === 400 && j.error && j.error.includes('Webhook URL')) {
          setWebhookUrlError(j.error);
        } else {
          setError(j.error || `Save failed (${r.status})`);
        }
        throw new Error('Save failed'); // To jump to catch block
      }
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (e:any) {
      // General error is already set or webhookUrlError is set, no need to set here unless it's truly a new generic error
      if (!error && !webhookUrlError) {
        setError(e.message || 'Could not save settings.');
      }
    } finally {
      setSaving(false);
    }
  }

  const disabled = unresolved || saving || loading;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight">App Settings</h1>
      <p className="mt-1 text-white/80">Configure your integration.</p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
        <div className="text-lg font-semibold">General Settings</div>
        <div className="mt-4 space-y-6">
          {/* Require email */}
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={requireEmail}
              onChange={(e)=>setRequireEmail(e.target.checked)}
              disabled={disabled}
            />
            <div>
              <div className="font-medium">Require email on onboarding</div>
              <div className="text-sm text-white/80">
                New members will be asked for their email address. This is recommended if you plan to follow up outside Whop.
              </div>
            </div>
          </label>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium mb-1">Forward leads to webhook URL</label>
            <input
              type="url"
              placeholder="https://your-crm.com/lead-webhook"
              value={webhookUrl}
              onChange={(e)=>setWebhookUrl(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-white/20 bg-white/70 dark:bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {webhookUrlError && <div className="mt-1 text-sm text-red-300">{webhookUrlError}</div>}
            <p className="mt-1 text-xs text-white/70">
              We’ll POST each captured lead to this URL. Leave blank to disable forwarding.
            </p>
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-300">{error}</div>}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={disabled}
            className="rounded-lg px-4 py-2 text-sm text-white bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 transition"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {ok && <div className="text-sm text-green-300">✅ Settings saved</div>}
          <div className="ms-auto">
            <Link href={`/app${creatorId ? `?community_id=${encodeURIComponent(creatorId)}` : ''}`} className="text-white/80 underline">
              ← Back to App
            </Link>
          </div>
        </div>
      </div>

      {unresolved && (
        <p className="mt-3 text-sm text-amber-300/90">
          Finish setup on Home to connect this app to your Whop Business.
        </p>
      )}
    </div>
  );
}
