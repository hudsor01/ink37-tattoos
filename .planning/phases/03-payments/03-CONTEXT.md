# Phase 3: Payments - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Stripe handles the full payment lifecycle: deposits collected at booking, session balances paid after appointments, webhooks process all payment events reliably, and the admin can view complete payment history with receipts. No client portal payment views (Phase 4). No store checkout (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Payment Model Design
- **D-01:** Separate `Payment` model linked to `TattooSession` and `Customer` — clean separation, supports multiple payments per session (deposit + balance), full audit trail
- **D-02:** Store `stripePaymentIntentId` on Payment model for reconciliation with Stripe
- **D-03:** Add `stripeCustomerId` to Customer model — link Stripe Customer to local Customer to avoid creating duplicate Stripe customers
- **D-04:** Payment statuses: PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED — mirror Stripe payment intent states
- **D-05:** Payment types: DEPOSIT, SESSION_BALANCE, REFUND — distinguish payment purpose
- **D-06:** Existing TattooSession fields (`depositAmount`, `totalCost`, `paidAmount`) continue to be the source of truth for session-level totals; Payment records are the transaction ledger

### Checkout Flow
- **D-07:** Use Stripe Checkout (hosted page), not Stripe Elements — faster implementation, PCI compliance fully handled by Stripe, mobile-optimized
- **D-08:** Admin triggers deposit request from dashboard after reviewing booking — not automatic on client submission (artist reviews first)
- **D-09:** Admin triggers balance payment request after session — client receives payment link via email (Resend), pays via Stripe Checkout
- **D-10:** No inline payment forms in this phase — all payments go through Stripe-hosted checkout pages

### Webhook Handling
- **D-11:** Route Handler at `/api/webhooks/stripe` — per CLAUDE.md convention (Route Handlers for webhooks only)
- **D-12:** Idempotency via storing Stripe event ID with unique constraint — skip duplicate events at database level
- **D-13:** Verify Stripe webhook signature with raw body parsing (SEC-05 requirement)
- **D-14:** Handle events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- **D-15:** Update Payment status and TattooSession.paidAmount atomically in a transaction

### Receipt/Invoice Display
- **D-16:** Use Stripe-hosted receipt URLs — no custom PDF generation. Stripe provides receipt links for completed charges.
- **D-17:** Admin payment history table: date, customer, session, amount, type (deposit/balance), status, receipt link
- **D-18:** Payment history is a new dashboard section at `/dashboard/payments`

### Claude's Discretion
- Stripe SDK version selection and initialization pattern
- Exact Prisma migration for Payment model (field types, indexes)
- Error handling and retry logic for Stripe API calls
- Email template for payment request notifications
- Payment history table column design and filtering options
- Whether to add payment summary to existing dashboard KPIs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Schema & Data Layer
- `prisma/schema.prisma` -- Current unified schema; TattooSession has depositAmount/totalCost/paidAmount fields (lines 171-201). No Payment model yet.
- `src/lib/dal/analytics.ts` -- Revenue aggregation from TattooSession.totalCost; will need to account for Payment records
- `src/lib/dal/sessions.ts` -- Session CRUD with paidAmount tracking
- `src/lib/actions/session-actions.ts` -- Session mutation actions with audit logging

### Security & Infrastructure
- `src/lib/security/validation.ts` -- Zod schemas; will need PaymentSchema additions
- `src/lib/security/rate-limiter.ts` -- Rate limiting pattern for webhook endpoint
- `src/lib/email/resend.ts` -- Email service for payment request notifications
- `src/lib/email/templates.ts` -- Email templates; needs payment request template
- `src/middleware.ts` -- Auth middleware; webhook route must bypass auth

### Admin Dashboard
- `src/app/(dashboard)/dashboard/page.tsx` -- Dashboard overview with KPI cards and revenue chart
- `src/components/dashboard/data-table.tsx` -- Reusable DataTable for payment history
- `src/components/dashboard/status-badge.tsx` -- Status badge pattern for payment statuses
- `src/lib/actions/` -- Server Action patterns with Zod validation and audit logging

### Project Requirements
- `.planning/REQUIREMENTS.md` -- PAY-01 through PAY-05 and SEC-05 define payment requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **DataTable** (`src/components/dashboard/data-table.tsx`): Reusable for payment history table
- **StatusBadge** (`src/components/dashboard/status-badge.tsx`): Extend for payment statuses (PENDING, COMPLETED, FAILED, REFUNDED)
- **KPICard** (`src/components/dashboard/kpi-card.tsx`): Can add payment KPIs to dashboard
- **Resend email service** (`src/lib/email/`): Reuse for payment request emails
- **Audit logging** (`src/lib/dal/audit.ts`): Log payment actions same pattern as existing mutations
- **Zod validation** (`src/lib/security/validation.ts`): Add payment schemas

### Established Patterns
- DAL with `requireStaffRole`/`requireAdminRole` for payment admin operations
- Server Actions with Zod validation + audit logging for mutations
- Route Handlers for external webhooks (auth API route exists as pattern)
- TattooSession already tracks `depositAmount`, `totalCost`, `paidAmount` as Decimal fields

### Integration Points
- Prisma schema needs `Payment` model with relations to Customer and TattooSession
- Admin sidebar needs "Payments" navigation item
- Dashboard KPIs may include payment metrics
- Webhook route at `/api/webhooks/stripe` bypasses auth middleware
- Customer model needs `stripeCustomerId` field

</code_context>

<specifics>
## Specific Ideas

- Owner wants things done right — use Stripe best practices, not shortcuts
- Keep payment flow simple: admin-initiated, not self-service (client portal is Phase 4)
- Stripe Checkout handles all PCI compliance — no custom card forms
- Receipt links from Stripe are sufficient — no custom invoice PDF generation needed

</specifics>

<deferred>
## Deferred Ideas

- Client self-service payment from portal — Phase 4 (PORT-05)
- Store checkout with cart — Phase 5 (STORE-03)
- Recurring payments / subscription billing — not in current roadmap
- Tip/gratuity at checkout — not in requirements, add to backlog if desired

</deferred>

---

*Phase: 03-payments*
*Context gathered: 2026-03-21*
