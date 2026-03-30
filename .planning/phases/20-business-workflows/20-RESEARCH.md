# Phase 20: Business Workflows - Research

**Researched:** 2026-03-30
**Domain:** Business workflow automation (deposits, consent, aftercare, reminders, invoices, onboarding)
**Confidence:** HIGH

## Summary

Phase 20 automates six core tattoo business workflows by building on existing infrastructure: the Resend email system, Stirling PDF receipt pipeline, Better Auth databaseHooks, the notification system, and the settings framework. The unique architectural challenge is that scheduled tasks (balance-due reminders, no-show follow-up) are triggered by n8n at `n8n.thehudsonfam.com` calling API routes on the app, NOT by Vercel Cron. This means the app needs new API routes secured with a shared secret (Bearer token pattern), while n8n handles the scheduling logic via its Schedule Trigger node + HTTP Request node.

The six workflows decompose naturally: three are event-driven (aftercare email on session completion, portal onboarding on user registration, consent versioning on schema change), two are n8n-scheduled (balance-due reminders, no-show follow-up), and one is admin-initiated (invoice generation + email). Cal.com handles 24h/48h booking reminders natively -- we do NOT rebuild those.

**Primary recommendation:** Build n8n-callable API routes with CRON_SECRET Bearer authentication, reuse the Stirling PDF receipt pipeline for invoices, extend the existing settings tab infrastructure for deposit configuration, and add consent version/expiration fields to the schema.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Configure deposit requirements by appointment type in Settings. System auto-calculates remaining balance from `depositAmount` + payments.
- D-02: Balance-due reminders triggered via n8n workflow at `n8n.thehudsonfam.com` -- n8n cron hits an API endpoint that scans for unpaid balances and sends reminder emails via Resend node. NOT Vercel Cron.
- D-03: Add consent form version tracking + expiration date (default 1 year). Portal signing already works from Phase 4.
- D-04: Admin view: dashboard page showing all signed consent forms per customer with download links and expiration status indicators. Filter by expired/active/pending.
- D-05: Claude decides template approach (configurable in Settings vs hardcoded). Auto-send aftercare email via Resend when session status changes to COMPLETED.
- D-06: Cal.com handles 24h/48h booking reminders -- their built-in reminder system covers appointments booked through Cal.com.
- D-07: n8n workflow for no-show follow-up -- cron scans for appointments marked NO_SHOW, sends follow-up email via Resend. API endpoint on the app, n8n triggers it.
- D-08: App provides API routes that n8n calls. n8n handles scheduling, Resend handles email delivery.
- D-09: Claude decides (likely reuse Stirling PDF pipeline from Phase 18). Invoice PDF includes line items, terms, due date. "Email to Customer" button sends PDF as Resend attachment.
- D-10: Claude decides. Better Auth user creation hook already auto-links/creates Customer records. Verify/enhance edge case handling.

### Claude's Discretion
- Deposit configuration UI (settings tab vs per-appointment-type config)
- Aftercare template approach (configurable vs hardcoded)
- Invoice PDF template design (reuse receipt pipeline or new template)
- Portal onboarding edge cases (what happens when email matches existing customer)
- n8n workflow documentation (what API endpoints to create, what n8n reads)
- Consent form version schema (version number field vs separate versioned table)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIZ-01 | Deposit workflow -- configurable deposit requirements by appointment type, automatic balance calculation, balance due reminders | Settings tab for deposit config, n8n API route for balance-due scan, existing payment/session schema has depositAmount/paidAmount/totalCost |
| BIZ-02 | Consent management -- digital consent form capture with version tracking, expiration, admin view/download of signed forms | New consentForm table for versioning, add version/expiration fields, admin dashboard page with filters |
| BIZ-03 | Aftercare workflow -- aftercare template management, automatic aftercare email after session completion | Settings-configurable template, trigger on session status update to COMPLETED, new email template + Resend function |
| BIZ-04 | Appointment reminders -- configurable reminder emails before appointments (24h, 48h), no-show follow-up | Cal.com handles booking reminders natively, n8n API route for no-show scan + follow-up email |
| BIZ-05 | Invoice generation -- generate and download invoice PDFs for completed payments, email invoice to customer | Reuse Stirling PDF pipeline from receipt route, new invoice HTML template, Resend attachment for email |
| BIZ-06 | Customer portal onboarding -- automatic Customer record creation when portal user registers | Better Auth databaseHooks already handles this; enhance edge cases (duplicate email, existing customer with userId) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2
- **ORM:** Drizzle ORM 0.45.1 -- schema in `src/lib/db/schema.ts`, relational query API for reads, SQL builder for aggregations
- **Auth:** Better Auth v1.5.5 with 5-tier RBAC
- **Email:** Resend
- **Patterns:** DAL pattern with auth checks in server-only DB functions, Server Actions for mutations, Route Handlers for webhooks only
- **Drizzle pitfalls:** `numeric()` returns strings -- use `mode:'number'`; mutations need `.returning()`; relational API does not support aggregations
- **Import convention:** `db` from `@/lib/db`, `schema` from `@/lib/db/schema`

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | ORM for schema changes + queries | Project standard |
| drizzle-kit | (dev) | Migration generation | `db:generate` + `db:push` scripts |
| resend | 6.9.4 | Email sending including PDF attachments | Project standard, supports `attachments` array with Buffer content |
| date-fns | 4.1.0 | Date manipulation (expiration calc, date formatting) | Already used throughout codebase |
| zod | 4.3.6 | Validation schemas for API routes | Project standard |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stirling PDF | self-hosted | HTML-to-PDF conversion | Invoice PDF generation via `POST /api/v1/convert/html/pdf` |
| n8n | self-hosted | Workflow scheduling | Balance-due reminders, no-show follow-up |

