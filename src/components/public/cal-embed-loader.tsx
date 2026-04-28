'use client';

import dynamic from 'next/dynamic';

/**
 * Client-only loader for CalEmbed. Cal.com's embed-react component
 * validates `calLink` at render time and throws during SSR if it's
 * not present, which fails Cache Components static prerender. The
 * iframe is inherently client-only anyway, so deferring the load
 * has no functional cost.
 */
export const CalEmbed = dynamic(
  () => import('@/components/public/cal-embed').then((m) => m.CalEmbed),
  { ssr: false }
);
