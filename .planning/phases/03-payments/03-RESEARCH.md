# Phase 3: Payments - Research

**Researched:** 2026-03-21
**Domain:** Stripe payments integration (Checkout Sessions, webhooks, admin payment management)
**Confidence:** HIGH

## Summary

Phase 3 adds Stripe payment processing to the existing tattoo studio platform. The integration uses Stripe Checkout (hosted pages) for PCI-compliant payment collection, with an admin-initiated flow where staff trigger deposit requests after booking review and balance payment requests after sessions. Webhook handling at `/api/webhooks/stripe` processes payment events idempotently, and the admin dashboard gets a new payments section for tracking all transactions.

The codebase already has strong patterns to follow: DAL with `requireStaffRole` auth checks, Server Actions with Zod validation and audit logging, Resend email service, DataTable component, StatusBadge, KPICard, and a well-structured middleware that only guards `/dashboard` routes (webhooks are unaffected since they live at `/api/webhooks/stripe`, outside the middleware matcher). The existing `TattooSession` model already tracks `depositAmount`, `totalCost`, and `paidAmount` as Decimal fields, so the new `Payment` model serves as the transaction ledger while session-level totals remain the source of truth.

**Primary recommendation:** Use `stripe@20.4.1` with Stripe Checkout (hosted redirect mode). Create Stripe Customer objects lazily on first payment and store the `stripeCustomerId` on the Customer model. Process all payment state changes through webhooks, never trust redirect callbacks alone. Use `price_data` with inline amounts (not pre-created Price objects) since tattoo pricing is custom per session.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Separate `Payment` model linked to `TattooSession` and `Customer` -- clean separation, supports multiple payments per session (deposit + balance), full audit trail
- **D-02:** Store `stripePaymentIntentId` on Payment model for reconciliation with Stripe
- **D-03:** Add `stripeCustomerId` to Customer model -- link Stripe Customer to local Customer to avoid creating duplicate Stripe customers
- **D-04:** Payment statuses: PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED -- mirror Stripe payment intent states
- **D-05:** Payment types: DEPOSIT, SESSION_BALANCE, REFUND -- distinguish payment purpose
- **D-06:** Existing TattooSession fields (`depositAmount`, `totalCost`, `paidAmount`) continue to be the source of truth for session-level totals; Payment records are the transaction ledger
- **D-07:** Use Stripe Checkout (hosted page), not Stripe Elements -- faster implementation, PCI compliance fully handled by Stripe, mobile-optimized
- **D-08:** Admin triggers deposit request from dashboard after reviewing booking -- not automatic on client submission (artist reviews first)
- **D-09:** Admin triggers balance payment request after session -- client receives payment link via email (Resend), pays via Stripe Checkout
- **D-10:** No inline payment forms in this phase -- all payments go through Stripe-hosted checkout pages
- **D-11:** Route Handler at `/api/webhooks/stripe` -- per CLAUDE.md convention (Route Handlers for webhooks only)
- **D-12:** Idempotency via storing Stripe event ID with unique constraint -- skip duplicate events at database level
- **D-13:** Verify Stripe webhook signature with raw body parsing (SEC-05 requirement)
- **D-14:** Handle events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- **D-15:** Update Payment status and TattooSession.paidAmount atomically in a transaction
- **D-16:** Use Stripe-hosted receipt URLs -- no custom PDF generation. Stripe provides receipt links for completed charges.
- **D-17:** Admin payment history table: date, customer, session, amount, type (deposit/balance), status, receipt link
- **D-18:** Payment history is a new dashboard section at `/dashboard/payments`

### Claude's Discretion
- Stripe SDK version selection and initialization pattern
- Exact Prisma migration for Payment model (field types, indexes)
- Error handling and retry logic for Stripe API calls
- Email template for payment request notifications
- Payment history table column design and filtering options
- Whether to add payment summary to existing dashboard KPIs

