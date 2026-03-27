---
phase: 11-full-stack-integration
plan: 02
status: complete
duration: 8min
tasks_completed: 2
files_modified: 7
key-files:
  modified:
    - src/app/(public)/page.tsx
    - src/app/(public)/gallery/page.tsx
    - src/app/(store)/store/page.tsx
    - src/app/(store)/store/[productId]/page.tsx
    - src/app/(store)/store/checkout/success/page.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(portal)/layout.tsx
decisions:
  - "Replace force-dynamic with connection() from next/server for Next.js 16 PPR readiness"
  - "Add connection() to dashboard and portal layouts to propagate dynamic rendering to child pages"
requirements:
  - STACK-13
  - STACK-14
---

# Phase 11 Plan 02: Route Boundaries + Force-Dynamic Removal Summary

**One-liner:** Replaced all 7 force-dynamic exports with connection() from next/server, verifying all route boundary files (loading, error, not-found) and React 19 features already exist.

## What was done

### Task 1: Remove force-dynamic and add connection()

The 13 route boundary files (5 loading.tsx, 4 error.tsx, 4 not-found.tsx) and React 19 features (prefetchDNS/preconnect, SubmitButton) were already created by a prior phase (Phase 10 or 11-01).

Actual work performed:
- Removed `export const dynamic = 'force-dynamic'` from 7 files
- Added `import { connection } from 'next/server'` and `await connection()` to all 7 files
- Dashboard and portal layouts converted to `async` functions to support `await connection()`
- This replaces the blunt force-dynamic with the modern Next.js 16 API, enabling future Partial Prerendering (PPR) adoption

Files modified:
1. `src/app/(public)/page.tsx` -- removed force-dynamic, added connection()
2. `src/app/(public)/gallery/page.tsx` -- removed force-dynamic, added connection()
3. `src/app/(store)/store/page.tsx` -- removed force-dynamic, added connection()
4. `src/app/(store)/store/[productId]/page.tsx` -- removed force-dynamic, added connection() in generateMetadata
5. `src/app/(store)/store/checkout/success/page.tsx` -- removed force-dynamic, added connection()
6. `src/app/(dashboard)/layout.tsx` -- removed force-dynamic, added connection(), made async
7. `src/app/(portal)/layout.tsx` -- removed force-dynamic, added connection(), made async

### Task 2: Verify React 19 features

Verified already existing:
- `src/app/(public)/layout.tsx` already has `prefetchDNS` and `preconnect` for Cal.com and Google Fonts
- `src/components/ui/submit-button.tsx` already has useFormStatus-based SubmitButton component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added connection() to replace force-dynamic**
- **Found during:** Task 1
- **Issue:** Plan said to simply remove force-dynamic, stating pages were "already dynamic due to reading cookies/auth." However, public and store pages don't use cookies/auth -- they make direct DB queries. Without force-dynamic or connection(), Next.js tries to prerender them at build time, failing without a database.
- **Fix:** Added `await connection()` from next/server to all 7 files. This is the modern Next.js 16 API for opting into dynamic rendering, replacing the deprecated force-dynamic pattern.
- **Files modified:** All 7 files listed above

**2. [Rule 3 - Blocking] Dashboard/portal layout propagation**
- **Found during:** Task 1
- **Issue:** Removing force-dynamic from dashboard layout caused all 15 dashboard child pages to attempt prerendering, failing on env validation (STRIPE_SECRET_KEY). The force-dynamic on the layout had been propagating to all child segments.
- **Fix:** Added connection() to dashboard and portal layouts. In Next.js 16, connection() in a layout propagates dynamic rendering to child pages, matching the previous force-dynamic behavior.
- **Files modified:** src/app/(dashboard)/layout.tsx, src/app/(portal)/layout.tsx

**3. Pre-existing files**
- All 13 route boundary files and both React 19 features (preloading, SubmitButton) already existed from prior phases. The plan had outdated context about these being missing.

## Verification

- `grep -r "force-dynamic" src/app/` returns 0 matches
- `grep "connection" src/app/(public)/page.tsx` returns match
- `grep "connection" src/app/(dashboard)/layout.tsx` returns match
- `grep "prefetchDNS" src/app/(public)/layout.tsx` returns match
- `grep "useFormStatus" src/components/ui/submit-button.tsx` returns match
- `bun run build` succeeds -- all DB-backed pages show Dynamic (f), static pages show Static (o)

## Known Stubs

None.

## Self-Check: PASSED
