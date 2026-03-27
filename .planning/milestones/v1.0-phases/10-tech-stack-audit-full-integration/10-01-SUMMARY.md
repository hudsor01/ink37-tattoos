---
phase: 10-tech-stack-audit-full-integration
plan: 01
subsystem: infra
tags: [nuqs, dependency-audit, react-table, better-auth, url-state]

# Dependency graph
requires:
  - phase: 08-drizzle-migration
    provides: Drizzle ORM as sole database layer, all 32 runtime deps in package.json
provides:
  - DEPENDENCY-AUDIT.md documenting all 33 runtime deps with used vs available API analysis
  - nuqs installed with NuqsAdapter in provider tree for URL state management
  - DataTable column visibility toggle and optional row selection support
  - better-auth plugin evaluation (rate limiting, sessions, 2FA) with recommendations
affects: [10-02-PLAN, 10-03-PLAN, future-portal-enhancements]

# Tech tracking
tech-stack:
  added: [nuqs@2.8.9]
  patterns: [NuqsAdapter in provider tree, column visibility toggle in DataTable, row selection opt-in pattern]

key-files:
  created:
    - .planning/phases/10-tech-stack-audit-full-integration/DEPENDENCY-AUDIT.md
  modified:
    - package.json
    - bun.lock
    - src/components/providers.tsx
    - src/components/dashboard/data-table.tsx

key-decisions:
  - "Keep custom rate limiter over better-auth rate limiting plugin -- custom covers all public endpoints, better-auth only covers auth routes"
  - "Defer better-auth 2FA and session management features to v2 -- low risk profile for tattoo studio platform"
  - "6 dependencies identified as ENHANCE candidates for Plans 02/03: react-query, react-table, framer-motion, date-fns, sonner, next"
  - "ws confirmed KEEP -- required by Neon serverless WebSocket transport"
  - "@radix-ui/react-slot confirmed KEEP -- used by Shadcn FormControl Slot component"

patterns-established:
  - "NuqsAdapter wraps children inside ThemeProvider in providers.tsx"
  - "DataTable column visibility: DropdownMenu with getCanHide() filter and toggleVisibility()"
  - "DataTable row selection: opt-in via enableRowSelection prop, callback via onRowSelectionChange"

requirements-completed: [STACK-01, STACK-02, STACK-03, STACK-09, STACK-10]

# Metrics
duration: 27min
completed: 2026-03-26
---

# Phase 10 Plan 01: Dependency Audit & Foundation Summary

**Full audit of 33 runtime deps with nuqs URL state provider, DataTable column visibility/row selection, and better-auth plugin evaluation**

## Performance

- **Duration:** 27 min
- **Started:** 2026-03-26T04:17:59Z
- **Completed:** 2026-03-26T04:44:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Audited all 33 runtime dependencies documenting used APIs, available unused APIs, and status recommendations (26 KEEP, 6 ENHANCE, 1 NEW)
- Confirmed ws and @radix-ui/react-slot as correctly needed (not dead) with documented justifications
- Installed nuqs and added NuqsAdapter to the provider tree for URL state management
- Enhanced shared DataTable with column visibility dropdown toggle (SlidersHorizontal) and optional row selection support
- Evaluated better-auth plugins: recommended keeping custom rate limiter, deferring 2FA and session management to v2

## Task Commits

Each task was committed atomically:

1. **Task 1: Dependency audit report, nuqs install, better-auth plugin evaluation** - `3970bac` (feat)
2. **Task 2: Enhance DataTable with column visibility toggle and row selection** - `6a8a8aa` (feat)

## Files Created/Modified
- `.planning/phases/10-tech-stack-audit-full-integration/DEPENDENCY-AUDIT.md` - Full audit of all 33 runtime deps with used vs available API analysis
- `package.json` - Added nuqs@2.8.9 dependency
- `bun.lock` - Updated lockfile with nuqs resolution
- `src/components/providers.tsx` - Added NuqsAdapter wrapping children inside ThemeProvider
- `src/components/dashboard/data-table.tsx` - Added column visibility dropdown, VisibilityState, optional row selection with callback

## Decisions Made
- Keep custom rate limiter (src/lib/security/rate-limiter.ts) over better-auth's rate limiting plugin -- custom implementation covers all public endpoints (contact, booking, auth), while better-auth only covers auth routes
- Defer better-auth 2FA and session management to v2 -- tattoo studio has low risk profile (no direct financial data, invitation-only admin, Stripe handles payments)
- Identified 6 ENHANCE candidates for Plans 02/03: @tanstack/react-query (useMutation), framer-motion (AnimatePresence), date-fns (formatDistance), sonner (toast.promise), @tanstack/react-table (now enhanced), next (after/useOptimistic)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used bun instead of npm for package installation**
- **Found during:** Task 1 (nuqs install)
- **Issue:** Plan specified `npm install nuqs` but project uses bun as package manager (per CLAUDE.md context and user instructions)
- **Fix:** Used `bun add nuqs` instead
- **Files modified:** package.json, bun.lock
- **Verification:** nuqs appears in package.json dependencies
- **Committed in:** 3970bac (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial fix -- correct package manager. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DEPENDENCY-AUDIT.md provides the foundation for Plans 02 and 03 to systematically enhance the 6 identified dependencies
- NuqsAdapter in place -- Plan 02 can rewrite gallery filters and admin DataTable URL state to use nuqs
- DataTable column visibility and row selection ready for consumers -- no changes needed to existing pages (backward compatible)
- Build passes, all 142 tests pass

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 10-tech-stack-audit-full-integration*
*Completed: 2026-03-26*
