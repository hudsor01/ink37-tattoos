# Phase 5: Online Store - Research

**Researched:** 2026-03-22
**Domain:** E-commerce (product catalog, cart, Stripe Checkout, gift cards, digital delivery, order management)
**Confidence:** HIGH

## Summary

Phase 5 adds an online store to the Ink37 platform for merchandise, art prints, and gift cards. The existing codebase already provides nearly all the infrastructure needed: Stripe SDK (v20.4.1) with Checkout session creation patterns, Vercel Blob (v2.3.1) for file storage, Resend for email delivery, DataTable for admin management, and the `(store)` route group placeholder.

The primary technical challenges are: (1) designing new Prisma schema models for Product, Order, OrderItem, and GiftCard that integrate with the existing schema; (2) extending the Stripe webhook handler to process store orders distinct from tattoo session payments; (3) implementing a client-side cart with Zustand (following the existing ui-store pattern); and (4) implementing time-limited digital downloads via Vercel Blob's private storage with server-side streaming and a database-tracked download token system.

**Primary recommendation:** Leverage every existing pattern (DAL, Server Actions, DataTable, Stripe Checkout, webhook idempotency, Resend email) and add only the new models, routes, and components needed for the store. The Zustand cart store, gift card code generation via `crypto.randomBytes`, and Vercel Blob private storage streaming route are the only genuinely new patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Products managed via admin dashboard UI -- full CRUD with Stripe Products synced behind the scenes. No Stripe Dashboard management needed.
- **D-02:** Three product types: physical (merch -- shirts, hats, stickers), digital (art prints), and gift cards. Schema needs a `productType` enum.
- **D-03:** Product catalog page uses a clean grid of product cards -- image, name, price. Click opens a detail page. Similar to gallery but simpler.
- **D-04:** Small initial catalog (under 20 products) -- no pagination or search needed. Simple type filter (Merch / Prints / Gift Cards) is sufficient.
- **D-05:** Guest checkout allowed -- no account required to purchase. Stripe Checkout collects email. Maximizes conversion for public-facing store.
- **D-06:** Session-based cart stored in localStorage. No auth needed, works for guest checkout. Cart clears when browser session expires.
- **D-07:** Flat rate shipping for physical items. Simple to implement. Digital items and gift cards have no shipping.
- **D-08:** Checkout goes through Stripe Checkout (hosted page) -- consistent with Phase 3 deposit/balance flow. Cart items become Stripe line items.
- **D-09:** Gift cards redeemable at both store checkout AND tattoo booking deposits. Applied as discount code / promo code.
- **D-10:** Preset denominations: $25, $50, $100, $200, $500. No custom amounts.
- **D-11:** 16-character alphanumeric code format: INK37-XXXX-XXXX-XXXX. Hard to guess, easy to type.
- **D-12:** No expiration -- gift cards never expire. Customer-friendly and legally safe.
- **D-13:** Gift card email includes recipient name, sender name, optional personal message, and the redemption code. Feels like a real gift.
- **D-14:** Gift card has a balance that decrements on use -- partial redemption supported. Remaining balance can be used on future purchases.
- **D-15:** Digital files stored in Vercel Blob -- consistent with existing media uploads. Signed URLs for secure download.
- **D-16:** Time-limited download links -- 72-hour expiry after purchase. Buyer can re-request via email if needed.
- **D-17:** Prints delivered as high-res PNG or JPEG -- standard print-quality formats.
- **D-18:** Store page shows low-res preview images only -- full resolution only after purchase. No watermarking needed.
- **D-19:** Admin order management at `/dashboard/orders` -- reuse DataTable pattern from payments and customers.
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

