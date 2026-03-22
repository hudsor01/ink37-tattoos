# Phase 5: Online Store - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

E-commerce for merchandise, art prints, and gift cards. Visitors can browse a product catalog, add items to a cart, and checkout via Stripe. Gift cards are purchased and delivered via email with unique redemption codes redeemable at store checkout and tattoo booking. Digital prints are delivered as time-limited download links. Admin manages products and orders from the dashboard. No subscriptions, no recurring billing, no marketplace.

</domain>

<decisions>
## Implementation Decisions

### Product Catalog & Management
- **D-01:** Products managed via admin dashboard UI — full CRUD with Stripe Products synced behind the scenes. No Stripe Dashboard management needed.
- **D-02:** Three product types: physical (merch — shirts, hats, stickers), digital (art prints), and gift cards. Schema needs a `productType` enum.
- **D-03:** Product catalog page uses a clean grid of product cards — image, name, price. Click opens a detail page. Similar to gallery but simpler.
- **D-04:** Small initial catalog (under 20 products) — no pagination or search needed. Simple type filter (Merch / Prints / Gift Cards) is sufficient.

### Cart & Checkout Flow
- **D-05:** Guest checkout allowed — no account required to purchase. Stripe Checkout collects email. Maximizes conversion for public-facing store.
- **D-06:** Session-based cart stored in localStorage. No auth needed, works for guest checkout. Cart clears when browser session expires.
- **D-07:** Flat rate shipping for physical items. Simple to implement. Digital items and gift cards have no shipping.
- **D-08:** Checkout goes through Stripe Checkout (hosted page) — consistent with Phase 3 deposit/balance flow. Cart items become Stripe line items.
- **D-09:** Gift cards redeemable at both store checkout AND tattoo booking deposits. Applied as discount code / promo code.

### Gift Card Mechanics
- **D-10:** Preset denominations: $25, $50, $100, $200, $500. No custom amounts.
- **D-11:** 16-character alphanumeric code format: INK37-XXXX-XXXX-XXXX. Hard to guess, easy to type.
- **D-12:** No expiration — gift cards never expire. Customer-friendly and legally safe.
- **D-13:** Gift card email includes recipient name, sender name, optional personal message, and the redemption code. Feels like a real gift.
- **D-14:** Gift card has a balance that decrements on use — partial redemption supported. Remaining balance can be used on future purchases.

### Digital Product Delivery
- **D-15:** Digital files stored in Vercel Blob — consistent with existing media uploads. Signed URLs for secure download.
- **D-16:** Time-limited download links — 72-hour expiry after purchase. Buyer can re-request via email if needed.
- **D-17:** Prints delivered as high-res PNG or JPEG — standard print-quality formats.
- **D-18:** Store page shows low-res preview images only — full resolution only after purchase. No watermarking needed.

### Order Management (Admin)
- **D-19:** Admin order management at `/dashboard/orders` — reuse DataTable pattern from payments and customers.
- **D-20:** Order statuses: PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED. Physical items track shipping status.
- **D-21:** Digital orders auto-complete after payment (no shipping needed). Physical orders need admin to mark as shipped/delivered.

### Claude's Discretion
- Product detail page layout and design
- Admin product form field design
- Cart UI component design (drawer, page, or dropdown)
- Gift card email template visual design
- Order management table columns and filtering
- Flat shipping rate amount and free shipping threshold
- Product image upload flow in admin (reuse Vercel Blob pattern)
- Whether to add store revenue metrics to existing dashboard KPIs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stripe Integration (Phase 3 foundation)
- `src/lib/stripe.ts` — Stripe SDK initialized, dollarsToStripeCents/stripeCentsToDollars helpers
- `src/lib/actions/payment-actions.ts` — Stripe Checkout Session creation pattern, getOrCreateStripeCustomer
- `src/app/api/webhooks/stripe/route.ts` — Existing webhook handler; needs new event types for store orders
- `src/lib/dal/payments.ts` — Payment DAL with getOrCreateStripeCustomer pattern

### Admin Dashboard Patterns
- `src/components/dashboard/data-table.tsx` — Reusable DataTable for orders and product management
- `src/components/dashboard/status-badge.tsx` — Status badge for order statuses
- `src/components/dashboard/kpi-card.tsx` — KPI cards pattern
- `src/lib/dal/` — DAL pattern with requireStaffRole for admin operations
- `src/lib/actions/` — Server Action pattern with Zod validation and audit logging

### Store Route Group
- `src/app/(store)/layout.tsx` — Placeholder layout from Phase 1
- `src/app/(store)/store/page.tsx` — Placeholder page from Phase 1

### Existing Infrastructure
- `src/lib/email/resend.ts` — Email service for gift card delivery and order confirmations
- `src/lib/email/templates.ts` — Email templates pattern
- `src/lib/security/validation.ts` — Zod schema pattern for store inputs
- `src/lib/env.ts` — Environment variable validation
- `prisma/schema.prisma` — Current schema; needs Product, Order, OrderItem, GiftCard models

### Project Requirements
- `.planning/REQUIREMENTS.md` — STORE-01 through STORE-05 define store requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Stripe SDK** (`src/lib/stripe.ts`): Already configured with currency helpers
- **Stripe Checkout** (`payment-actions.ts`): Session creation pattern reusable for store checkout
- **Webhook handler** (`/api/webhooks/stripe`): Extend with store order events
- **DataTable** (`data-table.tsx`): Reuse for product admin and order management
- **StatusBadge** (`status-badge.tsx`): Extend for order statuses
- **Vercel Blob** (`ADMIN-05`): File upload pattern for product images and digital files
- **Resend email** (`email/`): Gift card delivery and order confirmation emails
- **Gallery masonry** (`gallery/`): Product grid can follow similar card pattern

### Established Patterns
- DAL with `requireStaffRole` for admin product/order operations
- Server Actions with Zod validation for mutations (product CRUD, order management)
- Stripe Checkout (hosted page) for all payments — no custom card forms
- Webhook idempotency via event ID unique constraint
- Route Handlers for webhooks only, Server Actions for everything else

### Integration Points
- `(store)` route group layout needs real header with navigation and cart icon
- Store checkout creates Stripe Checkout Session with line items from cart
- Webhook handler processes `checkout.session.completed` for store orders (new event metadata)
- Admin sidebar needs "Products" and "Orders" navigation items
- Gift card redemption needs integration with booking deposit flow (Phase 3)
- Product images uploaded via Vercel Blob (same as media management)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The store should feel like a natural extension of the public site, not a separate e-commerce platform. Keep it simple and on-brand.

</specifics>

<deferred>
## Deferred Ideas

- Inventory tracking for physical products — not enough volume to justify complexity (per PROJECT.md Out of Scope)
- Product reviews/ratings — MKT-03 in v2 roadmap
- Discount codes (beyond gift cards) — could be added later
- Product bundles — future enhancement
- Subscription boxes — out of scope

</deferred>

---

*Phase: 05-online-store*
*Context gathered: 2026-03-22*
