---
phase: 03-payments
plan: 01
subsystem: payments
tags: [stripe, prisma, zod, payments]

requires:
  - phase: 01-foundation
    provides: Prisma schema with Customer and TattooSession models, env validation pattern, security validation pattern
provides:
  - Payment and StripeEvent Prisma models with enums
  - Server-only Stripe client with pinned API version
  - Currency conversion helpers (dollarsToStripeCents, stripeCentsToDollars)
  - Env validation for STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
  - RequestDepositSchema and RequestBalanceSchema Zod validators
affects: [03-02-PLAN, 03-03-PLAN, 04-client-portal]

tech-stack:
  added: [stripe@20.4.1]
  patterns: [server-only stripe client, integer-cent currency conversion]

key-files:
  created: [src/lib/stripe.ts]
  modified: [prisma/schema.prisma, src/lib/env.ts, src/lib/security/validation.ts]

key-decisions:
  - "Stripe API version pinned to 2025-12-18.acacia for reproducibility"
  - "Currency helpers use Math.round to prevent floating-point cent errors"
  - "Both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required (not optional) for fail-fast startup"

patterns-established:
  - "Server-only Stripe client: import 'server-only' prevents client-side bundle inclusion"
  - "Currency conversion: always use dollarsToStripeCents/stripeCentsToDollars, never manual multiplication"

requirements-completed: [PAY-01, PAY-02, PAY-04]

duration: 2min
completed: 2026-03-21
---

# Phase 3 Plan 1: Stripe Foundation Summary

**Payment and StripeEvent Prisma models with server-only Stripe client, currency helpers, env validation, and Zod payment schemas**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T15:52:05Z
- **Completed:** 2026-03-21T15:53:32Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Payment model with full field set (type, status, amount, Stripe IDs, indexes) and StripeEvent for idempotent webhooks
- Server-only Stripe client with pinned API version and currency conversion helpers
- Env validation requires both Stripe keys at startup (fail-fast)
- Zod schemas ready for deposit and balance payment Server Actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Payment and StripeEvent models to Prisma schema** - `85a8081` (feat)
2. **Task 2: Create Stripe client, currency helpers, env validation, and payment Zod schemas** - `d8e81a9` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Payment model, StripeEvent model, PaymentType/PaymentStatus enums, stripeCustomerId on Customer, payments relations
- `src/lib/stripe.ts` - Server-only Stripe client with currency conversion helpers
- `src/lib/env.ts` - Added STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET validation
- `src/lib/security/validation.ts` - Added RequestDepositSchema and RequestBalanceSchema
- `package.json` - Added stripe@20.4.1 dependency

## Decisions Made
- Stripe API version pinned to 2025-12-18.acacia for reproducibility
- Currency helpers use Math.round to prevent floating-point cent errors
- Both Stripe env vars required (not optional) for fail-fast startup

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** Environment variables needed:
- `STRIPE_SECRET_KEY` - From Stripe Dashboard -> Developers -> API keys (use `sk_test_...` for dev)
- `STRIPE_WEBHOOK_SECRET` - From Stripe Dashboard -> Developers -> Webhooks, or use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local dev

## Next Phase Readiness
- Payment data model and Stripe client ready for Plan 02 (business logic: checkout sessions, webhook handler)
- Plan 03 (admin UI) can reference Payment model for dashboard views

---
*Phase: 03-payments*
*Completed: 2026-03-21*
