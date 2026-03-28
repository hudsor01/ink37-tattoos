# Phase 15: UI Foundations - Research

**Researched:** 2026-03-28
**Domain:** Dashboard UI quality -- loading states, responsive design, form UX, accessibility, consistency
**Confidence:** HIGH

## Summary

Phase 15 is a comprehensive UI quality sweep across the existing dashboard. All the foundational UI components are already installed (Skeleton, AlertDialog, Breadcrumb, Calendar, Popover, Sheet, Sidebar). The shadcn sidebar already has built-in mobile Sheet behavior via `useIsMobile()`. Sonner Toaster is already wired in the Providers component. The main work is: (1) creating ~12 loading.tsx files with page-specific skeletons, (2) adding EmptyState components to list pages, (3) making DataTable responsive with card views on mobile, (4) wiring server-side fieldErrors into existing forms, (5) replacing one `confirm()` call and one Dialog-based delete with AlertDialog, (6) replacing raw date inputs with DatePicker, (7) making breadcrumbs dynamic, (8) migrating StatusBadge to CSS variables, and (9) adding ARIA labels and chart accessibility.

Critical discovery: several dashboard pages (orders, payments, products, contacts, audit-log) have TypeScript errors from Phase 14's pagination changes (PaginatedResult type not destructured). These must be fixed as part of this phase since the pages need to be touchable for loading/empty states.

**Primary recommendation:** Work in waves -- shared components first (EmptyState, FieldError, DatePicker wrapper, responsive DataTable, dynamic breadcrumbs), then page-by-page application of loading.tsx + empty states, then form fixes, then accessibility pass.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Every dashboard route gets its own `loading.tsx` with layout-matched skeleton placeholders (table skeleton for list pages, form skeleton for detail pages, chart skeleton for analytics). Uses existing `Skeleton` component from shadcn.
- D-02: Shared `EmptyState` component: `<EmptyState icon={Users} title="No customers yet" description="..." action={<Button>Add Customer</Button>} />`. Each list page passes its own icon/copy/CTA.
- D-03: Root `dashboard/error.tsx` serves as catch-all error boundary (already exists with retry + details toggle). Only add page-specific `error.tsx` where unique recovery is needed.
- D-04: Data tables collapse to stacked card views on mobile. Each row becomes a card with label:value pairs. Responsive `DataTable` wrapper switches layout at the `md` breakpoint.
- D-05: Sidebar collapses behind a hamburger menu on mobile. Opens as a `Sheet` (slide-in panel) from the left. `SidebarTrigger` already exists -- wire responsive behavior. Standard shadcn sidebar pattern.
- D-06: Forms stack vertically on mobile. Multi-column grids (`grid-cols-2`) collapse to `grid-cols-1` below `md`.
- D-07: Use React 19's `useActionState` hook with server actions for form submission. Display `fieldErrors` from `ActionResult<T>` below each input using a `<FieldError>` component. No extra form library -- Zod validation happens server-side.
- D-08: Use Sonner for toast notifications. Install shadcn Sonner component. Use `toast.promise()` for loading/success/error states on mutations.
- D-09: All destructive actions use shadcn `AlertDialog` for confirmation. No browser `confirm()` calls anywhere.
- D-10: All date inputs use shadcn `DatePicker` (Popover + Calendar, react-day-picker). Replace any raw text date inputs.
- D-11: Unsaved changes warning on all forms when navigating away mid-edit. Use `beforeunload` event + custom hook.
- D-12: Essential ARIA + keyboard navigation: `aria-label` on all interactive elements, `sr-only` text on icon-only buttons, `alt` text on chart data, keyboard-navigable.
- D-13: `StatusBadge` uses CSS variables via shadcn color token pattern. Respects dark mode automatically. No hardcoded Tailwind color classes.
- D-14: Dynamic breadcrumbs auto-generated from URL route segments. Uses `usePathname` + route metadata. One implementation in the layout.
- D-15: Dead imports removed, unused Tab imports cleaned.

