---
phase: 14-data-layer-fixes
plan: 02
subsystem: database
tags: [drizzle, pagination, tsvector, full-text-search, dal, postgres]

# Dependency graph
requires:
  - phase: 14-data-layer-fixes/01
    provides: PaginationParams, PaginatedResult, DEFAULT_PAGE_SIZE types; tsvector searchVector columns on 8 tables
provides:
  - 10 paginated list DAL functions with consistent PaginationParams/PaginatedResult pattern
  - Full-text search via tsvector/plainto_tsquery on 9 list functions (all except payments)
  - COUNT(*) OVER() window function pattern for efficient total counts
affects: [15-ui-foundations, 16-missing-pages, 17-missing-pages-operations, 18-feature-depth-records, 19-feature-depth-platform]

# Tech tracking
tech-stack:
  added: []
  patterns: [paginated-dal-pattern, window-function-count, tsvector-search-integration]

key-files:
  created: []
  modified:
    - src/lib/dal/customers.ts
    - src/lib/dal/appointments.ts
    - src/lib/dal/sessions.ts
    - src/lib/dal/payments.ts
    - src/lib/dal/orders.ts
    - src/lib/dal/contacts.ts
    - src/lib/dal/designs.ts
    - src/lib/dal/products.ts
    - src/lib/dal/media.ts
    - src/lib/dal/audit.ts
    - src/lib/dal/index.ts
    - src/__tests__/rbac.test.ts

key-decisions:
  - "Payments have no searchVector -- search param is a no-op for getPayments"
  - "searchCustomers removed, search integrated into getCustomers via PaginationParams.search"
  - "Media uses tattooDesign table's searchVector (media items stored as tattoo_design rows)"
  - "Used window function COUNT(*) OVER() for total count to avoid extra query"

patterns-established:
  - "Paginated DAL pattern: accept PaginationParams with defaults, return PaginatedResult<T>, use SQL builder not relational API"
  - "Search pattern: conditionally add tsvector @@ plainto_tsquery clause when search param present"
  - "Total count pattern: use cast(count(*) over() as integer) window function, extract from first row with ?? 0 fallback"

requirements-completed: [DAL-01, DAL-02]

# Metrics
duration: 20min
completed: 2026-03-28
---

# Phase 14 Plan 02: DAL Pagination + Search Summary

**All 10 list DAL functions refactored to accept PaginationParams and return PaginatedResult with tsvector full-text search via COUNT(*) OVER() window function**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-28T18:41:38Z
- **Completed:** 2026-03-28T19:02:07Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Refactored all 10 list DAL functions (customers, appointments, sessions, payments, orders, contacts, designs, products, media, audit) to accept PaginationParams and return PaginatedResult<T>
- Added full-text search via tsvector/plainto_tsquery on 9 of 10 functions (payments excluded -- no searchVector column)
- Eliminated separate searchCustomers function by integrating search into getCustomers via search param
- Established consistent pagination pattern using SQL builder with COUNT(*) OVER() window function for efficient total counts

## Task Commits

Each task was committed atomically:

1. **Task 1: Paginate + search customers, appointments, sessions, payments, orders** - `189d100` (feat)
2. **Task 2: Paginate + search contacts, designs, products, media, audit** - `8f1de20` (feat)

## Files Created/Modified
- `src/lib/dal/customers.ts` - Paginated getCustomers with tsvector search, removed searchCustomers
- `src/lib/dal/appointments.ts` - Paginated getAppointments with left join on customer and tsvector search
- `src/lib/dal/sessions.ts` - Paginated getSessions with tsvector search, replaced old limit/offset filters
- `src/lib/dal/payments.ts` - Paginated getPayments (no search -- no searchVector column)
- `src/lib/dal/orders.ts` - Paginated getOrders with tsvector search
- `src/lib/dal/contacts.ts` - Paginated getContacts with tsvector search, removed hardcoded limit: 100
- `src/lib/dal/designs.ts` - Paginated getAllDesigns (admin) with tsvector search, public functions unchanged
- `src/lib/dal/products.ts` - Paginated getProducts with tsvector search, public functions unchanged
- `src/lib/dal/media.ts` - Paginated getMediaItems with tsvector search via tattooDesign searchVector
- `src/lib/dal/audit.ts` - Paginated getAuditLogs with tsvector search
- `src/lib/dal/index.ts` - Removed searchCustomers from barrel exports
- `src/__tests__/rbac.test.ts` - Updated test to reflect searchCustomers removal

## Decisions Made
- Payments don't have their own searchVector column; search param is a no-op for getPayments since payments are typically queried by status/date, not text
- searchCustomers removed as a separate export -- search functionality now integrated into getCustomers via PaginationParams.search
- Media items use tattooDesign table's searchVector since media DAL operates on tattoo_design rows
- Used COUNT(*) OVER() window function pattern to get total count in same query as data, avoiding extra count query

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated rbac test referencing removed searchCustomers**
- **Found during:** Task 2 (barrel export update)
- **Issue:** src/__tests__/rbac.test.ts asserts searchCustomers exists in barrel exports
- **Fix:** Replaced assertion with comment explaining removal in 14-02
- **Files modified:** src/__tests__/rbac.test.ts
- **Verification:** Test file updated, no broken assertions
- **Committed in:** 8f1de20 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- necessary test update to match barrel export change. No scope creep.

## Known Stubs

None -- all DAL functions are fully wired with real database queries.

## Issues Encountered
- npm install required --legacy-peer-deps due to vitest peer dependency conflict (pre-existing, not introduced by this plan)
- Consumer pages/API routes now receive PaginatedResult instead of arrays -- expected breakage, will be updated in subsequent plans (UI foundations phase)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 10 list DAL functions have consistent pagination and search interface
- Consumer pages/API routes need updating to use `.data` property from PaginatedResult (phases 15+)
- Plan 14-03 (error handling) and 14-04 (missing DAL functions) can proceed independently

## Self-Check: PASSED

- All 13 files verified to exist on disk
- Both task commits (189d100, 8f1de20) verified in git log

---
*Phase: 14-data-layer-fixes*
*Completed: 2026-03-28*
