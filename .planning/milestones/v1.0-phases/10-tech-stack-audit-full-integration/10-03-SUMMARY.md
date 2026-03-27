---
phase: 10-tech-stack-audit-full-integration
plan: 03
subsystem: gallery-filters, dashboard-mutations, audit-logging
tags: [nuqs, useMutation, toast-promise, after, tanstack-query, sonner]
dependency_graph:
  requires: [10-01]
  provides: [nuqs-gallery-filters, mutation-ux, deferred-audit-logging]
  affects: [gallery, dashboard, portal, server-actions]
tech_stack:
  added: []
  patterns: [useQueryStates-shared-parsers, useMutation-cache-invalidation, toast-promise-feedback, next-server-after-audit]
key_files:
  created: []
  modified:
    - src/components/public/gallery-grid.tsx
    - src/components/public/gallery-filter-bar.tsx
    - src/lib/actions/customer-actions.ts
    - src/lib/actions/appointment-actions.ts
    - src/lib/actions/session-actions.ts
    - src/lib/actions/media-actions.ts
    - src/lib/actions/order-actions.ts
    - src/lib/actions/product-actions.ts
    - src/lib/actions/settings-actions.ts
    - src/lib/actions/payment-actions.ts
    - src/app/(dashboard)/dashboard/customers/customer-list-client.tsx
    - src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx
    - src/app/(dashboard)/dashboard/sessions/session-list-client.tsx
    - src/app/(dashboard)/dashboard/media/media-page-client.tsx
    - src/components/dashboard/customer-form.tsx
    - src/components/dashboard/appointment-form.tsx
    - src/components/dashboard/product-form.tsx
    - src/components/dashboard/session-form.tsx
    - src/components/dashboard/media-uploader.tsx
    - src/components/dashboard/order-detail.tsx
    - src/app/(dashboard)/dashboard/contacts/contacts-client.tsx
    - src/app/(dashboard)/dashboard/settings/settings-page-client.tsx
    - src/app/(dashboard)/dashboard/orders/columns.tsx
    - src/app/(dashboard)/dashboard/products/columns.tsx
    - src/components/portal/consent-form.tsx
decisions:
  - "Gallery grid uses nuqs shared parsers from gallery-filter-bar (single source of truth for URL state)"
  - "after() replaces .catch(() => {}) for all audit logging across 8 server action files"
  - "useMutation used for 4 dashboard list components (customer, appointment, session, media)"
  - "toast.promise applied to 15 files -- contact-form.tsx excluded as it uses React 19 useActionState pattern"
  - "payment-actions.ts included in after() migration (Rule 2 auto-fix) even though not in plan scope"
metrics:
  duration: 11min
  completed: "2026-03-26T04:58:43Z"
  tasks: 2
  files: 25
---

# Phase 10 Plan 03: nuqs Gallery Filters, useMutation + toast.promise, after() Audit Logging Summary

Wired nuqs useQueryStates into gallery filters replacing manual useSearchParams, upgraded all dashboard mutations with TanStack Query useMutation + sonner toast.promise() for loading/success/error feedback, and activated Next.js 16 after() for deferred audit logging in all server actions.

## Task 1: Gallery nuqs + Server Action after()

**Commit:** 92b07d9

### Gallery Filter Migration (STACK-03)

- `gallery-filter-bar.tsx` already had nuqs from prior plan context -- exported `galleryFilterParsers` for shared usage
- `gallery-grid.tsx` rewritten: removed `useSearchParams`, `Suspense` wrapper, and `GalleryClientInner` -- now uses `useQueryStates(galleryFilterParsers)` directly in `GalleryClient`
- Filter state reads from `filters.style`, `filters.placement`, `filters.size` (null-based, not undefined)
- `<GalleryFilterBar>` no longer receives `activeFilters` prop -- reads URL state internally

### after() Audit Logging (STACK-07)

All 8 server action files converted from `.catch(() => {})` to `after(() => logAudit(...))`:

| File | Instances |
|------|-----------|
| customer-actions.ts | 3 (create, update, delete) |
| appointment-actions.ts | 3 |
| session-actions.ts | 3 |
| media-actions.ts | 4 (create, update, delete, toggleVisibility) |
| order-actions.ts | 2 (updateStatus, refund) |
| product-actions.ts | 3 (create, update, delete) |
| settings-actions.ts | 1 (upsert) |
| payment-actions.ts | 2 (deposit, balance) |

The `hdrs` variable is captured before `after()` via `await headers()` during request processing. The after() callback references these captured values in its closure -- safe because after() runs after the response but the values were resolved during the request.

## Task 2: useMutation + toast.promise

**Commit:** cc1bc02

### useMutation (STACK-04)

4 dashboard list components upgraded with TanStack Query useMutation:

| Component | Mutations |
|-----------|-----------|
| customer-list-client.tsx | deleteMutation |
| appointment-list-client.tsx | deleteMutation, statusMutation |
| session-list-client.tsx | deleteMutation |
| media-page-client.tsx | deleteMutation, visibilityMutation |

Manual `isDeleting` state removed -- replaced with `mutation.isPending` for disabled states and button text.

### toast.promise (STACK-08)

15 files converted to `toast.promise()` with loading/success/error messages:

1. customer-list-client.tsx -- delete
2. appointment-list-client.tsx -- delete, status update
3. session-list-client.tsx -- delete
4. media-page-client.tsx -- visibility toggle, delete
5. customer-form.tsx -- create/update
6. appointment-form.tsx -- create/update
7. product-form.tsx -- create/update
8. session-form.tsx -- create
9. media-uploader.tsx -- save to portfolio
10. order-detail.tsx -- status update, refund
11. orders/columns.tsx -- status update, refund
12. settings-page-client.tsx -- save category
13. contacts-client.tsx -- status change
14. products/columns.tsx -- delete
15. consent-form.tsx -- sign consent

For server actions returning `{ success: false }` instead of throwing (order-actions, product-actions), the pattern checks `result.success` and throws if false, ensuring toast.promise shows the error message.

**Not converted:** `contact-form.tsx` uses React 19 `useActionState` with `useEffect`-based toast -- this is the correct progressive enhancement pattern and does not benefit from toast.promise (no imperative promise to wrap).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2] payment-actions.ts also converted to after()**
- **Found during:** Task 1
- **Issue:** payment-actions.ts had the same `.catch(() => {})` audit logging pattern but was not listed in the plan's scope
- **Fix:** Applied the same `after()` transformation (2 instances)
- **Files modified:** src/lib/actions/payment-actions.ts
- **Commit:** 92b07d9

## Verification

- `npx tsc --noEmit` -- PASSED (zero errors)
- `bun run build` -- PASSED (all routes compiled)
- Gallery: useQueryStates in both gallery-filter-bar.tsx and gallery-grid.tsx, no useSearchParams
- after(): 8 server action files use `after(`, zero `.catch(() => {})` remaining
- useMutation: 4 dashboard list components
- toast.promise: 15 files

## Known Stubs

None -- all mutations are wired to real server actions with proper feedback.

## Self-Check: PASSED

- All 25 modified files verified on disk
- Commit 92b07d9 (Task 1) verified in git log
- Commit cc1bc02 (Task 2) verified in git log
