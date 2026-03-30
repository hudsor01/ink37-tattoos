# Phase 18: Feature Depth — Records - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Add operational depth to 6 existing record management pages: customer bulk actions + CSV import, appointment conflict warnings (already wired — surface in UI), session detail page with inline editing + linked payments + image gallery, payment PDF receipts via Stirling PDF, product image galleries with visibility toggles, and order fulfillment status timeline with tracking numbers.

</domain>

<decisions>
## Implementation Decisions

### Customer Bulk Actions & CSV Import (FEAT-02)
- **D-01:** Claude decides bulk selection + toolbar UX pattern. Checkbox column in DataTable, toolbar with Delete/Export when selected.
- **D-02:** CSV import via file upload Dialog. Preview parsed rows. Duplicate detection by email match. Show conflicts before import.

### Customer Detail Enhancement (FEAT-03)
- **D-03:** Claude decides inline editing pattern for customer detail page. Create appointment/session from customer page. Communication timeline. Portal account indicator.

### Appointment Conflict Detection (FEAT-04)
- **D-04:** `checkSchedulingConflict()` already wired in server actions from Phase 14. Need to surface conflict warnings in the UI — show warning AlertDialog when conflict detected, allow override.

### Session Detail Page (FEAT-05)
- **D-05:** Full detail page at `/dashboard/sessions/[id]`. Shows all session fields, linked payment records, image gallery per session. Click any field to toggle inline edit mode. Save per-field.
- **D-06:** Claude decides inline edit component pattern (click-to-edit with save/cancel).

### Payment PDF Receipts (FEAT-06)
- **D-07:** Generate PDF receipts via **Stirling PDF** self-hosted at `pdf.thehudsonfam.com`. Render receipt as HTML template → POST to `/api/v1/convert/html/pdf` → return PDF blob for download. API route needed in the app to proxy the request.
- **D-08:** Receipt includes: studio name/logo, customer name, session details, amount, payment method, date, receipt number.

### Product Image Galleries (FEAT-07)
- **D-09:** Vercel Blob multi-upload for product images. Sortable drag grid for ordering. Visibility toggle per image for public store.
- **D-10:** Schema needs product images support — either JSON array on product table or separate `productImage` table. Claude decides.

### Order Fulfillment (FEAT-08)
- **D-11:** Claude decides appropriate depth for solo-artist store. Visual status timeline (Paid→Processing→Shipped→Delivered). Tracking number field. Simple returns (status change to REFUNDED + Stripe refund).

### Claude's Discretion
- Bulk selection UX pattern details
- Inline edit component implementation
- Product images schema (JSON array vs separate table)
- Order fulfillment complexity (simple status + tracking vs full workflow)
- Customer communication timeline data source
- Session image gallery upload/display pattern

</decisions>

<canonical_refs>
## Canonical References

### Customer Pages
- `src/app/(dashboard)/dashboard/customers/page.tsx` — Customer list (needs bulk selection)
- `src/app/(dashboard)/dashboard/customers/[id]/page.tsx` — Customer detail (needs inline edit, linked records)
- `src/lib/dal/customers.ts` — Customer CRUD + pagination
- `src/lib/utils/csv-export.ts` — CSV export utility (Phase 17)

### Appointment Pages
- `src/app/(dashboard)/dashboard/appointments/page.tsx` — Appointment list
- `src/lib/dal/appointments.ts` — `checkSchedulingConflict()` exists
- `src/lib/actions/appointment-actions.ts` — Conflict check already wired

### Session Pages
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — Session list (needs detail page link)
- `src/lib/dal/sessions.ts` — Session CRUD + pagination
- `src/lib/dal/payments.ts` — Linked payment records

### Payment Pages
- `src/app/(dashboard)/dashboard/payments/page.tsx` — Payment list (needs PDF receipt button)
- `src/lib/dal/payments.ts` — Payment data for receipts

### Product Pages
- `src/app/(dashboard)/dashboard/products/page.tsx` — Product list
- `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx` — Product edit (needs gallery)
- `src/lib/dal/products.ts` — Product CRUD
- `src/app/api/upload/token/route.ts` — Vercel Blob upload token

### Order Pages
- `src/app/(dashboard)/dashboard/orders/page.tsx` — Order list
- `src/app/(dashboard)/dashboard/orders/[id]/page.tsx` — Order detail (needs fulfillment timeline)
- `src/lib/dal/orders.ts` — Order CRUD

### External
- `pdf.thehudsonfam.com` — Stirling PDF API for HTML-to-PDF receipt generation
- `pdf.thehudsonfam.com/swagger-ui/index.html` — API docs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- ResponsiveDataTable with checkbox selection support (TanStack React Table)
- CSV export utility from Phase 17
- Vercel Blob upload pattern from media page
- AlertDialog for confirmations
- ActionResult<T> with fieldErrors for forms
- All Phase 15 UI foundations

### What Needs Creating
- `/dashboard/sessions/[id]/page.tsx` — Session detail page
- Inline edit component (click-to-edit pattern)
- CSV import Dialog with preview + duplicate detection
- Bulk action toolbar component
- PDF receipt API route (proxy to Stirling PDF)
- Receipt HTML template
- Product image gallery component (sortable, visibility toggles)
- Order fulfillment timeline component
- Tracking number field on order

</code_context>

<specifics>
## Specific Ideas

- Stirling PDF at pdf.thehudsonfam.com for PDF receipts (NOT client-side jsPDF)
- checkSchedulingConflict already wired — just needs UI warning
- Vercel Blob reuse for product image galleries
- Sortable drag grid for image ordering

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-feature-depth-records*
*Context gathered: 2026-03-29*
