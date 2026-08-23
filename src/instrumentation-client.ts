import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging (capture 10% of sessions, 100% on error)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out noisy errors
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    'AbortError',
    'NetworkError',
    'ResizeObserver loop',
    'Non-Error promise rejection',
  ],

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});

/**
 * Filename is load-bearing: Next aliases `instrumentation-client` and only
 * loads it under that name.
 *
 * This was `sentry.client.config.ts` at the repo root, which is referenced
 * ONLY by @sentry/nextjs's WEBPACK config
 * (build/cjs/config/webpack.js) -- nothing under config/turbopack/ loads it.
 * This project is Next 16 and builds with Turbopack, so Sentry.init() never
 * ran in the browser at all: no error reports, no Session Replay, and no
 * CSP-violation reporting.
 *
 * That is a large part of why the blank-page outage stayed invisible -- the
 * site was throwing nothing server-side, and the client had no reporter.
 */

/**
 * Required by @sentry/nextjs to instrument App Router navigations; the SDK
 * emits an "ACTION REQUIRED" build warning without it. Its presence is also a
 * useful signal that this file is actually being loaded -- the warning only
 * appeared once the file was renamed from sentry.client.config.ts, which
 * Turbopack never read.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
