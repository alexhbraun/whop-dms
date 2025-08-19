import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Welcome() {
  const router = useRouter();
  const token = (router.query.token as string) || '';

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
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold text-center mb-6">Welcome! Please answer a few questions.</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded p-3" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border rounded p-3" placeholder="What’s your #1 goal?" value={a1} onChange={e => setA1(e.target.value)} />
        <input className="w-full border rounded p-3" placeholder="What would make this community a win for you?" value={a2} onChange={e => setA2(e.target.value)} />
        <input className="w-full border rounded p-3" placeholder="Anything else?" value={a3} onChange={e => setA3(e.target.value)} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button disabled={loading} className="w-full rounded bg-blue-600 text-white py-3 font-medium">
          {loading ? 'Submitting…' : 'Submit Answers'}
        </button>
      </form>
    </main>
  );
}
