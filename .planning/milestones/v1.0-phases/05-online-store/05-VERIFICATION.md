---
phase: 05-online-store
verified: 2026-03-22T07:30:00Z
status: passed
score: 5/5 requirements verified
re_verification: false
gaps: []
human_verification:
  - test: "Browse store catalog and filter by type"
    expected: "All/Merch/Prints/Gift Cards pill filters work client-side, grid reflows to 1/2/3 columns"
    why_human: "Client-side filter state and CSS grid layout require browser render to verify"
  - test: "Add a product to cart, open cart drawer, apply gift card code INK37-XXXX-XXXX-XXXX"
    expected: "Cart item appears, drawer shows subtotal, gift card balance validated and shown in green"
    why_human: "Zustand persist, Sheet animation, validateGiftCardAction round-trip require live environment"
  - test: "Complete a store checkout via Stripe test mode"
    expected: "Redirected to Stripe, payment accepted, webhook fires, Order Confirmed page shows with download links for digital items"
    why_human: "Stripe Checkout session creation, webhook delivery, and Vercel Blob download all require deployed environment"
  - test: "Admin creates a product with type=Digital and uploads a file"
    expected: "Product appears in catalog; digital file stored in Vercel Blob private storage; download token generated on purchase"
    why_human: "Vercel Blob private write token required; file upload drag-and-drop requires browser"
  - test: "Admin marks an order as Shipped then Delivered"
    expected: "StatusBadge transitions PAID -> SHIPPED -> DELIVERED; action buttons update conditionally"
    why_human: "Conditional rendering of status action buttons requires live order data and browser interaction"
---

# Phase 5: Online Store Verification Report

**Phase Goal:** The studio earns passive revenue through an online store offering merchandise, prints, and gift cards -- all powered by Stripe Products with order management in the admin dashboard
**Verified:** 2026-03-22T07:30:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Gift card purchase flow exists with unique INK37 code generation | VERIFIED | `generateGiftCardCode` in `src/lib/store-helpers.ts` L7; `purchaseGiftCardAction` in `gift-card-actions.ts`; `GiftCardForm` with denomination buttons and `purchaseGiftCardAction` import; `createGiftCard` DAL called in webhook `handleGiftCardCheckoutCompleted` |
| 2 | Product catalog with Stripe Products sync exists for merch/prints | VERIFIED | `Product` model in `prisma/schema.prisma` L354 with `stripeProductId/stripePriceId`; `createProductAction` calls `stripe.products.create` + `stripe.prices.create`; `getActiveProducts` DAL feeds `/store/page.tsx`; `ProductGrid` with `TypeFilter` |
| 3 | Shopping cart and Stripe Checkout integration is complete | VERIFIED | `useCartStore` (Zustand persist, `ink37-cart`) in `src/stores/cart-store.ts`; `CartDrawer` wired to `storeCheckoutAction`; `storeCheckoutAction` calls `stripe.checkout.sessions.create` with `line_items`, `shipping_address_collection`, `shipping_options` |
| 4 | Order management in admin dashboard exists | VERIFIED | `/dashboard/orders/page.tsx` calls `getOrders` + `getOrderStats`; `OrderDetail` with `updateOrderStatusAction` + `refundOrderAction` + AlertDialog confirmations; `orderColumns` with `StatusBadge` and contextual dropdown actions |
| 5 | Digital product delivery via download tokens is implemented | VERIFIED | `DownloadToken` model in schema; `createOrder` DAL generates tokens via `randomBytes(32)` with 72h expiry; `/api/store/download/route.ts` validates token, checks expiry/count, serves via Vercel Blob with `Content-Disposition: attachment` |

**Score:** 5/5 truths verified

---

## Required Artifacts

### Plan 00 (Wave 0 Tests)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/__tests__/gift-card.test.ts` | VERIFIED | File exists, imports `generateGiftCardCode` from `@/lib/store-helpers` |
| `src/__tests__/store-validation.test.ts` | VERIFIED | File exists, imports `CreateProductSchema`, `StoreCheckoutSchema`, etc. |
| `src/__tests__/cart-store.test.ts` | VERIFIED | File exists, imports `useCartStore` |
| `src/__tests__/store-checkout.test.ts` | VERIFIED | File exists, imports `StoreCheckoutSchema` |
| `src/__tests__/order-status.test.ts` | VERIFIED | File exists, imports `UpdateOrderStatusSchema` |
| `src/__tests__/download-token.test.ts` | VERIFIED | File exists, uses inline logic (no missing imports) |

