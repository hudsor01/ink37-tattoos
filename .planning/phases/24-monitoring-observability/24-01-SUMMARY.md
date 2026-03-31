---
phase: 24-monitoring-observability
plan: 01
subsystem: infra
tags: [sentry, pino, health-check, web-vitals, monitoring, observability, logging]

# Dependency graph
requires:
  - phase: 23-git-merge-ci-cd
    provides: merged v2.0 codebase on main with CI/CD pipeline
provides:
  - Sentry error tracking with instrumentation hook
  - Health check endpoint at /api/health
  - Pino structured logging replacing all server-side console calls
  - Web Vitals tracking for LCP, FID/INP, CLS
affects: [25-db-security-hardening, 26-assets-infra, 27-documentation]

# Tech tracking
tech-stack:
  added: ["@sentry/nextjs 10.46.0", "pino 10.3.1", "pino-pretty 13.1.3"]
  patterns: ["structured logging via Pino", "instrumentation hook for Sentry", "Web Vitals via useReportWebVitals"]

key-files:
  created:
    - src/instrumentation.ts
    - sentry.client.config.ts
    - sentry.edge.config.ts
    - src/lib/logger.ts
    - src/app/api/health/route.ts
    - src/components/web-vitals.tsx
    - src/__tests__/health.test.ts
    - src/__tests__/logger.test.ts
  modified:
    - next.config.ts
    - src/lib/env.ts
    - src/components/providers.tsx
    - src/lib/auth.ts
    - src/lib/email/resend.ts
    - src/lib/security/rate-limiter.ts
    - src/lib/actions/contact-actions.ts
    - src/lib/actions/session-actions.ts
    - src/lib/actions/product-image-actions.ts
    - src/lib/actions/notification-actions.ts
    - src/lib/actions/safe-action.ts
    - src/lib/actions/media-actions.ts
    - src/lib/actions/gift-card-admin-actions.ts
    - src/lib/dal/audit.ts
    - src/app/api/admin/media/route.ts
    - src/app/api/admin/sessions/route.ts
    - src/app/api/admin/appointments/route.ts
    - src/app/api/admin/customers/route.ts
    - src/app/api/webhooks/stripe/route.ts
    - src/app/api/webhooks/cal/route.ts
    - src/app/api/webhooks/resend/route.ts
    - src/app/api/store/download/route.ts
    - src/app/api/upload/route.ts
    - src/app/api/upload/token/route.ts
    - src/app/api/cron/no-show-followup/route.ts
    - src/app/api/cron/balance-due/route.ts
    - src/__tests__/audit.test.ts

key-decisions:
  - "Pino logger uses server-only import to prevent accidental client-side inclusion"
  - "Kept console.error in client-side error.tsx boundaries since they run in browser"
  - "Removed rate-limiter console.warn rather than importing logger to avoid circular/server-only constraints"
  - "Web Vitals reports to Sentry metrics distribution when available, console.debug in dev"
  - "WebVitals component added to Providers (client component tree) rather than root layout directly"

patterns-established:
  - "Structured logging: import { logger } from '@/lib/logger' for all server-side logging"
  - "Request-scoped logging: createRequestLogger(requestId) for correlated logs"
  - "Pino error convention: logger.error({ err }, 'message') with error object in first arg"

requirements-completed: [MON-01, MON-02, MON-03, MON-04]

# Metrics
duration: 11min
completed: 2026-03-31
---

# Phase 24 Plan 01: Monitoring & Observability Summary

**Sentry error tracking, /api/health endpoint, Pino structured logging across 24 files, Web Vitals reporting for LCP/FID/CLS**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-31T00:51:50Z
- **Completed:** 2026-03-31T01:02:28Z
- **Tasks:** 5
- **Files modified:** 30

## Accomplishments
- Sentry SDK configured with instrumentation hook (server + edge + client), source map upload, session replay
- Health check endpoint at /api/health returns 200/503 based on DB connectivity with no-cache headers
- Pino structured logger created with JSON production output and pretty-print development mode
- All 24 server-side files migrated from console.log/error/warn to structured logger calls
- Web Vitals tracking enabled for LCP, FID/INP, CLS with Sentry metrics integration
- 10 new tests (4 health check, 6 logger) all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install monitoring dependencies and configure Sentry** - `c0284ba` (feat)
2. **Task 2: Create health check endpoint** - `605f66a` (feat)
3. **Task 3: Create Pino structured logger and replace console calls** - `a4c54ea` (feat)
4. **Task 4: Enable Web Vitals tracking** - `ae11666` (feat)
5. **Task 5: Add tests for health check and logger** - `7beaf6e` (test)

## Files Created/Modified
- `src/instrumentation.ts` - Sentry init for Node.js and Edge runtimes
- `sentry.client.config.ts` - Client-side Sentry with session replay
- `sentry.edge.config.ts` - Edge runtime Sentry init
- `src/lib/logger.ts` - Pino structured logger with createRequestLogger
- `src/app/api/health/route.ts` - GET /api/health with DB connectivity check
- `src/components/web-vitals.tsx` - Web Vitals reporter component
- `src/components/providers.tsx` - Added WebVitals to client provider tree
- `next.config.ts` - Sentry webpack plugin configuration
- `src/lib/env.ts` - SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN env vars
- 24 server-side files - console calls replaced with logger calls
- `src/__tests__/health.test.ts` - Health check endpoint tests
- `src/__tests__/logger.test.ts` - Logger module tests

## Decisions Made
- Pino logger uses `server-only` import to prevent accidental client-side inclusion
- Kept `console.error` in client-side error.tsx boundaries (they run in browser, not server)
- Removed rate-limiter console.warn rather than importing logger (avoids circular/server-only constraints)
- Web Vitals reports to Sentry metrics.distribution when available, console.debug in dev
- WebVitals component added inside Providers (client component tree) for proper hook usage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated audit test assertion**
- **Found during:** Task 3 (console replacement)
- **Issue:** Existing audit test asserted `console.error` presence in audit.ts -- after replacing with `logger.error`, test would fail
- **Fix:** Updated assertion to check for `logger.error` instead of `console.error`
- **Files modified:** `src/__tests__/audit.test.ts`
- **Verification:** Audit test passes
- **Committed in:** a4c54ea (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential correction to keep existing tests passing. No scope creep.

## Issues Encountered
None

## User Setup Required

Sentry requires external configuration:
- Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` environment variables in Vercel
- Set `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` for source map uploads
- Create a Sentry project at sentry.io if not already done

## Next Phase Readiness
- Monitoring infrastructure complete, ready for Phase 25 (DB + security hardening)
- Health check endpoint available for uptime monitoring services
- Structured logging will capture issues during migration consolidation and security changes

---
*Phase: 24-monitoring-observability*
*Completed: 2026-03-31*