### No New Dependencies Required
This phase uses only existing libraries. No new `npm install` needed.

## Architecture Patterns

### Recommended Structure for New Code
```
src/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   ├── balance-due/route.ts     # n8n calls this for balance reminders
│   │   │   └── no-show-followup/route.ts # n8n calls this for no-show emails
│   │   └── invoices/
│   │       └── [paymentId]/route.ts      # Invoice PDF generation (mirrors receipt route)
│   └── (dashboard)/
│       └── dashboard/
│           └── consent/
│               └── page.tsx              # Admin consent forms view
├── lib/
│   ├── dal/
│   │   └── consent.ts                   # Consent DAL (versioning, expiration queries)
│   ├── email/
│   │   ├── resend.ts                    # Add: sendAftercareEmail, sendBalanceDueReminder,
│   │   │                                #       sendNoShowFollowUp, sendInvoiceEmail
│   │   └── templates.ts                 # Add: aftercareTemplate, balanceDueTemplate,
│   │                                    #       noShowFollowUpTemplate
│   ├── actions/
│   │   ├── session-actions.ts           # Modify: hook aftercare email on COMPLETED status
│   │   ├── consent-actions.ts           # New: admin consent management actions
│   │   └── invoice-actions.ts           # New: generate + email invoice
│   └── invoice-template.ts             # New: HTML invoice template (mirrors receipt-template.ts)
└── drizzle/
    └── NNNN_*.sql                       # Migration for consent schema changes
```

### Pattern 1: n8n-Callable API Routes (CRON_SECRET Bearer Auth)
**What:** API routes that n8n calls on a schedule, secured with a shared secret token.
**When to use:** Balance-due reminders (D-02), no-show follow-up (D-07).
**Example:**
```typescript
// src/app/api/cron/balance-due/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql, and, lt, gt, eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { sendBalanceDueReminder } from '@/lib/email/resend';

export async function POST(request: Request) {
  // Verify CRON_SECRET Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find sessions with outstanding balance
  const sessionsWithBalance = await db.select({
    id: schema.tattooSession.id,
    totalCost: schema.tattooSession.totalCost,
    paidAmount: schema.tattooSession.paidAmount,
    depositAmount: schema.tattooSession.depositAmount,
    customerId: schema.tattooSession.customerId,
    designDescription: schema.tattooSession.designDescription,
  })
    .from(schema.tattooSession)
    .where(and(
      eq(schema.tattooSession.status, 'SCHEDULED'),
      sql`${schema.tattooSession.totalCost} > ${schema.tattooSession.paidAmount}`,
    ));

  // Send reminders for each, collect results
  let sent = 0;
  for (const session of sessionsWithBalance) {
    // Fetch customer email, send reminder...
    sent++;
  }

  return NextResponse.json({ processed: sessionsWithBalance.length, sent });
}
```