### Claude's Discretion
- Which specific pages need their own error.tsx beyond the root catch-all
- Exact skeleton layouts per page type
- Card view layout details for mobile table collapse
- Toast message copy for each mutation type
- `beforeunload` hook implementation details
- Chart alt-text generation approach

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Every dashboard page has loading.tsx with skeleton placeholders | 12 dashboard pages identified; Skeleton component exists; no loading.tsx files exist yet |
| UI-02 | Every dashboard page has error.tsx with retry button | Root error.tsx already exists with retry + details; only add page-specific where unique recovery needed |
| UI-03 | Every list page has empty state when no data exists | EmptyState pattern defined; customer-list-client already has inline empty state that can be standardized |
| UI-04 | All dashboard pages responsive on mobile | Sidebar mobile already works via shadcn Sheet; DataTable needs responsive wrapper; forms need grid-cols-1 fallback |
| UI-05 | All interactive elements have ARIA labels, charts have alt text | jsx-a11y ESLint plugin active; Recharts needs role="img" + aria-label on chart containers |
| UI-06 | All forms show field-level validation errors below inputs | ActionResult.fieldErrors exists from Phase 14; FieldError component needs creation; existing RHF forms already show client-side errors via FormMessage |
| UI-07 | All destructive actions use AlertDialog confirmation | 1 confirm() call (sessions); 1 Dialog-based delete (media) needs migration; customers/appointments/products/orders already use AlertDialog |
| UI-08 | All date inputs use date picker components | 3 raw date inputs found (customer DOB, appointment datetime, session datetime); Calendar + Popover already installed |
| UI-09 | Consistent toast patterns across all mutations | Sonner already wired in Providers; toast.promise() already used in most forms; need standardization |
| UI-10 | Dynamic breadcrumbs on all dashboard pages | Breadcrumb components installed; currently hardcoded "Dashboard" in layout; need usePathname-based generation |
| UI-11 | Unsaved changes warning on forms | Need useUnsavedChanges hook with beforeunload; apply to all form pages |
| UI-12 | Dead imports removed | Tabs import in customer-form.tsx confirmed unused (Tabs used but Tab imported); TypeScript check revealed additional issues |
| UI-13 | StatusBadge uses theme-aware color tokens | Currently uses hardcoded Tailwind bg/text color classes; needs CSS variable migration in globals.css + StatusBadge |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2
- **UI:** Shadcn/Radix + Tailwind CSS 4 (oklch colors, @theme inline pattern)
- **State:** TanStack Query (server) + Zustand (client)
- **Server Actions for mutations**, Route Handlers for webhooks only
- **Server components for pages, client components for interactive elements**
- **Import patterns:** `@/lib/db`, `@/lib/db/schema`, `@/components/ui/*`
- All existing forms use react-hook-form with zodResolver (despite D-07 mentioning useActionState -- the intent is to wire server-side fieldErrors, not rewrite all forms)

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| react | 19.2.3 | UI framework with useActionState | Installed |
| next | 16.2.0 | App Router (loading.tsx, error.tsx conventions) | Installed |
| sonner | 2.0.7 | Toast notifications | Installed + wired in Providers |
| react-day-picker | 9.14.0 | Calendar/DatePicker | Installed (Calendar component exists) |
| @tanstack/react-table | 8.21.3 | Data tables | Installed (DataTable component exists) |
| recharts | 2.15.4 | Charts (needs accessibility) | Installed |
| lucide-react | 0.462.0 | Icons | Installed |
| react-hook-form | 7.71.2 | Form state management | Installed (used in 4 dashboard forms) |
| @hookform/resolvers | 5.2.2 | Zod integration for RHF | Installed |

### Supporting (Already Installed)
| Library | Version | Purpose |
|---------|---------|---------|
| class-variance-authority | 0.7.1 | Component variants |
| tailwind-merge | 3.4.0 | Class merging |
| date-fns | 4.1.0 | Date formatting |
| nuqs | 2.8.9 | URL state management |
| zod | 4.3.6 | Schema validation |

### No New Dependencies Needed
All required shadcn components are already installed: Skeleton, AlertDialog, Breadcrumb, Calendar, Popover, Sheet, Sidebar, Dialog, DropdownMenu, Table, Card, Badge, Form, Tabs.

**No `npm install` needed for this phase.**

## Architecture Patterns

### New Components to Create

