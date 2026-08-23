import * as Sentry from '@sentry/nextjs';
import {
  dropFrameworkSignals,
  FRAMEWORK_SIGNAL_NAMES,
  NETWORK_NOISE,
} from '@/instrumentation';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging (capture 10% of sessions, 100% on error)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  /**
   * Shares the server's filter set instead of keeping a local copy.
   *
   * The hardcoded list this replaces had already drifted: it was missing
   * `NEXT_HTTP_ERROR_FALLBACK`, which is how Next 16 actually constructs
   * notFound() throws (see the long note in src/instrumentation.ts), and it
   * had no `beforeSend`. That mattered the moment this file started running:
   * every client-side notFound()/unauthorized()/forbidden() navigation would
   * be reported as a real error, and HANGING_PROMISE_REJECTION carries its
   * digest in a separate property that `ignoreErrors` cannot see at all --
   * which is the entire reason dropFrameworkSignals exists.
   */
  ignoreErrors: [
    ...FRAMEWORK_SIGNAL_NAMES,
    ...NETWORK_NOISE,
    'ResizeObserver loop',
    'Non-Error promise rejection',
  ],
  beforeSend: dropFrameworkSignals,

  integrations: [
    Sentry.replayIntegration({
      /**
       * Masking is ON. These were `false` while this file was dead code --
       * harmless then, not now.
       *
       * Renaming sentry.client.config.ts -> instrumentation-client.ts makes
       * Sentry.init() actually run in the browser for the first time, which
       * activates Session Replay at 10% of all sessions and 100% of error
       * sessions. Unmasked, that uploads full-DOM recordings of
       * /dashboard/customers, /dashboard/orders, /dashboard/payments and the
       * client /portal -- real customer names, emails, phones, addresses and
       * appointment notes -- to a third-party processor, and connect-src was
       * widened to https://*.sentry.io in the same change, so nothing blocks
       * the upload.
       *
       * true/true matches Sentry's own defaults. Replays stay useful for
       * layout and interaction debugging (which is what the blank-page
       * outage needed) without exfiltrating customer records.
       */
      maskAllText: true,
      blockAllMedia: true,
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
