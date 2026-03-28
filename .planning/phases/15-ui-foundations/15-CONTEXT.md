# Phase 15: UI Foundations - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add proper loading, error, and empty states to every dashboard page. Make all pages responsive on mobile (tables collapse to cards, sidebar collapses to sheet, forms stack). Wire field-level validation to ActionResult fieldErrors. Add AlertDialog confirmations for all destructive actions. Add essential accessibility (ARIA labels, keyboard nav). Fix UI consistency issues (StatusBadge theme tokens, dynamic breadcrumbs, toast patterns, date pickers). No new features or pages.

</domain>

<decisions>
## Implementation Decisions

### Loading & Empty States
- **D-01:** Every dashboard route gets its own `loading.tsx` with layout-matched skeleton placeholders (table skeleton for list pages, form skeleton for detail pages, chart skeleton for analytics). Uses existing `Skeleton` component from shadcn.
- **D-02:** Shared `EmptyState` component: `<EmptyState icon={Users} title="No customers yet" description="..." action={<Button>Add Customer</Button>} />`. Each list page passes its own icon/copy/CTA.
- **D-03:** Root `dashboard/error.tsx` serves as catch-all error boundary (already exists with retry + details toggle). Only add page-specific `error.tsx` where unique recovery is needed (e.g., analytics with date range reset).

### Mobile Responsiveness
- **D-04:** Data tables collapse to stacked card views on mobile. Each row becomes a card with label:value pairs. Responsive `DataTable` wrapper switches layout at the `md` breakpoint.
- **D-05:** Sidebar collapses behind a hamburger menu on mobile. Opens as a `Sheet` (slide-in panel) from the left. `SidebarTrigger` already exists — wire responsive behavior. Standard shadcn sidebar pattern.
- **D-06:** Forms stack vertically on mobile. Multi-column grids (`grid-cols-2`) collapse to `grid-cols-1` below `md`.

### Form UX & Validation
- **D-07:** Use React 19's `useActionState` hook with server actions for form submission. Display `fieldErrors` from `ActionResult<T>` below each input using a `<FieldError>` component. No extra form library — Zod validation happens server-side.
- **D-08:** Use **Sonner** for toast notifications. Install shadcn Sonner component. Use `toast.promise()` for loading/success/error states on mutations. Consistent toast patterns across all actions (UI-09).
- **D-09:** All destructive actions (delete customer, cancel appointment, remove media, etc.) use shadcn `AlertDialog` for confirmation. No browser `confirm()` calls anywhere.
- **D-10:** All date inputs use shadcn `DatePicker` (Popover + Calendar, react-day-picker). Replace any raw text date inputs.
- **D-11:** Unsaved changes warning on all forms when navigating away mid-edit (UI-11). Use `beforeunload` event + a custom hook.

### Accessibility & Consistency
- **D-12:** Essential ARIA + keyboard navigation: `aria-label` on all interactive elements, `sr-only` text on icon-only buttons, `alt` text on chart data, ensure all controls are keyboard-navigable. WCAG 2.1 AA basics.
- **D-13:** `StatusBadge` uses CSS variables via shadcn color token pattern (e.g., `--status-confirmed`, `--status-pending`). Respects dark mode automatically. No hardcoded Tailwind color classes.
- **D-14:** Dynamic breadcrumbs auto-generated from URL route segments. Dashboard > Customers > John Doe. Uses `usePathname` + route metadata. One implementation in the layout, works everywhere.
- **D-15:** Dead imports removed, unused Tab imports cleaned (UI-12).

