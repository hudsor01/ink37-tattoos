---
phase: 28-fix-pr-5-notification-retention-policy-review-issues
plan: 01
subsystem: security, infra
tags: [crypto, timing-safe, redis, zod, n8n, cron]

# Dependency graph
requires: []
provides:
  - "Shared timing-safe cron auth utility (verifyCronAuth) for all cron routes"
  - "Shared Redis client singleton (getRedis) for distributed locking"
  - "Zod-coerced numeric env vars for notification retention settings"
  - "n8n workflow JSON for daily notification cleanup at 3AM CT"
affects: [28-02-PLAN, cron-routes, notifications-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HMAC-then-timingSafeEqual for constant-time secret comparison"
    - "Lazy singleton pattern for shared Redis client"
    - "z.coerce.number().int().positive().optional() for numeric env vars"

key-files:
  created:
    - src/lib/security/cron-auth.ts
    - n8n/notifications-cleanup-workflow.json
  modified:
    - src/lib/env.ts
    - src/__tests__/env.test.ts

key-decisions:
  - "Used random key per comparison in HMAC (crypto.randomBytes(32)) rather than a static key, preventing any key-reuse attack vector"
  - "Redis singleton uses three-state pattern (undefined/null/Redis) to distinguish not-yet-initialized from env-vars-missing"

patterns-established:
  - "verifyCronAuth(request) returns typed CronAuthResult union for cron route auth"
  - "getRedis() lazy singleton for shared Redis access in security/infra modules"

requirements-completed: [CRON-SEC-01, CRON-CLEAN-01, CRON-CLEAN-02, CRON-ROB-01, CRON-INFRA-01]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 28 Plan 01: Shared Cron Auth, Env Coercion, and n8n Workflow Summary

**Timing-safe cron auth utility with HMAC comparison, Zod-coerced numeric env vars replacing z.string(), and n8n notification cleanup workflow JSON**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T22:37:54Z
- **Completed:** 2026-04-02T22:39:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created shared `verifyCronAuth()` using HMAC-then-timingSafeEqual to eliminate timing attack vector on CRON_SECRET comparison across all cron routes
- Created `getRedis()` lazy singleton to prevent redundant Redis client instantiation in lock acquire/release flows
- Changed 3 notification env vars from `z.string().optional()` to `z.coerce.number().int().positive().optional()` so non-numeric values fail at startup instead of producing NaN at runtime
- Added 5 test cases for notification retention Zod coercion covering numeric, undefined, non-numeric, negative, and zero inputs
- Created n8n workflow JSON for daily 3AM CT notification cleanup with retry and credential configuration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared cron auth utility with timing-safe comparison and Redis singleton** - `a89cffa` (feat)
2. **Task 2: Fix env schema to use Zod coerced numbers + extend env tests + create n8n workflow JSON** - `1099cfb` (feat)

## Files Created/Modified
- `src/lib/security/cron-auth.ts` - Shared cron auth with verifyCronAuth() and getRedis() exports
- `src/lib/env.ts` - Changed 3 notification env vars to z.coerce.number().int().positive().optional()
- `src/__tests__/env.test.ts` - Added 5 notification retention coercion tests (8 total tests, all passing)
- `n8n/notifications-cleanup-workflow.json` - n8n workflow for daily 3AM CT notification cleanup

## Decisions Made
- Used `crypto.randomBytes(32)` for a fresh HMAC key per comparison rather than a static key -- eliminates any key-reuse concern while maintaining constant-time properties
- Redis singleton uses three-state pattern (`undefined` = not initialized, `null` = env vars missing, `Redis` = active) to distinguish first call from known-missing configuration
- Did not add `import 'server-only'` to cron-auth.ts since it is consumed by API route handlers, not server components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all code is fully wired and functional.

## Next Phase Readiness
- `verifyCronAuth()` and `getRedis()` are ready for Plan 02 to refactor the notifications-cleanup route handler
- Env schema now returns coerced numbers, so Plan 02 can consume `env().NOTIFICATION_RETENTION_READ_DAYS` directly without parseInt
- n8n workflow JSON ready for import to n8n.thehudsonfam.com

## Self-Check: PASSED

All 4 created/modified files verified on disk. Both task commits (a89cffa, 1099cfb) verified in git log.

---
*Phase: 28-fix-pr-5-notification-retention-policy-review-issues*
*Completed: 2026-04-02*
