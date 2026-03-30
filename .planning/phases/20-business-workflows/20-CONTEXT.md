# Phase 20: Business Workflows - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Automate 6 core tattoo business workflows: deposit tracking with configurable requirements and balance reminders, digital consent form versioning + expiration + admin view, aftercare email automation on session completion, appointment reminders via n8n + Cal.com (not Vercel Cron), invoice PDF generation + email delivery, and portal onboarding auto-linking.

</domain>

<decisions>
## Implementation Decisions

### Deposit Workflow (BIZ-01)
- **D-01:** Configure deposit requirements by appointment type in Settings. System auto-calculates remaining balance from `depositAmount` + payments.
- **D-02:** Balance-due reminders triggered via **n8n workflow** at `n8n.thehudsonfam.com` — n8n cron hits an API endpoint that scans for unpaid balances and sends reminder emails via Resend node. NOT Vercel Cron (too expensive).

### Consent Management (BIZ-02)
- **D-03:** Add consent form version tracking + expiration date (default 1 year). Portal signing already works from Phase 4.
- **D-04:** Admin view: dashboard page showing all signed consent forms per customer with download links and expiration status indicators. Filter by expired/active/pending.

### Aftercare Automation (BIZ-03)
- **D-05:** Claude decides template approach (configurable in Settings vs hardcoded). Auto-send aftercare email via Resend when session status changes to COMPLETED.

### Appointment Reminders (BIZ-04)
- **D-06:** **Cal.com handles 24h/48h booking reminders** — their built-in reminder system covers appointments booked through Cal.com.
- **D-07:** **n8n workflow for no-show follow-up** — cron scans for appointments marked NO_SHOW, sends follow-up email via Resend. API endpoint on the app, n8n triggers it.
- **D-08:** App provides API routes that n8n calls. n8n handles scheduling, Resend handles email delivery.

### Invoice Generation (BIZ-05)
- **D-09:** Claude decides (likely reuse Stirling PDF pipeline from Phase 18). Invoice PDF includes line items, terms, due date. "Email to Customer" button sends PDF as Resend attachment.

### Portal Onboarding (BIZ-06)
- **D-10:** Claude decides. Better Auth user creation hook already auto-links/creates Customer records. Verify/enhance edge case handling (duplicate email, existing customer without userId).

### Claude's Discretion
- Deposit configuration UI (settings tab vs per-appointment-type config)
- Aftercare template approach (configurable vs hardcoded)
- Invoice PDF template design (reuse receipt pipeline or new template)
- Portal onboarding edge cases (what happens when email matches existing customer)
- n8n workflow documentation (what API endpoints to create, what n8n reads)
- Consent form version schema (version number field vs separate versioned table)

</decisions>

<canonical_refs>
## Canonical References

### Existing Workflows
- `src/lib/auth.ts` — Better Auth with databaseHooks for user creation (auto-link Customer)
- `src/app/api/webhooks/stripe/route.ts` — Payment webhook (deposit/balance tracking)
- `src/lib/email/resend.ts` — All email sending functions
- `src/lib/receipt-template.ts` — HTML receipt template (reusable pattern for invoices)
- `src/app/api/receipts/[paymentId]/route.ts` — Stirling PDF receipt API route

### Consent (Phase 4)
- `src/app/(portal)/portal/consent/page.tsx` — Portal consent signing page
- `src/lib/actions/portal-actions.ts` — Portal consent sign action
- `src/lib/security/validation.ts` — ConsentSignSchema

### Schema
- `src/lib/db/schema.ts` — tattooSession (depositAmount, paidAmount, status), appointment, customer, consentRecord
- `src/lib/dal/sessions.ts` — Session DAL
- `src/lib/dal/appointments.ts` — Appointment DAL

### Settings (Phase 19)
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Settings tabs (can add deposit config + email templates)

### External Services
- `n8n.thehudsonfam.com` — Self-hosted n8n for scheduled workflows (reminders, no-show follow-up, balance-due)
- `pdf.thehudsonfam.com` — Stirling PDF for invoice generation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Stirling PDF receipt pipeline (Phase 18) — reusable for invoices
- Resend email functions — already handle contact, order, gift card emails
- Better Auth databaseHooks — user.create.after already does auto-link
- Notification system (Phase 17) — can create notifications alongside emails
- Settings tab infrastructure (Phase 19) — can add deposit/email config tabs
- ConsentSign flow in portal (Phase 4)

### What Needs Creating
- Deposit config UI in settings
- Balance calculation logic (depositAmount + payments vs totalCost)
- n8n-callable API routes for: balance-due scan, no-show scan
- Consent version + expiration schema fields
- Admin consent forms view page
- Aftercare email trigger on session completion
- Invoice HTML template
- Invoice API route + email attachment
- Portal onboarding verification/enhancement
- n8n workflow documentation or export files

</code_context>

<specifics>
## Specific Ideas

- n8n at n8n.thehudsonfam.com replaces Vercel Cron for ALL scheduled tasks
- Cal.com handles booking reminders natively — don't rebuild
- Stirling PDF reuse for invoices
- API endpoints that n8n calls (not n8n calling Resend directly — app controls logic)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-business-workflows*
*Context gathered: 2026-03-30*
