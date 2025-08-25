import { redirect } from 'next/navigation';

export default function Home({ searchParams }) {
  const qp = new URLSearchParams(searchParams || {}).toString();
  redirect(`/app${qp ? `?${qp}` : ''}`);
}