### Pattern 2: Event-Driven Email Trigger (Aftercare on COMPLETED)
**What:** When session status changes to COMPLETED, automatically send aftercare email.
**When to use:** BIZ-03 aftercare workflow.
**Implementation:** Hook into the existing `updateSessionAction` in `session-actions.ts`. When the status field is set to `COMPLETED`, trigger aftercare email via `after()` callback (same pattern as audit logging).
```typescript
// Inside updateSessionAction, after successful update:
if (data.status === 'COMPLETED') {
  const sessionData = await getSessionWithDetails(id);
  if (sessionData?.customer?.email) {
    after(() =>
      sendAftercareEmail({
        to: sessionData.customer!.email!,
        customerName: `${sessionData.customer!.firstName} ${sessionData.customer!.lastName}`,
        sessionDate: sessionData.appointmentDate,
      }).catch(err => console.error('[Aftercare] Email failed:', err))
    );
  }
}
```

### Pattern 3: Stirling PDF Reuse (Invoice Generation)
**What:** Generate invoice PDFs using the same Stirling PDF pipeline as receipts.
**When to use:** BIZ-05 invoice generation.
**Implementation:** Mirror `src/app/api/receipts/[paymentId]/route.ts` pattern exactly:
1. Create `renderInvoiceHtml()` in `src/lib/invoice-template.ts` (same escapeHtml, same CSS approach)
2. Create `src/app/api/invoices/[paymentId]/route.ts` that renders HTML, sends to Stirling PDF, returns PDF blob
3. For email: fetch PDF blob from the invoice route or generate inline, then attach to Resend email using `attachments` parameter

### Pattern 4: Settings-Based Configuration
**What:** Store configurable values in the settings table with the existing key-value pattern.
**When to use:** Deposit percentages by appointment type, aftercare email template text.
**Implementation:**
```typescript
// Settings keys to add:
// Category: 'payment'
//   deposit_config: { byType: { TATTOO_SESSION: 20, CONSULTATION: 0, ... } }
//
// Category: 'notifications' (already has email keys)
//   aftercare_template: string (HTML template body)
//   aftercare_enabled: boolean
```
The settings page already has `deposit_percentage` in PAYMENT_KEYS and `aftercare_template` in EMAIL_KEYS. Extend these to support per-appointment-type deposit configuration.

### Pattern 5: Consent Version Tracking
**What:** Add versioning and expiration to consent forms.
**When to use:** BIZ-02 consent management.

**Recommendation: Add fields to tattooSession table + new consentForm table.**

Currently, consent is stored inline on the `tattooSession` table (`consentSigned`, `consentSignedAt`, `consentSignedBy`). The CONTEXT.md mentions a `consentRecord` table, but it does NOT exist in the schema. For version tracking:

1. Create a `consentForm` table to store versioned consent form templates:
```typescript
export const consentForm = pgTable('consent_form', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),    // The consent text
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});
```

2. Add to `tattooSession`: `consentFormVersion` (integer, nullable) to track which version was signed.
3. Add to `tattooSession`: `consentExpiresAt` (timestamp, nullable) calculated as `consentSignedAt + 1 year`.

This approach avoids a breaking migration by extending the existing table. The admin consent view queries `tattooSession` records grouped by customer.

### Anti-Patterns to Avoid
- **Building a scheduler in the app:** Do NOT use Vercel Cron, setTimeout, or any in-app scheduling. n8n handles all scheduled tasks.
- **n8n sending emails directly:** n8n calls app API routes which use Resend. This keeps email logic centralized and testable.
- **Rebuilding Cal.com reminders:** Cal.com already sends 24h/48h booking reminders. Do not duplicate.
- **Separate consent record table with full session data duplication:** Keep consent metadata on the `tattooSession` table, use a lightweight `consentForm` table only for template versioning.

## Discretion Recommendations

### Deposit Configuration UI
**Recommendation:** Add a "Deposits" section to the existing Payment settings tab. Use a JSON config stored as a single setting key (`deposit_config`) with per-appointment-type percentages. The UI shows a table of appointment types with editable percentage fields. This is simpler than a separate settings tab and aligns with the existing pattern.

### Aftercare Template Approach
**Recommendation:** Configurable in Settings. The settings page already has `aftercare_template` in EMAIL_KEYS. Store the template body as a setting value, render it with variable substitution (customer name, session date, placement). Default to a sensible hardcoded template if no setting exists. This gives the artist control over aftercare instructions without code changes.

### Invoice PDF Template
**Recommendation:** Reuse the Stirling PDF pipeline. Create `invoice-template.ts` mirroring `receipt-template.ts` with the same `escapeHtml`, styling, and structure. The invoice template adds: line items table, terms text, due date, and invoice number (format: `INV-{8chars}`). The Stirling PDF endpoint (`POST /api/v1/convert/html/pdf`) and the fetch+FormData pattern are proven from the receipt route.

