'use client';
import { useEffect, useMemo, useState } from 'react';
import useCreatorId from '@/components/useCreatorId';
import InfoCard from '@/components/InfoCard'; // Import InfoCard
import Link from 'next/link'; // Explicitly import Link

interface MessagesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function MessagesPage({ searchParams }: MessagesPageProps) {
  const { creatorId, unresolved } = useCreatorId(searchParams);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftDefault, setDraftDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!creatorId) return;
    const r = await fetch(`/api/templates/${encodeURIComponent(creatorId)}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.templates) {
      setTemplates(j.templates);
      if (!selectedId && j.templates.length) {
        const first = j.templates[0];
        setSelectedId(first.id);
        setDraftName(first.name || '');
        setDraftContent(first.content || '');
        setDraftDefault(Boolean(first.is_default));
      }
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [creatorId]);

  // hotkey save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const current = useMemo(() => templates.find(t => t.id === selectedId) || null, [templates, selectedId]);
  useEffect(() => {
    if (!current) return;
    setDraftName(current.name || '');
    setDraftContent(current.content || '');
    setDraftDefault(Boolean(current.is_default));
  }, [current?.id]);

  async function save() {
    setErr(null);
    if (!selectedId) return;
    if (!draftName.trim() || !draftContent.trim()) { setErr('Name and content are required.'); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/templates/item/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draftName.trim(), content: draftContent, is_default: draftDefault }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.error || `Save failed (${r.status})`);
      await load();
    } catch (e:any) {
      setErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!selectedId) return;
    if (!confirm('Delete this template? This cannot be undone.')) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/templates/item/${selectedId}`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.error || `Delete failed (${r.status})`);
      // reload and pick another
      await load();
      const remaining = templates.filter(t => t.id !== selectedId);
      setSelectedId(remaining[0]?.id || null);
    } catch (e:any) {
      setErr(e.message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  }

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
      setSelectedId(j.id); // Select the newly created template
    } catch (e:any) {
      setErr(e.message || 'Could not create template.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4"> {/* Removed container flex-grow py-8 and header, replaced with simple div and space-y-4 */}
      {unresolved && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm mb-4 max-w-3xl mx-auto text-red-800 text-center">
          <div className="font-semibold mb-1">Unresolved Creator ID</div>
          <p className="text-sm text-red-600">You must finish setup on the Home screen to manage DM templates.</p>
          <Link href="/app" className="mt-2 text-xs underline underline-offset-2 text-red-600 hover:text-red-800">Go to Home</Link>
        </div>
      )}

      {/* Main content grid */}
      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* List Column */}
        <div className="md:col-span-1 space-y-2">
          {templates.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <div className="text-lg font-semibold mb-2 text-gray-800">No DM Templates Yet</div>
              <p className="text-sm text-gray-600 mb-4">Start by creating your first welcome message template.</p>
              <button
                onClick={createFirstTemplate}
                disabled={busy || unresolved}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'Creating…' : '＋ Create First Template'}
              </button>
              {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
            </div>
          ) : (
            templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-xl border p-3 shadow-sm ${selectedId === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800">{t.name}</div>
                  {t.is_default ? <span className="text-xs text-green-600">default</span> : null}
                </div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{t.content}</div>
              </button>
            ))
          )}
        </div>

        {/* Editor Column */}
        <div className="md:col-span-2 space-y-4">
          <InfoCard />
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {!current ? (
              <div className="text-gray-600">Select a template to edit.</div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={draftName}
                    onChange={(e)=>setDraftName(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Template name"
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={draftDefault} onChange={(e)=>setDraftDefault(e.target.checked)} />
                    Set as default
                  </label>
                </div>

                <textarea
                  value={draftContent}
                  onChange={(e)=>setDraftContent(e.target.value)}
                  rows={10}
                  className="mt-3 w-full font-mono text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Write your welcome message…"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                  <div>
                    <span className="opacity-80">Variables:</span>{' '}
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">{'{{member_name}}'}</code>,
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">{'{{community_name}}'}</code>,
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">{'{{onboarding_link}}'}</code>
                  </div>
                  <div>{draftContent.length} chars</div>
                </div>

                {err && <div className="mt-2 text-sm text-red-600">{err}</div>}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-lg px-4 py-2 text-sm text-white bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 transition"
                  >
                    {saving ? 'Saving…' : 'Save (⌘/Ctrl+S)'}
                  </button>
                  <button
                    onClick={del}
                    disabled={saving}
                    className="rounded-lg px-4 py-2 text-sm text-gray-700 border border-gray-300 hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
