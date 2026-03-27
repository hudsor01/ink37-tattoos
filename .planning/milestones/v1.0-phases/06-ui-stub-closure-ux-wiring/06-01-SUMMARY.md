---
phase: 06-ui-stub-closure-ux-wiring
plan: 01
subsystem: ui
tags: [auth, signout, better-auth, payment-flow, portal]

requires:
  - phase: 04-client-portal
    provides: portal payments page at /portal/payments
  - phase: 03-payments
    provides: payment success page
provides:
  - Secure POST-based admin sign-out via Better Auth signOut()
  - Payment success to portal payments navigation link
affects: []

tech-stack:
  added: []
  patterns:
    - "signOut() from auth-client for all sign-out actions (not GET links)"

key-files:
  created: []
  modified:
    - src/components/dashboard/admin-nav.tsx
    - src/app/(public)/payment/success/page.tsx

key-decisions:
  - "Admin sign-out uses onClick with signOut() + window.location redirect, not router.push"

patterns-established:
  - "Sign-out pattern: await signOut() then window.location.href = '/login'"

requirements-completed: [SEC-03]

duration: 3min
completed: 2026-03-22
---

# Phase 06 Plan 01: Fix Admin Sign-Out + Payment Success Portal Link Summary

**Admin sign-out changed from insecure GET link to Better Auth signOut() POST action; payment success page now links to portal payment history**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T18:19:50Z
- **Completed:** 2026-03-22T18:22:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Admin sign-out now uses signOut() POST action from @/lib/auth-client instead of a GET navigation to /api/auth/sign-out
- Payment success page includes "View Payment History" button linking to /portal/payments
- Both buttons on payment success page wrapped in responsive flex layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix admin sign-out to use signOut() POST action** - `65d6dad` (fix)
2. **Task 2: Add portal link to payment success page** - `fe1f121` (feat)

## Files Created/Modified
- `src/components/dashboard/admin-nav.tsx` - Replaced GET link sign-out with onClick handler calling signOut() + redirect
- `src/app/(public)/payment/success/page.tsx` - Added "View Payment History" outline button and flex wrapper

## Decisions Made
- Admin sign-out uses onClick with signOut() + window.location redirect, matching the portal-header pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All v1.0 audit gaps closed
- Application ready for final verification

---
*Phase: 06-ui-stub-closure-ux-wiring*
*Completed: 2026-03-22*