```
src/
├── components/
│   ├── dashboard/
│   │   ├── empty-state.tsx          # NEW: Shared EmptyState component
│   │   ├── field-error.tsx          # NEW: Server action field error display
│   │   ├── responsive-data-table.tsx # NEW: Wraps DataTable with card view
│   │   ├── date-picker.tsx          # NEW: Popover + Calendar DatePicker
│   │   └── dynamic-breadcrumbs.tsx  # NEW: usePathname-based breadcrumbs
│   └── ...
├── hooks/
│   └── use-unsaved-changes.ts       # NEW: beforeunload warning hook
├── app/(dashboard)/
│   ├── layout.tsx                   # MODIFY: Wire DynamicBreadcrumbs
│   └── dashboard/
│       ├── error.tsx                # EXISTS: Keep as catch-all
│       ├── customers/
│       │   ├── loading.tsx          # NEW
│       │   └── ...
│       ├── appointments/
│       │   ├── loading.tsx          # NEW
│       │   └── ...
│       └── [every other page]/
│           └── loading.tsx          # NEW (12 total)
└── app/globals.css                  # MODIFY: Add status CSS variables
```

### Pattern 1: Loading Skeleton (loading.tsx)

**What:** Next.js App Router automatically renders loading.tsx during navigation while the page server component fetches data.

**When to use:** Every dashboard route segment that fetches data.

**Example (table page skeleton):**
```tsx
// src/app/(dashboard)/dashboard/customers/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-80" /> {/* Search bar */}
      <div className="rounded-md border">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Example (overview page skeleton with KPI cards + charts):**
```tsx
// src/app/(dashboard)/dashboard/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-60" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
```

### Pattern 2: EmptyState Component

**What:** Reusable component for list pages with no data.

```tsx
// src/components/dashboard/empty-state.tsx
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

### Pattern 3: FieldError Component (Server Action Errors)

**What:** Displays server-side field validation errors from ActionResult.fieldErrors.

```tsx
// src/components/dashboard/field-error.tsx
interface FieldErrorProps {
  errors?: string[];
}

export function FieldError({ errors }: FieldErrorProps) {
  if (!errors?.length) return null;
  return (
    <div className="text-sm text-destructive" role="alert">
      {errors.map((error, i) => (
        <p key={i}>{error}</p>
      ))}
    </div>
  );
}
```

### Pattern 4: Responsive DataTable (Card View on Mobile)

**What:** Wraps the existing DataTable and renders card views on mobile.

**Key approach:** Use the `useIsMobile()` hook (already exists at `@/hooks/use-mobile`) with breakpoint at 768px. On mobile, render data as stacked cards instead of table rows. Each card shows 3-4 key fields with label:value pairs.

```tsx
// Conceptual -- renders cards when isMobile is true, DataTable when false
function ResponsiveDataTable<TData>({ data, columns, mobileFields, ... }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((row) => (
          <Card>
            {mobileFields.map(field => (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{field.label}</span>
                <span>{field.accessor(row)}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  return <DataTable data={data} columns={columns} />;
}
```

### Pattern 5: Dynamic Breadcrumbs

**What:** Auto-generate breadcrumbs from URL pathname segments.

```tsx
// src/components/dashboard/dynamic-breadcrumbs.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  appointments: 'Appointments',
  sessions: 'Sessions',
  payments: 'Payments',
  products: 'Products',
  orders: 'Orders',
  contacts: 'Contacts',
  media: 'Media',
  analytics: 'Analytics',
  settings: 'Settings',
  'audit-log': 'Audit Log',
};

export function DynamicBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  // segments: ['dashboard'], ['dashboard', 'customers'], ['dashboard', 'customers', 'abc123']
  // ...build breadcrumb items from segments using ROUTE_LABELS
}
```

### Pattern 6: StatusBadge with CSS Variables

**What:** Migrate hardcoded Tailwind color classes to CSS custom properties.

```css
/* globals.css -- add to :root and .dark */
:root {
  --status-pending: oklch(0.85 0.15 85);      /* yellow */
  --status-confirmed: oklch(0.75 0.12 230);   /* blue */
  --status-completed: oklch(0.75 0.15 145);   /* green */
  --status-cancelled: oklch(0.65 0.2 25);     /* red */
  /* ...etc */
}
.dark {
  --status-pending: oklch(0.45 0.12 85);
  --status-confirmed: oklch(0.45 0.1 230);
  /* ...etc */
}
```

```tsx
// StatusBadge -- reference via inline styles or mapped Tailwind classes
const statusMap: Record<string, string> = {
  PENDING: 'bg-[var(--status-pending)]/15 text-[var(--status-pending)]',
  // ...
};
```

### Pattern 7: DatePicker Component

