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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          nonce={nonce}
        >
          {children}
          <WebVitals />
          <Toaster position="bottom-right" richColors />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