### Deferred Ideas (OUT OF SCOPE)
- Client self-service payment from portal -- Phase 4 (PORT-05)
- Store checkout with cart -- Phase 5 (STORE-03)
- Recurring payments / subscription billing -- not in current roadmap
- Tip/gratuity at checkout -- not in requirements, add to backlog if desired
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | Stripe integration for deposit collection on booking confirmation | Stripe Checkout Sessions with `price_data` for custom amounts, admin-initiated flow with payment link email |
| PAY-02 | Session payment processing (full payment or remaining balance) | Same Checkout flow, calculate remaining balance from `totalCost - paidAmount`, `price_data.unit_amount` in cents |
| PAY-03 | Payment history and status tracking in admin dashboard | Payment model with DAL queries, DataTable component reuse, StatusBadge for payment statuses, KPICard for revenue metrics |
| PAY-04 | Stripe webhook handling for payment events (success, failure, refund) | Route Handler at `/api/webhooks/stripe`, `request.text()` for raw body, `stripe.webhooks.constructEvent()`, idempotent event processing via unique Stripe event ID |
| PAY-05 | Receipt/invoice generation for completed payments | Stripe-hosted `receipt_url` retrieved from Charge object via PaymentIntent `latest_charge`, stored on Payment record |
| SEC-05 | Stripe webhook signature verification | `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)` with HMAC-SHA256 verification, 5-minute timestamp tolerance |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 20.4.1 | Stripe Node.js SDK | Official SDK, TypeScript native, API version pinning, webhook signature verification built-in |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| resend | 6.9.4 | Email delivery | Payment request emails to clients (deposit link, balance link) |
| zod | 4.3.6 | Validation | Payment-related Zod schemas for Server Action inputs |
| @tanstack/react-table | 8.21.3 | Table UI | Payment history table (DataTable component already exists) |
| prisma | 7.5.0 | ORM | Payment model, migrations, interactive transactions |
| lucide-react | 0.462.0 | Icons | CreditCard, DollarSign, Receipt icons for payment UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Stripe Elements (embedded) | Elements gives full UI control but requires PCI SAQ-A-EP; Checkout handles all compliance -- use Checkout per D-07 |
| `price_data` (inline amounts) | Pre-created Stripe Price objects | Tattoo pricing is unique per session; `price_data` avoids managing a product catalog in Stripe |
| `payment_intent_data.receipt_email` | Custom PDF receipts | Stripe receipts are auto-generated, always up-to-date with refunds, and free -- per D-16 |

**Installation:**
```bash
npm install stripe@20.4.1
```

**Version verification:** `stripe@20.4.1` confirmed via npm registry on 2026-03-21. Resend 6.9.4 already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    stripe.ts                    # Stripe client initialization (server-only)
    dal/
      payments.ts                # Payment DAL (queries + mutations with auth)
    actions/
      payment-actions.ts         # Server Actions (create checkout, request payment)
    email/
      templates.ts               # Add payment request email templates
  app/
    api/
      webhooks/
        stripe/
          route.ts               # Webhook Route Handler (signature verification)
    (dashboard)/
      dashboard/
        payments/
          page.tsx               # Payment history page
          columns.tsx            # DataTable column definitions
          payment-actions-menu.tsx  # Row action dropdown (view receipt, request refund)
  components/
    dashboard/
      request-payment-dialog.tsx # Dialog for admin to trigger deposit/balance request
```

### Pattern 1: Stripe Client Initialization
**What:** Server-only Stripe client with pinned API version
**When to use:** All server-side Stripe operations
**Example:**
```typescript
// src/lib/stripe.ts
import 'server-only';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-18.acacia',
  typescript: true,
});
```
Source: Stripe SDK docs -- pin to a stable API version (not necessarily the latest bleeding-edge version). The `2025-12-18.acacia` version is a well-tested stable release. The SDK handles TypeScript types for this version automatically.

### Pattern 2: Admin-Initiated Payment Flow (Server Action)
**What:** Admin triggers a Checkout Session, client receives payment link via email
**When to use:** Deposit requests after booking review, balance requests after session
**Example:**
```typescript
// src/lib/actions/payment-actions.ts
'use server';

