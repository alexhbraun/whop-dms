'use client';
import { Suspense } from 'react';

export default function EmbeddedLayout({ children }) {
  return (
    <div className="min-h-screen bg-transparent">
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </div>
  );
}
