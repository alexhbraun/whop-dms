import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Whop DMS',
  description: 'Elevate Your Community Experience',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col items-center justify-center p-4 antialiased text-white/90">
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
