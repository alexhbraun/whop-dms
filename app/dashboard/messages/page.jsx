'use client';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';

export default function MessagesPage({ searchParams }) {
  const creatorId = useCreatorId(searchParams);
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">DM Templates</h1>
        <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline">← Back</LinkWithId>
      </div>
      <div className="rounded-lg border bg-white p-6 shadow">
        {creatorId ? (
          <p className="text-gray-700">Editing templates for <b>{creatorId}</b>. (Mount your editor here.)</p>
        ) : (
          <p className="text-amber-700">Missing community id.</p>
        )}
      </div>
    </div>
  );
}

