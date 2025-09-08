'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  // Determine if we are on a dashboard/messages or dashboard/questions page
  const isDashboardPage = pathname?.startsWith('/dashboard');

  return (
    <header className="w-full py-6 px-6 text-gray-800">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-brand-red">Nexo</h1>
          <p className="text-xl text-gray-600">Turn New Members into Engaged Fans</p>
        </div>
        {isDashboardPage && (
          <Link href="/app" className="text-sm underline text-gray-600 hover:text-gray-800">
            ← Back to App
          </Link>
        )}
      </div>
    </header>
  );
}
