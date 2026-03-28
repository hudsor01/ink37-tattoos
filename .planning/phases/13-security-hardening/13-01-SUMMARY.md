---
phase: 13-security-hardening
plan: 01
subsystem: auth
tags: [better-auth, rbac, role-hierarchy, layout-auth, env-validation, zod]

# Dependency graph
requires: []
provides:
  - "requireRole() helper with ROLE_HIERARCHY for centralized role validation"
  - "Layout-level auth enforcement on dashboard (ADMIN+) and portal (USER+) route groups"
  - "Access-denied page for insufficient permissions"
  - "Hardened env schema with required BLOB_PRIVATE_READ_WRITE_TOKEN"
  - "Upstash Redis env vars in schema (optional, for Plan 02 rate limiting)"
affects: [13-02, 13-03, 14-data-layer, 16-missing-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [layout-level-auth-guards, role-hierarchy-validation, callback-url-redirects]

key-files:
  created:
    - src/app/(dashboard)/access-denied/page.tsx
  modified:
    - src/lib/auth.ts
    - src/lib/env.ts
    - src/app/(dashboard)/layout.tsx
    - src/app/(portal)/layout.tsx
    - .env.example

key-decisions:
  - "Used inline ADMIN_ROLES array in dashboard layout instead of requireRole() to keep layout logic explicit and avoid throwing in layout context"
  - "Upstash Redis env vars added as optional to support graceful degradation in dev environments"
  - "Updated .env.example to use correct var names matching env schema (VERCEL_BLOB_READ_WRITE_TOKEN + BLOB_PRIVATE_READ_WRITE_TOKEN)"

patterns-established:
  - "Layout auth guard pattern: getCurrentSession() at top of layout, redirect to /login?callbackUrl= if no session"
  - "Role hierarchy pattern: numeric levels (user=0, staff=1, manager=2, admin=3, super_admin=4) for >= comparisons"
  - "requireRole() throws pattern: 'Unauthorized' for no session, 'Forbidden' for insufficient role"

requirements-completed: [SEC-01, SEC-02, SEC-10]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 13 Plan 01: Layout Auth & Role Enforcement Summary

**Layout-level auth guards on dashboard (ADMIN+) and portal (USER+) with requireRole() helper and hardened env schema**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T15:42:22Z
- **Completed:** 2026-03-28T15:45:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Dashboard layout now redirects unauthenticated users to /login with callbackUrl, and rejects non-ADMIN roles to /access-denied
- Portal layout redirects unauthenticated users to /login with callbackUrl, allows any authenticated user
- requireRole() helper with 5-tier ROLE_HIERARCHY exported from auth.ts for use by Plan 03 server action enforcement
- BLOB_PRIVATE_READ_WRITE_TOKEN changed from optional to required in env schema (TD-03 resolved)
- Upstash Redis env vars pre-added for Plan 02 rate limiting integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create requireRole() helper, access-denied page, and env fix** - `b91d9dd` (feat)
2. **Task 2: Add layout-level auth to dashboard and portal layouts** - `78b0ceb` (feat)

## Files Created/Modified
- `src/lib/auth.ts` - Added requireRole() with ROLE_HIERARCHY, Role type, and hierarchy-based validation
- `src/lib/env.ts` - Made BLOB_PRIVATE_READ_WRITE_TOKEN required, added UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
- `src/app/(dashboard)/access-denied/page.tsx` - New access-denied page with message and link home
- `src/app/(dashboard)/layout.tsx` - Added getCurrentSession() auth guard with ADMIN+ role check
- `src/app/(portal)/layout.tsx` - Added getCurrentSession() auth guard for any authenticated user
- `.env.example` - Added UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, BLOB_PRIVATE_READ_WRITE_TOKEN

## Decisions Made
- Used inline `ADMIN_ROLES` array check in dashboard layout rather than calling `requireRole()` directly -- layouts should redirect (not throw), and requireRole() is designed for server actions that throw
- Added Upstash Redis env vars as optional now to avoid breaking dev environments before Plan 02 implements the actual rate limiter
- Fixed .env.example to use correct variable names matching the Zod env schema (was using `BLOB_READ_WRITE_TOKEN` instead of `BLOB_PRIVATE_READ_WRITE_TOKEN`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed .env.example variable name mismatch**
- **Found during:** Task 1 (env.ts and .env.example updates)
- **Issue:** .env.example had `BLOB_READ_WRITE_TOKEN` but env schema uses `BLOB_PRIVATE_READ_WRITE_TOKEN` and `VERCEL_BLOB_READ_WRITE_TOKEN`
- **Fix:** Updated .env.example to use correct variable names matching the Zod env schema
- **Files modified:** .env.example
- **Verification:** Variable names now match between env schema and .env.example
- **Committed in:** b91d9dd (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor correction to ensure env example matches actual schema. No scope creep.

## Issues Encountered
- Tests could not run in worktree (node_modules not installed) -- this is expected for parallel agent worktrees; orchestrator validates tests post-merge

## Next Phase Readiness
- requireRole() helper is ready for Plan 03 (server action role enforcement)
- Upstash Redis env vars are in place for Plan 02 (rate limiting)
- Layout auth patterns established for any future route groups

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log.

---
*Phase: 13-security-hardening*
*Completed: 2026-03-28*