import { stripe } from '@/lib/stripe';
import { createPaymentRecord } from '@/lib/dal/payments';
import { getSessionById } from '@/lib/dal/sessions';
import { getOrCreateStripeCustomer } from '@/lib/dal/payments';
import { sendPaymentRequestEmail } from '@/lib/email/resend';
import { RequestPaymentSchema } from '@/lib/security/validation';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { headers } from 'next/headers';

export async function requestDepositAction(formData: FormData) {
  const authSession = await getCurrentSession();
  if (!authSession?.user) throw new Error('Unauthorized');

  const validated = RequestPaymentSchema.parse({
    sessionId: formData.get('sessionId'),
    amount: Number(formData.get('amount')),
  });

  const tattooSession = await getSessionById(validated.sessionId);
  if (!tattooSession) throw new Error('Session not found');

  // Get or create Stripe Customer
  const stripeCustomerId = await getOrCreateStripeCustomer(
    tattooSession.customer
  );

  // Create Stripe Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tattoo Deposit - ${tattooSession.designDescription}`,
          },
          unit_amount: Math.round(validated.amount * 100), // Dollars to cents
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      receipt_email: tattooSession.customer.email ?? undefined,
      metadata: {
        tattooSessionId: tattooSession.id,
        paymentType: 'DEPOSIT',
        customerId: tattooSession.customerId,
      },
    },
    metadata: {
      tattooSessionId: tattooSession.id,
      paymentType: 'DEPOSIT',
      customerId: tattooSession.customerId,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancelled`,
  });

  // Create PENDING payment record
  await createPaymentRecord({
    customerId: tattooSession.customerId,
    tattooSessionId: tattooSession.id,
    type: 'DEPOSIT',
    amount: validated.amount,
    stripeCheckoutSessionId: checkoutSession.id,
  });

  // Send payment link email to client
  if (tattooSession.customer.email) {
    await sendPaymentRequestEmail({
      to: tattooSession.customer.email,
      customerName: `${tattooSession.customer.firstName} ${tattooSession.customer.lastName}`,
      amount: validated.amount,
      type: 'deposit',
      paymentUrl: checkoutSession.url!,
    });
  }

  // Audit log
  const hdrs = await headers();
  logAudit({
    userId: authSession.user.id,
    action: 'CREATE',
    resource: 'payment',
    resourceId: checkoutSession.id,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: {
      type: 'DEPOSIT',
      amount: validated.amount,
      tattooSessionId: tattooSession.id,
    },
  }).catch(() => {});

  return { success: true, checkoutUrl: checkoutSession.url };
}
```

### Pattern 3: Webhook Route Handler with Signature Verification
**What:** Route Handler that verifies Stripe webhook signatures and processes events idempotently
**When to use:** The single webhook endpoint at `/api/webhooks/stripe`
**Example:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text(); // Raw body for signature verification
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency: check if event already processed
  const existingEvent = await db.stripeEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
    }

    // Mark event as processed
    await db.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        processedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```
Source: Stripe webhook docs. Key detail -- use `request.text()` in Next.js App Router to get raw body (the Web Request API does not auto-parse). The middleware matcher only covers `/dashboard/:path*`, so `/api/webhooks/stripe` is NOT intercepted by auth middleware.

### Pattern 4: Atomic Payment + Session Update (Interactive Transaction)
**What:** Update Payment status and TattooSession.paidAmount atomically
**When to use:** Inside webhook handlers when payment succeeds
**Example:**
```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { tattooSessionId, paymentType, customerId } = session.metadata!;

  // Retrieve receipt URL from charge
  const paymentIntent = await stripe.paymentIntents.retrieve(
    session.payment_intent as string
  );
  const charge = await stripe.charges.retrieve(
    paymentIntent.latest_charge as string
  );
  const receiptUrl = charge.receipt_url;

  const amountInDollars = (session.amount_total ?? 0) / 100;

  // Atomic transaction: update payment + session totals
  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { stripeCheckoutSessionId: session.id },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: session.payment_intent as string,
        receiptUrl,
        completedAt: new Date(),
      },
    });

    await tx.tattooSession.update({
      where: { id: tattooSessionId },
      data: {
        paidAmount: { increment: amountInDollars },
      },
    });
  });
}
```
Source: Prisma interactive transactions docs. `increment` works on Decimal fields and prevents race conditions compared to read-modify-write.

### Anti-Patterns to Avoid
- **Trusting redirect callbacks for fulfillment:** Never mark a payment as complete based on the success_url redirect. The user can close their browser before the redirect. Always use webhooks for payment confirmation.
- **Parsing webhook body as JSON before signature verification:** Must use `request.text()` to get the raw body. If you call `request.json()` first, the signature verification will fail because the body gets re-serialized differently.
- **Creating Stripe Customers on every checkout:** Check if `customer.stripeCustomerId` exists first. Create once, reuse forever. This prevents duplicate Stripe Customer objects.
- **Storing amounts as floats:** Stripe uses integers (cents). Prisma uses Decimal. Convert carefully: `Math.round(decimalAmount * 100)` for Stripe, `amountCents / 100` for database. Never use `parseFloat` for money.
- **Blocking webhook responses with long operations:** Return 200 quickly. Stripe retries if no response within 20 seconds. If processing is complex, acknowledge first, process async.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form UI | Custom card input fields | Stripe Checkout (hosted) | PCI compliance, 3DS handling, mobile optimization, localization -- all handled |
| Receipt generation | Custom PDF/HTML receipts | `charge.receipt_url` from Stripe | Auto-updates with refunds, always current, Stripe maintains the infrastructure |
| Webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent()` | Handles timestamp tolerance, signature scheme versions, replay attack prevention |
| Idempotent event processing | Custom deduplication logic | Unique constraint on Stripe event ID | Database-level uniqueness is the simplest and most reliable approach |
| Currency formatting | Custom number formatting | `Intl.NumberFormat` | Handles locale-specific currency display correctly |
| Retry logic for failed webhooks | Custom retry queue | Stripe's built-in retry (3 days, exponential backoff) | Stripe retries automatically; just make your handler idempotent |

