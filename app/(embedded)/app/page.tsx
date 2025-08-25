'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import BindHostBanner from '@/components/BindHostBanner'; // Import BindHostBanner
import { Cog6ToothIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon, TableCellsIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useSearchParams } from 'next/navigation';
// No need for useState for bind fields here anymore

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
  const { creatorId, host, source, unresolved } = useCreatorId(searchParams); // Updated destructuring
  // Removed bindBusinessId, bindError, isBinding state - now handled by BindHostBanner

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">Whop DMS: Elevate Your Community Experience</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Capture leads, configure your Whop integration, and track results.</p>
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Settings"
          description="Webhook, email requirement, and branding options."
          href="/whop/settings"
          icon={Cog6ToothIcon}
          creatorId={creatorId}
          isDisabled={unresolved} // Use unresolved for disabling cards
        />
        <DashboardCard
          title="DM Templates"
          description="Craft the welcome message sent to new members."
          href="/dashboard/messages"
          icon={ChatBubbleLeftRightIcon}
          creatorId={creatorId}
          isDisabled={unresolved} // Use unresolved for disabling cards
        />
        <DashboardCard
          title="Onboarding Questions"
          description="Choose the questions after the magic link."
          href="/dashboard/questions"
          icon={ClipboardDocumentListIcon}
          creatorId={creatorId}
          isDisabled={unresolved} // Use unresolved for disabling cards
        />
        <DashboardCard
          title="Leads"
          description="View and export member responses."
          href="/dashboard/leads"
          icon={TableCellsIcon}
          creatorId={creatorId}
          isDisabled={unresolved} // Use unresolved for disabling cards
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
