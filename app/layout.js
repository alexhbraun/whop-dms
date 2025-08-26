import './globals.css';
import { Inter } from 'next/font/google';
import Header from '@/components/Header'; // Import the new Header component

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Whop DMS',
  description: 'Elevate Your Community Experience',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased text-white/90"> {/* Removed background gradient */}
        <Header /> {/* Render the global header here */}
        <main className="flex-grow w-full max-w-5xl mx-auto px-4"> {/* Main content area with flexible height and spacing */}
          {children}
        </main>
      </body>
    </html>
  );
}
