import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      enabled: !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Set sampling rate for profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Filter out noisy errors. Includes every Next.js framework signal
      // that gets thrown as an Error to support control flow:
      //   - NEXT_NOT_FOUND          notFound()
      //   - NEXT_REDIRECT           redirect()
      //   - NEXT_HTTP_ERROR_FALLBACK  unauthorized() / forbidden() (since Next 15)
      //   - HANGING_PROMISE_REJECTION  Cache Components prerender abort
      //
      // After the iteration-3/4 propagation work that re-throws every
      // framework signal up the call chain instead of swallowing them,
      // these throws now reach Sentry's instrumentation. Without the
      // filter, every legitimate 401/403 and every prerender abort
      // would be reported as a real error and bury the signal/noise
      // ratio. Match by message/digest substring -- Sentry checks both.
      ignoreErrors: [
        'NEXT_NOT_FOUND',
        'NEXT_REDIRECT',
        'NEXT_HTTP_ERROR_FALLBACK',
        'HANGING_PROMISE_REJECTION',
        'AbortError',
        'NetworkError',
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      enabled: !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      ignoreErrors: [
        'NEXT_NOT_FOUND',
        'NEXT_REDIRECT',
        'AbortError',
        'NetworkError',
      ],
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
