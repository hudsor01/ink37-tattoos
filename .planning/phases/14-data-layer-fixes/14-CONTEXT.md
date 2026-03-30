# Phase 14: Data Layer Fixes - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all DAL list functions to support pagination and search, standardize all server action return patterns to a consistent ActionResult type, add FK validation before inserts, wire revalidatePath into webhook handlers, create missing DAL functions, and fix gift card checkout error handling. No new UI — this is data layer remediation.

</domain>

<decisions>
## Implementation Decisions

### Pagination & Search Pattern
- **D-01:** Shared `PaginationParams` type: `{ page: number, pageSize: number, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc' }`. All list DAL functions accept this interface.
- **D-02:** Shared `PaginatedResult<T>` return type: `{ data: T[], total: number, page: number, pageSize: number, totalPages: number }`.
- **D-03:** PostgreSQL full-text search using `tsvector`/`tsquery` with GIN indexes for search functionality. Set up `tsvector` columns on relevant tables (customers, appointments, products, etc.).
- **D-04:** Default page size: 20 items. Configurable per-page via URL params.

### Claude's Discretion (Pagination)
- Pagination style (offset vs cursor) — pick what fits best for a solo-artist admin dashboard.
- Which columns to include in tsvector for each table.
- Whether to add a `withPagination()` Drizzle helper or inline the offset/limit in each function.

### Server Action Return Contract
- **D-05:** All server actions return `ActionResult<T>`: `{ success: true, data: T } | { success: false, error: string, fieldErrors?: Record<string, string[]> }`.
- **D-06:** Create a `safeAction()` wrapper utility that catches Zod validation errors (extracts fieldErrors from ZodError.flatten()), DB errors, and unexpected errors — maps each to the appropriate ActionResult shape.
- **D-07:** When Zod validation fails, return `{ success: false, error: 'Validation failed', fieldErrors: { fieldName: ['error message'] } }` so Phase 15 UI can show inline field errors.

### Claude's Discretion (Return Contract)
- Whether safeAction is a higher-order function wrapping the action, or a try/catch utility called inside each action.
- Error message granularity for DB errors (generic "Operation failed" vs specific constraint names).

### Webhook Revalidation
- **D-08:** Use `revalidatePath()` per affected route after webhook state changes. Each webhook handler knows which dashboard paths it affects.
- **D-09:** Stripe webhook: revalidate `/dashboard/payments`, `/dashboard/sessions`, `/dashboard/orders` after relevant events.
- **D-10:** Cal.com webhook: revalidate `/dashboard/appointments`, `/dashboard/customers` after booking events.
- **D-11:** Resend webhook: revalidate relevant paths after email status changes if applicable.

### Claude's Discretion (Revalidation)
- Exact paths to revalidate per webhook event type.
- Whether to also revalidate portal paths for client-facing updates.

### Missing DAL & Wiring Gaps
- **D-12:** All missing DAL functions (artist profile CRUD, design approval status, contact management update/delete) follow existing DAL patterns — Claude implements them.
- **D-13:** Store checkout page uses DAL function instead of direct db.query call.
- **D-14:** `checkSchedulingConflict()` function wired into appointment creation/update flow — Claude decides conflict detection logic.
- **D-15:** Gift card validation in store checkout returns explicit error to user when code is invalid.
- **D-16:** FK validation on inserts (customerId, artistId existence checks) returns clear validation errors instead of DB constraint violations.

### Claude's Discretion (Missing DAL)
- Scheduling conflict definition (buffer time, overlap detection algorithm).
- Artist profile schema (what fields to expose for CRUD).
- Contact management operations (what status transitions to support).
- Audit logging additions for currently-unlogged mutations.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### DAL Layer
- `src/lib/dal/customers.ts` — Existing DAL pattern (list, create, update, delete)
- `src/lib/dal/appointments.ts` — Appointment DAL (needs pagination, conflict check wiring)
- `src/lib/dal/sessions.ts` — Session DAL pattern
- `src/lib/dal/payments.ts` — Payment DAL
- `src/lib/dal/orders.ts` — Order DAL (includes getOrderByCheckoutSessionId)
- `src/lib/dal/gift-cards.ts` — Gift card DAL (redemption, validation)
- `src/lib/dal/contacts.ts` — Contact DAL (needs update/delete added)
- `src/lib/dal/designs.ts` — Design DAL (needs approval status)
- `src/lib/dal/analytics.ts` — Analytics DAL (needs SQL GROUP BY per DAL-03)
- `src/lib/dal/products.ts` — Product DAL
- `src/lib/dal/media.ts` — Media DAL
- `src/lib/dal/settings.ts` — Settings DAL
- `src/lib/dal/portal.ts` — Portal DAL
- `src/lib/dal/audit.ts` — Audit logging DAL
- `src/lib/dal/index.ts` — DAL barrel export

### Server Actions
- `src/lib/actions/customer-actions.ts` — Current action pattern (Zod parse, DAL call, revalidate)
- `src/lib/actions/appointment-actions.ts` — Needs conflict check wiring
- `src/lib/actions/contact-actions.ts` — Contact form action (rate limited from Phase 13)

### Webhooks (need revalidation)
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook (no revalidatePath yet in webhook)
- `src/app/api/webhooks/cal/route.ts` — Cal.com webhook
- `src/app/api/webhooks/resend/route.ts` — Resend webhook

### Store Checkout
- `src/app/(store)/checkout/page.tsx` or equivalent — Direct db.query that needs DAL function

### Schema
- `src/lib/db/schema.ts` — Database schema (tsvector columns may need adding)
- `src/lib/security/validation.ts` — Zod schemas (already has noHtml refinements from Phase 13)

### Auth (from Phase 13)
- `src/lib/auth.ts` — requireRole() helper, getCurrentSession()

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 16 DAL files with consistent patterns (list all, get by ID, create, update, delete)
- `logAudit()` from `src/lib/dal/audit.ts` — audit logging helper
- `requireRole()` from `src/lib/auth.ts` — role validation (Phase 13)
- Zod schemas in `src/lib/security/validation.ts` — all form validation

### Established Patterns
- DAL functions use Drizzle ORM relational query API for reads, SQL builder for mutations
- Server actions: `'use server'` → `requireRole()` → Zod parse → DAL call → `revalidatePath()` → return
- Audit logging via `after()` + `logAudit()` pattern (non-blocking)

### Integration Points
- Server actions are the boundary between client and DAL
- Webhook route handlers call DAL functions directly (no server action layer)
- Dashboard pages use server components that call DAL list functions

</code_context>

<specifics>
## Specific Ideas

- PostgreSQL full-text search with tsvector/tsquery + GIN indexes (user chose this over ILIKE)
- ActionResult<T> type with fieldErrors for Phase 15 form UX integration
- revalidatePath per affected route (not tag-based)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-data-layer-fixes*
*Context gathered: 2026-03-28*