### Plan 01 (Foundation)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `prisma/schema.prisma` | VERIFIED | `model Product` L354, `model Order` L378, `model OrderItem` L409, `model GiftCard` L428, `model DownloadToken` L449, `enum ProductType` L471, `enum OrderStatus` L477 |
| `src/lib/security/validation.ts` | VERIFIED | `CreateProductSchema` L181, `PurchaseGiftCardSchema` L205, `RedeemGiftCardSchema` L221, `StoreCheckoutSchema` L237, `UpdateOrderStatusSchema` L253 |
| `src/stores/cart-store.ts` | VERIFIED | `export interface CartItem` L4, `export const useCartStore` L30, `persist(` L31, `name: 'ink37-cart'` L78 |
| `src/lib/store-helpers.ts` | VERIFIED | `generateGiftCardCode` L7, `GIFT_CARD_DENOMINATIONS` L32, `SHIPPING_RATE_CENTS = 799` L36, `FREE_SHIPPING_THRESHOLD = 50` L38, `DOWNLOAD_LINK_EXPIRY_HOURS = 72` L40, `MAX_DOWNLOADS_PER_TOKEN = 5` L42 |

### Plan 02 (Business Logic)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/lib/dal/products.ts` | VERIFIED | `import 'server-only'` L1, `getActiveProducts` L22, `getProducts` L39, `createProduct` L50, `updateProduct` L72, `deleteProduct` L84 |
| `src/lib/dal/orders.ts` | VERIFIED | `import 'server-only'` L1, `randomBytes` L6, `createOrder` L62, `updateOrderStatus` L153, `getOrderStats` L171, `getOrderByCheckoutSessionId` L193 |
| `src/lib/dal/gift-cards.ts` | VERIFIED | `import 'server-only'` L1, `createGiftCard` L8, `validateGiftCard` L37, `redeemGiftCard` L52, `balance: { gte: data.amount }` L60 |
| `src/lib/actions/store-actions.ts` | VERIFIED | `storeCheckoutAction` L16, `orderType: 'store'` L80, `shipping_address_collection` L86, `shipping_options` L87, `stripe.checkout.sessions.create` L153 |
| `src/lib/actions/gift-card-actions.ts` | VERIFIED | `purchaseGiftCardAction` + `validateGiftCardAction` present |
| `src/lib/actions/payment-actions.ts` | VERIFIED | `giftCardCode` L41, `validateGiftCard` L46, `discounts` L80 -- D-09 gift card redemption wired into deposit/balance flow |
| `src/app/api/webhooks/stripe/route.ts` | VERIFIED | `handleStoreCheckoutCompleted` L158, `handleGiftCardCheckoutCompleted` L232, `orderType === 'store'` L48, `orderType === 'gift_card'` L50, `redeemGiftCard` L149 + L197 |
| `src/lib/email/templates.ts` | VERIFIED | `orderConfirmationTemplate` L62, `giftCardDeliveryTemplate` L134 |
| `src/lib/email/resend.ts` | VERIFIED | `sendOrderConfirmationEmail` L82, `sendGiftCardEmail` L110 |
| `src/components/dashboard/status-badge.tsx` | VERIFIED | `PAID:` L13, `SHIPPED:` L14, `DELIVERED:` L15 |
| `src/components/dashboard/admin-nav.tsx` | VERIFIED | `Package` L16, `ShoppingBag` L17, Products L39, Orders L40 |

### Plan 03 (Store Public UI)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/app/(store)/layout.tsx` | VERIFIED | File exists with CartDrawer and Shop nav link |
| `src/app/(store)/store/page.tsx` | VERIFIED | `getActiveProducts` L1, `ProductGrid` L2, products fetched L11 |
| `src/app/(store)/store/[productId]/page.tsx` | VERIFIED | File exists with `getProductById` and `Add to Cart` |
| `src/app/(store)/store/gift-cards/page.tsx` | VERIFIED | `GiftCardForm` L1, "Send a Gift Card" L13 |
| `src/app/(store)/store/checkout/success/page.tsx` | VERIFIED | `CheckCircle` L2, "Order Confirmed" L79, `Continue Shopping` L107 |
| `src/app/(store)/store/checkout/cancelled/page.tsx` | VERIFIED | File exists |
| `src/app/api/store/download/route.ts` | VERIFIED | `GET` L4, `downloadToken.findUnique` L12, `expiresAt < new Date()` L26, `Content-Disposition: attachment` L83 |
| `src/components/store/cart-drawer.tsx` | VERIFIED | `useCartStore` L5, `storeCheckoutAction` L6, `Sheet` L13, "Proceed to Checkout" L165 |
| `src/components/store/gift-card-form.tsx` | VERIFIED | `purchaseGiftCardAction` L7, `GIFT_CARD_DENOMINATIONS` L8, "Gift cards never expire." L118, `brand-accent` L125 |
| `src/components/store/gift-card-redeem-input.tsx` | VERIFIED | `validateGiftCardAction` L4, `INK37-XXXX-XXXX-XXXX` L61 |
| `src/components/store/product-card.tsx` | VERIFIED | File exists |
| `src/components/store/product-grid.tsx` | VERIFIED | File exists |
| `src/components/store/type-filter.tsx` | VERIFIED | File exists |
| `src/components/store/cart-icon.tsx` | VERIFIED | File exists |
| `src/components/store/cart-item.tsx` | VERIFIED | File exists |

