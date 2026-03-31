---
phase: 26-assets-infrastructure
plan: 01
subsystem: infra
tags: [pwa, service-worker, manifest, search-verification, seo]

# Dependency graph
requires:
  - phase: 24-monitoring-observability
    provides: Sentry, health check, web vitals infrastructure
provides:
  - Bing and Google search engine verification files
  - PWA web manifest with standalone display mode
  - Shell-only service worker with versioned caching
  - Service worker registration wired into client providers
  - sw.js-specific security headers in Next.js config
affects: [27-documentation]

# Tech tracking
tech-stack:
  added: []
  patterns: [Next.js manifest.ts file convention, shell-only service worker with version-bump strategy]

key-files:
  created:
    - public/BingSiteAuth.xml
    - public/google4e8b2c51e8e12345.html
    - public/googlec4d8a3b9c5e6f7a8.html
    - public/googlef47ac10b58e755e6.html
    - src/app/manifest.ts
    - public/sw.js
    - src/components/service-worker-registration.tsx
  modified:
    - src/components/providers.tsx
    - next.config.ts

key-decisions:
  - "Used Next.js manifest.ts file convention instead of static manifest.json for auto-linking and type safety"
  - "Split icon purposes into separate 'any' and 'maskable' entries to avoid cropping on Android launchers"
  - "Kept apple-icon.png reference unchanged since file exists and Next.js auto-generates apple-touch-icon link tag"

patterns-established:
  - "Service worker versioning: bump CACHE_NAME suffix (v1 -> v2) when cached assets change"
  - "SW registration via client component in Providers tree, not in layout.tsx"

requirements-completed: [ASSET-02, ASSET-03]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 26 Plan 01: Search Verification + PWA Manifest Summary

**Search engine verification files (Bing + 3 Google) and PWA with manifest.ts, shell-only service worker, and iOS apple-touch-icon**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T18:51:11Z
- **Completed:** 2026-03-31T18:59:17Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Copied 4 search verification files from tattoo-website source repo (1 Bing, 3 Google) -- generic placeholder excluded
- Created PWA manifest using Next.js file convention with standalone display, ink-black theme, and split icon purposes
- Built minimal shell-only service worker (51 lines) with documented versioning strategy and cache-first fetching
- Wired service worker registration into client Providers component and added sw.js-specific headers in next.config.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy search verification files and create PWA manifest + service worker** - `c545d71` (feat)
2. **Task 2: Register service worker, add sw.js headers, and add apple-touch-icon** - `0a4bf5e` (feat)

## Files Created/Modified
- `public/BingSiteAuth.xml` - Bing search engine verification
- `public/google4e8b2c51e8e12345.html` - Google search verification
- `public/googlec4d8a3b9c5e6f7a8.html` - Google search verification
- `public/googlef47ac10b58e755e6.html` - Google search verification
- `src/app/manifest.ts` - PWA web manifest with standalone display, theme colors, icon entries, shortcuts
- `public/sw.js` - Shell-only service worker with documented version-bump strategy
- `src/components/service-worker-registration.tsx` - Client component registering SW on page load
- `src/components/providers.tsx` - Added ServiceWorkerRegistration after Toaster
- `next.config.ts` - Added sw.js headers (Content-Type, no-cache, CSP) before catch-all

## Decisions Made
- Used Next.js `manifest.ts` file convention instead of static `manifest.json` in public/ -- provides auto-linking and type safety with MetadataRoute.Manifest
- Split icon purposes into separate "any" and "maskable" entries (not combined "maskable any") to avoid cropping issues on some Android launchers
- Kept existing `apple: '/icons/apple-icon.png'` reference unchanged -- file exists and Next.js auto-generates the `<link rel="apple-touch-icon">` tag from metadata.icons.apple
- Excluded `google-site-verification.html` from copy (generic placeholder, not a real verification file)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Search verification files ready for Bing/Google webmaster tools verification
- PWA manifest and service worker ready for "Add to Home Screen" testing
- Remaining Phase 26 plans: gallery videos (26-02), n8n workflows + env audit (26-03)

## Self-Check: PASSED

All 10 files verified present. Both task commits (c545d71, 0a4bf5e) confirmed in git log.

---
*Phase: 26-assets-infrastructure*
*Completed: 2026-03-31*
