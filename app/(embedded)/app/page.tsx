'use client';
import { Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { Cog6ToothIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon, TableCellsIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

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
  const [bindBusinessId, setBindBusinessId] = useState<string>('');
  const [bindError, setBindError] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState<boolean>(false);

  const shouldShowBindCard = unresolved; // Simplified condition

  const handleBind = async () => {
    if (!bindBusinessId || !host) { // Use host directly
      setBindError('Business ID and Host are required.');
      return;
    }

    // Safety: Only allow alphanumeric/underscore in business_id
    if (!/^[a-zA-Z0-9_]+$/.test(bindBusinessId)) {
      setBindError('Business ID must be alphanumeric and underscores only.');
      return;
    }

    setIsBinding(true);
    setBindError(null);
    try {
      const res = await fetch('/api/resolve/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host, business_id: bindBusinessId }), // Use host directly
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to bind host.');
      }
      // On success, refresh the page to re-resolve creatorId
      window.location.reload();
    } catch (e: any) {
      setBindError(e.message || 'An unexpected error occurred during binding.');
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">Whop DMS: Elevate Your Community Experience</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Capture leads, configure your Whop integration, and track results.</p>
        {process.env.NODE_ENV !== 'production' && (
          <div className="text-lg text-white/60">
            Installed for: <span className="font-medium text-white">{creatorId || '—'}</span>
            {host && <span className="text-white/50 ml-2">· host: {host}</span>}
            {source && <span className="text-white/50 ml-2">· source: {source}</span>}
          </div>
        )}
      </header>

      {shouldShowBindCard && (
        <div className="glass-card border-purple-500/30 bg-purple-500/10 dark:bg-purple-500/5 p-6 rounded-lg text-purple-100 text-sm max-w-lg mx-auto mb-8 shadow-inner">
          <h3 className="text-xl font-semibold mb-3">Bind this Installation</h3>
          <p className="mb-4">It looks like your community ID isn't automatically detected. Please enter your Whop Business ID below to bind this installation to your host. <span className="text-white/60 text-xs mt-1">You only need to do this once per community.</span></p>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={bindBusinessId}
              onChange={(e) => setBindBusinessId(e.target.value)}
              placeholder="Enter Whop Business ID (e.g., biz_abc123)"
              className="flex-grow px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors"
            />
            <button
              onClick={handleBind}
              disabled={isBinding || !bindBusinessId || !host}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBinding ? 'Binding…' : 'Bind'}
            </button>
          </div>
          {bindError && <p className="text-red-300 text-xs mt-2">Error: {bindError}</p>}
          <p className="text-white/60 text-xs mt-4">Your current host: <span className="font-medium">{host || 'N/A'}</span></p>
        </div>
      )}

      {unresolved && !shouldShowBindCard && (
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
