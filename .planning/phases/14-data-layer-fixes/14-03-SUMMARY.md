---
phase: 14-data-layer-fixes
plan: 03
subsystem: api
tags: [server-actions, error-handling, audit-logging, safeAction, ActionResult, zod]

# Dependency graph
requires:
  - phase: 14-data-layer-fixes
    plan: 01
    provides: "safeAction wrapper and ActionResult<T> type"
provides:
  - "All 13 server action files return ActionResult<T> consistently"
  - "All 13 action files have audit logging via after() + logAudit()"
  - "Zod validation errors produce fieldErrors for Phase 15 inline form validation"
affects: [15-ui-quality, 16-missing-pages, 22-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: ["safeAction wrapper for all server actions", "ActionResult<T> union type return contract", "requireRole outside safeAction for redirect propagation", "anonymous audit logging for public actions"]

key-files:
  modified:
    - src/lib/actions/customer-actions.ts
    - src/lib/actions/appointment-actions.ts
    - src/lib/actions/session-actions.ts
    - src/lib/actions/media-actions.ts
    - src/lib/actions/product-actions.ts
    - src/lib/actions/order-actions.ts
    - src/lib/actions/payment-actions.ts
    - src/lib/actions/settings-actions.ts
    - src/lib/actions/contact-actions.ts
    - src/lib/actions/contact-status-action.ts
    - src/lib/actions/gift-card-actions.ts
    - src/lib/actions/store-actions.ts
    - src/lib/actions/portal-actions.ts
    - src/components/store/cart-drawer.tsx
    - src/components/store/gift-card-form.tsx
    - src/components/store/gift-card-redeem-input.tsx
    - src/__tests__/contact-form.test.ts
    - src/__tests__/server-actions.test.ts

key-decisions:
  - "requireRole() stays OUTSIDE safeAction to preserve redirect propagation"
  - "Rate limiting stays OUTSIDE safeAction as middleware-like guard"
  - "Public/anonymous actions use userId 'anonymous' for audit logging"

patterns-established:
  - "safeAction wrapping: Every server action wraps core logic in safeAction(async () => { ... })"
  - "ActionResult<T> contract: All actions return Promise<ActionResult<T>> with fieldErrors for Zod failures"
  - "Audit trail: All 13 action files log mutations via after(() => logAudit(...))"

requirements-completed: [DAL-04, DAL-10]

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 14 Plan 03: safeAction Wrapping Summary

**All 13 server action files wrapped with safeAction returning ActionResult<T>, with audit logging on every mutation including public/portal actions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T18:42:15Z
- **Completed:** 2026-03-28T18:49:42Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Wrapped all 13 server action files with safeAction for consistent error handling
- Every action now returns ActionResult<T> with fieldErrors enabling Phase 15 inline form validation
- All 13 action files have audit logging via after() + logAudit() -- public actions use userId 'anonymous'
- Updated 3 store UI consumers and 2 test files for the new ActionResult wrapper shape

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap admin CRUD actions with safeAction + add missing audit logging** - `b23f721` (feat)
2. **Task 2: Wrap public/portal actions with safeAction + add missing audit logging** - `5223c20` (feat)

## Files Created/Modified

- `src/lib/actions/customer-actions.ts` - 3 actions wrapped with safeAction, return ActionResult
- `src/lib/actions/appointment-actions.ts` - 3 actions wrapped with safeAction, return ActionResult
- `src/lib/actions/session-actions.ts` - 3 actions wrapped with safeAction, return ActionResult
- `src/lib/actions/media-actions.ts` - 4 actions wrapped with safeAction, return ActionResult
- `src/lib/actions/product-actions.ts` - 3 actions wrapped with safeAction, return ActionResult
- `src/lib/actions/order-actions.ts` - 2 actions wrapped with safeAction, return ActionResult
- `src/lib/actions/payment-actions.ts` - 2 actions wrapped with safeAction, return ActionResult
- `src/lib/actions/settings-actions.ts` - 1 action wrapped with safeAction, return ActionResult
- `src/lib/actions/contact-actions.ts` - 1 action wrapped with safeAction, audit logging added
- `src/lib/actions/contact-status-action.ts` - 1 action wrapped with safeAction, audit logging added
- `src/lib/actions/gift-card-actions.ts` - 2 actions wrapped with safeAction, audit logging added
- `src/lib/actions/store-actions.ts` - 1 action wrapped with safeAction, audit logging added
- `src/lib/actions/portal-actions.ts` - 2 actions wrapped with safeAction, audit logging added
- `src/components/store/cart-drawer.tsx` - Updated to access result.data.checkoutUrl
- `src/components/store/gift-card-form.tsx` - Updated to access result.data.checkoutUrl
- `src/components/store/gift-card-redeem-input.tsx` - Updated to access result.success + result.data
- `src/__tests__/contact-form.test.ts` - Updated test expectations for ActionResult fieldErrors shape
- `src/__tests__/server-actions.test.ts` - Updated test expectations with proper union narrowing

## Decisions Made

- **requireRole outside safeAction**: requireRole() calls stay outside the safeAction wrapper because safeAction would catch the redirect error and convert it to an ActionResult instead of allowing the redirect to propagate. This is critical for auth to work correctly.
- **Rate limiting outside safeAction**: Similar to requireRole, rate limiting in contact-actions.ts returns early before safeAction since it's a middleware-like guard, not business logic.
- **Anonymous audit logging**: Public actions (contact, gift card, store) use userId 'anonymous' since there's no authenticated user. Portal actions use the session user ID.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed consumer components for ActionResult wrapper shape**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** 3 store UI components and 2 test files accessed old direct return properties (result.checkoutUrl, result.valid, result.errors) which are now nested under result.data or renamed to result.fieldErrors
- **Fix:** Updated cart-drawer.tsx, gift-card-form.tsx, gift-card-redeem-input.tsx to access result.data.checkoutUrl and result.data.valid. Updated contact-form.test.ts to check fieldErrors instead of errors. Updated server-actions.test.ts with proper union narrowing.
- **Files modified:** src/components/store/cart-drawer.tsx, src/components/store/gift-card-form.tsx, src/components/store/gift-card-redeem-input.tsx, src/__tests__/contact-form.test.ts, src/__tests__/server-actions.test.ts
- **Verification:** Full project TypeScript compilation passes with zero errors
- **Committed in:** 5223c20 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed invalid subject property reference in contact audit metadata**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** contact-actions.ts referenced validated.subject but ContactFormSchema has no subject field
- **Fix:** Changed to validated.name for audit metadata
- **Files modified:** src/lib/actions/contact-actions.ts
- **Committed in:** 5223c20 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added missing test mocks for audit logging**
- **Found during:** Task 2 (test consumer updates)
- **Issue:** contact-form.test.ts needed mocks for next/server after() and @/lib/dal/audit logAudit() since contact-actions.ts now calls them
- **Fix:** Added vi.mock for next/server and @/lib/dal/audit
- **Files modified:** src/__tests__/contact-form.test.ts
- **Committed in:** 5223c20 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. Consumer components and tests must match the new ActionResult<T> return contract. No scope creep.

## Issues Encountered

- npm cache permission errors prevented using npx tsc directly; resolved by using bun install for dependency installation and local node_modules/.bin/tsc for type checking
- Running tsc on individual files failed with path alias resolution errors; resolved by running full project tsc --noEmit --skipLibCheck instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 13 server action files now return consistent ActionResult<T> with fieldErrors
- Phase 15 (UI Quality) can wire inline form validation using fieldErrors from ActionResult
- Audit logging is complete across all action files -- Phase 22 testing can verify the audit trail
- Plan 14-04 (webhook revalidation + missing DAL) can proceed independently

## Self-Check: PASSED

- All 13 action files exist on disk
- Both task commits found in git history (b23f721, 5223c20)
- SUMMARY.md exists at expected path

---
*Phase: 14-data-layer-fixes*
*Completed: 2026-03-28*
