'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import LinkWithId from '@/components/LinkWithId';

interface OnboardingQuestion {
  question_text: string;
  type: string;
  required: boolean;
  position: number;
  options?: any[];
}

export default function OnboardingPage({ params, searchParams }: { params: { creatorId: string }, searchParams: { memberId: string, t: string } }) {
  const router = useRouter();
  const { creatorId } = params;
  const memberId = searchParams.memberId;
  const token = searchParams.t;

  const [loading, setLoading] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [validationReason, setValidationReason] = useState('');
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  useEffect(() => {
    const validateInvite = async () => {
      if (!creatorId || !memberId || !token) {
        setValidationReason('Missing link parameters.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/invites/validate?creatorId=${creatorId}&memberId=${memberId}&t=${token}`);
        const data = await res.json();

        if (data.ok) {
          setInviteValid(true);
          // Fetch questions after validation
          await fetchQuestions(creatorId);
        } else {
          setValidationReason(data.reason || 'Invalid invite link.');
        }
      } catch (error) {
        console.error('Error validating invite:', error);
        setValidationReason('Failed to validate link due to a server error.');
      } finally {
        setLoading(false);
      }
    };

    validateInvite();
  }, [creatorId, memberId, token]);

  const fetchQuestions = async (id: string) => {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.ok && data.questions && data.questions.length > 0) {
        // Map onboarding questions to the expected format
        const mappedQuestions = data.questions.map((q: any) => ({
          question_text: q.text,
          require_email: q.type === 'email',
          type: q.type,
          required: q.required,
          position: q.position,
          options: q.options || []
        }));
        setQuestions(mappedQuestions);
        setAnswers(new Array(mappedQuestions.length).fill(''));
      } else {
        console.warn('No onboarding questions found for creator:', id);
        setQuestions([]);
        setAnswers([]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions.');
      setQuestions([]);
      setAnswers([]);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionSuccess(false);
    toast.dismiss(); // Clear existing toasts

    if (!creatorId || !memberId || !token) {
      toast.error('Missing crucial IDs for submission.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Submit responses
      const responsePayload = {
        creatorId,
        memberId,
        email: email || null,
        responses: answers.reduce((acc, curr, idx) => ({ ...acc, [`q${idx + 1}_response`]: curr }), {}),
      };

      const submitRes = await fetch(`/api/responses/${creatorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responsePayload),
      });
      const submitData = await submitRes.json();

      if (!submitData.ok) {
        throw new Error(submitData.reason || 'Failed to save responses.');
      }

      // 2. Mark invite as used
      const useInviteRes = await fetch('/api/invites/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, memberId, t: token }),
      });
      const useInviteData = await useInviteRes.json();

      if (!useInviteData.ok) {
        throw new Error(useInviteData.reason || 'Failed to mark invite as used.');
      }

      setSubmissionSuccess(true);
      toast.success('Your onboarding is complete!');
      router.push('/thank-you');

    } catch (error: any) {
      console.error('Onboarding submission error:', error);
      toast.error(error.message || 'Failed to complete onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600 text-lg">Loading onboarding link...</p>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center space-y-4">
          <h1 className="text-3xl font-bold text-red-600">Invalid Onboarding Link</h1>
          <p className="text-gray-700">Reason: {validationReason}</p>
          <p className="text-gray-600">Please contact your community administrator for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Toaster />
      <h1 className="text-3xl font-bold text-center">Welcome Onboard!</h1>
      <p className="text-center text-gray-700">Please answer a few questions to complete your onboarding.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.some(q => q.type === 'email') && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Your Email (required)</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}

        {questions.length === 0 ? (
          <p className="text-gray-600 text-center">No onboarding questions found. You can proceed with submission.</p>
        ) : (
          questions.map((q, index) => (
            <div key={index}>
              <label htmlFor={`q${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                {index + 1}. {q.question_text}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {q.type === 'email' ? (
                <input
                  type="email"
                  id={`q${index}`}
                  value={answers[index]}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required={q.required}
                />
              ) : q.type === 'single_select' && q.options && q.options.length > 0 ? (
                <select
                  id={`q${index}`}
                  value={answers[index]}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required={q.required}
                >
                  <option value="">Select an option...</option>
                  {q.options.map((opt: any, optIndex: number) => (
                    <option key={optIndex} value={opt.value || opt.label}>
                      {opt.label || opt.value}
                    </option>
                  ))}
                </select>
              ) : q.type === 'multi_select' && q.options && q.options.length > 0 ? (
                <div className="space-y-2">
                  {q.options.map((opt: any, optIndex: number) => (
                    <label key={optIndex} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={answers[index]?.includes(opt.value || opt.label) || false}
                        onChange={(e) => {
                          const currentAnswers = answers[index] ? answers[index].split(',').filter(Boolean) : [];
                          if (e.target.checked) {
                            currentAnswers.push(opt.value || opt.label);
                          } else {
                            const indexToRemove = currentAnswers.indexOf(opt.value || opt.label);
                            if (indexToRemove > -1) {
                              currentAnswers.splice(indexToRemove, 1);
                            }
                          }
                          handleAnswerChange(index, currentAnswers.join(','));
                        }}
                        className="mr-2"
                      />
                      {opt.label || opt.value}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  id={`q${index}`}
                  value={answers[index]}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  rows={3}
                  placeholder="Your answer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required={q.required}
                />
              )}
            </div>
          ))
        )}

        <button
          type="submit"
          disabled={isSubmitting || submissionSuccess}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isSubmitting ? 'Submitting...' : submissionSuccess ? 'Onboarding Complete!' : 'Complete Onboarding'}
        </button>
      </form>
      <div className="flex justify-center pt-4">
        <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline">← Back to App</LinkWithId>
      </div>
    </div>
  );
}
