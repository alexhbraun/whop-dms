'use client';
import LinkWithId from '@/components/LinkWithId';
import useCreatorId from '@/components/useCreatorId';

export default function AppHome({ searchParams }) {
  const creatorId = useCreatorId(searchParams);
  const Card = ({ title, desc, href }) => (
    <LinkWithId baseHref={href} creatorId={creatorId}
      className="block rounded-lg border bg-white p-5 shadow-sm hover:shadow-md transition">
      <div className="text-lg font-semibold">{title}</div>
      <p className="text-sm text-gray-600 mt-1">{desc}</p>
    </LinkWithId>
  );
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Whop DMS: Elevate Your Community Experience</h1>
        <p className="text-gray-600 mt-2">Capture leads, configure your Whop integration, and track results.</p>
        <div className="mt-2 text-sm text-gray-500">
          {creatorId ? <>Installed for: <span className="font-medium">{creatorId}</span></> : 'Detecting community…'}
        </div>
      </header>
      {!creatorId && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          Community id not present. We’ll use your default business id if configured.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Configure" desc="Branding, questions, lead forwarding." href="/whop/settings" />
        <Card title="DM Templates" desc="Edit your welcome messages." href="/dashboard/messages" />
        <Card title="View Leads" desc="See captured onboarding responses." href="/dashboard/leads" />
      </div>
    </div>
  );
}