**Key insight:** Stripe Checkout offloads the entire PCI-compliance burden. Any custom payment form requires PCI SAQ-A-EP compliance which is significantly more complex. The admin-initiated flow (generate link, email to client, client pays on Stripe) is the simplest secure pattern.

## Common Pitfalls

### Pitfall 1: Webhook Body Parsing Breaks Signature Verification
**What goes wrong:** `stripe.webhooks.constructEvent()` fails with "No signatures found matching the expected signature for payload" even though the webhook secret is correct.
**Why it happens:** In Next.js App Router, calling `request.json()` before `request.text()` consumes the body stream. Or using a middleware/body parser that transforms the raw bytes. The HMAC signature is computed against the exact raw bytes Stripe sent.
**How to avoid:** Always call `request.text()` first. Never add body-parsing middleware to the webhook route. The App Router's `Request` object provides raw access via `.text()`.
**Warning signs:** Webhooks work locally with Stripe CLI but fail in production (different body handling in deployed environment).

### Pitfall 2: Dollar-Cent Conversion Errors
**What goes wrong:** Customer is charged $100 instead of $1.00, or $0.01 instead of $10.00.
**Why it happens:** Stripe's `unit_amount` is in cents (integer). The Prisma schema stores `Decimal` in dollars. Mixing up the conversion direction or using floating-point math introduces rounding errors.
**How to avoid:** Use `Math.round(decimalDollars * 100)` when sending to Stripe. Use `stripeCents / 100` when storing from Stripe. Create helper functions: `dollarsToStripeCents(amount: number): number` and `stripeCentsToDollars(cents: number): number`. Never use `parseFloat` for money.
**Warning signs:** Payment amounts in Stripe dashboard don't match admin dashboard amounts.

### Pitfall 3: Duplicate Stripe Customers
**What goes wrong:** The same customer has multiple Stripe Customer objects, leading to fragmented payment history in Stripe's dashboard.
**Why it happens:** Creating a new Stripe Customer on every checkout instead of checking for an existing `stripeCustomerId` on the Customer model.
**How to avoid:** Implement `getOrCreateStripeCustomer(customer)`: check `customer.stripeCustomerId` first, only call `stripe.customers.create()` if null, then save the returned ID back to the Customer record.
**Warning signs:** Multiple customer records in Stripe dashboard for the same email.