### Deferred Ideas (OUT OF SCOPE)
- Inventory tracking for physical products -- not enough volume to justify complexity (per PROJECT.md Out of Scope)
- Product reviews/ratings -- MKT-03 in v2 roadmap
- Discount codes (beyond gift cards) -- could be added later
- Product bundles -- future enhancement
- Subscription boxes -- out of scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STORE-01 | Gift card purchase and delivery (email delivery with unique code) | GiftCard schema model, `crypto.randomBytes` for code generation, Resend email templates, Stripe Checkout for purchase, webhook creates GiftCard record |
| STORE-02 | Product catalog for merchandise/prints (Stripe Products + custom UI) | Product schema model with `productType` enum, Stripe Products API sync, product grid component with type filter, detail pages |
| STORE-03 | Shopping cart and Stripe Checkout integration | Zustand cart store with localStorage persistence, Stripe Checkout with multiple line items, shipping_options for physical items, gift card redemption as amount_off coupon |
| STORE-04 | Order management in admin dashboard | Order/OrderItem schema models, DAL with requireStaffRole, DataTable with columns/StatusBadge, order status transitions |
| STORE-05 | Digital product delivery (prints as downloadable files) | Vercel Blob private storage for high-res files, download token system in DB, server-side streaming route with 72-hour expiry, re-request email flow |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 20.4.1 | Payment processing, Products API, Checkout Sessions | Already in use; Stripe Products API for catalog sync |
| @vercel/blob | 2.3.1 | Product images (public) + digital files (private) | Already used for portfolio; private storage for paid content |
| zustand | 5.0.12 | Client-side cart state | Already used for UI store; persist middleware for localStorage |
| resend | 6.9.4 | Gift card delivery, order confirmation emails | Already used for contact/payment emails |
| @tanstack/react-table | 8.21.3 | Admin DataTable for orders and products | Already used for payments table |
| zod | 4.3.6 | Input validation for store schemas | Already used throughout |
| lucide-react | 0.462.0 | Icons for store UI | Already used throughout |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Order date formatting | Already used in payments columns |
| react-hook-form | 7.71.2 | Admin product/gift card forms | Already used with @hookform/resolvers |
| @hookform/resolvers | 5.2.2 | Zod resolver for forms | Already paired with react-hook-form |
| next-themes | 0.4.6 | Theme support in store layout | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand (cart) | React Context | Zustand already in project, persist middleware handles localStorage trivially |
| Custom gift card codes | nanoid | crypto.randomBytes is more secure, no dependency needed, Node.js built-in |
| Stripe Customer Balance (gift cards) | App-level GiftCard table | App-level gives full control over balance, code format, and partial redemption; Stripe coupons limited to one per session |

**Installation:** No new packages required. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (store)/
      layout.tsx                    # Store layout with nav + cart icon
      store/
        page.tsx                    # Product catalog grid with type filter
        [productId]/
          page.tsx                  # Product detail page
        cart/
          page.tsx                  # Cart page (optional, if not using drawer)
        gift-cards/
          page.tsx                  # Gift card purchase page
        checkout/
          success/
            page.tsx               # Order confirmation + download links
          cancelled/
            page.tsx               # Checkout cancelled page
    (dashboard)/
      dashboard/
        products/
          page.tsx                 # Admin product management
          columns.tsx              # DataTable column definitions
          [id]/
            edit/
              page.tsx             # Edit product form
          new/
            page.tsx               # New product form
        orders/
          page.tsx                 # Admin order management
          columns.tsx              # DataTable column definitions
          [id]/
            page.tsx               # Order detail / fulfillment
    api/
      store/
        download/
          route.ts                 # Private blob streaming for digital downloads
      webhooks/
        stripe/
          route.ts                 # Extended: handle store checkout events
  lib/
    dal/
      products.ts                  # Product CRUD DAL
      orders.ts                    # Order management DAL
      gift-cards.ts                # Gift card DAL (create, redeem, check balance)
    actions/
      product-actions.ts           # Admin product CRUD Server Actions
      order-actions.ts             # Admin order status Server Actions
      store-actions.ts             # Store checkout Server Action
      gift-card-actions.ts         # Gift card purchase + redemption Server Actions
    email/
      templates.ts                 # Extended: gift card + order confirmation templates
  stores/
    cart-store.ts                  # Zustand cart with localStorage persistence
  components/
    store/
      product-card.tsx             # Product card for catalog grid
      product-grid.tsx             # Product grid with type filter
      cart-drawer.tsx              # Shopping cart slide-out drawer
      cart-item.tsx                # Individual cart item
      gift-card-form.tsx           # Gift card purchase form
      type-filter.tsx              # Merch / Prints / Gift Cards filter
    dashboard/
      product-form.tsx             # Admin product create/edit form
      order-detail.tsx             # Order detail view
