// components/DmStatusPanel.tsx
// DM status panel for settings page

'use client';

import { useState, useEffect } from 'react';
import { DM_ENABLED, DM_MODE } from '@/lib/flags';

interface DmStatus {
  enabled: boolean;
  mode: string;
  providerAvailable: boolean;
  lastCheck?: string;
}

export default function DmStatusPanel() {
  const [status, setStatus] = useState<DmStatus>({
    enabled: DM_ENABLED,
    mode: DM_MODE,
    providerAvailable: false
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Check provider availability
    const checkProvider = async () => {
      try {
        const response = await fetch('/api/diagnostics/health', {
          headers: {
            'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'dev-only'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStatus(prev => ({
            ...prev,
            providerAvailable: data.env?.WHOP_API_KEY === 'present',
            lastCheck: new Date().toISOString()
          }));
        }
      } catch (error) {
        // Silently fail in production
        console.debug('DM status check failed:', error);
      }
    };

    if (process.env.NODE_ENV === 'development') {
      checkProvider();
    }
  }, []);

  const getStatusBadge = () => {
    if (!status.enabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Disabled (waiting for Whop API access)
        </span>
      );
    }
    
    if (!status.providerAvailable) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Temporarily unavailable; falling back to welcome link
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Enabled
      </span>
    );
  };

  const getStatusMessage = () => {
    if (!status.enabled) {
      return "Direct messaging is currently disabled while we wait for Whop to enable API access for apps.";
    }
    
    if (!status.providerAvailable) {
      return "We're experiencing temporary issues with the Whop API. Messages are falling back to welcome links.";
    }
    
    return "Direct messaging is working correctly through the Whop GraphQL API.";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Direct Messages</h3>
        {getStatusBadge()}
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        {getStatusMessage()}
      </p>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Feature Flag:</span>
          <span className="font-mono text-gray-700">{status.enabled ? 'ON' : 'OFF'}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Mode:</span>
          <span className="font-mono text-gray-700">{status.mode}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Provider:</span>
          <span className="font-mono text-gray-700">
            {status.providerAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>

      {/* Collapsible instructions */}
      <div className="mt-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
        >
          <span>How to send the welcome link automatically</span>
          <svg
            className={`ml-1 h-4 w-4 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg">
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Go to <strong>Whop → Marketing → Automated Messages</strong></li>
              <li>Enable the <strong>Welcome message</strong></li>
              <li>Use this template:</li>
            </ol>
            
            <div className="mt-3 p-3 bg-white border border-gray-300 rounded font-mono text-sm">
              Welcome! Tap here to get set up: https://whop-dms.vercel.app/welcome
            </div>
            
            <p className="mt-3 text-xs text-gray-600">
              Your app personalizes the welcome page even if query parameters are missing.
            </p>
          </div>
        )}
      </div>

      {/* Future note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> When Whop enables DM for apps, just flip a switch—no new setup required.
        </p>
      </div>
    </div>
  );
}
