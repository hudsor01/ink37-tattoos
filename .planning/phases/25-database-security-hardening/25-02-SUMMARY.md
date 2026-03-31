---
phase: 25-database-security-hardening
plan: 02
subsystem: security
tags: [csp, nonce, rate-limiting, upstash, middleware, next.js]

# Dependency graph
requires:
  - phase: 24-monitoring-observability
    provides: Pino structured logging (logger import pattern)
  - phase: 13-security-hardening
    provides: Rate limiter infrastructure (createLimiter, Upstash)
provides:
  - Nonce-based CSP via proxy.ts with per-request crypto nonces
  - Admin route rate limiting at 60 req/min via Upstash
  - Upload route rate limiting at 20 req/min via Upstash
  - All merge conflicts from Phase 24 parallel execution resolved
affects: [26-assets-infra, 27-documentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSP nonce via proxy.ts middleware, propagated via x-nonce request header"
    - "Rate limit at top of route handler before auth checks"
    - "style-src unsafe-inline alongside nonce for Recharts inline style attribute compatibility"

key-files:
  created: []
  modified:
    - src/proxy.ts
    - next.config.ts
    - src/app/layout.tsx
    - src/lib/security/rate-limiter.ts
    - src/app/api/admin/sessions/route.ts
    - src/app/api/admin/media/route.ts
    - src/app/api/admin/customers/route.ts
    - src/app/api/admin/appointments/route.ts
    - src/app/api/admin/calendar/route.ts
    - src/app/api/upload/route.ts
    - src/app/api/upload/token/route.ts

key-decisions:
  - "style-src includes unsafe-inline alongside nonce for Recharts inline style attributes (W3C CSP Level 3 recommended migration approach)"
  - "API routes skip CSP processing (early return for /api/* -- JSON responses have no HTML to protect)"
  - "Google Fonts domains removed from CSP (next/font self-hosts all fonts)"
  - "Stripe domains not added to CSP (server-side only Stripe, no client embed)"

patterns-established:
  - "CSP nonce pattern: proxy.ts generates nonce -> sets x-nonce header -> layout.tsx reads via headers()"
  - "Rate limiting pattern: import rateLimiters -> call .admin.limit(ip) or .upload.limit(ip) at handler top"

requirements-completed: [INFRA-02, INFRA-03]

# Metrics
duration: 10min
completed: 2026-03-30
---

# Phase 25 Plan 02: CSP Nonces + Admin/Upload Rate Limiting Summary

**Nonce-based CSP replacing unsafe-inline/unsafe-eval, rate-limited admin (60/min) and upload (20/min) routes, all 12 merge conflict files resolved**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-31T04:38:35Z
- **Completed:** 2026-03-31T04:49:02Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments
- Dynamic CSP with per-request crypto nonces via proxy.ts middleware, removing unsafe-inline from script-src and unsafe-eval from production
- Admin and upload API routes protected with Upstash-backed rate limiting (60 req/min and 20 req/min respectively)
- All 12 merge conflict files from Phase 24 parallel worktree execution resolved with consistent logger imports
- Build passes and all 705 tests pass with zero conflict markers remaining

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement nonce-based CSP via proxy.ts** - `8f3565d` (feat)
2. **Task 2: Resolve merge conflicts, add rate limiters** - `9a3e60a` (feat)

## Files Created/Modified
- `src/proxy.ts` - Extended with nonce generation, dynamic CSP header, API route skip
- `next.config.ts` - Removed static CSP entry, fixed deprecated hideSourceMaps
- `src/app/layout.tsx` - Made async, reads x-nonce header, applies nonce to JSON-LD script
- `src/lib/security/rate-limiter.ts` - Added admin (60/min) and upload (20/min) limiters
- `src/app/api/admin/sessions/route.ts` - Merge conflict resolved, rate limiting added
- `src/app/api/admin/media/route.ts` - Merge conflict resolved, rate limiting added
- `src/app/api/admin/customers/route.ts` - Merge conflict resolved, rate limiting added
- `src/app/api/admin/appointments/route.ts` - Merge conflict resolved, rate limiting added
- `src/app/api/admin/calendar/route.ts` - Rate limiting added (no conflicts)
- `src/app/api/upload/route.ts` - Merge conflict resolved, rate limiting added
- `src/app/api/upload/token/route.ts` - Merge conflict resolved, rate limiting added, return type fixed
- `src/app/api/webhooks/cal/route.ts` - Merge conflict resolved
- `src/app/api/webhooks/resend/route.ts` - Merge conflict resolved
- `src/app/api/webhooks/stripe/route.ts` - Merge conflict resolved
- `src/app/api/cron/balance-due/route.ts` - Merge conflict resolved
- `src/app/api/cron/no-show-followup/route.ts` - Merge conflict resolved
- `src/app/api/store/download/route.ts` - Merge conflict resolved
- `src/lib/actions/contact-actions.ts` - Fixed createLogger -> logger import
- `src/lib/actions/session-actions.ts` - Fixed createLogger -> logger import
- `src/components/web-vitals.tsx` - Fixed Sentry v10 metrics API
- `src/__tests__/api-admin.test.ts` - Added rate limiter mocks, pass request params
- `src/__tests__/rbac-routes.test.ts` - Added rate limiter mocks, pass request params
- `src/__tests__/resend-webhook.test.ts` - Added server-only/rate-limiter/logger mocks
- `src/__tests__/auth-hooks.test.ts` - Updated logger mock expectations
- `src/__tests__/audit.test.ts` - Merge conflict resolved

## Decisions Made
- style-src includes both nonce and unsafe-inline for Recharts compatibility (W3C CSP Level 3 spec recommendation)
- API routes (/api/*) skip CSP processing entirely via early return (JSON responses, no HTML)
- Google Fonts CDN domains removed from CSP since next/font self-hosts all fonts
- Stripe domains not added to CSP since this project uses server-side Stripe only (no @stripe/stripe-js)
- unsafe-eval only in development mode for React dev tools

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed createLogger imports in contact-actions.ts and session-actions.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** Two action files imported non-existent `createLogger` from `@/lib/logger` (leftover from Phase 24 parallel merge -- not merge conflict markers, just wrong branch code)
- **Fix:** Changed to `import { logger } from '@/lib/logger'` and replaced all `log.` calls with `logger.`
- **Files modified:** src/lib/actions/contact-actions.ts, src/lib/actions/session-actions.ts
- **Verification:** bun run build succeeds
- **Committed in:** 9a3e60a (Task 2 commit)

**2. [Rule 3 - Blocking] Removed deprecated hideSourceMaps from Sentry config**
- **Found during:** Task 2 (build verification)
- **Issue:** next.config.ts contained `hideSourceMaps: true` which doesn't exist in Sentry SDK v10
- **Fix:** Removed the deprecated property
- **Files modified:** next.config.ts
- **Verification:** TypeScript type check passes
- **Committed in:** 9a3e60a (Task 2 commit)

**3. [Rule 3 - Blocking] Fixed Sentry v10 metrics API in web-vitals.tsx**
- **Found during:** Task 2 (build verification)
- **Issue:** `Sentry.metrics.distribution()` with `tags` property doesn't exist in Sentry SDK v10
- **Fix:** Replaced with `Sentry.setMeasurement()` which is the v10 API for custom metrics
- **Files modified:** src/components/web-vitals.tsx
- **Verification:** TypeScript type check passes
- **Committed in:** 9a3e60a (Task 2 commit)

**4. [Rule 3 - Blocking] Fixed upload/token route return type mismatch**
- **Found during:** Task 2 (build verification)
- **Issue:** `POST` function had explicit `Promise<NextResponse>` return type but `rateLimitResponse()` returns `Response`
- **Fix:** Removed explicit return type annotation to let TypeScript infer it
- **Files modified:** src/app/api/upload/token/route.ts
- **Verification:** TypeScript type check passes
- **Committed in:** 9a3e60a (Task 2 commit)

**5. [Rule 3 - Blocking] Updated test mocks for rate limiter and logger changes**
- **Found during:** Task 2 (test verification)
- **Issue:** Tests didn't mock new rate limiters (admin, upload) and used console.warn/error instead of logger
- **Fix:** Added rate limiter mocks to api-admin, rbac-routes, resend-webhook tests; updated logger expectations in auth-hooks and resend-webhook tests; added request parameter to route handler calls
- **Files modified:** src/__tests__/api-admin.test.ts, src/__tests__/rbac-routes.test.ts, src/__tests__/resend-webhook.test.ts, src/__tests__/auth-hooks.test.ts
- **Verification:** All 705 tests pass
- **Committed in:** 9a3e60a (Task 2 commit)

**6. [Rule 1 - Bug] Resolved merge conflict in audit.test.ts**
- **Found during:** Task 2 (conflict scan)
- **Issue:** src/__tests__/audit.test.ts had merge conflict markers from Phase 24 parallel execution
- **Fix:** Kept HEAD version (logger.error)
- **Files modified:** src/__tests__/audit.test.ts
- **Committed in:** 9a3e60a (Task 2 commit)

---

**Total deviations:** 6 auto-fixed (1 bug, 5 blocking)
**Impact on plan:** All auto-fixes were necessary to achieve green build and tests. The createLogger imports, deprecated Sentry API, and missing test mocks were all consequences of the Phase 24 parallel worktree merge. No scope creep.

## Issues Encountered
- Phase 24 parallel worktree execution left merge conflicts in 13 files (12 route files + 1 test file) and 2 additional files with wrong imports (no conflict markers but wrong branch code). All resolved as part of Task 2.

## Known Stubs
None -- all functionality is fully wired.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CSP nonces active on all page routes, API routes excluded
- Rate limiting covers all admin and upload endpoints
- Build passes, all 705 tests pass
- Ready for Phase 26 (assets, infra, PWA) or Phase 27 (documentation)

## Self-Check: PASSED

- All 12 key files verified present
- Both task commits verified in git log (8f3565d, 9a3e60a)
- Build: passes (bun run build)
- Tests: 705/705 pass (bun run test)

---
*Phase: 25-database-security-hardening*
*Completed: 2026-03-30*
