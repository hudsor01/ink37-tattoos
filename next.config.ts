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
   * Output mode -- standalone for self-hosting, native tracing on Vercel.
   *
   * `'standalone'` emits `.next/standalone/server.js` plus the traced subset
   * of node_modules needed to run it. The Dockerfile depends on exactly that
   * (`COPY .next/standalone ./` then `CMD ["node","server.js"]`), so it must
   * stay on for non-Vercel builds.
   *
   * On Vercel it is both redundant and, as of Next 16.3, actively broken.
   * Vercel's Build Output API does its own file tracing, so standalone just
   * duplicates that work -- and the combination fails the deploy outright:
   *
   *   ✓ Compiled successfully
   *   Running onBuildComplete from Vercel
   *   Error: ENOENT: no such file or directory, open
   *     '/vercel/path0/.next/next-server.js.nft.json'
   *
   * The Next build itself succeeds; Vercel's post-build packaging hook is
   * what cannot find the trace file it expects for a standalone build. GitHub
   * CI never runs that hook, which is why CI stayed green while every deploy
   * failed. Same signature reported upstream on 16.2.6 -> 16.3.1:
   * https://community.vercel.com/t/next-js-16-3-1-preview-packaging-fails-in-onbuildcomplete-with-missing-next-server-js-nft-json/48121
   *
   * Gating on VERCEL (which Vercel sets to "1" for every build) keeps Docker
   * self-hosting intact while letting the platform use the path it prefers.
   * Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
   */
  output: process.env.VERCEL ? undefined : 'standalone',

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

    /**
     * Vercel Blob is where every admin upload lands, and five dashboard
     * components render those URLs through `next/image`
     * (sortable-image-grid, products/columns, design-approval-card,
     * product-form, session-detail-client).
     *
     * Without an entry here `remotePatterns` is `[]`, and next/image refuses
     * any remote host outright: it throws E231 "hostname is not configured
     * under images" outside production, and the /_next/image optimizer 400s
     * the unmatched host in production. The net effect was an upload that
     * succeeded followed by a thumbnail that never loaded. proxy.ts already
     * whitelists this host in `img-src`, so the CSP half was in place and
     * only this half was missing.
     *
     * SECURITY -- this wildcard is wider than it looks. Vercel Blob hostnames
     * are `<storeId>.public.blob.vercel-storage.com` and store IDs are not
     * secret, so ANY pattern that accepts an arbitrary label here lets a
     * stranger call
     *   /_next/image?url=https://<their-store>.public.blob.vercel-storage.com/x.jpg
     * and have this site fetch, optimize, cache and serve third-party content
     * under its own domain, billed to this project's optimization quota.
     * (`**.host` is not narrower than `*.host` -- Next compiles both to the
     * same regex.) Set BLOB_IMAGE_HOSTNAME to this project's own
     * `<storeId>.public.blob.vercel-storage.com` to close it; the wildcard is
     * only the fallback so builds without that env var still render images.
     * The matching `img-src` entry in src/proxy.ts has the same caveat.
     */
    remotePatterns: [
      {
        protocol: 'https',
        // `||`, not `??`: clearing the var in the Vercel dashboard (rather
        // than deleting it) yields an empty string, which `??` would pass
        // through as a hostname matching nothing -- every dashboard thumbnail
        // would then 400 from the optimizer with no build-time error, which is
        // the exact symptom this block exists to fix.
        hostname:
          process.env.BLOB_IMAGE_HOSTNAME || '*.public.blob.vercel-storage.com',
      },
    ],
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

  /*
   * No `experimental` block.
   *
   * This held `viewTransition: true`, which Next 16.3 removed -- the key is
   * rejected both under `experimental` and at the top level (verified against
   * the installed types), so it is gone rather than promoted.
   *
   * Removing it is a no-op here: nothing in src/ ever imported
   * `<ViewTransition>`, so the flag was enabling an unused feature. Route
   * animations come from framer-motion via PageTransition, which is
   * unaffected. If React's ViewTransition is wanted later, check the Next
   * docs for the current config shape first.
   */

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