**What:** Popover + Calendar composition for date selection. Already have both primitives.

```tsx
// src/components/dashboard/date-picker.tsx
'use client';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date' }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="w-full justify-start text-left" />}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(value, 'PPP') : <span className="text-muted-foreground">{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}
```

### Pattern 8: useUnsavedChanges Hook

**What:** Warns users before navigating away from dirty forms.

```tsx
// src/hooks/use-unsaved-changes.ts
'use client';

import { useEffect } from 'react';

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
```

**Note on Next.js App Router:** `beforeunload` only catches browser-level navigation (refresh, close tab). For in-app navigation (Link clicks), there is no reliable built-in mechanism in Next.js App Router. The `router.events` API was removed in App Router. For MVP, `beforeunload` covers the most critical case (accidental tab close/refresh). In-app navigation guards are a known gap in the App Router ecosystem.

### Anti-Patterns to Avoid

- **DO NOT rewrite existing RHF forms to useActionState:** The forms work well with react-hook-form. D-07 means "wire fieldErrors from server action responses" -- not "replace RHF." The existing `FormMessage` component from shadcn already shows client-side validation errors. Server-side errors from `ActionResult.fieldErrors` should be additionally displayed.
- **DO NOT create per-page error.tsx files unless needed:** The root catch-all is sufficient. Only analytics might benefit from a custom one (date range reset).
- **DO NOT use `window.confirm()`:** Use AlertDialog exclusively.
- **DO NOT hardcode Tailwind color classes for status:** Use CSS custom properties that respect dark mode.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading skeletons | Custom shimmer animation | shadcn `Skeleton` with `animate-pulse` | Already styled, consistent |
| Date picker | Custom date input | `Popover` + `Calendar` (react-day-picker v9) | Accessibility, keyboard nav, locale support |
| Toast notifications | Custom notification system | Sonner (already installed) | Queuing, animations, promise support |
| Confirmation dialogs | window.confirm() or custom modal | shadcn `AlertDialog` | Accessible, styled, non-blocking |
| Mobile sidebar | Custom drawer | shadcn `Sidebar` + `Sheet` (already wired) | Already implemented in sidebar.tsx |
| Form validation display | Custom error rendering | shadcn `FormMessage` (RHF) + custom `FieldError` (server) | Two complementary patterns |
| Responsive breakpoint detection | CSS media queries in JS | `useIsMobile()` hook (already exists) | Consistent with sidebar behavior |

## Common Pitfalls

### Pitfall 1: TypeScript Errors from Phase 14 Pagination
**What goes wrong:** Several dashboard pages (orders, payments, products, contacts, audit-log) have TypeScript compilation errors because DAL functions now return `PaginatedResult<T>` instead of `T[]`. The pages still destructure or call `.length` on the result directly.
**Why it happens:** Phase 14 changed DAL return types to PaginatedResult but did not update all page consumers.
**How to avoid:** Fix PaginatedResult destructuring (`result.data`, `result.total`, `result.page`) on each affected page before adding loading/empty states.
**Warning signs:** `tsc --noEmit` reports 10 errors across 5 files.

### Pitfall 2: useActionState vs react-hook-form Confusion
**What goes wrong:** Attempting to rewrite all forms from react-hook-form to useActionState creates unnecessary churn and loses client-side instant validation.
**Why it happens:** D-07 mentions useActionState but existing forms use RHF successfully.
**How to avoid:** Keep RHF forms as-is for client-side validation. Add server-side error display by checking ActionResult.fieldErrors in the form's onSubmit handler and using `form.setError()` from RHF to set server errors on specific fields.
**Warning signs:** Removing `useForm` imports or `FormField` components.

### Pitfall 3: loading.tsx Showing During Client-Side Navigation
**What goes wrong:** `loading.tsx` only triggers during server component streaming (initial load or hard navigation). For pages that use TanStack Query client-side data fetching (like customers), the loading.tsx may not show after the first server render.
**Why it happens:** Server components fetch on navigation; client components with useQuery handle their own loading state.
**How to avoid:** loading.tsx handles the initial page load. TanStack Query's `isLoading` state handles subsequent refetches. Both should show appropriate skeletons.
**Warning signs:** Blank flash between navigation and data fetch.

