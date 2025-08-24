'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { PlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

function OnboardingQuestionsPageContent() {
  const creatorId = useCreatorId();

  const isDisabled = !creatorId;

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">Onboarding Questions</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Choose the questions after the magic link.</p>
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

      <div className="glass-card rounded-2xl p-6 shadow space-y-6 text-white/90">
        <h2 className="text-2xl font-semibold">Manage Your Onboarding Questions</h2>
        <p className="text-white/70">Here you can define the questions new members will answer after clicking their magic onboarding link. These questions help you gather valuable information about your community members.</p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            className={`btn bg-indigo-600 hover:bg-indigo-700 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isDisabled}
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Add Question (Coming Soon)
          </button>
          <button
            className={`btn btn-secondary bg-gray-600 hover:bg-gray-700 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isDisabled}
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" /> Reorder (Coming Soon)
          </button>
        </div>

        <div className="pt-4">
          <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline text-white/70 hover:text-white">
            ← Back to App
          </LinkWithId>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingQuestionsPage() {
  return (
    <Suspense fallback={<div className="text-white/70 text-center py-12">Loading questions...</div>}>
      <OnboardingQuestionsPageContent />
    </Suspense>
  );
}