### Portal Onboarding Edge Cases
**Recommendation:** The existing `databaseHooks.user.create.after` in `src/lib/auth.ts` already handles three cases:
1. Existing customer with matching email but no userId -> link
2. No matching customer -> create new
3. Existing customer already has userId -> do nothing (admin resolves)

Enhancement needed: handle the race condition where two users register with the same email simultaneously (unlikely but possible). Add a try/catch around the update that checks for the unique constraint violation on `customer.userId` and logs it. The current code already has a catch block, so this is mostly verification that edge cases are covered. Minimal code change.

### Consent Form Version Schema
**Recommendation:** Lightweight approach with a `consentForm` table for versioned templates + fields on `tattooSession` for tracking which version was signed and when it expires. This is preferred over a separate `consentRecord` join table because:
1. Consent is 1:1 with session (one consent per session)
2. The fields already exist on `tattooSession` (`consentSigned`, `consentSignedAt`, `consentSignedBy`)
3. Adding `consentFormVersion` and `consentExpiresAt` is a non-breaking additive migration

### n8n Workflow Documentation
**Recommendation:** Include documentation files (or comments in the API route files) describing:
- **Balance-due workflow:** Schedule Trigger (weekly) -> HTTP Request POST to `/api/cron/balance-due` with Bearer auth
- **No-show follow-up workflow:** Schedule Trigger (daily) -> HTTP Request POST to `/api/cron/no-show-followup` with Bearer auth
- Both use Header Auth with `Authorization: Bearer ${CRON_SECRET}` configured in n8n credentials

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled tasks | In-app cron/timer | n8n Schedule Trigger + HTTP Request | n8n already deployed, handles retries/monitoring |
| Booking reminders | Custom reminder emails | Cal.com built-in reminders | Already works for Cal.com-booked appointments |
| PDF generation | HTML-to-PDF library (puppeteer, etc.) | Stirling PDF at pdf.thehudsonfam.com | Already deployed, proven in receipt pipeline |
| Email delivery | Direct SMTP | Resend API (already in use) | Handles deliverability, tracking, attachments |
| Secret management | Custom auth middleware | CRON_SECRET Bearer pattern | Industry standard for cron endpoints |

**Key insight:** Every external service this phase needs (n8n, Stirling PDF, Resend, Cal.com) is already deployed and proven in the project. The implementation is primarily wiring existing services together with new API routes and email templates.

## Common Pitfalls

### Pitfall 1: Stirling PDF Timeout/Unavailability
**What goes wrong:** Stirling PDF at pdf.thehudsonfam.com may be temporarily down, causing invoice generation to fail silently.
**Why it happens:** Self-hosted service without guaranteed uptime.
**How to avoid:** Use the same health-check pre-ping pattern from the receipt route (5-second HEAD request timeout). Return 503 with user-friendly message. The receipt route already implements this pattern perfectly.
**Warning signs:** 503 responses from invoice endpoint.

### Pitfall 2: n8n API Route Missing Rate Limiting
**What goes wrong:** Exposed API routes without rate limiting could be abused if CRON_SECRET leaks.
**Why it happens:** Cron routes are often treated as "internal" and left unprotected.
**How to avoid:** Apply the existing `rateLimiters.webhook` rate limiter to cron routes. The Bearer token is the primary security; rate limiting is defense-in-depth.
**Warning signs:** Multiple rapid calls to cron endpoints in logs.

### Pitfall 3: Aftercare Email Sent Multiple Times
**What goes wrong:** If a session is updated to COMPLETED multiple times (admin corrects other fields after marking complete), the aftercare email fires again.
**Why it happens:** The trigger fires on every status update, not just the transition.
**How to avoid:** Check the `aftercareProvided` boolean field (already exists on `tattooSession`). Set it to true after sending. Only send if `aftercareProvided === false && data.status === 'COMPLETED'`.
**Warning signs:** Customer receives duplicate aftercare emails.

### Pitfall 4: Balance Calculation Drift
**What goes wrong:** Balance-due calculation in the reminder email shows wrong amount because `paidAmount` on the session doesn't reflect all payments.
**Why it happens:** `paidAmount` is updated atomically in the Stripe webhook handler, but if a race condition occurs or a manual payment is added without updating `paidAmount`, the amounts drift.
**How to avoid:** In the balance-due API route, calculate the true balance by summing COMPLETED payments from the `payment` table for that session, rather than relying solely on `tattooSession.paidAmount`. Use this as the source of truth: `totalCost - SUM(completed payments)`.
**Warning signs:** Customer disputes incorrect balance amount in reminder email.