### Pitfall 4: Non-Idempotent Webhook Handlers
**What goes wrong:** Double-charging or double-crediting because the same webhook event is processed twice.
**Why it happens:** Stripe retries failed webhook deliveries (up to 3 days in live mode). Network issues can cause Stripe to retry even if your handler succeeded but responded slowly.
**How to avoid:** Store Stripe event IDs in a `StripeEvent` table with a unique constraint. Check for existing event before processing. Use database transactions so the event record and payment update are atomic.
**Warning signs:** `paidAmount` on a session exceeds `totalCost`, or duplicate Payment records for the same Stripe event.

### Pitfall 5: Webhook Route Blocked by Auth Middleware
**What goes wrong:** Stripe webhook POST requests get redirected to `/login` and return HTML instead of processing the payment event.
**Why it happens:** Middleware intercepts the webhook route and checks for auth cookies that Stripe requests don't have.
**How to avoid:** The current middleware matcher is `['/dashboard/:path*']` which does NOT match `/api/webhooks/stripe`. Verify this stays true. If middleware is ever broadened, explicitly exclude webhook routes.
**Warning signs:** Stripe dashboard shows webhook deliveries getting 302/307 redirects or 200 with HTML response bodies.

### Pitfall 6: Missing Environment Variables in Production
**What goes wrong:** Stripe operations fail silently or crash on deploy because `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` are not set.
**Why it happens:** Keys added to local `.env` but not added to Vercel environment variables.
**How to avoid:** Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the Zod env schema in `src/lib/env.ts`. Make them required (not optional). The app will fail fast at startup if they're missing, not silently at checkout time.
**Warning signs:** App deploys fine but payment operations return 500 errors.

## Code Examples

### Stripe Client Initialization
```typescript
// src/lib/stripe.ts
import 'server-only';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-18.acacia',
  typescript: true,
});
```
Source: Stripe Node.js SDK docs. Use `server-only` import to prevent accidental client-side usage (would leak the secret key).

### Payment Model (Prisma Schema Addition)
```prisma
model Payment {
  id                       String        @id @default(uuid())
  customerId               String
  tattooSessionId          String
  type                     PaymentType
  status                   PaymentStatus @default(PENDING)
  amount                   Decimal
  stripeCheckoutSessionId  String?
  stripePaymentIntentId    String?
  receiptUrl               String?
  notes                    String?
  createdAt                DateTime      @default(now())
  updatedAt                DateTime      @updatedAt
  completedAt              DateTime?

  customer      Customer     @relation(fields: [customerId], references: [id])
  tattooSession TattooSession @relation(fields: [tattooSessionId], references: [id])

  @@index([customerId])
  @@index([tattooSessionId])
  @@index([status])
  @@index([type])
  @@index([createdAt])
  @@index([stripePaymentIntentId])
  @@map("payment")
}

model StripeEvent {
  id            String   @id @default(uuid())
  stripeEventId String   @unique
  type          String
  processedAt   DateTime @default(now())

  @@index([stripeEventId])
  @@map("stripe_event")
}

enum PaymentType {
  DEPOSIT
  SESSION_BALANCE
  REFUND
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}
```
Note: Customer model needs `stripeCustomerId String?` field added. TattooSession needs `payments Payment[]` relation added.

### Get-or-Create Stripe Customer
```typescript
// Inside src/lib/dal/payments.ts
export async function getOrCreateStripeCustomer(
  customer: { id: string; email: string | null; firstName: string; lastName: string; stripeCustomerId: string | null }
): Promise<string> {
  if (customer.stripeCustomerId) return customer.stripeCustomerId;

  const stripeCustomer = await stripe.customers.create({
    email: customer.email ?? undefined,
    name: `${customer.firstName} ${customer.lastName}`,
    metadata: { internalCustomerId: customer.id },
  });

  await db.customer.update({
    where: { id: customer.id },
    data: { stripeCustomerId: stripeCustomer.id },
  });

  return stripeCustomer.id;
}
```
Source: Stripe Customer API. Stores `stripeCustomerId` on first use, reuses for subsequent payments.

