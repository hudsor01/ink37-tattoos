---
phase: 13-security-hardening
plan: 03
subsystem: security
tags: [rbac, rate-limiting, idempotency, webhooks, drizzle, stripe, cal.com, resend]

# Dependency graph
requires:
  - phase: 13-01
    provides: requireRole() function for server action auth enforcement
  - phase: 13-02
    provides: rateLimiters.webhook and getRequestIp for webhook rate limiting
provides:
  - Role-enforced server actions (admin and portal)
  - 401/403/500 error discrimination on all admin and upload API routes
  - Atomic Stripe webhook idempotency via INSERT ON CONFLICT DO NOTHING
  - Cal.com webhook event audit trail (calEvent table)
  - Enhanced Cal.com Zod validation error logging
  - Rate limiting on all 3 webhook routes (100/min)
affects: [14-data-layer, 22-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [atomic-idempotency, webhook-audit-trail, structured-error-logging]

key-files:
  created:
    - drizzle/0001_lively_whirlwind.sql
  modified:
    - src/lib/db/schema.ts
    - src/app/api/webhooks/stripe/route.ts
    - src/app/api/webhooks/cal/route.ts
    - src/app/api/webhooks/resend/route.ts
    - src/__tests__/server-actions.test.ts
    - src/__tests__/upload-endpoint.test.ts
    - src/__tests__/cal-webhook.test.ts
    - src/__tests__/webhook-stripe.test.ts

key-decisions:
  - "calEvent table uses non-unique calEventUid since same booking UID appears for CREATED/RESCHEDULED/CANCELLED events -- audit trail, not idempotency gate"
  - "Stripe atomic idempotency uses INSERT ON CONFLICT DO NOTHING + .returning() to eliminate race window between read and write"

patterns-established:
  - "Atomic idempotency: INSERT ON CONFLICT DO NOTHING + .returning() to check if row was inserted without race conditions"
  - "Webhook audit trail: log every incoming webhook event with UID and trigger type for debugging"
  - "Structured error logging: console.error with prefixed context tags like [Cal Webhook] and [API] for grep-friendly debugging"

requirements-completed: [SEC-05, SEC-07, SEC-08, SEC-09]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 13 Plan 03: Server Action & Webhook Hardening Summary

**Atomic Stripe idempotency, Cal.com audit trail with calEvent table, webhook rate limiting (100/min), and test suite updates for requireRole auth pattern**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T16:02:18Z
- **Completed:** 2026-03-28T16:07:59Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Stripe webhook idempotency is now atomic (INSERT ON CONFLICT DO NOTHING) eliminating the race condition in the old read-then-write pattern
- Cal.com webhook events are tracked in a new calEvent table for audit trail, with enhanced Zod error path logging
- All 3 webhook routes (Stripe, Cal.com, Resend) are rate-limited at 100 requests/minute
- Test suite updated: 366 tests passing across 28 files after fixing mocks for requireRole, atomic idempotency, and rate limiter patterns

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Server action role enforcement + API route error discrimination** - `d594128` (test) -- Production code already committed by Plan 01; only test mocks needed updating
2. **Task 3: Stripe atomic idempotency + Cal.com event tracking + webhook rate limiting** - `0d706fa` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added calEvent table and calEventRelations for Cal.com webhook audit trail
- `drizzle/0001_lively_whirlwind.sql` - Migration for calEvent table (CREATE TABLE + index)
- `src/app/api/webhooks/stripe/route.ts` - Atomic idempotency (onConflictDoNothing) + rate limiting
- `src/app/api/webhooks/cal/route.ts` - Rate limiting + enhanced Zod error logging + calEvent tracking
- `src/app/api/webhooks/resend/route.ts` - Rate limiting
- `src/__tests__/server-actions.test.ts` - Updated mocks for requireRole (replaces getCurrentSession)
- `src/__tests__/upload-endpoint.test.ts` - Updated for early-return auth pattern (401/403 before handleUpload)
- `src/__tests__/cal-webhook.test.ts` - Added calEvent schema mock + rate limiter mock
- `src/__tests__/webhook-stripe.test.ts` - Updated for atomic idempotency pattern (onConflictDoNothing chain)

## Decisions Made
- calEvent table uses non-unique calEventUid because Cal.com sends the same booking UID for CREATED, RESCHEDULED, and CANCELLED events; this is an audit trail, not an idempotency gate
- Stripe atomic idempotency uses INSERT ON CONFLICT DO NOTHING + .returning() rather than a separate check query, eliminating the race window entirely

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 4 test files broken by security hardening changes**
- **Found during:** Task 3 verification (vitest run)
- **Issue:** Tests mocked getCurrentSession but actions now use requireRole; Cal/Stripe webhook tests didn't mock rate limiter or calEvent schema; upload endpoint tests expected handleUpload-level auth but auth now happens at route level
- **Fix:** Updated all 4 test files: server-actions.test.ts, upload-endpoint.test.ts, cal-webhook.test.ts, webhook-stripe.test.ts to mock requireRole, add rate limiter mocks, add calEvent schema mock, and test atomic idempotency chain
- **Files modified:** src/__tests__/server-actions.test.ts, src/__tests__/upload-endpoint.test.ts, src/__tests__/cal-webhook.test.ts, src/__tests__/webhook-stripe.test.ts
- **Verification:** All 366 tests pass across 28 test files
- **Committed in:** d594128 (test fixes for Tasks 1+2), 0d706fa (test fixes for Task 3)

**2. [Rule 2 - Missing Critical] Generated Drizzle migration for calEvent table**
- **Found during:** Task 3 (calEvent table was in schema but no migration existed)
- **Issue:** calEvent table defined in schema.ts but drizzle/0000_dry_human_torch.sql did not include it
- **Fix:** Ran `npx drizzle-kit generate` to create migration 0001_lively_whirlwind.sql
- **Files modified:** drizzle/0001_lively_whirlwind.sql, drizzle/meta/_journal.json, drizzle/meta/0001_snapshot.json
- **Verification:** Migration correctly creates cal_event table with id, cal_event_uid, trigger_event, processed_at columns and index
- **Committed in:** 0d706fa (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both essential. Test fixes required for CI to pass. Migration required for calEvent table to exist in production.

## Issues Encountered
- Tasks 1 and 2 production code was already implemented by Plan 01 (requireRole in all server actions, 401/403/500 discrimination in admin and upload routes). Only test updates were needed. Task 3 production code was partially implemented (schema and webhooks had changes staged by Plan 01).

## User Setup Required

Database migration needs to be applied to production:
```bash
npx drizzle-kit push
```

## Known Stubs

None -- all code is wired to real data sources and logic.

## Next Phase Readiness
- All security hardening for Phase 13 is complete
- Rate limiting, role enforcement, atomic idempotency, and error discrimination all in place
- Test suite is green (366/366 tests passing)
- Ready for Phase 14 (data layer fixes)

---
*Phase: 13-security-hardening*
*Completed: 2026-03-28*