```

### Pattern 1: Zustand Cart Store with localStorage Persistence
**What:** Client-side shopping cart using Zustand with built-in `persist` middleware to save state to localStorage.
**When to use:** Guest checkout where no server-side cart is needed.
**Example:**
```typescript
// Source: Zustand persist docs + existing ui-store.ts pattern
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  name: string;
  price: number;      // in dollars
  quantity: number;
  imageUrl: string;
  productType: 'PHYSICAL' | 'DIGITAL' | 'GIFT_CARD';
  // Gift card specific
  giftCardDenomination?: number;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  personalMessage?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  hasPhysicalItems: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),
      clearCart: () => set({ items: [] }),
      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: () =>
        get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
      hasPhysicalItems: () =>
        get().items.some((i) => i.productType === 'PHYSICAL'),
    }),
    { name: 'ink37-cart' }
  )
);
```

### Pattern 2: Stripe Products Sync on Admin CRUD
**What:** When admin creates/updates a product in the dashboard, a Stripe Product + Price is created/updated behind the scenes. The Stripe Price ID is stored in the Product record for use at checkout.
**When to use:** Product CRUD in admin dashboard.
**Example:**
```typescript
// Source: Stripe Products API docs
import { stripe, dollarsToStripeCents } from '@/lib/stripe';

// Inside product creation Server Action:
const stripeProduct = await stripe.products.create({
  name: product.name,
  description: product.description ?? undefined,
  images: product.imageUrl ? [product.imageUrl] : [],
  metadata: { internalProductId: product.id },
});

const stripePrice = await stripe.prices.create({
  product: stripeProduct.id,
  unit_amount: dollarsToStripeCents(product.price),
  currency: 'usd',
});

// Store stripeProductId and stripePriceId on the Product record
```

### Pattern 3: Multi-Line-Item Checkout with Conditional Shipping
**What:** Cart items become Stripe line items. Physical items trigger shipping_options; digital-only carts skip shipping.
**When to use:** Store checkout action.
**Example:**
```typescript
// Source: Stripe Checkout Sessions API docs
const lineItems = cartItems.map((item) => ({
  price: item.stripePriceId, // Use stored Stripe Price ID
  quantity: item.quantity,
}));

const sessionParams: Stripe.Checkout.SessionCreateParams = {
  mode: 'payment',
  line_items: lineItems,
  metadata: {
    orderType: 'store',
    // serialized cart info for webhook
  },
  success_url: `${env.NEXT_PUBLIC_APP_URL}/store/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/checkout/cancelled`,
};

// Only add shipping for physical items
if (hasPhysicalItems) {
  sessionParams.shipping_address_collection = {
    allowed_countries: ['US'],
  };
  sessionParams.shipping_options = [
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 799, currency: 'usd' },
        display_name: 'Standard Shipping',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 5 },
          maximum: { unit: 'business_day', value: 7 },
        },
      },
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 0, currency: 'usd' },
        display_name: 'Free Shipping (orders over $50)',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 7 },
          maximum: { unit: 'business_day', value: 10 },
        },
      },
    },
  ];
}

// Apply gift card as amount_off coupon if provided
if (giftCardCode) {
  const giftCard = await validateGiftCard(giftCardCode);
  if (giftCard) {
    const coupon = await stripe.coupons.create({
      amount_off: dollarsToStripeCents(
        Math.min(giftCard.balance, cartTotal)
      ),
      currency: 'usd',
      duration: 'once',
      name: `Gift Card ${giftCardCode}`,
    });
    sessionParams.discounts = [{ coupon: coupon.id }];
  }
}

const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
```

### Pattern 4: Gift Card Code Generation
**What:** Cryptographically secure code in INK37-XXXX-XXXX-XXXX format using Node.js built-in crypto.
**When to use:** Gift card purchase webhook handler.
**Example:**
```typescript
// Source: Node.js crypto docs
import { randomBytes } from 'node:crypto';