### Payment Request Email Template
```typescript
// Addition to src/lib/email/templates.ts
export function paymentRequestTemplate(data: {
  customerName: string;
  amount: number;
  type: 'deposit' | 'balance';
  paymentUrl: string;
}): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.amount);

  const typeLabel = data.type === 'deposit' ? 'Deposit' : 'Session Balance';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Payment Request - ${typeLabel}</h2>
      <p>Hello ${data.customerName},</p>
      <p>A ${typeLabel.toLowerCase()} payment of <strong>${formattedAmount}</strong> has been requested for your tattoo session at Ink 37 Tattoos.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.paymentUrl}" style="background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Pay ${formattedAmount}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This payment link will expire in 24 hours. If you have any questions, please contact us.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}
```
Source: Follows existing email template pattern from `contactAdminTemplate` / `contactConfirmationTemplate`.

### Environment Variable Additions
```typescript
// Updated src/lib/env.ts schema
const envSchema = z.object({
  // ... existing fields ...
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(), // Only needed if using client-side Stripe.js later
});
```
Source: Follows existing env validation pattern. Both keys are required -- app fails fast if missing.

### Currency Conversion Helpers
```typescript
// src/lib/stripe.ts (add to existing file)
/** Convert dollar amount (Decimal/number) to Stripe cents (integer) */
export function dollarsToStripeCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Convert Stripe cents (integer) to dollar amount (number) */
export function stripeCentsToDollars(cents: number): number {
  return cents / 100;
}
```

### StatusBadge Extension for Payment Statuses
```typescript
// Add to existing statusColors in src/components/dashboard/status-badge.tsx
const statusColors: Record<string, string> = {
  // ... existing statuses ...
  PROCESSING: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-orange-100 text-orange-800',
  // PENDING, COMPLETED already exist
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Charges API | Payment Intents API | 2019 | All new integrations use Payment Intents; Checkout Sessions create Payment Intents under the hood |
| Pages Router `req.body` with bodyParser config | App Router `request.text()` | Next.js 13+ | No bodyParser config needed; Web Request API gives raw body directly |
| `stripe.webhooks.constructEventAsync()` | `stripe.webhooks.constructEvent()` | stripe@15+ | Synchronous is simpler; async version exists but rarely needed |
| `@stripe/stripe-js` for server-side | `stripe` (Node SDK) server-only | Always | Node SDK is server-only; `@stripe/stripe-js` is for client-side Elements only (not needed with Checkout hosted) |
| Stripe API version auto-upgrade | Pinned `apiVersion` in SDK constructor | Best practice | Prevents breaking changes from hitting production unexpectedly |

**Deprecated/outdated:**
- `stripe.charges.create()` direct usage: Use Payment Intents or Checkout Sessions instead
- `micro` library for raw body parsing in Pages Router: Not needed with App Router
- `next-stripe` wrapper libraries: Unnecessary abstraction over the official SDK

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` (exists, environment: node, globals: true, @/ alias configured) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | Deposit checkout session creation with correct amount in cents | unit | `npx vitest run src/__tests__/payment-actions.test.ts -t "deposit"` | No -- Wave 0 |
| PAY-02 | Balance payment calculates remaining amount correctly | unit | `npx vitest run src/__tests__/payment-actions.test.ts -t "balance"` | No -- Wave 0 |
| PAY-03 | Payment DAL queries return correct data with auth checks | unit | `npx vitest run src/__tests__/payment-dal.test.ts` | No -- Wave 0 |
| PAY-04 | Webhook handler processes events idempotently, skips duplicates | unit | `npx vitest run src/__tests__/webhook-stripe.test.ts` | No -- Wave 0 |
| PAY-05 | Receipt URL is extracted from charge and stored on Payment record | unit | `npx vitest run src/__tests__/webhook-stripe.test.ts -t "receipt"` | No -- Wave 0 |
| SEC-05 | Webhook rejects requests with invalid signatures | unit | `npx vitest run src/__tests__/webhook-stripe.test.ts -t "signature"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/payment-actions.test.ts` -- covers PAY-01, PAY-02 (mock Stripe SDK, test Server Action logic)
- [ ] `src/__tests__/payment-dal.test.ts` -- covers PAY-03 (mock Prisma, test auth + query logic)
- [ ] `src/__tests__/webhook-stripe.test.ts` -- covers PAY-04, PAY-05, SEC-05 (mock Stripe constructEvent, test handler logic)
- [ ] `src/__tests__/stripe-helpers.test.ts` -- covers currency conversion helpers (pure functions, no mocks needed)

