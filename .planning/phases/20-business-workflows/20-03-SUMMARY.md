---
phase: 20-business-workflows
plan: 03
subsystem: payments, ui
tags: [pdf, stirling-pdf, invoice, consent, resend, email, dashboard]

# Dependency graph
requires:
  - phase: 20-01
    provides: "Receipt PDF pipeline, consent DAL, sendInvoiceEmail, consent-actions"
provides:
  - "Invoice PDF generation route (GET /api/invoices/[paymentId])"
  - "Invoice email action with inline PDF generation (emailInvoiceAction)"
  - "Admin consent management page (/dashboard/consent)"
  - "Consent form version management dialog"
affects: [22-testing, dashboard-navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline PDF generation in server actions (avoid internal HTTP fetch for auth safety)"
    - "Card-based consent records with status badges and URL-synced filter controls"

key-files:
  created:
    - src/lib/invoice-template.ts
    - src/app/api/invoices/[paymentId]/route.ts
    - src/lib/actions/invoice-actions.ts
    - src/app/(dashboard)/dashboard/consent/page.tsx
    - src/app/(dashboard)/dashboard/consent/consent-page-client.tsx
  modified: []

key-decisions:
  - "Invoice email action generates PDF inline via direct Stirling PDF POST, not internal route fetch"
  - "Consent page uses card layout with badge status indicators rather than DataTable for richer per-record display"
  - "Invoice terms fetched from settings with graceful fallback default"

patterns-established:
  - "Inline PDF generation: renderHtml() + direct Stirling PDF POST in server actions avoids cookie/auth forwarding issues"
  - "URL-synced filter buttons: filter state stored in search params for server-side re-fetch on navigation"

requirements-completed: [BIZ-02, BIZ-05]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 20 Plan 03: Invoice PDF + Consent Management Summary

**Invoice PDF pipeline with inline Stirling PDF generation and admin consent management page with expiration tracking and version control**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T07:07:35Z
- **Completed:** 2026-03-30T07:13:09Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Invoice HTML template with line items, deposit deduction, terms section, and XSS-safe escaping
- Invoice PDF route mirroring proven receipt pipeline (health check, timeout, Stirling PDF conversion)
- emailInvoiceAction with inline PDF generation (direct Stirling PDF POST, not internal HTTP fetch)
- Admin consent management page with paginated records, status badges (active/expired/pending), filter controls, and search
- Consent form version management dialog with create new version and deactivate existing versions

## Task Commits

Each task was committed atomically:

1. **Task 1: Invoice HTML template + PDF generation route + inline email action** - `dd528ca` (feat)
2. **Task 2: Admin consent management dashboard page** - `b7399c0` (feat)

## Files Created/Modified
- `src/lib/invoice-template.ts` - HTML invoice template with line items, deposit, terms, XSS escaping
- `src/app/api/invoices/[paymentId]/route.ts` - Invoice PDF API route via Stirling PDF (mirrors receipt pattern)
- `src/lib/actions/invoice-actions.ts` - emailInvoiceAction with inline PDF generation + Resend email
- `src/app/(dashboard)/dashboard/consent/page.tsx` - Server page fetching consent data from DAL
- `src/app/(dashboard)/dashboard/consent/consent-page-client.tsx` - Client component with filters, search, pagination, version dialog

## Decisions Made
- Invoice email action generates PDF inline (renderInvoiceHtml + direct Stirling PDF POST) instead of fetching from internal /api/invoices route -- avoids auth forwarding and cookie propagation issues in server actions
- Consent page uses card-based layout rather than DataTable for richer per-record display with status badges
- Invoice terms fetched from settings DAL (`invoice_terms` key) with graceful fallback to default text

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data sources are wired to real DAL functions and all actions connect to real endpoints.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Invoice and consent management complete the BIZ-02 and BIZ-05 requirements
- Plan 20-02 (aftercare/reminders) is the remaining plan in phase 20
- All invoice infrastructure ready for UI integration on payment detail pages

---
*Phase: 20-business-workflows*
*Completed: 2026-03-30*
