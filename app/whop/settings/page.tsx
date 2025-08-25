'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import BindHostBanner from '@/components/BindHostBanner'; // Import BindHostBanner
import { useSearchParams } from 'next/navigation';
// No need for useState for bind fields here anymore

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const { creatorId, host, source, unresolved } = useCreatorId(searchParams); // Updated destructuring
  // Removed bindBusinessId, bindError, isBinding state - now handled by BindHostBanner

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">App Settings</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Configure your integration and branding.</p>
        {process.env.NODE_ENV !== 'production' && (
          <p className="text-xs text-white/60 mt-1">
            Installed for: {creatorId || '—'} · host: {host || '—'} · source: {source}
          </p>
        )}
      </header>

      {unresolved && host && (
        <div className="max-w-5xl mx-auto mt-4">
          <BindHostBanner host={host} />
        </div>
      )}

      {/* Removed the old conditional amber card for missing Community ID */}

      <section className={`glass-card p-6 rounded-2xl space-y-6 text-white/90 ${unresolved ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-2xl font-semibold">General Settings</h2>
        {/* Your existing settings form goes here. Keep it functional. */}
        {/* Ensure any API calls use creatorId when available. */}
        <p>This is where your settings form will go.</p>

        <div className="flex gap-2 pt-2">
          <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline text-white/70 hover:text-white">
            ← Back to App
          </LinkWithId>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-white/70 text-center py-12">Loading settings...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
