'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  // Determine if we are on a dashboard/messages or dashboard/questions page
  const isDashboardPage = pathname?.startsWith('/dashboard');

  return (
    <header className="w-full max-w-5xl mx-auto py-6 px-4 text-white/90">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold drop-shadow-lg">Whop DMS</h1>
          <p className="text-xl text-white/80">Elevate Your Community Experience</p>
        </div>
        {isDashboardPage && (
          <Link href="/app" className="text-sm underline text-white/70 hover:text-white">
            ← Back to App
          </Link>
        )}
      </div>
    </header>
  );
}