### Pitfall 5: Consent Expiration Timezone Issues
**What goes wrong:** Consent expiration checks produce wrong results due to timezone mismatches.
**Why it happens:** PostgreSQL timestamps stored without timezone info compared against server-local time.
**How to avoid:** All timestamps in the schema use `timestamp()` (without timezone). Be consistent: store UTC, compare UTC. Use `new Date()` (which is UTC) for expiration checks.
**Warning signs:** Consent forms showing as expired when they shouldn't be.

### Pitfall 6: CRON_SECRET Not Added to Env Schema
**What goes wrong:** App deploys without CRON_SECRET, cron routes reject all requests.
**Why it happens:** New env var added but not registered in `src/lib/env.ts` Zod schema.
**How to avoid:** Add `CRON_SECRET` to the Zod env schema as optional (allows local dev without n8n). In the cron route, return 500 if `CRON_SECRET` is not configured rather than silently accepting all requests.
**Warning signs:** n8n workflows fail with 401 after deployment.

## Code Examples

### n8n-Callable Cron Route with Bearer Auth
```typescript
// Source: Adapted from Vercel CRON_SECRET pattern + existing webhook route pattern
import { NextResponse } from 'next/server';

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[Cron] CRON_SECRET not configured');
    return false;
  }
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... business logic
  return NextResponse.json({ success: true });
}
```

### Resend Email with PDF Attachment
```typescript
// Source: Resend API docs - attachments parameter
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvoiceEmail(data: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  pdfBuffer: Buffer;
}): Promise<{ sent: boolean }> {
  const result = await resend.emails.send({
    from: 'Ink 37 Tattoos <noreply@ink37tattoos.com>',
    to: data.to,
    subject: `Invoice ${data.invoiceNumber} - Ink 37 Tattoos`,
    html: invoiceEmailTemplate(data),
    attachments: [
      {
        filename: `invoice-${data.invoiceNumber}.pdf`,
        content: data.pdfBuffer,
        content_type: 'application/pdf',
      },
    ],
  });
  return { sent: !!result.data?.id };
}
```

### Invoice Template Pattern (Mirrors Receipt Template)
```typescript
// Source: Existing src/lib/receipt-template.ts pattern
import { format } from 'date-fns';
import { escapeHtml } from './receipt-template'; // Reuse escapeHtml

export interface InvoiceData {
  studioName: string;
  customerName: string;
  customerEmail?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  lineItems: Array<{ description: string; amount: number }>;
  subtotal: number;
  depositPaid: number;
  totalDue: number;
  terms?: string;
}

export function renderInvoiceHtml(data: InvoiceData): string {
  // Same escapeHtml, same CSS structure as receipt-template.ts
  // Add: line items table, due date, terms section
}
```

