---
phase: 08-drizzle-migration
plan: 02
subsystem: database
tags: [drizzle-orm, query-rewrite, dal, server-actions, webhooks, prisma-migration]

# Dependency graph
requires:
  - phase: 08-drizzle-migration
    plan: 01
    provides: "Drizzle schema.ts, db client, Better Auth with raw pg.Pool"
provides:
  - "All 82 Prisma queries across 21 files rewritten to Drizzle ORM syntax"
  - "3 interactive transactions using db.transaction(async (tx) => {...})"
  - "All DAL server-only, cache(), auth check patterns preserved"
  - "All Server Actions preserve 'use server' and {success, error?} return patterns"
  - "Webhook route with 2 Drizzle transactions for atomic payment+session updates"
  - "Test mocks updated to match Drizzle API surface"
affects: [08-03-verification-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns: [drizzle-relational-api, drizzle-sql-builder, drizzle-transactions, ilike-case-insensitive, onConflictDoUpdate-upsert, sql-template-aggregations]

key-files:
  created: []
  modified:
    - src/lib/dal/analytics.ts
    - src/lib/dal/appointments.ts
    - src/lib/dal/audit.ts
    - src/lib/dal/contacts.ts
    - src/lib/dal/customers.ts
    - src/lib/dal/designs.ts
    - src/lib/dal/gift-cards.ts
    - src/lib/dal/media.ts
    - src/lib/dal/orders.ts
    - src/lib/dal/payments.ts
    - src/lib/dal/portal.ts
    - src/lib/dal/products.ts
    - src/lib/dal/sessions.ts
    - src/lib/dal/settings.ts
    - src/lib/dal/users.ts
    - src/lib/actions/store-actions.ts
    - src/lib/actions/portal-actions.ts
    - src/app/api/webhooks/stripe/route.ts
    - src/app/api/store/download/route.ts
    - src/app/(store)/store/checkout/success/page.tsx
    - src/__tests__/webhook-stripe.test.ts

key-decisions:
  - "Use Drizzle relational API (db.query) for reads and SQL-like builder (db.select/insert/update/delete) for mutations and aggregations"
  - "Replace Prisma P2025 error catch with Drizzle undefined check (Drizzle returns empty array, not throw)"
  - "Replace Prisma _count with sql subqueries for product order item counts"
  - "Use Record<string, unknown> for update .set() when mixing Zod types with Drizzle column types"
  - "Contacts DAL uses db.insert without drizzle-orm operators since it only has one insert query"

patterns-established:
  - "DAL read pattern: db.query.model.findMany/findFirst with where, orderBy, columns, with"
  - "DAL write pattern: db.insert/update/delete(schema.model).values/set/where().returning()"
  - "DAL aggregation pattern: db.select({ count: sql<number>`...` }).from(schema.model).where()"
  - "Transaction pattern: db.transaction(async (tx) => { await tx.insert/update... })"
  - "Search pattern: or(ilike(col, `%${query}%`), ...) for case-insensitive search"
  - "Upsert pattern: db.insert().values().onConflictDoUpdate({ target, set })"

requirements-completed: [DRZ-02, DRZ-03, DRZ-07, DRZ-08]

# Metrics
duration: 12min
completed: 2026-03-23
---

# Phase 08 Plan 02: Query Rewrites Summary

**All 82 Prisma queries across 21 files rewritten to Drizzle ORM with zero type errors in modified files, 3 interactive transactions, and preserved auth/cache/server-only patterns**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-23T16:13:41Z
- **Completed:** 2026-03-23T16:25:00Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments

### Task 1: Rewrite all 16 DAL files (15 modules + barrel)
- Converted 15 DAL modules from Prisma query syntax to Drizzle ORM
- analytics.ts: 4 aggregation queries with sql template literals for count/sum, groupBy
- portal.ts: 11 queries using relational API with columns selection, Promise.all for dashboard
- orders.ts: 10 queries including interactive transaction with db.transaction(async (tx) => {...})
- customers.ts: 7 queries with ilike() for case-insensitive OR search
- appointments.ts: 7 queries with groupBy + count for stats
- payments.ts: 8 queries with 3 aggregate sum queries using sql template
- audit.ts: Replaced Prisma.InputJsonValue and Prisma.DbNull with native null
- gift-cards.ts: Replaced P2025 error catch with Drizzle conditional update returning undefined
- sessions.ts: Nested include converted to with: { customer, artist, appointment }
- products.ts: _count replaced with sql subquery for orderItems count
- media.ts: Standard CRUD with .returning()
- designs.ts: Reads with and() for multi-condition where clauses
- contacts.ts: Single insert query with .returning()
- settings.ts: Upsert with onConflictDoUpdate on unique key
- users.ts: Simple read with columns selection
- index.ts: Barrel exports unchanged (no changes needed)

### Task 2: Rewrite actions, API routes, pages, and test mocks
- store-actions.ts: Product lookup uses db.query with inArray, order update uses db.update
- portal-actions.ts: Customer/session lookups use db.query.findFirst, updates use db.update
- webhook route: 2 batch $transaction converted to db.transaction(async (tx) => {...})
  - handleCheckoutCompleted: Atomic payment status + tattooSession.paidAmount increment
  - handleChargeRefunded: Atomic payment refund + tattooSession.paidAmount decrement
  - handlePaymentFailed: OR condition with Drizzle or() operator
  - stripeEvent idempotency: findFirst + insert pattern
- download route: Token lookup uses db.query with nested with, download count uses sql increment
- checkout success page: Order lookup uses db.query with nested columns/with selection
- webhook test: Mock shape updated to match Drizzle API (query.stripeEvent.findFirst, insert, transaction)

## Task Commits

1. **Task 1: Rewrite all 15 DAL modules from Prisma to Drizzle** - `75067ba` (feat)
2. **Task 2: Rewrite actions, API routes, and test mocks to Drizzle** - `50ff55d` (feat)
3. **Task 2b: Rewrite checkout success page to Drizzle** - `aab512e` (feat)

## Files Modified

### DAL Layer (15 files)
- `src/lib/dal/analytics.ts` - 4 aggregation queries with sql templates
- `src/lib/dal/appointments.ts` - 7 queries, groupBy stats
- `src/lib/dal/audit.ts` - 2 queries, Prisma.DbNull replaced with null
- `src/lib/dal/contacts.ts` - 1 insert query
- `src/lib/dal/customers.ts` - 7 queries, ilike search
- `src/lib/dal/designs.ts` - 3 read queries
- `src/lib/dal/gift-cards.ts` - 6 queries, P2025 replaced with undefined check
- `src/lib/dal/media.ts` - 6 CRUD queries
- `src/lib/dal/orders.ts` - 10 queries, interactive transaction
- `src/lib/dal/payments.ts` - 8 queries, 3 aggregate sums
- `src/lib/dal/portal.ts` - 11 queries, Promise.all dashboard
- `src/lib/dal/products.ts` - 6 queries, _count subquery
- `src/lib/dal/sessions.ts` - 5 queries, nested with
- `src/lib/dal/settings.ts` - 3 queries, onConflictDoUpdate upsert
- `src/lib/dal/users.ts` - 1 read query

### Actions (2 files)
- `src/lib/actions/store-actions.ts` - Product lookup, order update
- `src/lib/actions/portal-actions.ts` - Customer/session queries, consent update

### API Routes (2 files)
- `src/app/api/webhooks/stripe/route.ts` - 11 queries, 2 transactions
- `src/app/api/store/download/route.ts` - Token lookup, download count increment

### Pages (1 file)
- `src/app/(store)/store/checkout/success/page.tsx` - Order lookup with nested relations

### Tests (1 file)
- `src/__tests__/webhook-stripe.test.ts` - Mock shape updated for Drizzle API

## Decisions Made

- **Relational API for reads, SQL builder for writes:** db.query.model.findMany/findFirst for reads (cleaner syntax with with/columns), db.insert/update/delete for mutations (explicit .returning())
- **Drizzle undefined check replaces P2025 catch:** gift-cards.ts redeemGiftCard uses conditional where clause + checks empty array instead of catching Prisma error codes
- **SQL subquery for _count:** products.ts uses cast(count(*) as integer) subquery instead of Prisma's include._count
- **Record<string, unknown> for mixed types:** When Zod validation types (string dates) need conversion before passing to Drizzle .set(), build an explicit setData object
- **contacts.ts omits drizzle-orm import:** Single insert query only needs db and schema, not operator imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type mismatch in update .set() with Zod partial types**
- **Found during:** Task 1 (appointments.ts, customers.ts, sessions.ts)
- **Issue:** Drizzle .set() expects exact column types, but spreading UpdateAppointmentData (with `scheduledDate: string`) caused TS2345. Similarly for UpdateCustomerData with `dateOfBirth: string`.
- **Fix:** Build explicit `setData: Record<string, unknown>` objects with proper Date conversions before passing to .set()
- **Files modified:** appointments.ts, customers.ts, sessions.ts
- **Verification:** npx tsc --noEmit shows 0 errors in all DAL files

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type-safety fix needed for Drizzle's stricter .set() typing. No scope creep.

## Pre-existing Issues (Not Our Scope)

The following 10 type errors exist in files NOT modified by this plan:
- prisma.config.ts (1 error) - Prisma module import, will be cleaned up in Plan 03
- contact-form.test.ts (3 errors) - Uses old Prisma mock shape, needs conversion in Plan 03
- dashboard/customers/[id]/page.tsx (4 errors) - Null safety on allergies/medicalConditions arrays
- portal/tattoos/page.tsx (1 error) - referenceImages type null incompatibility
- gallery/page.tsx (1 error) - tags type null incompatibility

These are pre-existing and logged for Plan 03 (verification/cleanup) to address.

## Known Stubs

None - all files are fully implemented with no placeholder data or TODO markers.

## Next Phase Readiness

- All 82 Prisma queries converted to Drizzle across 21 files
- Zero type errors in any modified file
- 3 transactions use db.transaction(async (tx) => {...}) pattern
- Plan 03 can now run final verification, fix pre-existing type issues, and clean up Prisma artifacts

## Self-Check: PASSED

- src/lib/dal/analytics.ts: FOUND (contains sql< templates)
- src/lib/dal/portal.ts: FOUND (11 queries, highest count)
- src/lib/dal/orders.ts: FOUND (contains db.transaction)
- src/lib/dal/customers.ts: FOUND (contains ilike)
- src/lib/dal/gift-cards.ts: FOUND (no P2025 references)
- src/lib/dal/settings.ts: FOUND (contains onConflictDoUpdate)
- src/lib/dal/audit.ts: FOUND (no Prisma.DbNull)
- src/app/api/webhooks/stripe/route.ts: FOUND (2 db.transaction, sql templates)
- src/__tests__/webhook-stripe.test.ts: FOUND (no $transaction, no findUnique)
- Zero Prisma references in src/lib/dal/, src/lib/actions/, src/app/api/: VERIFIED
- Commit 75067ba: FOUND (Task 1)
- Commit 50ff55d: FOUND (Task 2)
- Commit aab512e: FOUND (Task 2b)

---
*Phase: 08-drizzle-migration*
*Completed: 2026-03-23*
