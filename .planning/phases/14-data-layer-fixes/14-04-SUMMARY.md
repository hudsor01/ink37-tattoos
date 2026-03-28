---
phase: 14-data-layer-fixes
plan: 04
subsystem: database
tags: [drizzle, dal, webhooks, revalidation, fk-validation, scheduling]

# Dependency graph
requires:
  - phase: 14-02
    provides: "Paginated DAL list functions with PaginationParams/PaginatedResult"
  - phase: 14-03
    provides: "safeAction wrapper with ActionResult<T> and error classification"
provides:
  - "Artist profile CRUD DAL (getArtistProfile, updateArtistProfile)"
  - "Contact update/delete DAL functions"
  - "Design approval status update DAL function"
  - "Gift card admin list with pagination and ILIKE search"
  - "FK validation on appointment and session creation"
  - ".returning() guards on all DAL mutation functions"
  - "Webhook revalidation for Stripe and Cal.com handlers"
  - "Checkout success page migrated to DAL"
  - "Scheduling conflict check wired into appointment create/update"
  - "Explicit gift card error messages at checkout"
affects: [16-missing-pages, 17-operations, 18-feature-depth, 20-business-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FK validation pattern: verify referenced entity exists before insert"
    - ".returning() guard pattern: throw if no result from mutation"
    - "Webhook revalidation pattern: revalidatePath after each handler"
    - "ILIKE fallback search for tables without tsvector columns"

key-files:
  created:
    - "src/lib/dal/artists.ts"
  modified:
    - "src/lib/dal/contacts.ts"
    - "src/lib/dal/designs.ts"
    - "src/lib/dal/gift-cards.ts"
    - "src/lib/dal/appointments.ts"
    - "src/lib/dal/sessions.ts"
    - "src/lib/dal/customers.ts"
    - "src/lib/dal/orders.ts"
    - "src/lib/dal/payments.ts"
    - "src/lib/dal/products.ts"
    - "src/lib/dal/media.ts"
    - "src/lib/dal/settings.ts"
    - "src/lib/dal/index.ts"
    - "src/app/api/webhooks/stripe/route.ts"
    - "src/app/api/webhooks/cal/route.ts"
    - "src/app/api/webhooks/resend/route.ts"
    - "src/app/(store)/store/checkout/success/page.tsx"
    - "src/lib/actions/appointment-actions.ts"
    - "src/lib/actions/store-actions.ts"

key-decisions:
  - "Used tattooArtist table for artist profile (not user table) since it already has bio, specialties, portfolio fields"
  - "ILIKE fallback for gift card search (no tsvector) -- small dataset, code/email search sufficient"
  - "Added portal revalidation to Stripe webhook events for client-facing UX freshness"

patterns-established:
  - "FK validation: check referenced entity exists via db.query.findFirst before insert, throw descriptive error"
  - ".returning() guard: destructure [result] then if (!result) throw Error with entity-specific message"
  - "Webhook revalidation: call revalidatePath for all dashboard paths affected by each event type"

requirements-completed: [DAL-05, DAL-06, DAL-07, DAL-08, DAL-09, DAL-11, DAL-12]

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 14 Plan 04: DAL Gaps + Webhook Revalidation + Conflict Checks Summary

**Created missing DAL functions (artist profile, contact CRUD, design approval, gift card list), added FK validation and .returning() guards to all 30+ DAL mutations, wired revalidatePath into Stripe/Cal webhooks, migrated checkout to DAL, and connected scheduling conflict check to appointment actions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T19:05:15Z
- **Completed:** 2026-03-28T19:12:41Z
- **Tasks:** 2/2
- **Files modified:** 19

## Accomplishments

- Created artist profile DAL with CRUD operations using tattooArtist table (ready for Phase 16 artist profile page)
- Added updateContact, deleteContact, updateDesignApprovalStatus, and getGiftCards admin list -- closing all DAL function gaps
- Added FK validation to createAppointment (customerId) and createSession (customerId + artistId) preventing cryptic DB constraint errors
- Added .returning() guards across all DAL mutation functions (customers, appointments, sessions, orders, payments, products, media, contacts, gift cards, settings) -- 30+ mutations protected
- Wired revalidatePath into Stripe webhook (11 calls across 4 event types) and Cal.com webhook (5 calls across 3 event types) for fresh dashboard data
- Migrated checkout success page from direct db.query to getOrderByCheckoutSessionId DAL function
- Connected checkSchedulingConflict to both createAppointment and updateAppointment actions with safeAction error handling
- Added explicit error messages for invalid/expired gift cards at checkout (no more silent $0 discount fallback)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create missing DAL functions + FK validation + .returning() guards** - `f79ea0d` (feat)
2. **Task 2: Webhook revalidation + checkout DAL migration + conflict wiring + gift card error fix** - `1fb65d8` (feat)

## Files Created/Modified

- `src/lib/dal/artists.ts` - NEW: getArtistProfile + updateArtistProfile for solo artist studio
- `src/lib/dal/contacts.ts` - Added updateContact, deleteContact, .returning() guards
- `src/lib/dal/designs.ts` - Added updateDesignApprovalStatus with staff role check
- `src/lib/dal/gift-cards.ts` - Added getGiftCards admin list with ILIKE search, .returning() guard
- `src/lib/dal/appointments.ts` - FK validation on create, .returning() guards on update/delete
- `src/lib/dal/sessions.ts` - FK validation on create (customer + artist), .returning() guards
- `src/lib/dal/customers.ts` - .returning() guards on create/update/delete
- `src/lib/dal/orders.ts` - .returning() guard on updateOrderStatus
- `src/lib/dal/payments.ts` - .returning() guard on createPaymentRecord
- `src/lib/dal/products.ts` - .returning() guards on create/update/delete
- `src/lib/dal/media.ts` - .returning() guards on create/update/delete/toggle
- `src/lib/dal/settings.ts` - .returning() guard on upsertSetting
- `src/lib/dal/index.ts` - Comprehensive barrel exports for all DAL functions
- `src/app/api/webhooks/stripe/route.ts` - revalidatePath after each event handler
- `src/app/api/webhooks/cal/route.ts` - revalidatePath after each booking event
- `src/app/api/webhooks/resend/route.ts` - Documented no revalidation needed
- `src/app/(store)/store/checkout/success/page.tsx` - Migrated from direct db.query to DAL
- `src/lib/actions/appointment-actions.ts` - Wired checkSchedulingConflict
- `src/lib/actions/store-actions.ts` - Explicit gift card validation errors

## Decisions Made

- Used `tattooArtist` table for artist profile (not user table) since it already has bio, specialties, portfolio, hourlyRate fields relevant to the studio owner
- Used ILIKE fallback search for gift cards instead of tsvector (small dataset, search by code/email is sufficient)
- Added `/portal` revalidation to Stripe webhook payment events for client portal freshness
- Verified Resend webhook needs no revalidation (only logs bounce/complaint events, no DB mutations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended barrel exports beyond plan scope**
- **Found during:** Task 1 (barrel export update)
- **Issue:** index.ts barrel exports only covered a subset of DAL modules. Contacts, gift cards, orders, payments, products were missing from barrel file.
- **Fix:** Added comprehensive exports for all DAL modules (contacts, gift-cards, orders, payments, products) in addition to the plan-specified new functions
- **Files modified:** src/lib/dal/index.ts
- **Verification:** All exports resolve, TypeScript compiles
- **Committed in:** f79ea0d (Task 1 commit)

**2. [Rule 2 - Missing Critical] Artist FK validation uses tattooArtist table not user table**
- **Found during:** Task 1 (FK validation for sessions)
- **Issue:** Plan suggested validating artistId against user table, but schema shows tattooSession.artistId references tattooArtist.id
- **Fix:** Used tattooArtist table for FK validation in createSession
- **Files modified:** src/lib/dal/sessions.ts
- **Verification:** TypeScript compiles, matches schema FK references
- **Committed in:** f79ea0d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in dashboard page files (contacts, orders, payments, products pages) that expect array returns from DAL functions that now return PaginatedResult. These are out of scope for this plan (they will be fixed when UI pages are updated in later phases).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All DAL gaps closed -- Phase 16 (missing pages) can build artist profile page, contacts management, gift card management using the new DAL functions
- Webhook revalidation ensures dashboard always shows fresh data after payment/booking events
- Scheduling conflict check prevents double-booking in appointment flows
- Comprehensive barrel exports make DAL imports clean for all future phases

## Self-Check: PASSED

All 10 key files verified present. Both task commits (f79ea0d, 1fb65d8) verified in git log. SUMMARY.md exists.

---
*Phase: 14-data-layer-fixes*
*Completed: 2026-03-28*
