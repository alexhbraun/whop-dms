'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const { creatorId, context } = useCreatorId(searchParams);

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">App Settings</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Configure your integration and branding.</p>
        <div className="text-lg text-white/60">
          {creatorId ? (
            <>
              Installed for: <span className="font-medium text-white">{creatorId}</span>
              {context.slug && <span className="text-white/50 ml-2">(via slug: {context.slug})</span>}
            </>
          ) : (
            'Detecting community…'
          )}
        </div>
      </header>

      {!creatorId && (
        <div className="glass-card border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-lg text-amber-100 text-sm text-center max-w-md mx-auto mb-8 shadow-inner">
          Community ID is missing. If you opened this page directly, please access it from the Whop sidebar or go back to <LinkWithId baseHref="/app" creatorId={creatorId} className="underline text-amber-100 hover:text-white">/app</LinkWithId>.
        </div>
      )}

      <section className="glass-card p-6 rounded-2xl space-y-6 text-white/90">
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