### Consent Version Schema Addition
```typescript
// Source: Drizzle ORM pattern from existing schema.ts
export const consentForm = pgTable('consent_form', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull(),
  title: text('title').notNull().default('Tattoo Consent Form'),
  content: text('content').notNull(),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
});

// Add to tattooSession table:
// consentFormVersion: integer('consentFormVersion'),
// consentExpiresAt: timestamp('consentExpiresAt'),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Cron for scheduled tasks | n8n self-hosted for scheduling | Project decision | All scheduled workflows use n8n HTTP Request -> app API routes |
| Consent as flat fields on session | Consent with version + expiration tracking | This phase | consentForm table + session fields enable admin consent management |
| Manual aftercare instructions | Automated aftercare email on session completion | This phase | Reduces admin work, ensures every client gets aftercare info |

**Deprecated/outdated:**
- Vercel Cron: Not used in this project (too expensive). n8n replaces all cron functionality.

## Open Questions

1. **n8n Authentication Method Reliability**
   - What we know: n8n HTTP Request node supports Bearer auth via Header Auth credential type. There's a known issue where the built-in "Bearer Auth" generic option sometimes doesn't send the header.
   - What's unclear: Whether this is fixed in current n8n versions at n8n.thehudsonfam.com.
   - Recommendation: Use "Header Auth" credential type in n8n (manually set `Authorization: Bearer {secret}`) rather than the "Bearer Auth" shortcut, as the workaround is more reliable.

2. **Consent Form Content Source**
   - What we know: The settings page already has `consent_form_text` in LEGAL_KEYS.
   - What's unclear: Whether the current consent text in settings should become version 1 in the new consentForm table, or if the settings value should be deprecated in favor of the table.
   - Recommendation: Migrate the existing `consent_form_text` setting value as version 1 in the consentForm table. The settings key becomes a pointer to "use the latest active version."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| n8n | BIZ-01 (balance reminders), BIZ-04 (no-show) | External (n8n.thehudsonfam.com) | -- | Manual trigger via admin action |
| Stirling PDF | BIZ-05 (invoice PDF) | External (pdf.thehudsonfam.com) | -- | HTML invoice download (no PDF) |
| Resend | All email workflows | Configured | 6.9.4 | Console logging in dev |
| PostgreSQL (Neon) | Schema migration | Configured | -- | -- |

**Missing dependencies with no fallback:**
- None -- all external services have graceful degradation paths.

**Missing dependencies with fallback:**
- n8n: If unavailable, admin can manually trigger balance-due/no-show scans from the dashboard.
- Stirling PDF: If unavailable, return 503 with user-friendly message (existing pattern from receipt route).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZ-01 | Deposit config stored/retrieved from settings, balance calculation | unit | `bun run test src/__tests__/deposit-workflow.test.ts -x` | Wave 0 |
| BIZ-02 | Consent form versioning, expiration calculation, admin query | unit | `bun run test src/__tests__/consent-management.test.ts -x` | Wave 0 |
| BIZ-03 | Aftercare email triggered on COMPLETED status, not re-sent | unit | `bun run test src/__tests__/aftercare-workflow.test.ts -x` | Wave 0 |
| BIZ-04 | Cron route auth, no-show scan logic, Cal.com not duplicated | unit | `bun run test src/__tests__/cron-routes.test.ts -x` | Wave 0 |
| BIZ-05 | Invoice HTML generation, PDF route, email with attachment | unit | `bun run test src/__tests__/invoice-generation.test.ts -x` | Wave 0 |
| BIZ-06 | Auto-link edge cases (duplicate email, existing userId) | unit | `bun run test src/__tests__/auth-hooks.test.ts -x` | Existing (extend) |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/deposit-workflow.test.ts` -- covers BIZ-01
- [ ] `src/__tests__/consent-management.test.ts` -- covers BIZ-02
- [ ] `src/__tests__/aftercare-workflow.test.ts` -- covers BIZ-03
- [ ] `src/__tests__/cron-routes.test.ts` -- covers BIZ-04 (cron auth + logic)
- [ ] `src/__tests__/invoice-generation.test.ts` -- covers BIZ-05
- [ ] Extend `src/__tests__/auth-hooks.test.ts` -- covers BIZ-06 edge cases

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/db/schema.ts`, `src/lib/email/resend.ts`, `src/lib/receipt-template.ts`, `src/app/api/receipts/[paymentId]/route.ts`, `src/lib/auth.ts`, `src/lib/actions/session-actions.ts`, `src/lib/actions/portal-actions.ts`, `src/lib/dal/settings.ts`, `src/lib/dal/notifications.ts`
- [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email) -- attachments parameter structure (content as Buffer, filename, content_type)
- [Stirling PDF API](https://docs.stirlingpdf.com/API/) -- `POST /api/v1/convert/html/pdf` endpoint (verified via existing receipt route)
- Existing receipt route at `src/app/api/receipts/[paymentId]/route.ts` -- proven Stirling PDF integration pattern

### Secondary (MEDIUM confidence)
- [n8n HTTP Request node docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/) -- supports Header Auth for Bearer token
- [n8n Webhook credentials](https://docs.n8n.io/integrations/builtin/credentials/webhook/) -- credential management for external API calls
- [Vercel CRON_SECRET pattern](https://codingcat.dev/post/how-to-secure-vercel-cron-job-routes-in-next-js-14-app-router) -- Bearer token auth for cron endpoints (adapted for n8n)
- [n8n Bearer Auth known issue](https://github.com/n8n-io/n8n/issues/15261) -- use Header Auth workaround instead of generic Bearer Auth

### Tertiary (LOW confidence)
- n8n Schedule Trigger + HTTP Request combo for cron-like workflows -- inferred from n8n docs, not directly tested against n8n.thehudsonfam.com

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- patterns directly mirror existing code (receipt route, email system, settings, auth hooks)
- Pitfalls: HIGH -- identified from direct codebase analysis (aftercareProvided flag, balance calculation, Stirling PDF timeout handling)
- n8n integration: MEDIUM -- patterns verified from docs but not tested against the specific n8n instance

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- all dependencies are existing, no version changes expected)
