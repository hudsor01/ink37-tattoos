import * as Sentry from '@sentry/nextjs';

/**
 * Drops Sentry events whose original exception is a Next.js framework
 * signal -- Cache Components prerender aborts and the throws emitted by
 * `redirect()`, `notFound()`, `unauthorized()`, and `forbidden()`. These
 * are control-flow signals, not real errors; iteration-3/4 propagation
 * work re-throws them up the call chain so they now reach Sentry's
 * `captureRequestError`, where without filtering they would flood the
 * dashboard.
 *
 * Why a beforeSend hook (not just ignoreErrors)?
 *
 *   `ignoreErrors` substring-matches against `event.message`,
 *   `lastException.value`, and `"${type}: ${value}"` (see
 *   node_modules/@sentry/core/build/cjs/utils/eventUtils.js). It does
 *   NOT inspect the `digest` property. For three of the four signals
 *   that's fine because Next constructs the error with the digest as
 *   the message itself (e.g. `new Error('NEXT_REDIRECT;...')`), so a
 *   substring filter on `'NEXT_REDIRECT'` works. But the
 *   `HangingPromiseRejectionError` message is human-readable text
 *   ("During prerendering, ${expression} rejects when the prerender
 *   is complete...") and the digest is set as a separate property, so
 *   a substring filter on `'HANGING_PROMISE_REJECTION'` is dead code.
 *   Checking `hint.originalException.digest` directly is the
 *   reliable contract.
 *
 * Returns `null` to drop the event entirely (vs returning the event
 * to forward it).
 */
export function dropFrameworkSignals(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint
): Sentry.ErrorEvent | null {
  const original = hint.originalException as { digest?: unknown } | undefined;
  const digest = original?.digest;
  if (typeof digest === 'string') {
    if (
      digest === 'HANGING_PROMISE_REJECTION' ||
      digest.startsWith('NEXT_REDIRECT') ||
      digest.startsWith('NEXT_NOT_FOUND') ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')
    ) {
      return null;
    }
  }
  return event;
}

/**
 * String-based safety net for the same signal classes. Catches errors
 * where `hint.originalException` was lost (e.g., serialized-then-
 * deserialized through a Next runtime boundary). Substring-matches the
 * three signals whose constructor stuffs the digest into the message;
 * the prerender abort is handled by the beforeSend hook above because
 * its message is human-readable text that doesn't contain the digest
 * substring.
 */
const FRAMEWORK_SIGNAL_NAMES = [
  'NEXT_NOT_FOUND',
  'NEXT_REDIRECT',
  'NEXT_HTTP_ERROR_FALLBACK',
] as const;

const NETWORK_NOISE = ['AbortError', 'NetworkError'] as const;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      enabled: !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      ignoreErrors: [...FRAMEWORK_SIGNAL_NAMES, ...NETWORK_NOISE],
      beforeSend: dropFrameworkSignals,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      enabled: !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Edge runtime sees a smaller subset of routes (proxy.ts + edge
      // route handlers), but unauthorized()/forbidden() and the
      // prerender abort can fire from any runtime, so the filter set
      // mirrors the Node config exactly.
      ignoreErrors: [...FRAMEWORK_SIGNAL_NAMES, ...NETWORK_NOISE],
      beforeSend: dropFrameworkSignals,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
