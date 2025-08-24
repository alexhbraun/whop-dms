'use client';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';

export default function SettingsPage({ searchParams }) {
  const creatorId = useCreatorId(searchParams);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">App Settings</h1>

      {!creatorId && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          Community ID is missing. If you opened this page directly, please access it from the Whop sidebar or go back to <LinkWithId baseHref="/app" className="underline">/app</LinkWithId>.
        </div>
      )}

      <section className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold">General Settings</h2>
        {/* Your existing settings form goes here. Keep it functional. */}
        {/* Ensure any API calls use creatorId when available. */}

        <div className="flex gap-2 pt-2">
          <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline">
            ← Back to App
          </LinkWithId>
        </div>
      </section>
    </div>
  );
}
