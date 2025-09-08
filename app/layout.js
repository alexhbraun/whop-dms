import './globals.css';
import { Inter } from 'next/font/google';
import Header from '@/components/Header'; // Import the new Header component
import AdminHealthBadge from '@/components/AdminHealthBadge';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: "Nexo — Welcome DMs",
  description: "Turn new members into engaged community fans — automatically.",
  openGraph: {
    title: "Nexo — Welcome DMs",
    description: "Automated onboarding DMs with questions and leads.",
    images: ["/brand/og-nexo.svg"],
  },
  twitter: { card: "summary_large_image", images: ["/brand/og-nexo.svg"] },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased text-gray-800"> {/* Updated text color for light background */}
        <Header /> {/* Render the global header here */}
        <main className="flex-grow w-full"> {/* Removed max-width constraint to fill entire screen */}
          {children}
        </main>
        <AdminHealthBadge />
      </body>
    </html>
  );
}
