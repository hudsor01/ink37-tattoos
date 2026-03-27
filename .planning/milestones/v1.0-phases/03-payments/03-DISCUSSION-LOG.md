# Phase 3: Payments - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-21
**Phase:** 03-payments
**Areas discussed:** Payment model design, Checkout flow UX, Webhook reliability, Receipt/invoice generation
**Mode:** Auto (--auto flag)

---

## Payment Model Design

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Payment model | New model linked to TattooSession and Customer with full transaction history | (auto) |
| Track on TattooSession | Use existing depositAmount/totalCost/paidAmount fields only, no separate table | |
| Stripe-only tracking | Rely on Stripe Dashboard for all payment records, no local tracking | |

**User's choice:** [auto] Separate Payment model (recommended — supports multiple payments per session, audit trail, offline querying)
**Notes:** TattooSession fields continue as summary totals; Payment model is the transaction ledger.

---

## Checkout Flow UX

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe Checkout (hosted) | Redirect to Stripe-hosted payment page | (auto) |
| Stripe Elements (embedded) | Inline card form using Stripe Elements SDK | |
| Stripe Payment Links | Pre-built Stripe payment links, no code needed | |

**User's choice:** [auto] Stripe Checkout (recommended — PCI compliance handled by Stripe, mobile-optimized, fastest to implement)

| Option | Description | Selected |
|--------|-------------|----------|
| Admin triggers deposit after review | Artist reviews booking, then sends deposit request | (auto) |
| Auto-collect on booking | Deposit automatically charged when client books | |

**User's choice:** [auto] Admin triggers deposit (recommended — matches tattoo studio workflow)

---

## Webhook Reliability

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe event ID + unique constraint | Store event ID in DB, skip duplicates via constraint | (auto) |
| In-memory dedup with TTL | Track recent event IDs in memory | |
| Stripe idempotency keys | Use Stripe's built-in idempotency on API calls only | |

**User's choice:** [auto] Stripe event ID + unique constraint (recommended — database-enforced, survives restarts)
**Notes:** Also includes Stripe signature verification (SEC-05 requirement).

---

## Receipt/Invoice Generation

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe-hosted receipt URLs | Use Stripe's built-in receipt links for completed payments | (auto) |
| Custom PDF generation | Generate PDFs with a library like @react-pdf/renderer | |
| HTML email receipts | Send custom HTML receipt emails via Resend | |

**User's choice:** [auto] Stripe-hosted receipt URLs (recommended — zero maintenance, professional appearance, Stripe handles updates)
**Notes:** Admin sees receipt link in payment history table. No custom PDF complexity needed for a small studio.

---

## Claude's Discretion

- Stripe SDK version and initialization pattern
- Payment model exact field types and indexes
- Error handling for Stripe API failures
- Payment request email template design
- Payment history filtering/sorting options
- Dashboard KPI integration

## Deferred Ideas

- Client self-service payment (Phase 4: PORT-05)
- Store checkout (Phase 5: STORE-03)
- Recurring/subscription billing (not in roadmap)
- Tip/gratuity at checkout (not in requirements)
