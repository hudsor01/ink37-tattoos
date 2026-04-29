/**
 * Next.js 16 configuration.
 * See https://nextjs.org/docs/app/api-reference/config/next-config-js
 *
 * Top-level keys here are documented at the URLs in the JSDoc above each
 * option. Anything under `experimental` is opt-in and may change between
 * minor releases per the Next.js docs.
 */
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

/** Security headers applied to every response. See:
 *  - X-Frame-Options:        https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Frame-Options
 *  - X-Content-Type-Options: https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Content-Type-Options
 *  - Referrer-Policy:        https://developer.mozilla.org/docs/Web/HTTP/Headers/Referrer-Policy
 *  - Strict-Transport-Security: https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security
 *  - Permissions-Policy:     https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  /**
   * Output mode. `'standalone'` emits `.next/standalone/server.js` plus the
   * traced subset of `node_modules` needed to run, suitable for Docker and
   * lightweight self-hosting.
   * Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
   */
  output: 'standalone',

  /**
   * `next/image` configuration. In Next 16, declaring `images.qualities`
   * locks the Image Optimization API to ONLY the listed values: any
   * `<Image quality={N}>` not in this array is rejected, including the
   * default 75. So 75 is load-bearing here, not decorative.
   * Currently used non-default values: 90 (home-client), 95 (about-client).
   * Docs: https://nextjs.org/docs/app/api-reference/components/image#qualities
   */
  images: {
    qualities: [75, 90, 95],
  },

  /**
   * Allow dev-server cross-origin requests from these origins. Next 16
   * blocks `_next/webpack-hmr` and other dev-only resources from any host
   * other than the one the server bound to (default `localhost`).
   *
   * Per Next's csrf-protection.js, a bare `'*'` is explicitly rejected --
   * patterns must have >=2 segments. So we enumerate typical dev networks:
   *   - 100.*.*.*           Tailscale CGNAT range (100.64.0.0/10)
   *   - 192.168.*.*         RFC1918 LAN
   *   - 10.*.*.*            RFC1918 LAN
   *   - *.tail367f2e.ts.net Tailscale MagicDNS for this tailnet
   *   - *.thehudsonfam.com  Cloudflare-tunneled subdomains
   *
   * DEV ONLY -- no effect on production builds (the gate only runs in
   * `next dev`).
   * Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: [
    '100.*.*.*',
    '192.168.*.*',
    '10.*.*.*',
    '*.tail367f2e.ts.net',
    '*.thehudsonfam.com',
  ],

  /**
   * Cache Components -- the Next.js 16 caching model. With this enabled:
   *   - All dynamic data is executed at request time by default
   *   - Cache opt-in is via `'use cache'` directive + `cacheLife()` + `cacheTag()`
   *   - Mutations use `updateTag()` (read-your-writes) and `refresh()` (uncached)
   *     instead of the legacy `revalidatePath()` / `revalidateTag()` flow
   *   - PPR is included automatically; the old `experimental.ppr` flag was
   *     removed in Next 16 in favor of this model
   *
   * Pages that fetch dynamic data MUST wrap that fetch in a `<Suspense>`
   * boundary or mark the function with `'use cache'`. Failures show as
   * "Uncached data was accessed outside of <Suspense>" at build time.
   * Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
   *       https://nextjs.org/docs/app/getting-started/caching
   */
  cacheComponents: true,

  /**
   * Experimental flags. Subject to change between minor releases per the
   * Next.js docs; do not rely on these for production-critical behavior.
   *
   * - `viewTransition`: enables Next.js integration with React 19.2's
   *   `<ViewTransition>` component for animated route navigations.
   *   Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition
   */
  experimental: {
    viewTransition: true,
  },

  /**
   * Custom HTTP response headers per request path.
   * `/sw.js`: serve as JS, never cache, restrict via CSP.
   * `/(.*)`: apply security headers to every response.
   * Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
   */
  async headers() {
    return [
      {
        // Content-Security-Policy now set per-request by proxy.ts (nonce-based).
        // The static CSP that used to live here was redundant and conflicted.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      { source: '/(.*)', headers: securityHeaders },
    ];
  },
};

/**
 * Wrap with Sentry's plugin so production builds upload source maps to the
 * configured Sentry org/project. The plugin is a no-op when SENTRY_AUTH_TOKEN
 * is unset (local dev), so it ships nothing in those builds.
 * Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