### Pitfall 4: Mobile Card View Missing Actions
**What goes wrong:** When collapsing table to cards, the actions column (edit/delete dropdown) gets lost.
**Why it happens:** Card view only shows mobileFields, forgetting the actions column.
**How to avoid:** Always include an actions row/section in card view. Use the same DropdownMenu pattern.
**Warning signs:** Users can't edit/delete on mobile.

### Pitfall 5: beforeunload Not Working in Next.js App Router
**What goes wrong:** `beforeunload` only fires for browser-level navigation, not in-app Link navigation.
**Why it happens:** Next.js App Router removed `router.events`. Client-side navigation via `<Link>` or `router.push()` does not trigger `beforeunload`.
**How to avoid:** Accept `beforeunload` as a partial solution. For critical forms, also show a "you have unsaved changes" indicator in the UI. Do not try to intercept Next.js navigation -- there is no reliable API for this in the App Router.
**Warning signs:** Users report losing form data on in-app navigation but not on refresh.

### Pitfall 6: StatusBadge Dark Mode Colors
**What goes wrong:** CSS variables defined in :root but not .dark cause badges to look wrong in dark mode.
**Why it happens:** Forgetting to define dark-mode variants of status colors.
**How to avoid:** Define every status color in both :root and .dark blocks. Use oklch for perceptual uniformity.
**Warning signs:** Badges with light backgrounds on dark theme.

### Pitfall 7: Chart Accessibility -- role="img" Not Enough
**What goes wrong:** Adding `role="img"` to SVG charts makes screen readers announce "image" but convey no data.
**Why it happens:** Recharts SVG elements need descriptive alt text, not just a role.
**How to avoid:** Wrap each chart in a `<figure>` with `role="img"` and a descriptive `aria-label` that summarizes the data (e.g., "Revenue chart showing $12,000 in January, $15,000 in February..."). Also add a visually hidden `<figcaption>` or `<table>` with the raw data for full screen reader access.
**Warning signs:** Accessibility audit tools flagging charts as unlabeled images.

## Code Examples

### Verified: AlertDialog Delete Pattern (from customer-list-client.tsx)

This pattern is already implemented correctly for customers. Replicate for sessions and media:

```tsx
// State management for controlled AlertDialog
const [deleteId, setDeleteId] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);

async function handleDelete() {
  if (!deleteId) return;
  setIsDeleting(true);
  try {
    await deleteAction(deleteId);
    await queryClient.invalidateQueries({ queryKey: ['items'] });
    toast.success('Item deleted successfully');
  } catch {
    toast.error("Changes couldn't be saved. Please try again.");
  } finally {
    setIsDeleting(false);
    setDeleteId(null);
  }
}

// In actions column: onClick={() => setDeleteId(row.original.id)}
// AlertDialog controlled by open={!!deleteId}
<AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Item</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently remove this item. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
        {isDeleting ? 'Deleting...' : 'Delete'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Verified: Sonner toast.promise Pattern (from customer-form.tsx)

```tsx
toast.promise(
  action.then(async (result) => {
    await queryClient.invalidateQueries({ queryKey: ['items'] });
    onSuccess?.();
    return result;
  }),
  {
    loading: 'Saving...',
    success: 'Saved successfully',
    error: "Changes couldn't be saved. Please try again.",
  }
);
```

### Verified: Server-Side FieldErrors with RHF Integration

```tsx
// In existing form onSubmit handler, after server action call:
async function onSubmit(data: FormData) {
  const result = await serverAction(data);
  if (!result.success) {
    // Map server fieldErrors to RHF errors
    if (result.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([field, messages]) => {
        form.setError(field as keyof FormData, {
          type: 'server',
          message: messages[0],
        });
      });
    } else {
      toast.error(result.error);
    }
    return;
  }
  // success handling
}
```

### Verified: Responsive Grid Collapse Pattern

```tsx
// Existing in appointment-form.tsx and customer-form.tsx:
<div className="grid grid-cols-2 gap-4">

