'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import { useState } from 'react';
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
          forcedTheme="dark" pins the rendered html class (and therefore
          the resolved CSS variables) to "dark" regardless of stored
          preference or system setting -- this site has no theme toggle
          anywhere in the public surface, so honoring stored prefs would
          only re-introduce the bug where a stale theme=light value
          flipped the page to an unstyled light render.

          defaultTheme / enableSystem are intentionally omitted because
          forcedTheme overrides the *applied* theme and including them
          would mislead readers into thinking they were load-bearing.
          Note: useTheme().theme can still surface the underlying stored
          preference; only useTheme().resolvedTheme + the html class are
          forced. No callsite reads .theme today, but if one is added,
          treat the stored value as cosmetic-only.
        */}
        <ThemeProvider attribute="class" forcedTheme="dark" nonce={nonce}>
          {children}
          <WebVitals />
          <Toaster position="bottom-right" richColors />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
