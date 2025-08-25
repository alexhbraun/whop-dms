'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { Cog6ToothIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon, TableCellsIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useSearchParams } from 'next/navigation';

interface CardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  creatorId: string | null;
  isDisabled: boolean;
}

function DashboardCard({ title, description, href, icon: Icon, creatorId, isDisabled }: CardProps) {
  const commonClasses = "glass-card p-6 flex flex-col justify-between text-white transition-all duration-300 transform group";
  const hoverClasses = "hover:-translate-y-1 hover:shadow-purple-500/20";
  const disabledClasses = "opacity-50 cursor-not-allowed";

  return (
    <LinkWithId
      baseHref={href}
      creatorId={creatorId}
      className={`${commonClasses} ${isDisabled ? disabledClasses : hoverClasses}`}
      ariaLabel={`Go to ${title} page`}
      aria-disabled={isDisabled}
    >
      <div className="flex items-start justify-between mb-4">
        <Icon className="h-8 w-8 text-indigo-300 group-hover:text-indigo-200 transition-colors" />
        <ArrowRightIcon className="h-5 w-5 text-white opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-white/90 group-hover:text-white transition-colors">{title}</h2>
      <p className="text-sm text-white/70 flex-grow">{description}</p>
    </LinkWithId>
  );
}

function AppHomeContent() {
  const searchParams = useSearchParams();
  const { creatorId, context } = useCreatorId(searchParams);
  const isCreatorIdMissing = !creatorId;

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">Whop DMS: Elevate Your Community Experience</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Capture leads, configure your Whop integration, and track results.</p>
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

      {isCreatorIdMissing && (
        <div className="glass-card border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-lg text-amber-100 text-sm text-center max-w-md mx-auto mb-8 shadow-inner">
          Community ID not present. We’ll use your default business id if configured.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Settings"
          description="Webhook, email requirement, and branding options."
          href="/whop/settings"
          icon={Cog6ToothIcon}
          creatorId={creatorId}
          isDisabled={isCreatorIdMissing}
        />
        <DashboardCard
          title="DM Templates"
          description="Craft the welcome message sent to new members."
          href="/dashboard/messages"
          icon={ChatBubbleLeftRightIcon}
          creatorId={creatorId}
          isDisabled={isCreatorIdMissing}
        />
        <DashboardCard
          title="Onboarding Questions"
          description="Choose the questions after the magic link."
          href="/dashboard/questions"
          icon={ClipboardDocumentListIcon}
          creatorId={creatorId}
          isDisabled={isCreatorIdMissing}
        />
        <DashboardCard
          title="Leads"
          description="View and export member responses."
          href="/dashboard/leads"
          icon={TableCellsIcon}
          creatorId={creatorId}
          isDisabled={isCreatorIdMissing}
        />
      </div>
    </div>
  );
}

export default function AppHome() {
  return (
    <Suspense fallback={<div className="text-white/70 text-center py-12">Loading dashboard...</div>}>
      <AppHomeContent />
    </Suspense>
  );
}