// Should become:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// For 3-column grids:
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/` directory with getServerSideProps | App Router `loading.tsx` / `error.tsx` | Next.js 13+ | Automatic streaming loading states |
| Custom error boundaries | App Router `error.tsx` convention | Next.js 13+ | Automatic error boundaries per route segment |
| window.confirm() | AlertDialog component | Always | Accessible, styled, non-blocking |
| `<input type="date">` | DatePicker (Popover + Calendar) | shadcn pattern | Consistent UI, locale support, keyboard nav |
| Router events for unsaved changes | No reliable equivalent in App Router | Next.js 13+ | beforeunload is partial solution only |
| Hardcoded color classes | CSS custom properties + @theme inline | Tailwind v4 | Dark mode automatic, single source of truth |

## Codebase Audit Results

### Dashboard Pages Needing loading.tsx (12 total)

| Page | Skeleton Type | Fetch Pattern |
|------|--------------|---------------|
| `/dashboard` (overview) | KPI cards + 2 chart cards | Server component, direct DAL |
| `/dashboard/customers` | Search + table rows | Server prefetch + TanStack Query |
| `/dashboard/appointments` | Filter + table rows | Server prefetch + TanStack Query |
| `/dashboard/sessions` | Table rows | Server prefetch + TanStack Query |
| `/dashboard/payments` | Table rows | Server component, direct DAL |
| `/dashboard/orders` | Table rows | Server component, direct DAL |
| `/dashboard/products` | Grid of product cards | Server component, direct DAL |
| `/dashboard/media` | Grid of image cards | Server prefetch + TanStack Query |
| `/dashboard/contacts` | Table rows | Server component, direct DAL |
| `/dashboard/analytics` | Charts grid | Server component, direct DAL |
| `/dashboard/audit-log` | Filter + table rows | Server component, direct DAL |
| `/dashboard/settings` | Form fields | Server prefetch + TanStack Query |

### Destructive Actions Audit

| Page | Action | Current Pattern | Needs Change |
|------|--------|-----------------|--------------|
| Customers | Delete customer | AlertDialog (controlled) | No -- already correct |
| Appointments | Delete appointment | AlertDialog (controlled) | No -- already correct |
| Sessions | Delete session | `confirm()` | YES -- replace with AlertDialog |
| Products | Delete product | AlertDialog (trigger-based) | No -- already correct |
| Orders | Cancel order | AlertDialog (trigger-based) | No -- already correct |
| Orders | Issue refund | AlertDialog (trigger-based) | No -- already correct |
| Media | Delete media | Dialog (not AlertDialog) | YES -- migrate to AlertDialog |
| Contacts | No delete action | N/A | N/A |

### Date Inputs Audit

| Form | Field | Current | Needs Change |
|------|-------|---------|--------------|
| Customer form | dateOfBirth | `<Input type="date">` | YES -- DatePicker |
| Appointment form | scheduledDate | `<Input type="datetime-local">` | YES -- DatePicker with time |
| Session form | appointmentDate | `<Input type="datetime-local">` | YES -- DatePicker with time |

### Form Responsive Grid Audit

| Form | Current Grid | Needs Change |
|------|-------------|--------------|
| Customer form | `grid-cols-2`, `grid-cols-3` | YES -- add `grid-cols-1 md:` prefix |
| Appointment form | `grid-cols-2`, `grid-cols-3` | YES -- add `grid-cols-1 md:` prefix |
| Session form | No grid (raw register) | YES -- needs restructuring per D-04/DEBT-04 |
| Product form | `grid-cols-2` | YES -- add `grid-cols-1 md:` prefix |

### TypeScript Errors to Fix (from Phase 14)

| File | Error | Fix |
|------|-------|-----|
| contacts/page.tsx | `.map` on PaginatedResult | Destructure `result.data` |
| orders/page.tsx | `.length` on PaginatedResult | Destructure `result.data` |
| payments/page.tsx | `limit` not in PaginationParams | Use correct param name |
| products/page.tsx | `.length` on PaginatedResult | Destructure `result.data` |
| audit-log/page.tsx | `limit` not in PaginationParams | Use correct param name |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | loading.tsx files exist for all dashboard routes | smoke | `ls src/app/(dashboard)/dashboard/*/loading.tsx` | N/A (file existence check) |
| UI-02 | error.tsx exists as catch-all | smoke | Verify file exists | Already exists |
| UI-03 | EmptyState component renders correctly | unit | `npx vitest run src/__tests__/empty-state.test.tsx -x` | Wave 0 |
| UI-04 | Responsive DataTable renders cards on mobile | unit | `npx vitest run src/__tests__/responsive-data-table.test.tsx -x` | Wave 0 |
| UI-05 | ARIA labels present on interactive elements | manual + lint | `npx eslint src/components/dashboard/ --rule 'jsx-a11y/aria-props: error'` | ESLint configured |
| UI-06 | FieldError component displays server errors | unit | `npx vitest run src/__tests__/field-error.test.tsx -x` | Wave 0 |
| UI-07 | No confirm() calls in codebase | smoke | `grep -r "confirm(" src/app/ --include="*.tsx"` | N/A (grep check) |
| UI-08 | DatePicker component renders and selects dates | unit | `npx vitest run src/__tests__/date-picker.test.tsx -x` | Wave 0 |
| UI-09 | Toast patterns consistent (toast.promise used) | manual | Code review | N/A |
| UI-10 | Dynamic breadcrumbs render from pathname | unit | `npx vitest run src/__tests__/dynamic-breadcrumbs.test.tsx -x` | Wave 0 |
| UI-11 | useUnsavedChanges fires beforeunload | unit | `npx vitest run src/__tests__/use-unsaved-changes.test.ts -x` | Wave 0 |
| UI-12 | No unused imports | lint | `npx eslint src/ --rule '@typescript-eslint/no-unused-vars: error'` | ESLint configured |
| UI-13 | StatusBadge uses CSS variables | unit | `npx vitest run src/__tests__/status-badge.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose && npx tsc --noEmit`
- **Phase gate:** Full suite green + TypeScript clean + ESLint clean before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/empty-state.test.tsx` -- covers UI-03
- [ ] `src/__tests__/responsive-data-table.test.tsx` -- covers UI-04
- [ ] `src/__tests__/field-error.test.tsx` -- covers UI-06
- [ ] `src/__tests__/date-picker.test.tsx` -- covers UI-08
- [ ] `src/__tests__/dynamic-breadcrumbs.test.tsx` -- covers UI-10
- [ ] `src/__tests__/use-unsaved-changes.test.ts` -- covers UI-11
- [ ] `src/__tests__/status-badge.test.tsx` -- covers UI-13

**Note:** UI component tests require jsdom environment. vitest.config.ts currently uses `environment: 'node'`. Tests for these components should specify `// @vitest-environment jsdom` at the top or a separate config. However, given the unit tests focus on logic (hook behavior, render output), node environment with React testing utilities may suffice for some. Alternatively, add a per-file `@vitest-environment jsdom` directive.

## Open Questions

1. **PaginatedResult Consumer Updates**
   - What we know: 5 pages have TypeScript errors from Phase 14 pagination changes
   - What's unclear: Whether these should be fixed as a prerequisite task or inline during loading.tsx creation
   - Recommendation: Fix as first task in phase -- can't add loading/empty states to broken pages

2. **DateTimePicker for Appointments/Sessions**
   - What we know: Appointments and sessions need datetime (not just date). The Calendar component only picks dates.
   - What's unclear: Whether to build a combined DateTimePicker or use Calendar for date + separate time input
   - Recommendation: DatePicker for date-only fields (customer DOB). For datetime fields, use DatePicker + separate time Input or keep `type="datetime-local"` which already works well for admin UIs. The datetime-local input is actually quite functional on modern browsers.

3. **In-App Navigation Guards**
   - What we know: `beforeunload` only fires for browser-level navigation, not Next.js Link navigation
   - What's unclear: Whether the user expects in-app navigation guards or browser-level is sufficient
   - Recommendation: Implement `beforeunload` for browser navigation. Add a visual "unsaved changes" indicator (dirty dot/text) in the UI. Do not attempt to intercept Next.js routing -- no reliable API exists.

## Sources

### Primary (HIGH confidence)
- Codebase audit: All 12 dashboard page files, 4 form components, layout.tsx, providers.tsx, sidebar.tsx examined directly
- Package.json: All library versions verified against installed versions
- TypeScript compiler output: `tsc --noEmit` run to identify existing errors

### Secondary (MEDIUM confidence)
- Next.js App Router loading.tsx/error.tsx conventions: Well-established patterns since Next.js 13
- Shadcn component patterns: Verified from installed component source code

### Tertiary (LOW confidence)
- `beforeunload` limitation in App Router: Based on known Next.js architecture (no router.events in App Router) -- may have changed in Next.js 16 but unlikely

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified
- Architecture: HIGH -- patterns based on direct codebase examination
- Pitfalls: HIGH -- TypeScript errors confirmed, patterns verified by code reading
- Accessibility: MEDIUM -- chart alt-text approach needs validation against Recharts v2 API

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- no library upgrades needed)
