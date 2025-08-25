'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import { useState } from 'react';

function LeadsPageContent() {
  const searchParams = useSearchParams();
  const { creatorId, host, source, unresolved } = useCreatorId(searchParams); // Updated destructuring
  const [bindBusinessId, setBindBusinessId] = useState<string>('');
  const [bindError, setBindError] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState<boolean>(false);

  const shouldShowBindCard = unresolved; // Simplified condition

  const handleBind = async () => {
    if (!bindBusinessId || !host) { // Use host directly
      setBindError('Business ID and Host are required.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(bindBusinessId)) {
      setBindError('Business ID must be alphanumeric and underscores only.');
      return;
    }

    setIsBinding(true);
    setBindError(null);
    try {
      const res = await fetch('/api/resolve/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host, business_id: bindBusinessId }), // Use host directly
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to bind host.');
      }
      window.location.reload();
    } catch (e: any) {
      setBindError(e.message || 'An unexpected error occurred during binding.');
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">Leads</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">View and export member responses.</p>
        {process.env.NODE_ENV !== 'production' && (
          <div className="text-lg text-white/60">
            Installed for: <span className="font-medium text-white">{creatorId || '—'}</span>
            {host && <span className="text-white/50 ml-2">· host: {host}</span>}
            {source && <span className="text-white/50 ml-2">· source: {source}</span>}
          </div>
        )}
      </header>

      {shouldShowBindCard && (
        <div className="glass-card border-purple-500/30 bg-purple-500/10 dark:bg-purple-500/5 p-6 rounded-lg text-purple-100 text-sm max-w-lg mx-auto mb-8 shadow-inner">
          <h3 className="text-xl font-semibold mb-3">Bind this Installation</h3>
          <p className="mb-4">It looks like your community ID isn't automatically detected. Please enter your Whop Business ID below to bind this installation to your host. <span className="text-white/60 text-xs mt-1">You only need to do this once per community.</span></p>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={bindBusinessId}
              onChange={(e) => setBindBusinessId(e.target.value)}
              placeholder="Enter Whop Business ID (e.g., biz_abc123)"
              className="flex-grow px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors"
            />
            <button
              onClick={handleBind}
              disabled={isBinding || !bindBusinessId || !host}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBinding ? 'Binding…' : 'Bind'}
            </button>
          </div>
          {bindError && <p className="text-red-300 text-xs mt-2">Error: {bindError}</p>}
          <p className="text-white/60 text-xs mt-4">Your current host: <span className="font-medium">{host || 'N/A'}</span></p>
        </div>
      )}

      {unresolved && !shouldShowBindCard && (
        <div className="glass-card border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-lg text-amber-100 text-sm text-center max-w-md mx-auto mb-8 shadow-inner">
          Community ID is missing. Please access this page from the Whop sidebar or go back to <LinkWithId baseHref="/app" creatorId={creatorId} className="underline text-amber-100 hover:text-white">/app</LinkWithId>.
        </div>
      )}

      <div className="glass-card rounded-2xl p-6 shadow space-y-4 text-white/90">
        <h2 className="text-2xl font-semibold">Onboarding Responses</h2>
        {creatorId ? (
          <p className="text-white/70">Showing responses for <b>{creatorId}</b>. (Wire up table here.)</p>
        ) : (
          <p className="text-amber-300">Missing community ID to load leads.</p>
        )}
        <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline text-white/70 hover:text-white">← Back to App</LinkWithId>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="text-white/70 text-center py-12">Loading leads...</div>}>
      <LeadsPageContent />
    </Suspense>
  );
}
