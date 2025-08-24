'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';

function MessagesPageContent() {
  const creatorId = useCreatorId();

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">DM Templates</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Craft the welcome message sent to new members.</p>
        <div className="text-lg text-white/60">
          {creatorId ? (
            <>Installed for: <span className="font-medium text-white">{creatorId}</span></>
          ) : (
            'Detecting community…'
          )}
        </div>
      </header>

      {!creatorId && (
        <div className="glass-card border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-lg text-amber-100 text-sm text-center max-w-md mx-auto mb-8 shadow-inner">
          Community ID is missing. Please access this page from the Whop sidebar or go back to <LinkWithId baseHref="/app" creatorId={creatorId} className="underline text-amber-100 hover:text-white">/app</LinkWithId>.
        </div>
      )}

      <div className="glass-card rounded-2xl p-6 shadow space-y-4 text-white/90">
        <h2 className="text-2xl font-semibold">Manage DM Templates</h2>
        {creatorId ? (
          <p className="text-white/70">Editing templates for <b>{creatorId}</b>. (Mount your editor here.)</p>
        ) : (
          <p className="text-amber-300">Missing community ID to load templates.</p>
        )}
        <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline text-white/70 hover:text-white">← Back to App</LinkWithId>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="text-white/70 text-center py-12">Loading DM templates...</div>}>
      <MessagesPageContent />
    </Suspense>
  );
}