## Open Questions

1. **Stripe API version to pin**
   - What we know: Latest is `2026-02-25.clover`. SDK 20.4.1 supports it. Older stable versions include `2025-12-18.acacia`.
   - What's unclear: Whether the latest version introduces any breaking changes for Checkout Sessions. The reserve-related changes in `2026-02-25.clover` are irrelevant to this project.
   - Recommendation: Pin to `2025-12-18.acacia` (well-tested stable version) unless testing confirms `2026-02-25.clover` works identically for checkout flows. This is LOW risk since Checkout Session API has been stable across versions.

2. **Checkout Session expiration for payment links**
   - What we know: Stripe Checkout Sessions expire after 24 hours by default. The `expires_at` parameter can customize this.
   - What's unclear: Whether 24 hours is appropriate for tattoo deposit/balance links, or if a longer window (e.g., 72 hours) would be better for client convenience.
   - Recommendation: Use the default 24-hour expiration. Admin can always re-trigger a new payment request if the link expires. Shorter windows reduce risk of stale payment amounts.

3. **Dashboard KPI integration**
   - What we know: The dashboard overview page has KPI cards showing revenue, clients, bookings, and completion rate. Revenue currently comes from `TattooSession.totalCost` aggregation.
   - What's unclear: Whether to add payment-specific KPIs (total collected, pending payments, refund total) to the main dashboard or keep them isolated to the payments page.
   - Recommendation: Add a "Total Collected" KPI to the main dashboard (from Payment records where status=COMPLETED). Keep detailed payment metrics on the `/dashboard/payments` page. This provides at-a-glance visibility without cluttering the overview.

## Sources

### Primary (HIGH confidence)
- Stripe Node.js SDK npm registry -- version 20.4.1 confirmed
- [Stripe API: Create Checkout Session](https://docs.stripe.com/api/checkout/sessions/create) -- parameters, price_data, metadata, customer
- [Stripe Webhooks](https://docs.stripe.com/webhooks) -- signature verification, retry behavior, idempotency
- [Stripe API: Charge object](https://docs.stripe.com/api/charges/object) -- receipt_url field, payment_intent relation
- [Stripe API: Create Refund](https://docs.stripe.com/api/refunds/create) -- partial refunds, parameters
- [Stripe Receipts](https://docs.stripe.com/receipts) -- receipt_url behavior, 30-day expiration
- [Stripe Checkout Receipts](https://docs.stripe.com/payments/checkout/receipts) -- payment_intent_data.receipt_email

### Secondary (MEDIUM confidence)
- [Stripe + Next.js 2026 Edition (DEV Community)](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33) -- Server Action patterns, API version guidance
- [Stripe + Next.js 15 Complete 2025 Guide (Pedro Alonso)](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) -- App Router webhook pattern
- [Next.js App Router + Stripe Webhook Signature (Kitson Broadhurst)](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) -- request.text() for raw body
- [Prisma Transactions docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) -- interactive transactions, atomic increment on Decimal

### Tertiary (LOW confidence)
- Stripe API version `2025-12-18.acacia` stability -- based on version naming convention and SDK compatibility; exact pinned version should be validated during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Stripe SDK version confirmed from npm registry, all supporting libraries already installed and tested in project
- Architecture: HIGH -- patterns derived from official Stripe docs and existing codebase patterns (DAL, Server Actions, Route Handlers)
- Pitfalls: HIGH -- well-documented issues from Stripe docs, Next.js discussions, and community experience
- Prisma integration: HIGH -- atomic transactions and Decimal increment confirmed in Prisma docs

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (Stripe SDK and APIs are stable; pin API version to avoid drift)
