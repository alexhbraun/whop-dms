'use client';

// app/welcome/WelcomeClient.tsx
// Client component for the welcome page
// 
// REFACTORED: Updated to modern light theme with:
// - New headline: "Turn New Members into Engaged Community Fans — Automatically"
// - Updated tile descriptions to match requirements
// - Four feature tiles for creators to navigate the app
// - This is a creators landing page, NOT an onboarding form page
// - Onboarding forms are handled at /onboarding/[creatorId]

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface WelcomeData {
  memberId?: string;
  username?: string;
  hasPersonalization: boolean;
}

export default function WelcomeClient() {
  const searchParams = useSearchParams();
  const [welcomeData, setWelcomeData] = useState<WelcomeData>({
    hasPersonalization: false
  });

  useEffect(() => {
    // Extract query parameters
    const memberId = searchParams?.get('member');
    const username = searchParams?.get('u');
    
    if (memberId || username) {
      setWelcomeData({
        memberId: memberId || undefined,
        username: username || undefined,
        hasPersonalization: true
      });
      
      // Log analytics event (if available)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'welcome_page_view', {
          event_category: 'onboarding',
          event_label: 'personalized',
          member_id: memberId,
          username: username
        });
      }
    }
  }, [searchParams]);

  const getWelcomeMessage = () => {
    if (welcomeData.username) {
      return `Welcome, @${welcomeData.username}!`;
    }
    if (welcomeData.memberId) {
      return 'Welcome to our community!';
    }
    return 'Welcome to our community!';
  };

  const getSubtitle = () => {
    if (welcomeData.hasPersonalization) {
      return "We're excited to have you here. Let's get you set up with everything you need to succeed.";
    }
    return "Whether you're a new member or just getting started, we're here to help you succeed.";
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Turn New Members into<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Engaged Community Fans
            </span>
            <br />
            — Automatically
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Streamline your onboarding process and turn every new member into an engaged community participant.
          </p>
        </div>

        {/* Four Tiles Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Link 
            href="/dashboard/settings"
            className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Settings</h3>
              <svg className="ml-auto w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-600">
              Decide what to collect and where to send it.
            </p>
          </Link>

          <Link 
            href="/dashboard/dm-templates"
            className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">DM Templates</h3>
              <svg className="ml-auto w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-600">
              Craft your welcome messages — personal, professional, or fun.
            </p>
          </Link>

          <Link 
            href="/dashboard/questions"
            className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-indigo-200 transition-colors">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Onboarding Questions</h3>
              <svg className="ml-auto w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-600">
              Ask for emails, goals, or preferences with one click.
            </p>
          </Link>

          <Link 
            href="/dashboard/leads"
            className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Leads</h3>
              <svg className="ml-auto w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-600">
              View all your member responses in one dashboard.
            </p>
          </Link>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            Our team is here to support you every step of the way. Don't hesitate to reach out if you have questions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/help"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help Center
            </Link>
            <Link 
              href="/contact"
              className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Support
            </Link>
          </div>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-mono text-sm font-semibold mb-2">Debug Info:</h4>
            <pre className="text-xs text-gray-600">
              {JSON.stringify(welcomeData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
