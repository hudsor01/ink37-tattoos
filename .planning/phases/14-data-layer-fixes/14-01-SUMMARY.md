---
phase: 14-data-layer-fixes
plan: 01
subsystem: database
tags: [drizzle, pagination, tsvector, full-text-search, zod, server-actions, sql-aggregation]

# Dependency graph
requires: []
provides:
  - "PaginationParams and PaginatedResult<T> types for all DAL list functions"
  - "ActionResult<T> discriminated union for all server action returns"
  - "safeAction wrapper with Zod 4 flattenError, Next.js redirect passthrough, DB error categorization"
  - "tsvector custom type with GIN indexes on 8 searchable tables"
  - "SQL-based analytics aggregation with date_trunc (replaces JS loops)"
affects: [14-02, 14-03, 14-04, 15-ui-foundations, 22-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tsvector generated columns with weighted setweight for full-text search"
    - "GIN indexes on search_vector columns for fast text search"
    - "SQL GROUP BY with date_trunc for time-bucketed aggregation"
    - "safeAction wrapper pattern for consistent server action error handling"
    - "Offset-based pagination with PaginatedResult<T>"

key-files:
  created:
    - "src/lib/dal/types.ts"
    - "src/lib/actions/types.ts"
    - "src/lib/actions/safe-action.ts"
  modified:
    - "src/lib/db/schema.ts"
    - "src/lib/dal/analytics.ts"

key-decisions:
  - "Used offset-based pagination (not cursor) -- fits admin dashboard's page-number navigation pattern"
  - "safeAction is a callback wrapper (not HOF) -- simpler integration with existing action patterns"
  - "Zod 4 z.flattenError with cast to Record<string, string[] | undefined> for type safety"
  - "Weighted tsvector (A/B/C/D) for relevance-ranked search results"
  - "SQL GROUP BY replaces JS Map/loop aggregation -- eliminates N+1-like fetch-all pattern"

patterns-established:
  - "PaginationParams interface: { page, pageSize, search?, sortBy?, sortOrder? }"
  - "PaginatedResult<T>: { data, total, page, pageSize, totalPages }"
  - "ActionResult<T>: { success: true, data } | { success: false, error, fieldErrors? }"
  - "safeAction(async () => { ... }) wraps any server action callback"
  - "tsvector('search_vector').generatedAlwaysAs(sql`...`) on searchable tables"
  - "db.execute<T>(sql`SELECT ... GROUP BY date_trunc(...)`) for analytics"

requirements-completed: [DAL-01, DAL-02, DAL-03, DAL-04]

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 14 Plan 01: Data Layer Foundation Summary

**Shared pagination types, safeAction error wrapper, tsvector full-text search on 8 tables, and SQL-based analytics aggregation replacing JS loops**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-28T17:06:23Z
- **Completed:** 2026-03-28T17:13:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- PaginationParams, PaginatedResult<T>, DEFAULT_PAGE_SIZE types ready for all DAL list functions
- ActionResult<T> and safeAction wrapper with Zod 4 error extraction, Next.js redirect passthrough, FK validation, DB constraint, and scheduling conflict handling
- 8 tables (customer, appointment, tattooSession, tattooDesign, contact, auditLog, product, order) have tsvector generated columns with weighted search vectors and GIN indexes
- 3 analytics functions (getRevenueData, getClientAcquisitionData, getBookingTrends) refactored from JS Map/loop to SQL GROUP BY with date_trunc

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared types and safeAction utility** - `0aec17d` (feat)
2. **Task 2: Add tsvector columns to schema + refactor analytics to SQL aggregation** - `b87f53c` (feat)

## Files Created/Modified
- `src/lib/dal/types.ts` - PaginationParams, PaginatedResult<T>, DEFAULT_PAGE_SIZE
- `src/lib/actions/types.ts` - ActionResult<T> discriminated union
- `src/lib/actions/safe-action.ts` - safeAction wrapper with 6-tier error categorization
- `src/lib/db/schema.ts` - tsvector custom type, 8 searchVector generated columns, 8 GIN indexes
- `src/lib/dal/analytics.ts` - SQL GROUP BY aggregation replacing JS loops

## Decisions Made
- Offset-based pagination chosen over cursor -- admin dashboard uses page numbers, not infinite scroll
- safeAction as callback wrapper (not higher-order function) -- matches existing action patterns where actions have varying signatures
- Used `z.flattenError(error)` with type cast for Zod 4 compatibility (Zod 4 types `fieldErrors` as `{[P in keyof T]?: U[]}` which requires cast to `Record<string, string[] | undefined>` for generic error handling)
- Weighted tsvector columns (A=primary identifiers, B=secondary, C=content, D=metadata) for relevance-ranked search
- Analytics functions now return rows directly from SQL instead of fetching all records and aggregating in JS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod 4 flattenError type compatibility**
- **Found during:** Task 1 (safeAction implementation)
- **Issue:** `z.flattenError(error).fieldErrors` in Zod 4 returns `{[P in keyof T]?: U[]}` which TypeScript resolves to `{}` when T is unknown, causing `.length` property errors
- **Fix:** Cast `flattened.fieldErrors` to `Record<string, string[] | undefined>` before iteration
- **Files modified:** src/lib/actions/safe-action.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 0aec17d (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added Next.js digest-based redirect detection**
- **Found during:** Task 1 (safeAction implementation)
- **Issue:** Plan only specified `error.message === 'NEXT_REDIRECT'` check, but some Next.js versions use `error.digest` starting with 'NEXT_REDIRECT'/'NEXT_NOT_FOUND'
- **Fix:** Added secondary check for `error.digest` property with startsWith matching
- **Files modified:** src/lib/actions/safe-action.ts
- **Verification:** Both detection paths present in code
- **Committed in:** 0aec17d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Worktree had no node_modules installed -- ran `bun install` to resolve TypeScript compilation
- npm cache permission issue -- used `bun x tsc` instead of `npx tsc` for TypeScript checking

## Known Stubs

None -- all types, utilities, and schema changes are fully implemented.

## User Setup Required

Database migration needed: The tsvector generated columns and GIN indexes need to be applied to the production database via `npx drizzle-kit generate` followed by `npx drizzle-kit push`. This is a schema change that adds columns and indexes to 8 tables.

## Next Phase Readiness
- Plans 02-04 can now import PaginationParams, PaginatedResult from @/lib/dal/types
- Plans 02-04 can now import ActionResult from @/lib/actions/types and safeAction from @/lib/actions/safe-action
- Search queries can use the searchVector columns with plainto_tsquery
- Analytics functions are already SQL-based, no further refactoring needed

## Self-Check: PASSED

All 5 created/modified files exist. Both task commits (0aec17d, b87f53c) verified in git log. SUMMARY.md created successfully.

---
*Phase: 14-data-layer-fixes*
*Completed: 2026-03-28*