### Plan 04 (Admin UI)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/app/(dashboard)/dashboard/products/page.tsx` | VERIFIED | `getProducts` L1, `DataTable` L2, "Add Product" L36 |
| `src/app/(dashboard)/dashboard/products/columns.tsx` | VERIFIED | File exists |
| `src/app/(dashboard)/dashboard/products/new/page.tsx` | VERIFIED | File exists |
| `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx` | VERIFIED | `getProductById` L1, `ProductForm` L2, `mode="edit"` L50 |
| `src/app/(dashboard)/dashboard/orders/page.tsx` | VERIFIED | `getOrders` L1, `getOrderStats` L1, `DataTable` L2, `KPICard` L3 |
| `src/app/(dashboard)/dashboard/orders/columns.tsx` | VERIFIED | File exists |
| `src/app/(dashboard)/dashboard/orders/[id]/page.tsx` | VERIFIED | `getOrderById` L1, `OrderDetail` L2, `getOrderById` called L19 |
| `src/components/dashboard/product-form.tsx` | VERIFIED | `zodResolver` L4, `CreateProductSchema` L9, `createProductAction` L13, `updateProductAction` L14 |
| `src/components/dashboard/order-detail.tsx` | VERIFIED | `updateOrderStatusAction` L20, `refundOrderAction` L20, `AlertDialog` L10-18, "Mark as Shipped" L268, "Issue Refund" L303 |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `store/page.tsx` | `dal/products.ts` | `getActiveProducts` server call | WIRED | Import at L1, called at L11 |
| `cart-drawer.tsx` | `actions/store-actions.ts` | `storeCheckoutAction` on checkout | WIRED | Import at L6, called at L55 |
| `actions/store-actions.ts` | `lib/stripe.ts` | `stripe.checkout.sessions.create` | WIRED | Called at L153 with `line_items` |
| `webhooks/stripe/route.ts` | `dal/orders.ts` | `handleStoreCheckoutCompleted` -> `createOrder`/`updateOrderStatus` | WIRED | `orderType === 'store'` L48 routes to handler; `redeemGiftCard` called L149 |
| `actions/gift-card-actions.ts` | `dal/gift-cards.ts` | `purchaseGiftCardAction` -> webhook -> `createGiftCard` | WIRED | Webhook `handleGiftCardCheckoutCompleted` calls `createGiftCard` |
| `actions/payment-actions.ts` | `dal/gift-cards.ts` | deposit/balance actions call `validateGiftCard` (D-09) | WIRED | `validateGiftCard` imported L16, called L46 and L173 |
| `api/store/download/route.ts` | `lib/db.ts` | `db.downloadToken.findUnique` | WIRED | Called at L12; expiry check L26; count check L34 |
| `dashboard/products/page.tsx` | `dal/products.ts` | `getProducts` server call | WIRED | Import L1, called L15 |
| `dashboard/product-form.tsx` | `actions/product-actions.ts` | form submit calls `createProductAction`/`updateProductAction` | WIRED | Imports L13-14, called L160-161 |
| `dashboard/orders/page.tsx` | `dal/orders.ts` | `getOrders` + `getOrderStats` | WIRED | Imports L1, called via `Promise.all` L22-23 |
| `dashboard/order-detail.tsx` | `actions/order-actions.ts` | status buttons call `updateOrderStatusAction`/`refundOrderAction` | WIRED | Import L20, called L93 and L109 |

---

## Requirements Coverage