export function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes I/O/0/1 for readability
  const bytes = randomBytes(12);
  const segments: string[] = [];

  for (let seg = 0; seg < 3; seg++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars[bytes[seg * 4 + i] % chars.length];
    }
    segments.push(segment);
  }

  return `INK37-${segments.join('-')}`;
}
```

### Pattern 5: Digital Download via Vercel Blob Private Storage
**What:** High-res files stored in Vercel Blob private store. Downloads gated by a time-limited token stored in the database.
**When to use:** Serving purchased digital prints.
**Example:**
```typescript
// Source: Vercel Blob Private Storage docs (verified 2026-03-22)
// Route: src/app/api/store/download/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // Verify download token exists and is not expired
  const downloadToken = await db.downloadToken.findUnique({
    where: { token },
    include: { orderItem: { include: { product: true } } },
  });

  if (!downloadToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  if (downloadToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Download link expired' }, { status: 410 });
  }

  // Stream file from private Vercel Blob
  const result = await get(downloadToken.orderItem.product.digitalFilePathname!, {
    access: 'private',
  });

  if (result?.statusCode !== 200) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Increment download count
  await db.downloadToken.update({
    where: { token },
    data: { downloadCount: { increment: 1 } },
  });

  const filename = downloadToken.orderItem.product.digitalFileName ?? 'print.png';
  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
```

### Anti-Patterns to Avoid
- **Don't store cart state on the server:** D-06 mandates localStorage. Server-side cart adds auth requirements and complexity for no benefit with <20 products.
- **Don't use Stripe's built-in promotion codes for gift cards:** `allow_promotion_codes: true` means Stripe manages codes -- app loses control of balance, partial redemption, and the INK37 code format. Manage gift card codes in the database and apply as one-time Stripe coupon at checkout.
- **Don't use Vercel Blob `access: 'public'` for digital downloads:** Public URLs never expire. High-res files must use private storage with authenticated server-side streaming.
- **Don't create Stripe Products at checkout time:** Sync products to Stripe when admin creates/updates them. Store the `stripePriceId` so checkout only needs to reference it.
- **Don't hand-roll download URL signing:** Use a database token table with expiry timestamps instead of JWT or HMAC URL signing. Simpler, revocable, and trackable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment processing | Custom card form or PaymentIntent flow | Stripe Checkout (hosted) | PCI compliance, built-in address collection, receipt emails |
| Shopping cart persistence | Custom localStorage wrapper | Zustand `persist` middleware | Already in project, handles serialization, rehydration, SSR edge cases |
| Gift card code generation | Math.random or UUID substring | `crypto.randomBytes` | Cryptographically secure, prevents guessing attacks on gift card balances |
| Email delivery | Custom SMTP or sendgrid | Resend (already configured) | Already set up with FROM_EMAIL, error handling, templates |
| Data tables | Custom table with sorting/filtering | TanStack Table + DataTable component | Already built and used for payments, customers, etc. |
| File upload | Custom multipart handler | Vercel Blob `put()` | Already configured with upload route, size/type validation |
| Input validation | Manual checks | Zod schemas | Already used everywhere, type inference, error messages |
| Shipping rate calculation | Custom shipping logic | Stripe Checkout `shipping_options` with `shipping_rate_data` | Built-in to checkout flow, handles display and tax implications |

**Key insight:** This phase has zero new packages to install. Every building block exists in the project already. The work is connecting existing infrastructure to new domain models.

## Common Pitfalls

### Pitfall 1: Webhook Handler Not Distinguishing Store Orders from Tattoo Payments
**What goes wrong:** The existing `handleCheckoutCompleted` function looks for `tattooSessionId` in metadata. Store orders will not have this field, causing either errors or silent failures.
**Why it happens:** The webhook handler was written for Phase 3 payments only.
**How to avoid:** Add an `orderType` field to Stripe Checkout session metadata. In `handleCheckoutCompleted`, branch on `metadata.orderType === 'store'` vs the existing tattoo payment logic. Each path has its own handler function.
**Warning signs:** Orders stuck in PENDING status after successful Stripe payment.

### Pitfall 2: Gift Card Balance Race Conditions
**What goes wrong:** Two simultaneous requests redeem the same gift card, resulting in a negative balance (double-spend).
**Why it happens:** Read-then-write pattern without database-level locking.
**How to avoid:** Use an atomic Prisma `update` with a `where` clause that checks the balance is sufficient: `where: { code, balance: { gte: redeemAmount } }`. If no row matches, the gift card lacks sufficient funds.
**Warning signs:** Gift card balance going negative; more total redemptions than original value.

### Pitfall 3: Vercel Blob Private Storage Requires Separate Store
**What goes wrong:** Trying to use `access: 'private'` on the existing public blob store fails -- the store access mode is set at creation time.
**Why it happens:** The existing upload route uses `access: 'public'` for portfolio images. Private files need a private blob store.
**How to avoid:** Create a second Vercel Blob store with `--access private` for digital product files. Use a separate `BLOB_PRIVATE_READ_WRITE_TOKEN` env var. Product preview images stay in the existing public store.
**Warning signs:** 403 errors when trying to upload with `access: 'private'` to a public store.

### Pitfall 4: Stripe Price Immutability
**What goes wrong:** Admin updates product price, code tries to update the Stripe Price, but Stripe Prices are immutable.
**Why it happens:** Stripe's pricing model: Prices are created once, never modified.
**How to avoid:** When price changes, create a new Stripe Price and archive the old one. Update the `stripePriceId` in the Product record. The old Price remains valid for any in-progress checkout sessions.
**Warning signs:** Stripe API error "This price cannot be modified."

### Pitfall 5: Cart Hydration Mismatch in SSR
**What goes wrong:** Server renders cart icon with 0 items; client hydrates with localStorage cart contents. React hydration mismatch warning.
**Why it happens:** localStorage is only available on the client; server always sees empty cart.
**How to avoid:** Use Zustand's `onRehydrateStorage` callback or render cart count only after mount with `useEffect`. The Zustand persist middleware has a `skipHydration` option that can be used to defer hydration.
**Warning signs:** React hydration mismatch warnings in console; cart count flickers from 0 to actual count.

### Pitfall 6: Gift Card Applied at Checkout but Order Fails
**What goes wrong:** Gift card balance is decremented before Stripe payment completes, but the payment fails. Gift card balance is now wrong.
**Why it happens:** Decrementing the balance in the checkout action rather than in the webhook handler.
**How to avoid:** Create the Stripe coupon in the checkout action (to show the discount on the hosted page) but only decrement the gift card balance in the webhook handler when `checkout.session.completed` fires. If payment fails, the one-time coupon is unused and the gift card balance is untouched.
**Warning signs:** Gift card balance decremented but no corresponding order exists.

## Code Examples

Verified patterns from the existing codebase and official documentation:

### Prisma Schema Extensions
```prisma
// New enums
enum ProductType {
  PHYSICAL
  DIGITAL
  GIFT_CARD
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

// New models
model Product {
  id                    String      @id @default(uuid())
  name                  String
  description           String?
  price                 Decimal
  productType           ProductType
  imageUrl              String?           // public blob URL for preview
  digitalFilePathname   String?           // private blob pathname for high-res
  digitalFileName       String?           // original filename for download
  stripeProductId       String?   @unique
  stripePriceId         String?   @unique
  isActive              Boolean   @default(true)
  sortOrder             Int       @default(0)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  orderItems OrderItem[]

  @@index([productType])
  @@index([isActive])
  @@index([isActive, productType])
  @@map("product")
}

model Order {
  id                      String      @id @default(uuid())
  email                   String
  status                  OrderStatus @default(PENDING)
  subtotal                Decimal
  shippingAmount          Decimal     @default(0)
  discountAmount          Decimal     @default(0)
  total                   Decimal
  stripeCheckoutSessionId String?     @unique
  stripePaymentIntentId   String?
  shippingName            String?
  shippingAddress         String?
  shippingCity            String?
  shippingState           String?
  shippingPostalCode      String?
  shippingCountry         String?
  giftCardCode            String?     // gift card used, if any
  notes                   String?
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt

  items          OrderItem[]
  downloadTokens DownloadToken[]

  @@index([email])
  @@index([status])
  @@index([createdAt])
  @@index([stripeCheckoutSessionId])
  @@map("order")
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  productId   String
  productName String  // snapshot at time of purchase
  quantity    Int
  unitPrice   Decimal // snapshot at time of purchase
  totalPrice  Decimal

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  downloadTokens DownloadToken[]

  @@index([orderId])
  @@index([productId])
  @@map("order_item")
}

model GiftCard {
  id              String    @id @default(uuid())
  code            String    @unique
  initialBalance  Decimal
  balance         Decimal
  purchaserEmail  String
  recipientEmail  String
  recipientName   String?
  senderName      String?
  personalMessage String?
  orderId         String?   // link to the purchase order
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([code])
  @@index([recipientEmail])
  @@index([purchaserEmail])
  @@map("gift_card")
}

model DownloadToken {
  id            String   @id @default(uuid())
  token         String   @unique
  orderId       String
  orderItemId   String
  downloadCount Int      @default(0)
  maxDownloads  Int      @default(5)
  expiresAt     DateTime
  createdAt     DateTime @default(now())

  order     Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderItem OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([expiresAt])
  @@map("download_token")
}
```

### Extended Webhook Handler Pattern
```typescript
// Source: Existing src/app/api/webhooks/stripe/route.ts + Stripe docs
// In the switch statement, add:
case 'checkout.session.completed':
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.orderType === 'store') {
    await handleStoreCheckoutCompleted(session);
  } else {
    await handleCheckoutCompleted(session);
  }
  break;

// New handler for store orders:
async function handleStoreCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  // Retrieve line items from Stripe
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

  // Atomically update order status and process gift cards / download tokens
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        stripePaymentIntentId: session.payment_intent as string,
      },
    });

    // Decrement gift card balance if used
    const giftCardCode = session.metadata?.giftCardCode;
    if (giftCardCode) {
      const discountAmount = Number(session.metadata?.discountAmount ?? 0);
      await tx.giftCard.update({
        where: { code: giftCardCode, balance: { gte: discountAmount } },
        data: { balance: { decrement: discountAmount } },
      });
    }

    // Create gift cards for any gift card items purchased
    // Create download tokens for any digital items purchased
    // ... (handled in order fulfillment logic)
  });
}
```

### Extending StatusBadge
```typescript
// Add to existing statusColors in src/components/dashboard/status-badge.tsx:
PAID: 'bg-green-100 text-green-800',
SHIPPED: 'bg-blue-100 text-blue-800',
DELIVERED: 'bg-green-100 text-green-800',
// PENDING, CANCELLED, REFUNDED already exist
```

### Admin Nav Extension
```typescript
// Add to navItems in src/components/dashboard/admin-nav.tsx:
import { Package, ShoppingBag } from 'lucide-react';

