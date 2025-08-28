'use client';
import { useEffect, useState } from 'react';

type Section = { title: string; body: any };

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string|null>(null);
  const [communityId, setCommunityId] = useState('');
  const [host, setHost] = useState('');
  const [probe, setProbe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if we're in development or have proper token
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const qs = new URLSearchParams(window.location.search);
      const token = qs.get('token');
      const diagnosticsToken = process.env.NEXT_PUBLIC_DIAGNOSTICS_TOKEN;
      
      if (!token || !diagnosticsToken || token !== diagnosticsToken) {
        setErr('Access denied. This page is only available in development or with proper token.');
        return;
      }
    }
  }, []);

  async function run() {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (communityId) q.set('community_id', communityId);
      if (host) q.set('host', host);
      if (probe) q.set('probe_webhook', '1');
      const r = await fetch(`/api/diagnostics?${q.toString()}`, { cache: 'no-store' });
      const j = await r.json();
      setData(j);
      if (!r.ok) setErr('Diagnostics returned an error status');
    } catch (e:any) { 
      setErr(e.message || 'failed'); 
    } finally {
      setLoading(false);
    }
  }

  function Badge({ ok }: { ok?: boolean }) {
    return ok ? <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 font-medium">PASS</span>
              : <span className="rounded-full bg-rose-100 text-rose-700 text-xs px-2 py-0.5 font-medium">FAIL</span>;
  }

  function Row({ label, value }: { label: string; value: any }) {
    return (
      <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-800 min-w-0 flex-shrink-0">{label}</div>
        <pre className="text-xs text-gray-600 max-w-[60%] overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(value, null, 2)}</pre>
      </div>
    );
  }

  if (err && err.includes('Access denied')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-sky-100 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
            <p className="text-red-600">{err}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-sky-100 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            E2E Diagnostics
          </h1>
          <p className="text-xl text-gray-600 mt-2">Verify readiness for the end-to-end test</p>
          <p className="text-sm text-gray-500 mt-1">(Development only)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Parameters</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Community ID</label>
              <input 
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="biz_…"
                value={communityId}
                onChange={e=>setCommunityId(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Embed Host</label>
              <input 
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="hr…apps.whop.com"
                value={host}
                onChange={e=>setHost(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input 
                  type="checkbox" 
                  checked={probe} 
                  onChange={(e)=>setProbe(e.target.checked)}
                  className="rounded"
                />
                Probe webhook reachability
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button 
              onClick={run} 
              disabled={loading}
              className="rounded-lg bg-indigo-600 text-white text-sm px-6 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Running checks...' : 'Run Diagnostics'}
            </button>
            {err && <div className="text-sm text-red-600">{err}</div>}
          </div>
        </div>

        {data && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Overall Summary</h2>
                <Badge ok={
                  data?.envs?.ok &&
                  data?.supabase?.ok &&
                  data?.schema?.dm_templates?.ok &&
                  data?.schema?.community_settings?.ok &&
                  data?.binding?.ok !== false &&
                  data?.templates?.ok !== false
                }/>
              </div>
              <Row label="Timestamp" value={data.timestamp}/>
              <Row label="Input Parameters" value={data.input}/>
            </div>

            {/* Individual Check Cards */}
            {[
              { key: 'envs', title: 'Environment Variables', description: 'Required environment variables presence' },
              { key: 'supabase', title: 'Supabase Connectivity', description: 'Database connection and table access' },
              { key: 'schema', title: 'Database Schema', description: 'Required tables and structure' },
              { key: 'binding', title: 'Host Binding', description: 'Whop embed host to business ID mapping' },
              { key: 'settings', title: 'Community Settings', description: 'Settings configuration and webhook setup' },
              { key: 'templates', title: 'DM Templates', description: 'Default welcome message template' },
              { key: 'questions', title: 'Onboarding Questions', description: 'User onboarding form questions' }
            ].map(({ key, title, description }) => (
              <div key={key} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                  <Badge ok={data?.[key]?.ok ?? (typeof data?.[key] === 'object' ? undefined : true)} />
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(data?.[key], null, 2)}
                  </pre>
                </div>
              </div>
            ))}

            {/* Help Section */}
            <div className="bg-blue-50 rounded-2xl shadow-sm p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Fix Issues</h3>
              <div className="space-y-3 text-sm text-blue-700">
                <div><strong>envs FAIL:</strong> Set missing environment variables in Vercel Project Settings</div>
                <div><strong>supabase FAIL:</strong> Check SUPABASE_URL and SERVICE_KEY, verify table permissions</div>
                <div><strong>schema FAIL:</strong> Run database migrations or create missing tables</div>
                <div><strong>binding FAIL:</strong> Add host mapping in host_map table via /api/resolve/host</div>
                <div><strong>settings FAIL:</strong> Save settings once in the Settings UI to create defaults</div>
                <div><strong>templates FAIL:</strong> Create a DM template and mark it as default</div>
                <div><strong>questions INFO:</strong> Optional - create onboarding questions if needed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

