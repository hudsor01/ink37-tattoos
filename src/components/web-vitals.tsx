'use client';

import { useReportWebVitals } from 'next/web-vitals';
import * as Sentry from '@sentry/nextjs';

/**
 * Web Vitals reporter component.
 *
 * Reports Core Web Vitals (LCP, FID/INP, CLS) and Next.js-specific metrics
 * (TTFB, FCP) to Sentry performance monitoring and console in dev.
 *
 * Must be included in a client component tree (root layout via Providers).
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // In development, log to console for debugging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
    }

    // Report to Sentry if available
    if (typeof Sentry.metrics !== 'undefined') {
      Sentry.metrics.distribution(metric.name, metric.value, {
        unit: metric.name === 'CLS' ? '' : 'millisecond',
        tags: {
          rating: metric.rating,
          navigationType: metric.navigationType,
        },
      });
    }
  });

  return null;
}
