'use client';

import useCreatorId from '@/components/useCreatorId';

export default function AppHome({ searchParams }) {
  const creatorId = searchParams?.community_id || searchParams?.business_id || 'unknown';

  const Card = ({ title, desc, href }) => (
    <a href={href} className="block rounded-lg border bg-white p-5 shadow-sm hover:shadow transition">
      <div className="text-lg font-semibold">{title}</div>
      <p className="text-sm text-gray-600 mt-1">{desc}</p>
    </a>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Whop DMS: Elevate Your Community Experience</h1>
        <p className="text-gray-600 mt-1">Installed for: <span className="font-medium">{creatorId}</span></p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Configure App"
          desc="Branding, webhooks, lead forwarding."
          href={`/whop/settings?community_id=${creatorId}`}
        />
        <Card
          title="DM Templates"
          desc="Edit your welcome messages & variables."
          href={`/dashboard/${creatorId}/messages`}
        />
        <Card
          title="View Leads"
          desc="See onboarding responses captured."
          href={`/dashboard/${creatorId}/leads`}
        />
      </div>
    </div>
  );
}
