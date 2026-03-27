---
phase: 05-online-store
plan: 01
subsystem: database, api
tags: [prisma, zustand, zod, gift-cards, e-commerce, cart]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Prisma schema patterns, Zod validation patterns, Zustand store pattern, env validation
  - phase: 03-payments
    provides: Stripe integration, Payment model, StripeEvent model
provides:
  - ProductType and OrderStatus enums in Prisma schema
  - Product, Order, OrderItem, GiftCard, DownloadToken models
  - Zod schemas for product CRUD, gift card purchase/redemption, checkout, order management
  - Zustand cart store with localStorage persistence (useCartStore)
  - Gift card code generator (INK37-XXXX-XXXX-XXXX format)
  - Currency formatter, shipping constants, download token constants
  - BLOB_PRIVATE_READ_WRITE_TOKEN env var for digital downloads
affects: [05-02, 05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zustand persist middleware for localStorage cart state
    - Gift card code generation via crypto.randomBytes with ambiguous character exclusion
    - Store-specific Zod schemas following existing validation.ts conventions

key-files:
  created:
    - src/stores/cart-store.ts
    - src/lib/store-helpers.ts
  modified:
    - prisma/schema.prisma
    - src/lib/security/validation.ts
    - src/lib/env.ts

key-decisions:
  - "Gift card codes use INK37-XXXX-XXXX-XXXX format with crypto.randomBytes, excluding I/O/0/1 for readability"
  - "Cart store uses Zustand persist middleware with 'ink37-cart' localStorage key for guest checkout"
  - "Gift cards always added as separate cart items (different recipients), while regular products merge quantities"
  - "Flat shipping rate $7.99 (799 cents), free shipping over $50"
  - "Download links expire after 72 hours with max 5 downloads per token"

patterns-established:
  - "Zustand persist: use zustand/middleware persist for client-side state that survives page navigation"
  - "Store constants: centralize business rules (shipping rates, thresholds, limits) in store-helpers.ts"
  - "Gift card code format: INK37-XXXX-XXXX-XXXX using ABCDEFGHJKLMNPQRSTUVWXYZ23456789 character set"

requirements-completed: [STORE-01, STORE-02, STORE-03, STORE-04, STORE-05]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 5 Plan 1: Store Foundation Summary

**Prisma schema with 5 store models (Product, Order, OrderItem, GiftCard, DownloadToken), Zustand cart store with localStorage persistence, Zod validation schemas, and gift card code generator**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T06:04:12Z
- **Completed:** 2026-03-22T06:07:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended Prisma schema with ProductType/OrderStatus enums and 5 new store models with proper indexes and table mappings
- Created 6 Zod validation schemas for store operations (product CRUD, gift card purchase/redemption, checkout, order status)
- Built Zustand cart store with localStorage persistence, quantity merging for regular products, and separate item handling for gift cards
- Implemented cryptographically secure gift card code generator producing INK37-XXXX-XXXX-XXXX format codes
- All 29 Wave 0 tests pass GREEN across 3 test suites

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with store models and enums** - `pending` (feat)
2. **Task 2: Create Zod validation schemas, cart store, and store helpers** - `pending` (feat)

**Plan metadata:** `pending` (docs: complete plan)

_Note: Commit hashes pending git permission resolution._

## Files Created/Modified
- `prisma/schema.prisma` - Added ProductType, OrderStatus enums; Product, Order, OrderItem, GiftCard, DownloadToken models
- `src/lib/security/validation.ts` - Added CreateProductSchema, UpdateProductSchema, PurchaseGiftCardSchema, RedeemGiftCardSchema, StoreCheckoutSchema, UpdateOrderStatusSchema
- `src/stores/cart-store.ts` - Zustand cart store with persist middleware, CartItem interface, add/remove/update/clear operations
- `src/lib/store-helpers.ts` - generateGiftCardCode, formatCurrency, GIFT_CARD_DENOMINATIONS, SHIPPING_RATE_CENTS, FREE_SHIPPING_THRESHOLD, DOWNLOAD_LINK_EXPIRY_HOURS, MAX_DOWNLOADS_PER_TOKEN
- `src/lib/env.ts` - Added optional BLOB_PRIVATE_READ_WRITE_TOKEN env var

## Decisions Made
- Gift card codes use INK37-XXXX-XXXX-XXXX format with crypto.randomBytes (12 random bytes), excluding ambiguous characters I/O/0/1 for readability
- Cart store uses Zustand persist middleware with 'ink37-cart' localStorage key -- works for guest checkout without server-side auth
- Gift cards are always added as separate cart items (different recipients may exist), while regular products merge quantities on duplicate add
- Flat shipping rate set at $7.99 (799 cents in Stripe), free shipping threshold at $50
- Download links expire after 72 hours with max 5 downloads per token
- UpdateOrderStatusSchema excludes PENDING from valid update targets (orders start as PENDING, cannot be set back)

## Deviations from Plan

None - plan executed exactly as written. Wave 0 test files already existed from 05-00 plan execution.

## Issues Encountered

- Git permission consistently denied in parallel agent context -- all file changes and test verification completed successfully but commits pending permission resolution

## User Setup Required

None - no external service configuration required for this plan. The BLOB_PRIVATE_READ_WRITE_TOKEN env var is optional and will be configured when digital product upload is implemented in a later plan.

## Next Phase Readiness
- Schema models ready for DAL functions (plan 05-02)
- Validation schemas ready for Server Actions (plan 05-02, 05-03)
- Cart store ready for store UI components (plan 05-02)
- Gift card code generator ready for gift card purchase flow (plan 05-03)
- All 29 Wave 0 tests passing, establishing quality baseline

## Self-Check: PASSED

All created/modified files verified present:
- FOUND: prisma/schema.prisma
- FOUND: src/lib/security/validation.ts
- FOUND: src/stores/cart-store.ts
- FOUND: src/lib/store-helpers.ts
- FOUND: src/lib/env.ts
- FOUND: .planning/phases/05-online-store/05-01-SUMMARY.md

Test verification: 29/29 tests pass (3 test files)
Prisma generate: exit 0

Note: Git commits blocked by permission system in parallel agent. Files are ready to be committed by orchestrator.

---
*Phase: 05-online-store*
*Completed: 2026-03-22*
