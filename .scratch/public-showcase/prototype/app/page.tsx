import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Showcase from './showcase';
// Throwaway: two new public-experience variants, ?variant=A|B&view=landing|demo.
// Isolated Next application; never mounted in UsageFlow's production router.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Suspense fallback={<p>Loading design study…</p>}><Showcase /></Suspense>;
}
