import './globals.css';

export const metadata = { title: 'Whop DMS' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
