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
  const [showHelp, setShowHelp] = useState(false);
  const disabled = !/^biz_/i.test(biz.trim()) || loading;

  async function bind() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/resolve/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, business_id: biz.trim() }),
      });
      let payload: any = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        payload = await res.json().catch(() => ({}));
      } else {
        // tolerate empty or non‑JSON responses
        await res.text().catch(() => '');
        payload = {};
      }
      if (!res.ok || (payload && payload.ok === false)) {
        throw new Error((payload && payload.error) || `Request failed (${res.status})`);
      }
      location.reload();
    } catch (e: any) {
      setErr(e?.message || 'Binding failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm mt-4">
      <div className="font-semibold mb-1 text-yellow-800">Finish setup</div>
      <p className="text-sm text-yellow-700">
        To complete setup, please enter your Whop <span className="font-medium">Business ID</span>. 
        You only need to do this once, and it will connect this app to your community automatically.
      </p>
      <div className="mt-2 text-xs text-yellow-600">Host: <code>{host}</code></div>
      <div className="mt-3 flex gap-2">
        <input
          value={biz}
          onChange={(e)=>setBiz(e.target.value)}
          placeholder="biz_XXXXXXXX"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={bind}
          disabled={disabled}
          className="rounded-lg px-4 py-2 text-sm text-white bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 transition"
        >
          {loading ? 'Binding…' : 'Bind'}
        </button>
      </div>
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
      <button
        type="button"
        onClick={() => setShowHelp(v => !v)}
        className="mt-2 text-xs underline underline-offset-2 text-yellow-600 hover:text-yellow-800"
      >
        {showHelp ? 'Hide help' : 'Where do I find this?'}
      </button>
      {showHelp && (
        <div className="mt-2 text-xs text-yellow-700 space-y-1 rounded-lg border border-yellow-200 bg-yellow-100 p-3">
          <p><span className="font-semibold">How to find it:</span></p>
          <ol className="list-decimal ms-5 space-y-1">
            <li>Open Whop in another tab and go to your <span className="font-medium">Business Dashboard</span>.</li>
            <li>Look at the <span className="font-medium">URL</span> in your browser. Example: <code>https://whop.com/business/biz_ABC12345</code></li>
            <li>Copy the part that starts with <code>biz_</code> (e.g., <code>biz_ABC12345</code>).</li>
            <li>Paste it here and press <span className="font-medium">Bind</span>.</li>
          </ol>
          <p className="opacity-80">Tip: You only do this once per community. Future visits work automatically.</p>
        </div>
      )}
    </div>
  );
}
