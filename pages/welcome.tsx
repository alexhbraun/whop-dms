import { useRouter } from 'next/router';
import { useState } from 'react';
import { useCommunitySettings } from './_app'; // Corrected import path to be sibling

export default function Welcome() {
  const router = useRouter();
  const token = (router.query.token as string) || '';
  const communitySettings = useCommunitySettings();

  const [email, setEmail] = useState('');
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [a3, setA3] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/save-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          answers: [a1, a2, a3],
          meta: { ua: navigator.userAgent },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Submit failed');
      router.replace('/thank-you');
    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-100 flex items-center justify-center p-4">
      <main className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full text-center transform transition-all duration-300 hover:scale-[1.01]">
        {communitySettings?.logo_url && (
          <div className="mb-8">
            <img
              src={communitySettings.logo_url}
              alt="Community Logo"
              className="mx-auto max-w-[120px] h-auto rounded-lg shadow-md border border-neutral-200"
            />
          </div>
        )}
        <h1
          className="text-4xl font-serif font-bold text-neutral-900 mb-4 leading-tight"
          style={{ color: communitySettings?.primary_color || undefined }}
        >
          {communitySettings?.welcome_message_title || 'Welcome! Please answer a few questions.'}
        </h1>
        {communitySettings?.welcome_message_body && (
          <p className="text-lg text-neutral-700 mb-8 leading-relaxed"
             style={{ color: communitySettings?.primary_color ? `${communitySettings.primary_color}d0` : undefined }}>
            {communitySettings.welcome_message_body}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <input
            type="email"
            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all duration-200 shadow-sm"
            placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
          <input
            type="text"
            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all duration-200 shadow-sm"
            placeholder="What’s your #1 goal?" value={a1} onChange={e => setA1(e.target.value)} />
          <input
            type="text"
            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all duration-200 shadow-sm"
            placeholder="What would make this community a win for you?" value={a2} onChange={e => setA2(e.target.value)} />
          <input
            type="text"
            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all duration-200 shadow-sm"
            placeholder="Anything else?" value={a3} onChange={e => setA3(e.target.value)} />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn w-full text-lg px-8 py-3 transform hover:scale-105 transition-transform duration-200"
            style={{ backgroundColor: communitySettings?.primary_color || undefined }}
          >
            {loading ? 'Submitting…' : 'Submit Answers'}
          </button>
        </form>
      </main>
    </div>
  );
}
