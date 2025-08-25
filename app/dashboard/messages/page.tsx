'use client';
import { useState, useEffect } from 'react';
import useCreatorId from '@/components/useCreatorId';

interface MessagesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function MessagesPage({ searchParams }: MessagesPageProps) {
  const { creatorId, unresolved } = useCreatorId(searchParams);
  const [templates, setTemplates] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function load() {
    if (!creatorId) return;
    const r = await fetch(`/api/templates/${encodeURIComponent(creatorId)}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.templates) setTemplates(j.templates);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [creatorId]);

  async function createFirstTemplate() {
    setErr(null);
    if (!creatorId || unresolved) { setErr('Finish setup on Home to connect your Whop Business.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(creatorId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Welcome Message',
          content: 'Hi {{member_name}}, welcome to {{community_name}}! Tap here to answer a couple of quick questions: {{onboarding_link}}',
          is_default: true,
          steps: null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || `Request failed (${res.status})`);
      await load();
      // TODO: set selected template = j.id if you have an editor pane
    } catch (e:any) {
      setErr(e.message || 'Could not create template.');
    } finally {
      setBusy(false);
    }
  }

  // Empty state
  if ((templates?.length ?? 0) === 0) {
    return (
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
          {err && <div className="mt-3 text-sm text-red-300">{err}</div>}
          <div className="mt-4">
            <a href={`/app${creatorId ? `?community_id=${encodeURIComponent(creatorId)}` : ''}`} className="text-white/80 underline">← Back to App</a>
          </div>
        </div>
      </div>
    );
  }

  // TODO: render list + editor. For now, list names to prove it works:
  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {templates.map(t => (
        <div key={t.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="font-medium">{t.name} {t.is_default ? <span className="text-xs text-green-300 ml-2">default</span> : null}</div>
          <pre className="whitespace-pre-wrap text-sm text-white/80 mt-1">{t.content}</pre>
        </div>
      ))}
    </div>
  );
}