// After Payments entry:
{ label: 'Products', href: '/dashboard/products', icon: Package },
{ label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Charges API | Stripe Checkout Sessions | 2019+ | Use Checkout for hosted page; no custom card forms needed |
| S3 presigned URLs | Vercel Blob private storage | Feb 2026 | Private blob requires server-side streaming instead of signed URLs |
| Custom e-commerce carts | Zustand with persist middleware | Zustand 5.x | Built-in localStorage persistence replaces manual serialization |
| Stripe Amount-based coupons only | Stripe Coupons + dynamic discounts | 2025+ | One-time amount_off coupons work well for gift card integration |
| `allow_promotion_codes` (Stripe-managed) | `discounts: [{ coupon }]` (app-managed) | Ongoing | App-managed coupons give control over gift card balance tracking |

**Deprecated/outdated:**
- Stripe Charges API: Replaced by Checkout Sessions and PaymentIntents
- Vercel Blob signed URLs: Never shipped. Private storage with server streaming is the official pattern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STORE-01 | Gift card code generation produces valid format | unit | `npx vitest run src/__tests__/gift-card.test.ts -t "generates valid code" --reporter=verbose` | Wave 0 |
| STORE-01 | Gift card purchase creates record with correct balance | unit | `npx vitest run src/__tests__/gift-card.test.ts -t "purchase" --reporter=verbose` | Wave 0 |
| STORE-02 | Product schema validates all three product types | unit | `npx vitest run src/__tests__/store-validation.test.ts -t "product" --reporter=verbose` | Wave 0 |
| STORE-03 | Cart store add/remove/update/clear operations | unit | `npx vitest run src/__tests__/cart-store.test.ts --reporter=verbose` | Wave 0 |
| STORE-03 | Store checkout action creates Stripe session with line items | unit | `npx vitest run src/__tests__/store-checkout.test.ts --reporter=verbose` | Wave 0 |
| STORE-04 | Order status transitions (PENDING->PAID->SHIPPED->DELIVERED) | unit | `npx vitest run src/__tests__/order-status.test.ts --reporter=verbose` | Wave 0 |
| STORE-05 | Download token validates expiry and returns 410 for expired | unit | `npx vitest run src/__tests__/download-token.test.ts --reporter=verbose` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/gift-card.test.ts` -- covers STORE-01 (code generation, balance ops)
- [ ] `src/__tests__/store-validation.test.ts` -- covers STORE-02 (Zod schemas for product, order, gift card)
- [ ] `src/__tests__/cart-store.test.ts` -- covers STORE-03 (Zustand cart operations)
- [ ] `src/__tests__/store-checkout.test.ts` -- covers STORE-03 (checkout action validation)
- [ ] `src/__tests__/order-status.test.ts` -- covers STORE-04 (status transition logic)
- [ ] `src/__tests__/download-token.test.ts` -- covers STORE-05 (token validation, expiry)

## Open Questions

1. **Private Blob Store Configuration**
   - What we know: Vercel Blob private storage requires a separate blob store created with `--access private` and a distinct `BLOB_READ_WRITE_TOKEN`.
   - What's unclear: Whether the existing project already has a private store configured, or if one needs to be created via Vercel dashboard/CLI.
   - Recommendation: Plan includes a setup task to verify/create the private blob store and add the `BLOB_PRIVATE_READ_WRITE_TOKEN` env var.

2. **Gift Card Redemption at Booking Deposits**
   - What we know: D-09 says gift cards are redeemable at both store checkout AND tattoo booking deposits. The Phase 3 deposit flow currently does not support discount codes.
   - What's unclear: The exact UX for entering a gift card code during the existing booking deposit flow.
   - Recommendation: Add a gift card code input field to the payment request flow. When creating the Stripe Checkout session for a deposit, apply the gift card as a one-time coupon the same way as store checkout. Decrement balance in the webhook.

3. **Flat Shipping Rate Amount**
   - What we know: D-07 says flat rate shipping. Context notes "Claude's discretion" for the amount and free shipping threshold.
   - What's unclear: What the studio considers reasonable.
   - Recommendation: $7.99 flat rate for standard shipping (5-7 business days). Free shipping on orders over $50. These are easy to adjust in code later.

## Sources

### Primary (HIGH confidence)
- Stripe API Reference -- [Checkout Sessions Create](https://docs.stripe.com/api/checkout/sessions/create?lang=node) -- line items, shipping_options, discounts
- Stripe API Reference -- [Products Create](https://docs.stripe.com/api/products/create) -- product sync pattern
- Stripe API Reference -- [Prices Create](https://docs.stripe.com/api/prices/create) -- immutable prices, archiving
- Stripe Docs -- [Charge for Shipping](https://docs.stripe.com/payments/during-payment/charge-shipping) -- shipping_rate_data inline pattern
- Stripe Docs -- [Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons) -- amount_off coupon for gift cards
- Vercel Docs -- [Blob Private Storage](https://vercel.com/docs/vercel-blob/private-storage) -- server-side streaming, `get()` with `access: 'private'`
- Node.js Docs -- [crypto.randomBytes](https://nodejs.org/api/crypto.html) -- secure code generation

### Secondary (MEDIUM confidence)
- Stripe Docs -- [Add Discounts](https://docs.stripe.com/payments/advanced/discounts) -- applying coupons to checkout sessions
- Vercel Storage GitHub -- [Issue #544 (Signed URLs)](https://github.com/vercel/storage/issues/544) -- confirms no native signed URL support
- Vercel Changelog -- [Private Storage Beta](https://vercel.com/changelog/private-storage-for-vercel-blob-now-available-in-public-beta) -- confirmed Feb 2026 availability

### Tertiary (LOW confidence)
- None. All findings verified against official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use; verified versions match npm registry
- Architecture: HIGH -- patterns directly extend existing codebase patterns (DAL, Server Actions, DataTable, Webhook, Zustand store)
- Pitfalls: HIGH -- each pitfall identified from real codebase analysis (webhook branching, Stripe Price immutability, Blob store access modes, hydration issues)
- Gift card mechanics: HIGH -- Stripe coupon approach verified against official docs; app-managed balance gives full control
- Digital delivery: HIGH -- Vercel Blob private storage pattern verified against official docs (Feb 2026 release)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable domain; Stripe/Vercel APIs well-established)
