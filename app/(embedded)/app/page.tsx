'use client';
import { Suspense } from 'react';
import Link from 'next/link'; // Add this import
// import useCreatorId from '@/components/useCreatorId'; // Not needed for this static content
// import LinkWithId from '@/components/LinkWithId'; // Not needed for this static content
// import BindHostBanner from '@/components/BindHostBanner'; // Not needed for this static content
// import { Cog6ToothIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon, TableCellsIcon, ArrowRightIcon } from '@heroicons/react/24/outline'; // Using emojis for now
import { useSearchParams } from 'next/navigation'; // Still needed for useCreatorId in the original use case

// We are keeping useCreatorId for debugging purposes for now, but its actual usage is commented out for the redesign
import useCreatorId from '@/components/useCreatorId';

// The original CardProps and DashboardCard component are no longer used for the redesigned static home page.
// If dynamic cards are needed later, they can be re-introduced.

export default function AppHome() {
  const searchParams = useSearchParams();
  const { creatorId, host, source, unresolved } = useCreatorId(searchParams); // Keeping for debug info

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-sky-100 px-6 py-12"> {/* Light gradient background */}
      <div className="text-center max-w-3xl mx-auto"> {/* Centered content area */}
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Turn New Members into Engaged Community Fans — Automatically
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Send a personal DM the moment someone joins, capture their email or goals,
          and keep all responses organized in one place.
        </p>
        <p className="mt-3 text-sm text-gray-500">
          ✅ No code, no setup headaches — start in 2 minutes <br/>
          ✅ Trusted by creators to onboard new members seamlessly
        </p>
        {process.env.NODE_ENV !== 'production' && ( // Debug info, slightly restyled
          <p className="text-xs text-gray-400 mt-4">
            Installed for: {creatorId || '—'} · host: {host || '—'} · source: {source}
          </p>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"> {/* Card grid */}
        {[ // Static card data
          { title: "Settings", icon: "⚙️", desc: "Decide what to collect and where to send it.", href: "/whop/settings" },
          { title: "DM Templates", icon: "💬", desc: "Craft your welcome messages — personal, professional, or fun.", href: "/dashboard/messages" },
          { title: "Onboarding Questions", icon: "📝", desc: "Ask for emails, goals, or preferences with one click.", href: "/dashboard/questions" },
          { title: "Leads", icon: "📊", desc: "View all your member responses in one dashboard.", href: "/dashboard/leads" },
        ].map(card => (
          <Link key={card.title} href={card.href} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg hover:scale-[1.02] transition block"> {/* Link wrapper for cards */}
            <div className="text-3xl mb-3">{card.icon}</div>
            <h3 className="text-xl font-semibold text-gray-800">{card.title}</h3>
            <p className="mt-1 text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