### Claude's Discretion
- Which specific pages need their own error.tsx beyond the root catch-all
- Exact skeleton layouts per page type
- Card view layout details for mobile table collapse
- Toast message copy for each mutation type
- `beforeunload` hook implementation details
- Chart alt-text generation approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing UI Components
- `src/components/ui/skeleton.tsx` — Skeleton component (already installed)
- `src/components/ui/alert-dialog.tsx` — AlertDialog component (already installed)
- `src/components/ui/breadcrumb.tsx` — Breadcrumb component (already installed)
- `src/components/ui/table.tsx` — Table component (used by DataTable)
- `src/components/dashboard/data-table.tsx` — DataTable with TanStack React Table (needs responsive wrapper)
- `src/components/dashboard/status-badge.tsx` — StatusBadge (needs theme token migration)
- `src/components/dashboard/analytics-chart.tsx` — Chart component (needs alt text)

### Dashboard Layout
- `src/app/(dashboard)/layout.tsx` — Dashboard layout (sidebar, breadcrumb, auth check)
- `src/app/(dashboard)/dashboard/error.tsx` — Existing error boundary (has retry + details)
- `src/components/dashboard/admin-nav.tsx` — Sidebar navigation (needs mobile Sheet behavior)

### Forms
- `src/components/dashboard/customer-form.tsx` — Customer form (needs field-level errors)
- `src/components/dashboard/appointment-form.tsx` — Appointment form (needs date picker, field errors)
- `src/components/dashboard/session-form.tsx` — Session form (needs field errors)
- `src/components/dashboard/product-form.tsx` — Product form (needs field errors)

### Server Actions (ActionResult from Phase 14)
- `src/lib/actions/types.ts` — ActionResult<T> type with fieldErrors
- `src/lib/actions/safe-action.ts` — safeAction wrapper

### Dashboard Pages (all need loading.tsx)
- `src/app/(dashboard)/dashboard/customers/page.tsx`
- `src/app/(dashboard)/dashboard/appointments/page.tsx`
- `src/app/(dashboard)/dashboard/sessions/page.tsx`
- `src/app/(dashboard)/dashboard/payments/page.tsx`
- `src/app/(dashboard)/dashboard/orders/page.tsx`
- `src/app/(dashboard)/dashboard/products/page.tsx`
- `src/app/(dashboard)/dashboard/media/page.tsx`
- `src/app/(dashboard)/dashboard/contacts/page.tsx`
- `src/app/(dashboard)/dashboard/analytics/page.tsx`
- `src/app/(dashboard)/dashboard/audit-log/page.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx` (overview)

### Theming
- `src/app/globals.css` — Global CSS with shadcn theme tokens (oklch colors, :root/.dark)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Skeleton` component — ready to use in loading.tsx files
- `AlertDialog` component — installed, needs wiring to delete actions
- `Breadcrumb` components — installed, currently hardcoded "Dashboard"
- `DataTable` — TanStack React Table with sorting, filtering, pagination
- `SidebarProvider`/`SidebarTrigger` — sidebar infrastructure exists

### Established Patterns
- shadcn/ui component library with Tailwind CSS v4 + oklch color tokens
- `@custom-variant dark (&:is(.dark *))` for dark mode
- `@theme inline` for mapping CSS vars to Tailwind utilities
- Server components for pages, client components for interactive elements
- `useActionState` pattern already used in some forms

### Integration Points
- `loading.tsx` files are Next.js App Router convention — auto-shown during navigation
- `error.tsx` files are Next.js error boundaries — auto-catch rendering errors
- `ActionResult.fieldErrors` → `<FieldError>` component → inline display below inputs
- Sonner `<Toaster>` goes in root layout, `toast()` callable from any client component
- `data-table.tsx` wrapper controls table vs card rendering based on viewport

</code_context>

<specifics>
## Specific Ideas

- Sonner for toasts (shadcn ecosystem standard)
- shadcn DatePicker = Popover + Calendar (react-day-picker)
- useActionState (React 19) for form submission, NOT react-hook-form
- StatusBadge CSS variables should follow the shadcn pattern: define in :root/.dark, map via @theme inline
- Mobile card view for tables should show the most important 3-4 fields per card, not all columns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-ui-foundations*
*Context gathered: 2026-03-28*
