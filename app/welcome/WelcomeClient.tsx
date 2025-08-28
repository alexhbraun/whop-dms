'use client';

// app/welcome/WelcomeClient.tsx
// Client component for the welcome page
// 
// REFACTORED: Updated to modern light theme with:
// - New headline: "Turn New Members into Engaged Community Fans — Automatically"
// - Updated tile descriptions to match requirements
// - Added onboarding form below tiles with email + 3 questions
// - Form submits to existing /api/responses/[creatorId] endpoint
// - Preserves all existing functionality and API shapes

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface WelcomeData {
  memberId?: string;
  username?: string;
  hasPersonalization: boolean;
}

interface OnboardingForm {
  email: string;
  goal: string;
  communityWin: string;
  anythingElse: string;
}

export default function WelcomeClient() {
  const searchParams = useSearchParams();
  const [welcomeData, setWelcomeData] = useState<WelcomeData>({
    hasPersonalization: false
  });
  
  // Form state
  const [formData, setFormData] = useState<OnboardingForm>({
    email: '',
    goal: '',
    communityWin: '',
    anythingElse: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

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

  const handleInputChange = (field: keyof OnboardingForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear email error when user starts typing
    if (field === 'email') {
      setEmailError(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get creator ID from URL or use a default
      const creatorId = searchParams?.get('creator') || 'default';
      
      const response = await fetch(`/api/responses/${creatorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: welcomeData.memberId || 'anonymous',
          email: formData.email.trim(),
          responses: {
            goal: formData.goal.trim(),
            community_win: formData.communityWin.trim(),
            anything_else: formData.anythingElse.trim(),
          }
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setSubmitSuccess(true);
        // Log success event
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'onboarding_form_submitted', {
            event_category: 'onboarding',
            event_label: 'success'
          });
        }
      } else {
        setSubmitError(result.reason || 'Failed to save responses. Please try again.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#F6F7FB]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Thank you!</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              We've received your information and will be in touch soon. Welcome to the community!
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to App
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

        {/* Onboarding Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome! Please answer a few questions</h2>
          
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="polite">
              <p className="text-red-800">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="your@email.com"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError && (
                <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            {/* Goal Field */}
            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
                What's your #1 goal?
              </label>
              <textarea
                id="goal"
                name="goal"
                value={formData.goal}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g., Build a community, Learn new skills, Find collaborators..."
              />
            </div>

            {/* Community Win Field */}
            <div>
              <label htmlFor="communityWin" className="block text-sm font-medium text-gray-700 mb-2">
                What would make this community a win?
              </label>
              <textarea
                id="communityWin"
                name="communityWin"
                value={formData.communityWin}
                onChange={(e) => handleInputChange('communityWin', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g., Regular events, Active discussions, Networking opportunities..."
              />
            </div>

            {/* Anything Else Field */}
            <div>
              <label htmlFor="anythingElse" className="block text-sm font-medium text-gray-700 mb-2">
                Anything else?
              </label>
              <textarea
                id="anythingElse"
                name="anythingElse"
                value={formData.anythingElse}
                onChange={(e) => handleInputChange('anythingElse', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Additional thoughts, questions, or preferences..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Submit'
              )}
            </button>
          </form>
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
