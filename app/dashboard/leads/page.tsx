'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import { useState } from 'react';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/PageHeader';

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
    <div className="container flex-grow py-8 px-6">
      <PageHeader title="Leads" subtitle="View and export member responses" />
      
      {process.env.NODE_ENV !== 'production' && (
        <div className="text-lg text-gray-500 text-center mb-6">
          Installed for: <span className="font-medium text-gray-800">{creatorId || '—'}</span>
          {host && <span className="text-gray-400 ml-2">· host: {host}</span>}
          {source && <span className="text-gray-400 ml-2">· source: {source}</span>}
        </div>
      )}

      {shouldShowBindCard && (
        <div className="nexo-card max-w-lg mx-auto mb-8">
          <h3 className="text-xl font-semibold mb-3 text-brand-charcoal">Bind this Installation</h3>
          <p className="mb-4 text-gray-600">It looks like your community ID isn't automatically detected. Please enter your Whop Business ID below to bind this installation to your host. <span className="text-brand-coral text-xs mt-1">You only need to do this once per community.</span></p>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={bindBusinessId}
              onChange={(e) => setBindBusinessId(e.target.value)}
              placeholder="Enter Whop Business ID (e.g., biz_abc123)"
              className="flex-grow px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-colors"
            />
            <Button
              onClick={handleBind}
              disabled={isBinding || !bindBusinessId || !host}
              variant="brand"
            >
              {isBinding ? 'Binding…' : 'Bind'}
            </Button>
          </div>
          {bindError && <p className="text-red-600 text-xs mt-2">Error: {bindError}</p>}
          <p className="text-brand-coral text-xs mt-4">Your current host: <span className="font-medium">{host || 'N/A'}</span></p>
        </div>
      )}

      {unresolved && !shouldShowBindCard && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 text-sm text-center max-w-md mx-auto mb-8 shadow-sm">
          Community ID is missing. Please access this page from the Whop sidebar or go back to <LinkWithId baseHref="/app" creatorId={creatorId} className="underline text-amber-600 hover:text-amber-800">/app</LinkWithId>.
        </div>
      )}

      <div className="nexo-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-brand-charcoal">Onboarding Responses</h2>
          <Button variant="secondary" disabled>
            Export CSV
          </Button>
        </div>
        {creatorId ? (
          <div className="space-y-4">
            <p className="text-gray-600">Showing responses for <b className="text-brand-charcoal">{creatorId}</b>. (Wire up table here.)</p>
            <div className="bg-brand-gray rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-2">Sample lead data (placeholder)</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-brand-charcoal">john@example.com</span>
                  <span className="text-xs text-gray-500">2024-01-08</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-brand-charcoal">jane@example.com</span>
                  <span className="text-xs text-gray-500">2024-01-07</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-amber-600">Missing community ID to load leads.</p>
        )}
        <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm text-brand-red hover:underline">← Back to App</LinkWithId>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="text-gray-600 text-center py-12">Loading leads...</div>}>
      <LeadsPageContent />
    </Suspense>
  );
}
