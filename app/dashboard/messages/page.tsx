'use client';
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import useCreatorId from '@/components/useCreatorId';
import Link from 'next/link';

interface MessagesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function MessagesPage({ searchParams }: MessagesPageProps) {
  const { creatorId, unresolved } = useCreatorId(searchParams);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null); // New state for selected template

  const load = useCallback(async () => {
    if (!creatorId) return;
    const r = await fetch(`/api/templates/${encodeURIComponent(creatorId)}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.templates) setTemplates(j.templates); // Make sure 'templates' is actually on 'j'
  }, [creatorId]);

  useEffect(() => {
    load();
  }, [load]); // Depend on load

  async function createFirstTemplate() {
    setErr(null);
    if (!creatorId || unresolved) { setErr('Finish setup first.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(creatorId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Welcome Message',
          content: 'Hi {{member_name}}, welcome to {{community_name}}! Tap here to answer a couple of quick questions: {{onboarding_link}}',
          is_default: true
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || `Request failed (${res.status})`);
      await load();
      setSelectedTemplateId(j.id); // Optionally: scroll to editor or set selected template id = j.id
    } catch (e: any) {
      setErr(e.message || 'Could not create template.');
    } finally {
      setBusy(false);
    }
  }

  // Empty state
  if (templates.length === 0) {
    return (unresolved ? (
      <div className="rounded-2xl border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl p-4 shadow-xl mt-4 max-w-3xl mx-auto">
        <div className="font-semibold mb-1">Finish setup</div>
        <p className="text-sm text-white/80 dark:text-white/70">Finish setup on the Home screen to connect this app to your Whop Business.</p>
        <Link href="/app" className="mt-2 text-xs underline underline-offset-2 text-white/80 hover:text-white">Go to Home</Link>
      </div>
    ) : (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl p-6 text-center">
          <div className="text-lg font-semibold mb-2">No DM Templates Yet</div>
          <p className="text-sm text-white/80 mb-4">Start by creating your first welcome message template.</p>
          <button
            onClick={createFirstTemplate}
            disabled={busy || unresolved}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Creating…' : '＋ Create First Template'}
          </button>
          {err && <div className="mt-3 text-sm text-red-300">Error: {err}</div>}
        </div>
      </div>
    ));
  }

  // ...render the normal two‑pane editor here using `templates`
  // For now, let's just display a message and the templates for debugging
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-xl font-bold mb-4">DM Templates</h2>
      {unresolved && (
        <div className="rounded-2xl border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl p-4 shadow-xl mt-4 mb-4 text-red-300">
          <div className="font-semibold mb-1">Unresolved Creator ID</div>
          <p className="text-sm text-white/80 dark:text-white/70">You must finish setup on the Home screen to manage DM templates.</p>
          <Link href="/app" className="mt-2 text-xs underline underline-offset-2 text-white/80 hover:text-white">Go to Home</Link>
        </div>
      )}
      {templates.length > 0 && (
        <ul className="space-y-2">
          {templates.map((template: any) => (
            <li key={template.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="font-semibold">Name: {template.name}</div>
              <div className="text-sm text-white/70">Content: {template.content}</div>
              <div className="text-xs text-white/50">Default: {template.is_default ? 'Yes' : 'No'}</div>
              <div className="text-xs text-white/50">ID: {template.id}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
