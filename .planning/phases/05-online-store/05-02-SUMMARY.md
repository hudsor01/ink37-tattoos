---
phase: 05-online-store
plan: 02
subsystem: api
tags: [stripe, prisma, server-actions, webhooks, email, gift-cards, dal]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Prisma schema models (Product, Order, OrderItem, GiftCard, DownloadToken), Zod validation schemas, store-helpers utilities, cart store"
  - phase: 03-payments
    provides: "Stripe integration, payment DAL pattern, webhook handler, payment-actions pattern"
provides:
  - "Product CRUD DAL with Stripe product/price sync"
  - "Order management DAL with transactional item + download token creation"
  - "Gift card DAL with atomic balance redemption (Prisma conditional update)"
  - "Store checkout Server Action with Stripe line items, conditional shipping, gift card coupon"
  - "Gift card purchase and validation Server Actions"
  - "Deposit/balance payment actions extended with optional gift card redemption (D-09)"
  - "Webhook handler branching on orderType (store, gift_card, tattoo)"
  - "Order confirmation and gift card delivery email templates"
  - "Admin nav with Products and Orders links"
  - "StatusBadge supports PAID, SHIPPED, DELIVERED statuses"
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [store-checkout-stripe-flow, gift-card-redemption-pattern, webhook-ordertype-branching]

key-files:
  created:
    - src/lib/dal/products.ts
    - src/lib/dal/orders.ts
    - src/lib/dal/gift-cards.ts
    - src/lib/actions/product-actions.ts
    - src/lib/actions/order-actions.ts
    - src/lib/actions/store-actions.ts
    - src/lib/actions/gift-card-actions.ts
  modified:
    - src/lib/actions/payment-actions.ts
    - src/app/api/webhooks/stripe/route.ts
    - src/lib/email/templates.ts
    - src/lib/email/resend.ts
    - src/components/dashboard/status-badge.tsx
    - src/components/dashboard/admin-nav.tsx

key-decisions:
  - "Gift card balance decrement happens in webhook (not checkout action) for atomicity"
  - "Store checkout creates pending order before Stripe session, updates with session ID after"
  - "Shipping details extracted from session.collected_information.shipping_details per Stripe 2025-12 API"

patterns-established:
  - "Store checkout flow: validate cart -> lookup products -> build Stripe line_items -> create pending order -> create Stripe session -> return URL"
  - "Gift card as Stripe coupon: validate -> create one-time coupon with amount_off -> attach as discount to checkout session"
  - "Webhook orderType branching: metadata.orderType determines handler (store, gift_card, tattoo)"

requirements-completed: [STORE-01, STORE-02, STORE-03, STORE-04, STORE-05]

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 05 Plan 02: Store Business Logic Summary

**Product/order/gift-card DAL with Stripe sync, store checkout action, webhook branching on orderType, and gift card redemption wired into tattoo deposit/balance flow (D-09)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-22T06:18:25Z
- **Completed:** 2026-03-22T06:26:30Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Three DAL modules (products, orders, gift-cards) with auth enforcement on admin operations
- Five Server Action files covering product CRUD, order management, store checkout, gift card purchase/validation
- Webhook handler extended to branch on orderType metadata for store, gift card, and tattoo payment flows
- Gift card redemption integrated into existing deposit and balance payment actions via optional form field
- Order confirmation and gift card delivery email templates following existing HTML pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DAL modules for products, orders, and gift cards** - `005d524` (feat)
2. **Task 2: Create Server Actions, extend webhook, update email templates, update admin nav/StatusBadge, and add gift card redemption to deposit flow (D-09)** - `0b39151` (feat)

## Files Created/Modified
- `src/lib/dal/products.ts` - Product CRUD DAL with public and admin operations
- `src/lib/dal/orders.ts` - Order management DAL with transactional creation and download tokens
- `src/lib/dal/gift-cards.ts` - Gift card DAL with atomic balance redemption
- `src/lib/actions/product-actions.ts` - Admin product CRUD with Stripe product/price sync
- `src/lib/actions/order-actions.ts` - Admin order status updates and refunds
- `src/lib/actions/store-actions.ts` - Guest checkout with conditional shipping and gift card discount
- `src/lib/actions/gift-card-actions.ts` - Guest gift card purchase and code validation
- `src/lib/actions/payment-actions.ts` - Extended with optional giftCardCode for D-09 redemption
- `src/app/api/webhooks/stripe/route.ts` - Extended with store/gift-card checkout handlers
- `src/lib/email/templates.ts` - Added orderConfirmationTemplate and giftCardDeliveryTemplate
- `src/lib/email/resend.ts` - Added sendOrderConfirmationEmail and sendGiftCardEmail
- `src/components/dashboard/status-badge.tsx` - Added PAID, SHIPPED, DELIVERED status colors
- `src/components/dashboard/admin-nav.tsx` - Added Products and Orders nav links with Package/ShoppingBag icons

## Decisions Made
- Gift card balance decrement happens in webhook handler (not checkout action) to ensure payment is confirmed before reducing balance
- Store checkout creates a pending order in the database before Stripe session creation, then updates with the Stripe session ID -- this ensures the order exists for webhook processing even if the user abandons checkout
- Used `session.collected_information.shipping_details` for Stripe 2025-12.acacia API version (not deprecated `shipping_details`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Stripe API shipping_details property name**
- **Found during:** Task 2 (webhook handler)
- **Issue:** Plan referenced `session.shipping_details` which does not exist in Stripe 2025-12.acacia API types
- **Fix:** Changed to `session.collected_information?.shipping_details` per current Stripe type definitions
- **Files modified:** src/app/api/webhooks/stripe/route.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 0b39151 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor API property name fix. No scope creep.

## Issues Encountered
None beyond the Stripe type fix documented above.

## Known Stubs
None - all DAL functions, Server Actions, and webhook handlers are fully wired to Prisma and Stripe.

## User Setup Required
None - no external service configuration required (Stripe keys already configured from Phase 03).

## Next Phase Readiness
- Business logic layer complete, ready for admin UI pages (Plan 03) and store frontend (Plan 04)
- All DAL exports, Server Actions, and email functions available for UI consumption
- Webhook handler processes all three checkout types (store, gift card, tattoo)

---
*Phase: 05-online-store*
*Completed: 2026-03-22*
