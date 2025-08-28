// app/welcome/page.tsx
// Public onboarding page for new community members

import { Suspense } from 'react';
import WelcomeClient from './WelcomeClient';

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <WelcomeClient />
    </Suspense>
  );
}
