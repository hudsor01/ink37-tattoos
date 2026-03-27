---
phase: 05-online-store
plan: 03
subsystem: ui
tags: [react, nextjs, zustand, stripe, vercel-blob, store, cart, gift-cards]

requires:
  - phase: 05-01
    provides: Cart store (Zustand), store-helpers (formatCurrency, GIFT_CARD_DENOMINATIONS, shipping constants)
  - phase: 05-02
    provides: DAL (getActiveProducts, getProductById), server actions (storeCheckoutAction, purchaseGiftCardAction, validateGiftCardAction), Prisma schema (Order, OrderItem, DownloadToken, Product)
provides:
  - Store layout with nav, footer, and cart drawer
  - Product catalog page with type filter and responsive grid
  - Product detail page with add-to-cart client island
  - Cart drawer with quantity controls, gift card redemption, and Stripe checkout
  - Gift card purchase page with denomination selection and recipient form
  - Checkout success page with order type detection and download links
  - Checkout cancelled page
  - Secure digital download route with token/expiry/limit verification
affects: [05-04, 05-05]

tech-stack:
  added: []
  patterns:
    - "CustomEvent dispatch for cross-component communication (CartIcon <-> CartDrawer)"
    - "Hydration-safe client badge with mounted flag pattern"
    - "Server component + client island pattern for add-to-cart"
    - "Vercel Blob private download with head() + fetch"

key-files:
  created:
    - src/app/(store)/layout.tsx
    - src/app/(store)/store/page.tsx
    - src/app/(store)/store/[productId]/page.tsx
    - src/app/(store)/store/[productId]/add-to-cart-button.tsx
    - src/app/(store)/store/gift-cards/page.tsx
    - src/app/(store)/store/checkout/success/page.tsx
    - src/app/(store)/store/checkout/success/clear-cart.tsx
    - src/app/(store)/store/checkout/cancelled/page.tsx
    - src/app/api/store/download/route.ts
    - src/components/store/product-card.tsx
    - src/components/store/product-grid.tsx
    - src/components/store/type-filter.tsx
    - src/components/store/cart-drawer.tsx
    - src/components/store/cart-item.tsx
    - src/components/store/cart-icon.tsx
    - src/components/store/gift-card-form.tsx
    - src/components/store/gift-card-redeem-input.tsx
  modified: []

key-decisions:
  - "Store layout inline rather than importing PublicNav -- adds Shop link and CartIcon to nav"
  - "CustomEvent pattern for CartIcon <-> CartDrawer communication (toggle-cart, open-cart events)"
  - "Order relation is items not orderItems in Prisma schema -- success page uses correct relation"
  - "Download route uses Vercel Blob head() then fetch() for private file serving"
  - "ClearCartOnMount client island on success page to clear cart after payment confirmation"

patterns-established:
  - "Client island pattern: AddToCartButton wraps server product detail with client interaction"
  - "Event-driven drawer: CartIcon dispatches CustomEvent, CartDrawer listens and opens"
  - "Hydration-safe badge: mounted useState flag prevents SSR mismatch on cart count"

requirements-completed: [STORE-01, STORE-02, STORE-03, STORE-05]

duration: 8min
completed: 2026-03-22
---

# Phase 05 Plan 03: Store Public UI Summary

**Complete store customer-facing UI with product catalog, cart drawer, gift card purchase, checkout flow, and secure digital download route.**

## What Was Built

### Task 1: Store Layout, Product Catalog, and Catalog Components
- **Store layout** (`src/app/(store)/layout.tsx`): Full store shell with StoreNav (Gallery, Services, Shop, About, FAQ, Contact links), CartIcon in nav, mobile hamburger menu, footer, and CartDrawer rendered outside main for Sheet overlay
- **TypeFilter** (`src/components/store/type-filter.tsx`): Horizontal pill buttons (All/Merch/Prints/Gift Cards) with brand-accent active state per UI-SPEC color contract
- **ProductCard** (`src/components/store/product-card.tsx`): Card with aspect-1/1 image, name (16px semibold), price (14px semibold), type Badge, entire card as clickable Link
- **ProductGrid** (`src/components/store/product-grid.tsx`): Client component managing filter state, responsive grid (1/2/3 columns), empty filter state message
- **Store page** (`src/app/(store)/store/page.tsx`): Server component calling getActiveProducts, empty state with "Shop Coming Soon", passes products to ProductGrid

### Task 2: Product Detail, Cart Drawer, and Cart Components
- **Product detail** (`src/app/(store)/store/[productId]/page.tsx`): Server component with breadcrumb, two-column layout (image + details), SEO metadata, gift card redirect
- **AddToCartButton** (`src/app/(store)/store/[productId]/add-to-cart-button.tsx`): Client island that calls useCartStore.addItem and dispatches open-cart event
- **CartIcon** (`src/components/store/cart-icon.tsx`): Hydration-safe count badge with mounted flag, dispatches toggle-cart CustomEvent
- **CartItem** (`src/components/store/cart-item.tsx`): Row with thumbnail, name, price, [-]/[+] quantity controls, Remove button (text-destructive)
- **CartDrawer** (`src/components/store/cart-drawer.tsx`): Sheet (right side) with cart items, subtotal/shipping/total, gift card redemption toggle, Proceed to Checkout calling storeCheckoutAction

### Task 3: Gift Cards, Checkout Pages, and Download Route
- **GiftCardForm** (`src/components/store/gift-card-form.tsx`): Denomination buttons ($25-$500), recipient fields with react-hook-form + zod, brand-accent Send Gift Card CTA
- **GiftCardRedeemInput** (`src/components/store/gift-card-redeem-input.tsx`): Code input with Apply/Remove, validates via validateGiftCardAction, shows balance or error
- **Gift card page** (`src/app/(store)/store/gift-cards/page.tsx`): Wraps GiftCardForm with heading and metadata
- **Checkout success** (`src/app/(store)/store/checkout/success/page.tsx`): Detects order type (physical/digital/gift_card/mixed), shows contextual message, download links for digital items, ClearCartOnMount client island
- **Checkout cancelled** (`src/app/(store)/store/checkout/cancelled/page.tsx`): XCircle icon, cancelled message, Return to Shop CTA
- **Download route** (`src/app/api/store/download/route.ts`): Token validation, expiry check, download limit, Vercel Blob private fetch, Content-Disposition attachment headers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Order relation name in success page**
- **Found during:** Task 3
- **Issue:** Plan referenced `orderItems` but Prisma schema uses `items` for Order->OrderItem relation, and `productType` is on Product not OrderItem
- **Fix:** Changed query to use `items` with nested `product: { select: { productType: true } }`
- **Files modified:** src/app/(store)/store/checkout/success/page.tsx

**2. [Rule 2 - Missing functionality] Added ClearCartOnMount client island**
- **Found during:** Task 3
- **Issue:** Success page needed to clear cart after render but is a server component
- **Fix:** Created separate client component ClearCartOnMount that calls clearCart on mount
- **Files modified:** src/app/(store)/store/checkout/success/clear-cart.tsx

**3. [Rule 2 - Missing functionality] Added AddToCartButton client island**
- **Found during:** Task 2
- **Issue:** Product detail page is a server component but needs client-side cart interaction
- **Fix:** Created AddToCartButton client component co-located with product detail page
- **Files modified:** src/app/(store)/store/[productId]/add-to-cart-button.tsx

## Verification

- TypeScript compilation: PASS (zero errors in store files)
- All 17 files created successfully
- All acceptance criteria met across all 3 tasks

## Known Stubs

None -- all components are wired to real DAL functions, server actions, and cart store.