| Requirement | Description | Plans | Status | Evidence |
|-------------|-------------|-------|--------|---------|
| STORE-01 | Gift card purchase and delivery (email delivery with unique code) | 00,01,02,03 | SATISFIED | `generateGiftCardCode` (INK37 format), `purchaseGiftCardAction`, `createGiftCard` DAL, `sendGiftCardEmail`, `GiftCardForm` UI |
| STORE-02 | Product catalog for merchandise/prints (Stripe Products + custom UI) | 00,01,02,03,04 | SATISFIED | `Product` model with `stripeProductId`, `createProductAction` with `stripe.products.create` + `stripe.prices.create`, catalog page with `ProductGrid` + `TypeFilter`, admin product CRUD pages |
| STORE-03 | Shopping cart and Stripe Checkout integration | 00,01,02,03 | SATISFIED | `useCartStore` (Zustand persist), `CartDrawer` with `storeCheckoutAction`, Stripe Checkout session with `line_items`, `shipping_options`, optional gift card discount as Stripe coupon |
| STORE-04 | Order management in admin dashboard | 00,01,02,04 | SATISFIED | `Order`/`OrderItem` models, `getOrders`/`getOrderStats` DAL, `updateOrderStatusAction`/`refundOrderAction`, orders DataTable with KPI cards, `OrderDetail` with status actions and confirmation dialogs |
| STORE-05 | Digital product delivery (prints as downloadable files) | 00,01,02,03 | SATISFIED | `DownloadToken` model, `createOrder` generates tokens with `randomBytes(32)` + 72h expiry + max 5 downloads, `/api/store/download/route.ts` validates and serves files from Vercel Blob with `Content-Disposition: attachment` |

No orphaned requirements -- all 5 STORE-* IDs are claimed in plan frontmatter and verified present.

---

## Anti-Patterns Found

No blockers or stubs found. Targeted scan of key phase files:

| File | Pattern Checked | Result |
|------|----------------|--------|
| `src/lib/dal/gift-cards.ts` | `redeemGiftCard` -- atomic balance check | Clean -- `balance: { gte: data.amount }` conditional update |
| `src/lib/actions/store-actions.ts` | Shipping stub / empty line_items | Clean -- real `stripePriceId` lookup + conditional shipping |
| `src/app/api/store/download/route.ts` | Token validation completeness | Clean -- expiry, count, Blob fetch, increment all present |
| `src/components/store/cart-drawer.tsx` | `storeCheckoutAction` call + response handling | Clean -- `await`, redirect to `checkoutUrl`, error toast |
| `src/components/dashboard/order-detail.tsx` | Status buttons -- real actions vs logs | Clean -- `updateOrderStatusAction`/`refundOrderAction` with `useTransition` |
| `src/lib/actions/payment-actions.ts` | D-09 gift card redemption (not stub) | Clean -- validates gift card, creates Stripe coupon, attaches discount |

---

## Human Verification Required

### 1. Store catalog filter and grid layout

**Test:** Visit `/store` in browser, click each filter pill (All, Merch, Prints, Gift Cards)
**Expected:** Products filter instantly client-side; empty filter shows "No products match this filter"; grid reflows 1 column mobile / 2 tablet / 3 desktop
**Why human:** Client-side Zustand filter state and CSS grid columns require browser render

### 2. Cart persistence across navigation

**Test:** Add item to cart, navigate to `/gallery`, return to `/store`
**Expected:** Cart contents preserved (Zustand `persist` with `ink37-cart` localStorage key)
**Why human:** localStorage persistence only verifiable in browser environment

### 3. Stripe Checkout end-to-end (physical + digital)

**Test:** Add a physical product and digital product to cart, proceed to checkout in Stripe test mode
**Expected:** Stripe checkout shows correct line items + shipping options; webhook fires `handleStoreCheckoutCompleted`; order confirmation page shows download link for digital item; physical item shows shipping address capture
**Why human:** Requires live Stripe test keys, webhook delivery, and Vercel Blob

### 4. Gift card code entry and balance validation

**Test:** Open cart drawer, click "Have a gift card?", enter a valid `INK37-XXXX-XXXX-XXXX` code
**Expected:** Green "Gift card balance: $XX.XX" shown; Stripe checkout total reduced by applied amount
**Why human:** Requires a valid gift card code in the database and live `validateGiftCardAction`

### 5. Admin order status lifecycle

**Test:** Log in as admin, open an order in PAID status, click "Mark as Shipped"
**Expected:** AlertDialog appears, confirm transitions order to SHIPPED; "Mark as Delivered" appears; "Mark as Shipped" disappears
**Why human:** Conditional action button rendering and live database state require browser + real order

---

## Gaps Summary

No gaps. All 5 requirements verified as fully implemented and wired. Every plan-level artifact exists, is substantive (not a stub), and is connected to its dependencies.

The phase achieves its stated goal: the studio can earn passive revenue through an online store with merch, prints, and gift cards, powered by Stripe Products, with order management in the admin dashboard.

---

_Verified: 2026-03-22T07:30:00Z_
_Verifier: Claude (gsd-verifier)_
