---
phase: 28-fix-pr-5-notification-retention-policy-review-issues
plan: 02
subsystem: security, api, database
tags: [timing-safe, redis, lua, distributed-lock, cron, vitest]

# Dependency graph
requires:
  - "28-01: shared verifyCronAuth utility, getRedis singleton, coerced env numbers"
provides:
  - "All 3 cron routes use timing-safe auth via verifyCronAuth (no inline string ===)"
  - "Owner-checked distributed lock with UUID + Lua release script"
  - "purgeOldNotifications without RETURNING clause, with @cron-authorized JSDoc"
  - "8 unit tests covering auth, locking, rowCount, and shared Redis client"
affects: [cron-routes, notifications-cleanup, balance-due, no-show-followup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lua script atomic check-and-delete for Redis lock release"
    - "UUID lock ownership prevents cross-process lock deletion"
    - "env() coerced number consumption with ?? fallback (no parseInt)"

key-files:
  created:
    - src/__tests__/api-cron-cleanup.test.ts
  modified:
    - src/app/api/cron/notifications-cleanup/route.ts
    - src/app/api/cron/balance-due/route.ts
    - src/app/api/cron/no-show-followup/route.ts
    - src/lib/dal/notifications.ts
    - src/lib/security/cron-auth.ts

key-decisions:
  - "Exported LOCK_KEY and LOCK_TTL_SECONDS from cron-auth.ts so the notifications-cleanup route imports lock constants from a single source of truth"
  - "Lock acquire returns { acquired, owner } tuple to thread the UUID through to releaseLock without module-level state"

patterns-established:
  - "verifyCronAuth + NextResponse.json pattern for all cron route auth blocks"
  - "Lua EVAL with KEYS[1]/ARGV[1] for atomic owner-checked lock release"

requirements-completed: [CRON-SEC-01, CRON-SEC-02, CRON-ROB-02, CRON-ROB-03, CRON-CLEAN-01]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 28 Plan 02: Cron Route Auth Refactor, Owner-Checked Lock, and DAL Fix Summary

**All 3 cron routes migrated to timing-safe verifyCronAuth, notification cleanup lock rewritten with UUID ownership + Lua release, RETURNING removed from purge SQL, 8 tests green**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T22:41:51Z
- **Completed:** 2026-04-02T22:46:11Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced inline `authHeader !== \`Bearer ${secret}\`` in all 3 cron routes with `verifyCronAuth()` from shared utility, eliminating timing attack vector
- Rewrote notification cleanup lock to store a UUID via SET NX EX and release via Lua script that atomically checks owner before deleting, preventing the cross-process lock deletion race condition
- Removed RETURNING clause from both DELETE queries in purgeOldNotifications, eliminating unnecessary data transfer on batch deletes
- Added @cron-authorized JSDoc to purgeOldNotifications documenting intentional requireStaffRole bypass
- Replaced parseInt with env() coerced numbers (z.coerce.number from Plan 01) for all retention settings
- Wrote 8 unit tests (TDD) covering auth accept/reject, UUID lock acquire, Lua release with owner check, rowCount usage, and shared Redis client verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Write tests for cron cleanup route (TDD RED)** - `3416004` (test)
2. **Task 2: Update all 3 cron routes + fix DAL (TDD GREEN)** - `b7af676` (feat)

## Files Created/Modified
- `src/__tests__/api-cron-cleanup.test.ts` - 8 unit tests for cron cleanup route behavior (auth, lock, purge, shared client)
- `src/app/api/cron/notifications-cleanup/route.ts` - Rewritten with verifyCronAuth, UUID lock, Lua release, env() coerced numbers
- `src/app/api/cron/balance-due/route.ts` - Auth block replaced with verifyCronAuth
- `src/app/api/cron/no-show-followup/route.ts` - Auth block replaced with verifyCronAuth
- `src/lib/dal/notifications.ts` - Removed RETURNING from both DELETEs, added @cron-authorized JSDoc
- `src/lib/security/cron-auth.ts` - Added LOCK_KEY and LOCK_TTL_SECONDS exports

## Decisions Made
- Exported LOCK_KEY and LOCK_TTL_SECONDS from cron-auth.ts rather than keeping them in the route file, since the lock constants are part of the shared security infrastructure
- Used `{ acquired, owner }` tuple return from tryAcquireLock instead of module-level state, making the lock ownership explicit and threaded through the handler flow without mutable globals

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exported LOCK_KEY and LOCK_TTL_SECONDS from cron-auth.ts**
- **Found during:** Task 2 (notifications-cleanup route rewrite)
- **Issue:** The route imports LOCK_KEY and LOCK_TTL_SECONDS from cron-auth.ts, but Plan 01 did not create these exports (only verifyCronAuth and getRedis were exported)
- **Fix:** Added `export const LOCK_KEY` and `export const LOCK_TTL_SECONDS` to cron-auth.ts
- **Files modified:** src/lib/security/cron-auth.ts
- **Verification:** Route compiles and all 8 tests pass
- **Committed in:** b7af676 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary addition to the shared utility to avoid duplicating lock constants. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all code is fully wired and functional.

## Next Phase Readiness
- All PR #5 review issues are resolved
- All 3 cron routes now use the shared timing-safe auth utility
- Notification cleanup has owner-checked distributed locking
- DAL purge function is documented and optimized
- Ready for PR merge

## Self-Check: PASSED

All 6 created/modified files verified on disk. Both task commits (3416004, b7af676) verified in git log.

---
*Phase: 28-fix-pr-5-notification-retention-policy-review-issues*
*Completed: 2026-04-02*
