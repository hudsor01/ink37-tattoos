'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ServiceWorkerRegistration } from './service-worker-registration';
import { WebVitals } from './web-vitals';

export function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode;
  /**
   * Forwarded to next-themes so its theme-bootstrap inline script carries
   * the nonce that matches the CSP header set in proxy.ts. Without this,
   * the browser blocks the inline script and the page flashes light-mode
   * before hydration.
   */
  nonce?: string;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  }));

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        {/*
          forcedTheme="dark" pins the rendered html class attribute (and
          therefore the resolved CSS variables) to "dark" regardless of
          stored preference or system setting -- this site has no theme
          toggle anywhere in the public surface, so honoring stored
          prefs would only re-introduce the bug where a stale
          theme=light value flipped the page to an unstyled light
          render.

          defaultTheme / enableSystem are intentionally omitted because
          forcedTheme overrides the *applied* theme and including them
          would mislead readers into thinking they were load-bearing.

          IMPORTANT: under forcedTheme, only the html class attribute is
          actually forced. `useTheme().theme` AND `useTheme().resolved-
          Theme` both still return the underlying stored preference --
          verified against next-themes source where the context value is
          `resolvedTheme: c==="system"?T:c` (c is the stored state, NOT
          the forcedTheme value). Treat both hook fields as cosmetic
          only; rely on the html class / CSS variables for theme-
          dependent rendering. No callsite reads either today.
        */}
        <ThemeProvider attribute="class" forcedTheme="dark" nonce={nonce}>
          {children}
          <WebVitals />
          {/*
            Vercel Analytics (page views, custom events) + Speed Insights
            (Core Web Vitals telemetry). Native to Vercel deployments,
            cookie-free, GDPR-friendly. Custom event tracking is wired
            into the booking/contact/gallery CTAs via the `track()`
            import from @vercel/analytics. Both components are no-ops
            when not deployed on Vercel (e.g., during local dev).
          */}
          <Analytics />
          <SpeedInsights />
          <Toaster position="bottom-right" richColors />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
