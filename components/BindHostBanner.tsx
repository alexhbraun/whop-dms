'use client';
import { useState } from 'react';

export default function BindHostBanner({
  host,
}: {
  host: string;
}) {
  const [biz, setBiz] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const disabled = !biz || loading || !/^biz_/i.test(biz.trim());

  async function bind() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/resolve/host', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ host, business_id: biz.trim() }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j?.error || 'Binding failed');
      location.reload();
    } catch (e:any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl p-4 shadow-xl mt-4">
      <div className="font-semibold mb-1">Bind this installation</div>
      <p className="text-sm text-white/80 dark:text-white/70">
        We couldn&apos;t auto-resolve this embed host. Enter the Whop <span className="font-medium">Business ID</span> to bind it once.
      </p>
      <div className="mt-2 text-xs text-white/60">Host: <code>{host}</code></div>
      <div className="mt-3 flex gap-2">
        <input
          value={biz}
          onChange={(e)=>setBiz(e.target.value)}
          placeholder="biz_XXXXXXXX"
          className="w-full rounded-lg border border-white/20 bg-white/70 dark:bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={bind}
          disabled={disabled}
          className="rounded-lg px-4 py-2 text-sm text-white bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 transition"
        >
          {loading ? 'Binding…' : 'Bind'}
        </button>
      </div>
      {err && <div className="mt-2 text-sm text-red-300">{err}</div>}
      <p className="mt-2 text-xs text-white/60">Tip: Only needed once per community. Future loads resolve automatically.</p>
    </div>
  );
}
