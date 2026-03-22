---
phase: 07-store-integration-fixes
plan: 01
subsystem: api
tags: [stripe, email, resend, webhooks, store, download-tokens]

# Dependency graph
requires:
  - phase: 05-online-store
    provides: store checkout, order creation, gift card purchase, download tokens
provides:
  - per-item download URLs in order confirmation emails using /api/store/download?token=TOKEN
  - stripePriceId null guard in storeCheckoutAction preventing crashes
  - gift card purchaser confirmation email template and sender
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-item download links in email templates instead of single bulk URL"
    - "Pre-validation guard pattern for required Stripe fields before building line items"

key-files:
  created: []
  modified:
    - src/lib/dal/orders.ts
    - src/lib/actions/store-actions.ts
    - src/lib/email/templates.ts
    - src/lib/email/resend.ts
    - src/app/api/webhooks/stripe/route.ts

key-decisions:
  - "Download URLs use per-item tokens from downloadTokens relation, matching checkout success page pattern"
  - "stripePriceId guard returns user-friendly error before for-loop rather than crashing on non-null assertion"
  - "Gift card purchaser confirmation is a separate email function/template, not appended to recipient delivery email"

patterns-established:
  - "Per-item download links: iterate order items with downloadTokens to build individual download URLs"
  - "Pre-validation guards: check data integrity before building Stripe params to avoid runtime crashes"

requirements-completed: [STORE-01, STORE-03, STORE-05]

# Metrics
duration: 9min
completed: 2026-03-22
---

# Phase 7 Plan 1: Store Integration Fixes Summary

**Fixed order email download URLs to use per-item /api/store/download?token=TOKEN format, added stripePriceId null guard, and wired gift card purchaser confirmation email**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-22T22:49:54Z
- **Completed:** 2026-03-22T22:58:59Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Order confirmation emails now contain per-item download URLs using the correct /api/store/download?token=TOKEN format, matching the checkout success page pattern
- storeCheckoutAction returns a user-friendly error when any cart product lacks a stripePriceId, preventing the non-null assertion crash
- Gift card purchasers receive a separate confirmation email acknowledging their purchase amount and recipient name

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix download URLs in order confirmation email and add stripePriceId guard** - `6114821` (fix)
2. **Task 2: Add gift card purchaser confirmation email** - `75e8bef` (feat)

## Files Created/Modified
- `src/lib/dal/orders.ts` - Added downloadTokens: true to getOrderByCheckoutSessionId include
- `src/lib/actions/store-actions.ts` - Added stripePriceId null guard before Stripe line item construction
- `src/lib/email/templates.ts` - Replaced single downloadUrl with per-item downloadLinks array; added giftCardPurchaseConfirmationTemplate
- `src/lib/email/resend.ts` - Updated sendOrderConfirmationEmail to accept downloadLinks; added sendGiftCardPurchaseConfirmationEmail
- `src/app/api/webhooks/stripe/route.ts` - Built per-item download URLs from tokens; called purchaser confirmation email in gift card handler

## Decisions Made
- Download URLs use per-item tokens from the downloadTokens relation on each order item, matching the checkout success page's existing pattern
- stripePriceId guard returns `{ success: false, error: '...' }` before the for-loop rather than crashing on the `product.stripePriceId!` non-null assertion
- Gift card purchaser confirmation is a separate email function and template, not appended to the recipient's delivery email

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three store integration gaps (INT-01, INT-02, FLOW-02/FLOW-03) are closed
- Store checkout flow works end-to-end: checkout -> payment -> order confirmation with download links -> gift card purchaser confirmation

---
*Phase: 07-store-integration-fixes*
*Completed: 2026-03-22*
