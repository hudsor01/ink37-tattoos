# Phase 11: Full Stack Integration - Research B (Library Deep Dive)

**Researched:** 2026-03-26
**Domain:** Full API utilization audit across all major dependencies
**Confidence:** HIGH

## Summary

This research audits every major dependency in ink37-tattoos against its full API surface, identifying unused features that would materially improve the application. The project currently uses a narrow slice of each library -- mostly basic CRUD patterns. Significant value sits untapped in TanStack Query (SSR hydration, optimistic updates, query cancellation), TanStack Table (faceted filters, column pinning, createColumnHelper), Recharts (ComposedChart, RadarChart, Brush), and Drizzle ORM (prepared statements, $dynamic, arrayContains for tag filtering). The framer-motion situation is partially optimized -- 2 of 3 files already use LazyMotion/m, but gallery-grid.tsx still imports the full `motion` component adding ~30kb unnecessarily. Stripe and Resend usage is already solid for the current use case.

**Primary recommendation:** Prioritize TanStack Query SSR hydration + optimistic updates, fix the gallery-grid.tsx motion import, add Recharts ComposedChart for revenue analytics, and introduce Drizzle prepared statements for hot-path queries (dashboard stats, customer list).

## Project Constraints (from CLAUDE.md)

- Package manager: **bun** (never npm/yarn/pnpm)
- Framework: Next.js 16 + React 19.2
- ORM: Drizzle ORM 0.45.1 with neon-serverless driver
- Supabase Auth: NOT used -- project uses Better Auth
- Auth cookie methods: getAll/setAll only (global CLAUDE.md rule -- applies to Better Auth cookie handling too)
- Import db from @/lib/db, schema from @/lib/db/schema
- Server Actions for mutations, Route Handlers for webhooks only
- DAL pattern -- auth checks in server-only DB functions

---

## 1. TanStack Query v5 - Full API Utilization

**Installed:** @tanstack/react-query 5.91.3 (latest: 5.95.2)
**Confidence:** HIGH

### Current Usage (Narrow)

| Feature | Used | Where |
|---------|------|-------|
| useQuery | Yes | 4 dashboard list pages, media page |
| useMutation | Yes | media-page-client.tsx only |
| useQueryClient | Yes | 4 files for invalidation |
| QueryClientProvider | Yes | providers.tsx |
| queryOptions | Yes | query-options.ts (3 definitions) |
| keepPreviousData | Yes | query-options.ts, list pages |

### Unused Features - Assessment

#### useInfiniteQuery - APPLICABLE (gallery, customer list)
**What:** Fetches paginated data with automatic page tracking. Returns `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`.

**Where it applies in this project:**
- **Public gallery** -- currently loads ALL designs at once via `initialDesigns` prop. With 100+ portfolio items, this should paginate with infinite scroll.
- **Customer list** -- currently fetches all customers. Scales poorly beyond ~500 records.
- **Appointment list** -- same issue.

**Pattern:**
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['gallery', filters],
  queryFn: ({ pageParam }) => fetchDesigns({ ...filters, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

// Flatten pages for rendering
const allDesigns = data?.pages.flatMap(p => p.items) ?? [];
```

**Verdict:** HIGH value. Gallery and admin lists should use this.

#### useSuspenseQuery - APPLICABLE (dashboard pages)
**What:** Replaces useQuery when the component is wrapped in a `<Suspense>` boundary. Data is guaranteed non-null -- no loading state checks needed. In Next.js App Router with RSC, can prefetch on server and stream to client.

**Where it applies:**
- **Dashboard page** -- stats cards could use Suspense boundaries for streaming
- **Customer detail page** -- individual customer data
- **Portal pages** -- appointment/payment data

**Pitfall:** If you use useSuspenseQuery without prefetching on the server, it delays the entire HTML response until the query resolves. Always pair with server-side prefetch.

**Pattern:**
```typescript
// In server component or layout:
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

export default async function DashboardLayout({ children }) {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(dashboardStatsOptions);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}

// In client component:
const { data } = useSuspenseQuery(dashboardStatsOptions);
// data is always defined -- no loading checks needed
```

**Verdict:** MEDIUM value. Good DX improvement but requires Suspense boundary refactoring.

#### usePrefetchQuery - APPLICABLE (hover prefetch)
**What:** Prefetches query data on hover/focus before navigation. Warms the cache so the destination page renders instantly.

**Where it applies:**
- **Dashboard sidebar links** -- prefetch customer/appointment data on hover
- **Customer list rows** -- prefetch customer detail on hover
- **Gallery items** -- prefetch full-size image data on hover

**Pattern:**
```typescript
import { usePrefetchQuery } from '@tanstack/react-query';

function CustomerRow({ customer }) {
  usePrefetchQuery({
    queryKey: ['customer', customer.id],
    queryFn: () => fetchCustomerDetail(customer.id),
    // Only prefetch when hovering -- use onMouseEnter trigger
  });
}
```

**Verdict:** LOW priority. Nice-to-have polish feature.

#### useQueries - APPLICABLE (dashboard stats)
**What:** Runs multiple queries in parallel with a single hook call. Each query gets independent loading/error states.

**Where it applies:**
- **Dashboard page** -- could replace the current Promise.all in the RSC with client-side parallel queries
- **Customer detail** -- appointments + sessions + designs in parallel

**Pattern:**
```typescript
const results = useQueries({
  queries: [
    { queryKey: ['stats', 'customers'], queryFn: fetchCustomerCount },
    { queryKey: ['stats', 'revenue'], queryFn: fetchRevenue },
    { queryKey: ['stats', 'appointments'], queryFn: fetchAppointmentCount },
  ],
});
```

**Verdict:** LOW priority. Current RSC pattern with Promise.all works well. Only useful if moving stats to client-side fetching.

#### useIsFetching / useIsMutating - APPLICABLE (global indicators)
**What:** Returns the number of currently fetching/mutating queries. Useful for global loading spinners.

**Where it applies:**
- **Dashboard layout** -- show a subtle loading indicator in the header when any data is refreshing
- **Form submit buttons** -- disable globally during any mutation

**Pattern:**
```typescript
const isFetching = useIsFetching();
// Show a spinner in the header if isFetching > 0
```

**Verdict:** LOW priority. Nice polish.

#### Query Cancellation - APPLICABLE (search inputs)
**What:** Automatically cancels in-flight queries when a new query with the same key starts. Uses AbortSignal.

**Where it applies:**
- **Customer search** -- currently fires new query on each keystroke without cancelling previous
- **Appointment search** -- same pattern

**Pattern:**
```typescript
queryFn: ({ signal }) => fetch('/api/customers?q=' + query, { signal }).then(r => r.json()),
```

**Verdict:** MEDIUM value. Prevents wasted requests on fast typing.

#### Dependent Queries - ALREADY USED (implicitly)
**What:** Queries that depend on other query results use `enabled` option.

**Verdict:** Not needed -- current patterns don't chain queries.

#### Optimistic Updates - HIGH VALUE
**What:** Immediately updates UI before server confirms, rolls back on error.

**Where it applies:**
- **Appointment status changes** -- currently waits for server response
- **Media visibility toggle** -- currently uses toast.promise (shows loading state)
- **Customer delete** -- remove from list immediately

**Pattern:**
```typescript
const mutation = useMutation({
  mutationFn: toggleVisibility,
  onMutate: async ({ id, isPublic }) => {
    await queryClient.cancelQueries({ queryKey: ['media'] });
    const previous = queryClient.getQueryData(['media']);
    queryClient.setQueryData(['media'], (old) =>
      old.map(item => item.id === id ? { ...item, isPublic } : item)
    );
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['media'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['media'] });
  },
});
```

**Verdict:** HIGH value. Makes UI feel instant for toggles and status changes.

#### SSR Hydration (HydrationBoundary, dehydrate/hydrate) - HIGH VALUE
**What:** Prefetch queries on the server, serialize to HTML, hydrate on client. Zero loading flashes.

**Where it applies:** ALL pages that currently pass `initialData` via RSC props -- which is the current pattern but is suboptimal because:
1. `initialData` doesn't include query metadata (refetch timestamps)
2. `initialData` is only used if no cached data exists -- stale data won't be replaced
3. Hydration is the proper SSR pattern in Next.js App Router

**Current pattern (suboptimal):**
```typescript
// Server component passes data as prop
const media = await getMedia();
return <MediaPageClient initialMedia={media} />;

// Client uses initialData
const { data } = useQuery({ queryKey: ['media'], queryFn: ..., initialData: initialMedia });
```

**Correct pattern:**
```typescript
// Server component prefetches into QueryClient
const queryClient = new QueryClient();
await queryClient.prefetchQuery({ queryKey: ['media'], queryFn: getMedia });

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <MediaPageClient />
  </HydrationBoundary>
);

// Client component -- no initialData needed
const { data } = useQuery({ queryKey: ['media'], queryFn: fetchMediaClient });
```

**Verdict:** HIGH value. Should be the standard pattern for all dashboard pages.

### Priority Summary (TanStack Query)

| Feature | Priority | Impact |
|---------|----------|--------|
| SSR Hydration | HIGH | Eliminates loading flashes, proper SSR |
| Optimistic Updates | HIGH | Instant UI for toggles/deletes |
| useInfiniteQuery | HIGH | Gallery + lists need pagination |
| Query Cancellation | MEDIUM | Search input performance |
| useSuspenseQuery | MEDIUM | Cleaner data access patterns |
| usePrefetchQuery | LOW | Navigation polish |
| useQueries | LOW | Not needed with RSC pattern |
| useIsFetching | LOW | Global loading indicator polish |

---

## 2. TanStack Table v8 - Full API Utilization

**Installed:** @tanstack/react-table 8.21.3 (latest: 8.21.3 -- up to date)
**Confidence:** HIGH

### Current Usage

| Feature | Used | Notes |
|---------|------|-------|
| getCoreRowModel | Yes | |
| getSortedRowModel | Yes | |
| getFilteredRowModel | Yes | Single-column text filter |
| getPaginationRowModel | Yes | |
| Column visibility | Yes | Dropdown toggle |
| Row selection | Yes | Optional, with checkbox |
| ColumnDef (manual) | Yes | Using raw ColumnDef<T>[] |

### Unused Features - Assessment

#### createColumnHelper - APPLICABLE
**What:** Type-safe column definition helper. Replaces manual `ColumnDef` typing with inferred types from row data.

**Current pattern:**
```typescript
const columns: ColumnDef<Customer>[] = [
  { accessorKey: 'firstName', header: 'First Name' },
  // ...no type safety on accessorKey strings
];
```

**Better pattern:**
```typescript
const columnHelper = createColumnHelper<Customer>();
const columns = [
  columnHelper.accessor('firstName', { header: 'First Name' }),
  // TypeScript catches typos in 'firstName'
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => <Actions customer={row.original} />,
  }),
];
```

**Verdict:** MEDIUM value. Better DX and type safety, but not a functional improvement.

#### Faceted Filters (getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues) - HIGH VALUE
**What:** Automatically computes unique values and min/max ranges for filter columns. Enables dropdown/checkbox filter UIs that show available options.

**Where it applies:**
- **Appointment list** -- filter by status (SCHEDULED, CONFIRMED, etc.) with count badges
- **Customer list** -- no obvious facet, but could filter by acquisition month
- **Session list** -- filter by status with counts
- **Order list** -- filter by status (PENDING, PAID, SHIPPED, etc.)

**Pattern:**
```typescript
import { getFacetedRowModel, getFacetedUniqueValues } from '@tanstack/react-table';

const table = useReactTable({
  // ...existing config
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
});

// In filter UI:
const statusColumn = table.getColumn('status');
const uniqueStatuses = statusColumn?.getFacetedUniqueValues(); // Map<string, number>
// Renders: SCHEDULED (5), CONFIRMED (3), CANCELLED (1)
```

**Verdict:** HIGH value. Status filters with counts are standard in admin dashboards.

#### Grouping (getGroupedRowModel, getExpandedRowModel) - LOW VALUE
**What:** Groups rows by column values with expandable sections.

**Where it applies:**
- **Appointments by date** -- group by scheduled date
- **Sessions by customer** -- see all sessions for a customer grouped

**Verdict:** LOW priority. Not essential for a small studio with manageable data volumes.

#### Column Pinning - APPLICABLE
**What:** Pins columns to left/right edges so they stay visible during horizontal scroll.

**Where it applies:**
- **Wider tables** (orders, sessions) -- pin the "Actions" column to the right on mobile
- **Customer name** -- pin to the left when many columns are visible

**Pattern:**
```typescript
const table = useReactTable({
  state: { columnPinning: { left: ['name'], right: ['actions'] } },
  onColumnPinningChange: setColumnPinning,
});
```

**Verdict:** MEDIUM value. Important for mobile responsiveness of admin tables.

#### Global Filter - APPLICABLE
**What:** Single search input that filters across ALL columns simultaneously.

**Where it applies:**
- **DataTable component** currently only filters a single `searchKey` column. A global filter would let the admin search across name, email, phone, status simultaneously.

**Pattern:**
```typescript
const [globalFilter, setGlobalFilter] = useState('');
const table = useReactTable({
  state: { globalFilter },
  onGlobalFilterChange: setGlobalFilter,
  globalFilterFn: 'includesString', // or custom fuzzy
});
```

**Verdict:** HIGH value. Replaces the single-column search with multi-column.

#### Table State Persistence (via nuqs) - APPLICABLE
**What:** Persist sort, filter, and pagination state in URL search params.

**Where it applies:** The project already uses `nuqs` for URL state. Table state (current sort column, active filters, page number) should survive page refresh and be shareable via URL.

**Verdict:** MEDIUM value. Good UX improvement, leverages existing nuqs setup.

### Priority Summary (TanStack Table)

| Feature | Priority | Impact |
|---------|----------|--------|
| Faceted Filters | HIGH | Status filter dropdowns with counts |
| Global Filter | HIGH | Multi-column search |
| createColumnHelper | MEDIUM | Type safety improvement |
| Column Pinning | MEDIUM | Mobile table UX |
| State Persistence | MEDIUM | URL-persisted table state |
| Grouping/Expanding | LOW | Not essential for data volume |

---

## 3. Recharts - Full Library Utilization

**Installed:** recharts 2.15.4 (latest: 3.8.1 -- MAJOR version available)
**Confidence:** HIGH

### Current Usage

| Component | Used | Where |
|-----------|------|-------|
| AreaChart + Area | Yes | RevenueChart |
| BarChart + Bar | Yes | ClientAcquisitionChart |
| PieChart + Pie + Cell | Yes | AppointmentTypeChart |
| CartesianGrid | Yes | Revenue + Acquisition charts |
| XAxis, YAxis | Yes | Revenue + Acquisition charts |
| ChartContainer (shadcn) | Yes | Wrapper for all charts |
| ChartTooltip, ChartLegend | Yes | All charts |

### Unused Chart Types - Assessment for Tattoo Studio

#### LineChart - APPLICABLE
**What:** Simple line chart, lighter than AreaChart. Better for comparing multiple data series.

**Where it applies:**
- **Revenue comparison** -- this month vs. last month overlaid as two lines
- **Booking trends** -- weekly booking count over time

**Verdict:** MEDIUM value. Useful for year-over-year comparisons.

#### ComposedChart - HIGH VALUE
**What:** Combines multiple chart types (Line + Bar + Area) in a single chart. The most versatile chart type.

**Where it applies:**
- **Revenue dashboard** -- Bar for revenue amount + Line for session count overlay. This is the #1 missing chart for the analytics page.
- **Client acquisition** -- Bar for new clients + Line for retention rate

**Pattern:**
```typescript
import { ComposedChart, Line, Bar, Area } from 'recharts';

<ComposedChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis yAxisId="left" /> {/* Revenue */}
  <YAxis yAxisId="right" orientation="right" /> {/* Count */}
  <Bar dataKey="revenue" yAxisId="left" fill="var(--color-revenue)" />
  <Line dataKey="count" yAxisId="right" stroke="var(--color-sessions)" />
</ComposedChart>
```

**Verdict:** HIGH value. The revenue chart already has both revenue and count data -- a ComposedChart would show both.

#### RadarChart - APPLICABLE
**What:** Spider/web chart showing multiple dimensions on radial axes.

**Where it applies:**
- **Artist performance** -- plot dimensions like: sessions completed, average revenue, client satisfaction, rebooking rate, on-time percentage on a radar chart per artist.
- **Style distribution** -- show relative frequency of tattoo styles (realism, traditional, blackwork, etc.)

**Verdict:** MEDIUM value. Good for artist performance comparisons if multi-artist.

#### RadialBarChart - APPLICABLE
**What:** Circular bar chart. Good for showing progress toward goals.

**Where it applies:**
- **Monthly revenue goal** -- radial progress bar showing $X of $Y goal
- **Booking capacity** -- how full is the schedule this week/month

**Verdict:** MEDIUM value. Good for dashboard KPI cards.

#### ScatterChart - LOW VALUE
**What:** Shows correlation between two variables.

**Where it applies:**
- Could show price vs. duration correlation, but low priority for a tattoo studio.

**Verdict:** LOW priority.

#### FunnelChart - APPLICABLE
**What:** Shows conversion funnel stages with narrowing widths.

**Where it applies:**
- **Booking funnel** -- Contact form submissions -> Consultations booked -> Appointments scheduled -> Sessions completed -> Repeat clients

**Verdict:** MEDIUM value. Useful for understanding client conversion.

#### Treemap - LOW VALUE
**What:** Hierarchical data as nested rectangles.

**Where it applies:** Could show revenue by tattoo style/size, but pie chart already covers this.

**Verdict:** LOW priority.

#### Brush (zoom/pan) - APPLICABLE
**What:** Adds a brush slider below the chart for zooming into date ranges.

**Where it applies:**
- **Revenue chart** -- when viewing 12+ months of data, let the user brush to zoom into a specific quarter

**Pattern:**
```typescript
import { Brush } from 'recharts';

<AreaChart data={data}>
  {/* ...existing chart content */}
  <Brush dataKey="month" height={30} stroke="hsl(var(--primary))" />
</AreaChart>
```

**Verdict:** MEDIUM value. Useful for the revenue chart with a year of data.

#### ReferenceArea / ReferenceLine - APPLICABLE
**What:** Draws horizontal/vertical reference lines or highlighted areas on charts.

**Where it applies:**
- **Revenue chart** -- horizontal ReferenceLine at monthly revenue target
- **Booking chart** -- ReferenceArea highlighting holiday periods (typically slow)

**Verdict:** MEDIUM value. Adds context to charts.

### Priority Summary (Recharts)

| Feature | Priority | Impact |
|---------|----------|--------|
| ComposedChart | HIGH | Revenue + count overlay |
| RadialBarChart | MEDIUM | KPI goal progress |
| Brush | MEDIUM | Date range zooming |
| ReferenceLine | MEDIUM | Revenue targets on charts |
| RadarChart | MEDIUM | Artist performance |
| FunnelChart | MEDIUM | Booking conversion funnel |
| LineChart (overlay) | MEDIUM | Period comparisons |
| ScatterChart | LOW | Not needed |
| Treemap | LOW | Pie chart suffices |

### Version Note

Recharts 3.x is available (3.8.1) but is a major version with breaking API changes. The project is on 2.15.4. Upgrading is not recommended as part of this integration phase -- all documented patterns work with 2.x. Schedule recharts upgrade as a separate effort.

---

## 4. framer-motion - Bundle Impact and Optimization

**Installed:** framer-motion 12.38.0 (latest: 12.38.0 -- up to date)
**Confidence:** HIGH

### Current Usage Analysis

| File | Import Style | Bundle Impact |
|------|-------------|---------------|
| page-transition.tsx | `LazyMotion, domAnimation, m, AnimatePresence` | OPTIMIZED (~15kb shared) |
| hero-section.tsx | `LazyMotion, domAnimation, m` | OPTIMIZED (~15kb shared) |
| gallery-grid.tsx | `motion` (full import) | NOT OPTIMIZED (~34kb) |

### The Problem

`gallery-grid.tsx` imports `motion` directly from `framer-motion`, which bundles the full ~34kb motion component. The other 2 files correctly use `LazyMotion + m + domAnimation` which is ~15kb.

### The Fix

```typescript
// gallery-grid.tsx - BEFORE (34kb)
import { motion } from 'framer-motion';
<motion.div variants={containerVariants} ... />

// gallery-grid.tsx - AFTER (uses shared 15kb bundle)
import { LazyMotion, domAnimation, m } from 'framer-motion';
<LazyMotion features={domAnimation}>
  <m.div variants={containerVariants} ... />
</LazyMotion>
```

**Estimated savings:** ~19kb gzipped from removing the full motion bundle.

### framer-motion vs motion (the package)

The `framer-motion` package was rebranded to `motion` in late 2024. The API is identical, with imports changing from `"framer-motion"` to `"motion/react"`. However:

- The project uses `framer-motion` 12.38.0 which IS the latest version of the same package
- `motion` (npm package) is also at 12.38.0 -- they are the SAME package, just different import paths
- Migration is optional -- `framer-motion` imports still work and will continue to work
- If migrating: change `from 'framer-motion'` to `from 'motion/react'` and `m` to `from 'motion/react-m'`

### Bundle Size Comparison

| Configuration | Approx. Size (gzipped) |
|---------------|----------------------|
| Full `motion` component | ~34kb |
| `LazyMotion` + `domAnimation` (sync) | ~15kb |
| `LazyMotion` + `domMax` | ~27kb |
| `m` + `LazyMotion` initial render | ~4.6kb |
| CSS animations only | 0kb |
| react-spring (selective) | ~12kb |

### Recommendation

1. **Immediate:** Fix gallery-grid.tsx to use `LazyMotion + m` pattern (saves ~19kb)
2. **Optional:** Consider wrapping the LazyMotion provider at the layout level rather than in each component, so all 3 components share a single provider instance
3. **Do NOT** switch to the `motion` package name -- the framer-motion import path is fine and avoids churn
4. **Do NOT** switch to react-spring -- the current animations are simple opacity/transform animations that framer-motion handles well, and the team already knows the API

### CSS Animation Alternative Assessment

The 3 framer-motion use cases are:
1. **Page transitions** -- AnimatePresence + route-keyed animations. CSS cannot replicate AnimatePresence easily.
2. **Hero fade-in** -- Could be CSS `@keyframes` + `animation`, but the current pattern is fine.
3. **Gallery stagger** -- Staggered children with `staggerChildren: 0.06`. This COULD be done with CSS `animation-delay` but is cleaner with framer-motion.

**Verdict:** Keep framer-motion. The ~15kb (optimized) cost is justified for the DX.

---

## 5. Stripe - Full API Utilization

**Installed:** stripe 20.4.1 (latest: 21.0.1)
**Confidence:** HIGH

### Current Usage

| Feature | Used | Where |
|---------|------|-------|
| Checkout Sessions | Yes | store-actions.ts, webhook handler |
| PaymentIntents (retrieve) | Yes | Webhook handler |
| Charges (retrieve) | Yes | Receipt URL in webhook |
| Billing Portal | Yes | /api/portal/billing |
| Coupons (create) | Yes | Gift card discounts |
| Webhooks (constructEvent) | Yes | /api/webhooks/stripe |

### Unused Features - Assessment for Tattoo Studio

#### SetupIntents - APPLICABLE
**What:** Save a payment method for future use without charging. The client authorizes the card, and it's stored on their Stripe Customer for later charges.

**Where it applies:**
- **Returning clients** -- save card on first visit, charge deposits automatically for future sessions
- **No-show protection** -- require card on file to book, charge no-show fee if they don't show

**Verdict:** MEDIUM value. Useful for repeat clients and no-show protection. Requires customer.stripeCustomerId which already exists in the schema.

#### PaymentMethods Management - APPLICABLE
**What:** List, update, detach saved payment methods for a customer.

**Where it applies:**
- **Client portal** -- show saved cards, let client remove/update default payment method
- Already partially covered by Stripe Billing Portal integration

**Verdict:** LOW priority. Billing Portal already handles this.

#### Subscriptions - NOT APPLICABLE
**What:** Recurring billing at fixed intervals.

**Assessment:** A tattoo studio does not have subscription products. Aftercare plans could theoretically be subscriptions, but they are one-time purchases in practice.

**Verdict:** NOT needed. Skip.

#### Invoices - APPLICABLE
**What:** Generate formal invoices with line items, sent to customers.

**Where it applies:**
- **Session invoices** -- generate a professional invoice for each completed tattoo session
- **Tax records** -- customers may need invoices for record-keeping

**Verdict:** LOW priority. Current receipt URL from Stripe Checkout suffices. Full invoicing is overengineering for a single-artist studio.

#### Stripe Tax - APPLICABLE (if required by jurisdiction)
**What:** Automatic tax calculation based on customer location.

**Where it applies:**
- **Store checkout** -- automatically calculate sales tax on merch/prints
- **Tattoo services** -- some states tax tattoo services

**Verdict:** MEDIUM value if in a state that taxes services. Easy to add: `sessionParams.automatic_tax = { enabled: true }` in store-actions.ts. Requires Stripe Dashboard configuration.

#### Promotion Codes / Coupons - ALREADY PARTIALLY USED
**What:** Create and apply discounts to checkout sessions.

**Current state:** Coupons are already created for gift card discounts in store-actions.ts. Could extend to:
- **Referral discounts** -- 10% off for referred clients
- **First-time client promotion** -- promotional pricing

**Verdict:** LOW priority for now -- infrastructure is already there.

#### Connect (Multi-Artist Payouts) - NOT APPLICABLE
**What:** Platform model where multiple artists get paid through a single platform.

**Assessment:** This is a single-artist studio (Fernando Govea). Connect adds massive complexity for no benefit.

**Verdict:** NOT needed. Skip entirely.

### Priority Summary (Stripe)

| Feature | Priority | Impact |
|---------|----------|--------|
| Stripe Tax | MEDIUM | Legal compliance if required |
| SetupIntents | MEDIUM | Saved cards for repeat clients |
| Invoices | LOW | Professional invoicing |
| Promotions | LOW | Already have infrastructure |
| PaymentMethods | LOW | Billing Portal covers this |
| Subscriptions | SKIP | Not applicable |
| Connect | SKIP | Single-artist studio |

---

## 6. Resend - Full API Utilization

**Installed:** resend 6.9.4 (latest: 6.9.4 -- up to date)
**Confidence:** HIGH

### Current Usage (Comprehensive)

| Feature | Used | Where |
|---------|------|-------|
| emails.send | Yes | 4 email functions |
| batch.send | Yes | Contact notification (admin + customer) |
| HTML templates (inline) | Yes | 6 template functions |

### Unused Features - Assessment

#### Contacts Management - APPLICABLE
**What:** Store contacts in Resend with custom properties, segment by topics, manage subscriptions.

**Where it applies:**
- **Client mailing list** -- store customers as Resend contacts
- **Marketing emails** -- send promotions to clients who opted in
- **Topic segmentation** -- separate "appointment reminders" from "promotions" and "gallery updates"

**Verdict:** MEDIUM value. Useful if the studio wants to send marketing/promotional emails. Not needed for transactional-only email.

#### Webhooks (email.delivered, email.bounced, email.opened) - APPLICABLE
**What:** Get real-time notifications about email delivery status.

**Where it applies:**
- **Payment request tracking** -- know if the payment email was opened
- **Bounce handling** -- flag customer records with bad emails
- **Delivery confirmation** -- log in audit trail

**Verdict:** MEDIUM value. Bounce handling prevents sending to dead addresses.

#### Email Status Tracking - APPLICABLE
**What:** Check delivery/open/click status of sent emails via API.

**Where it applies:** Same as webhooks but pull-based. Webhooks are the better pattern.

**Verdict:** LOW priority. Use webhooks instead.

#### Templates (Resend Dashboard) - NOT RECOMMENDED
**What:** Create email templates in Resend's dashboard, reference by ID.

**Assessment:** The project already has inline HTML templates in `src/lib/email/templates.ts`. Moving to Resend's template system would mean templates live outside the codebase (harder to version control, harder to test).

**Verdict:** SKIP. Keep templates in code.

#### Inbound Email - NOT APPLICABLE
**What:** Receive emails at a Resend-managed address.

**Assessment:** The studio uses a contact form. Inbound email parsing adds complexity without benefit.

**Verdict:** SKIP.

### Priority Summary (Resend)

| Feature | Priority | Impact |
|---------|----------|--------|
| Webhooks (bounce) | MEDIUM | Bad email detection |
| Contacts | MEDIUM | Marketing segmentation |
| Idempotency keys | MEDIUM | Prevent duplicate sends |
| Templates (dashboard) | SKIP | Keep templates in code |
| Inbound Email | SKIP | Not applicable |

---

## 7. Sonner + date-fns + Vercel Blob

### Sonner v2 - Toast Types

**Installed:** sonner 2.0.7 (latest: 2.0.7 -- up to date)
**Confidence:** HIGH

#### Current Usage

| Method | Used | Count |
|--------|------|-------|
| toast.success | Yes | 8 files |
| toast.error | Yes | 10 files |
| toast.promise | Yes | 9 files |
| toast.warning | No | 0 |
| toast.info | No | 0 |
| toast.custom | No | 0 |
| toast.dismiss | No | 0 |
| toast.loading | No | 0 |

#### Unused Methods - Assessment

**toast.warning** -- APPLICABLE
- Form validation edge cases: "Phone number looks invalid but was saved"
- Session approaching budget: "This session is at 90% of the estimated cost"
- Schedule conflicts: "This time overlaps with an existing appointment"

**toast.info** -- APPLICABLE
- Non-error informational: "Appointment reminder sent to client"
- Status updates: "Gallery updated with 3 new images"
- Portal notices: "Your next appointment is in 2 days"

**toast.custom** -- LOW VALUE
- Could create branded toast designs, but standard types cover all needs

**toast.dismiss** -- APPLICABLE
- Dismiss stale toasts when navigating between dashboard pages
- Clear all notifications: `toast.dismiss()` with no args

**toast.loading** -- APPLICABLE (but toast.promise is better)
- Manual loading state management
- Use case: when you need to update the toast message mid-operation
- In most cases, `toast.promise` is simpler and covers the same need

### date-fns v4 - Underutilized Functions

**Installed:** date-fns 4.1.0 (latest: 4.1.0 -- up to date)
**Confidence:** HIGH

#### Current Usage

| Function | Used | Count |
|----------|------|-------|
| format | Yes | 10 files |
| formatDistance | Yes | 3 files |

#### Unused Functions for Tattoo Session Tracking

**formatDuration** -- HIGH VALUE for session tracking
```typescript
import { formatDuration, intervalToDuration } from 'date-fns';

// Session duration display
const duration = intervalToDuration({ start: sessionStart, end: sessionEnd });
formatDuration(duration, { format: ['hours', 'minutes'] });
// "2 hours 30 minutes"
```

**intervalToDuration** -- HIGH VALUE
- Convert session start/end into structured Duration object
- Calculate remaining time in ongoing sessions

**differenceInDays / differenceInHours / differenceInMinutes** -- HIGH VALUE
```typescript
import { differenceInDays } from 'date-fns';

// Days until next appointment
const daysUntil = differenceInDays(appointment.scheduledDate, new Date());
// "Your appointment is in 5 days"

// Session duration in hours
const hours = differenceInHours(session.endTime, session.startTime);
```

**isWithinInterval** -- MEDIUM VALUE
```typescript
import { isWithinInterval } from 'date-fns';

// Is today within the healing period (14 days after session)?
const inHealingPeriod = isWithinInterval(new Date(), {
  start: session.completedAt,
  end: addDays(session.completedAt, 14),
});
```

**eachDayOfInterval** -- MEDIUM VALUE
```typescript
import { eachDayOfInterval } from 'date-fns';

// Generate calendar days for booking availability
const days = eachDayOfInterval({
  start: startOfWeek(new Date()),
  end: endOfWeek(addWeeks(new Date(), 4)),
});
```

**startOfMonth / endOfMonth / startOfWeek** -- MEDIUM VALUE
- Date range calculations for analytics queries
- Weekly/monthly revenue aggregation date boundaries

### Vercel Blob vs Neon for File Storage

**Installed:** @vercel/blob 2.3.1 (latest: 2.3.1 -- up to date)
**Confidence:** HIGH

#### Current Architecture (CORRECT)

The project correctly uses the split pattern:
- **Vercel Blob** stores files (images, portfolio photos)
- **Neon PostgreSQL** stores metadata (fileUrl, thumbnailUrl, tags, etc.)

This is the right approach. Neon is a relational database -- it should NOT store binary files.

#### Current Upload Pattern

```
Client browser
  -> POST /api/upload (server-side, validates auth + file type + size)
  -> put() to Vercel Blob
  -> Returns { url, pathname }
  -> Client stores URL in form, submits to server action
  -> Server action saves metadata to Neon
```

#### Client-Side Upload Optimization

Vercel Blob supports **client-side direct uploads** which skip the server for the file transfer:

```typescript
// Current: Client -> Server -> Blob (double bandwidth)
// Better: Client -> Blob directly (with server-issued token)

// Server: generate client token
import { handleUpload } from '@vercel/blob/client';

// Client: upload directly
import { upload } from '@vercel/blob/client';
const blob = await upload(file.name, file, {
  access: 'public',
  handleUploadUrl: '/api/upload/token', // server endpoint that generates token
});
```

**Benefits:** Faster uploads, reduced server bandwidth, better for large files (videos).

**Verdict:** MEDIUM priority. Current server-side upload works, but client-side is better for portfolio images and videos (up to 500MB per file).

---

## 8. Drizzle ORM - Remaining Features

**Installed:** drizzle-orm 0.45.1 (latest: 0.45.1 -- up to date)
**Confidence:** HIGH

### Current Usage

| Feature | Used | Where |
|---------|------|-------|
| db.query (relational) | Yes | All DAL files |
| db.select (SQL builder) | Yes | Analytics |
| db.insert / update / delete | Yes | All DAL files |
| .returning() | Yes | All mutations |
| Transactions (db.transaction) | Yes | Webhook handler, store checkout |
| eq, and, or, ilike, desc, asc, count, sum, sql | Yes | Various |
| gte, inArray | Yes | Analytics, store actions |

### Unused Features - Assessment

#### .prepare() for Hot Paths - HIGH VALUE
**What:** Pre-compiles SQL query once, reuses binary format on subsequent calls. Eliminates SQL string concatenation overhead.

**Where it applies -- hot paths identified:**
1. **getDashboardStats** -- called on every dashboard page load
2. **getCustomers** -- called frequently in admin
3. **getSessions** -- called frequently in admin
4. **getCurrentSession (auth)** -- called on EVERY authenticated request

**Pattern:**
```typescript
// In DAL file (one-time preparation)
import { sql } from 'drizzle-orm';

const getCustomerCountStmt = db.select({ count: count() })
  .from(customer)
  .prepare('get_customer_count');

// Usage (reuses prepared statement)
const result = await getCustomerCountStmt.execute();

// With parameters:
const getCustomerByIdStmt = db.query.customer.findFirst({
  where: { id: { eq: sql.placeholder('id') } },
}).prepare('get_customer_by_id');

const customer = await getCustomerByIdStmt.execute({ id: 'abc-123' });
```

**Caveats with Neon Serverless:**
- Neon HTTP driver creates new connections per request -- prepared statements provide less benefit than with persistent connections
- With WebSocket driver (which this project uses via `pg` + `@neondatabase/serverless`), prepared statements DO help because the connection can be reused within a request
- The `.prepare()` name argument is optional in recent Drizzle versions

**Verdict:** HIGH value for frequently-called queries. Especially `getDashboardStats` which runs 5 parallel queries on every dashboard load.

#### $dynamic() for Conditional Queries - HIGH VALUE
**What:** Allows building queries dynamically by chaining `.where()` multiple times.

**Where it applies:**
- **getSessions** -- currently manually builds conditions array and passes to `and()`
- **Customer search** -- filters by multiple optional fields
- **Appointment list** -- status + search filters

**Current pattern (works but verbose):**
```typescript
const conditions = [];
if (filters?.status) conditions.push(eq(schema.tattooSession.status, filters.status));
return db.query.tattooSession.findMany({
  where: conditions.length > 0 ? and(...conditions) : undefined,
});
```

**With $dynamic():**
```typescript
const query = db.select().from(tattooSession).$dynamic();
if (filters?.status) query.where(eq(tattooSession.status, filters.status));
if (filters?.customerId) query.where(eq(tattooSession.customerId, filters.customerId));
return query;
```

**Note:** For the relational query builder (db.query), conditional filters are better handled by passing `undefined` for inactive conditions:
```typescript
db.query.tattooSession.findMany({
  where: and(
    filters?.status ? eq(schema.tattooSession.status, filters.status) : undefined,
    filters?.customerId ? eq(schema.tattooSession.customerId, filters.customerId) : undefined,
  ),
});
```

**Verdict:** HIGH value. Cleaner conditional query building, especially in the select/SQL builder mode.

#### exists() / notExists() - APPLICABLE
**What:** Subquery existence checks.

**Where it applies:**
- **Customers with no appointments** -- find customers who never booked
- **Sessions without payments** -- find unpaid sessions

**Pattern:**
```typescript
import { exists } from 'drizzle-orm';

// Customers who have at least one session
db.select().from(customer).where(
  exists(
    db.select().from(tattooSession)
      .where(eq(tattooSession.customerId, customer.id))
  )
);
```

**Verdict:** MEDIUM value. Useful for analytics and admin filters.

#### between() - APPLICABLE
**What:** SQL BETWEEN operator for date/number ranges.

**Where it applies:**
- **Analytics date ranges** -- currently uses `gte()` only. Adding `between()` for bounded ranges:
```typescript
import { between } from 'drizzle-orm';

// Revenue for a specific quarter
db.select().from(tattooSession).where(
  between(tattooSession.appointmentDate, startDate, endDate)
);
```

**Verdict:** MEDIUM value. Cleaner than `and(gte(), lte())`.

#### arrayContains() - HIGH VALUE
**What:** PostgreSQL `@>` operator for checking if an array column contains specific values.

**Where it applies:**
- **Media/Gallery tag filtering** -- the `media` table has a `tags` column (text array). Currently, the gallery filters by style/size/placement using JS `Array.some()` in the client. With `arrayContains`, this filtering moves to the database:

```typescript
import { arrayContains } from 'drizzle-orm';

// Find media tagged with "arm" and "blackwork"
db.select().from(media).where(
  arrayContains(media.tags, ['arm', 'blackwork'])
);
```

**Current client-side pattern (gallery-grid.tsx):**
```typescript
// This fetches ALL designs then filters in JS
const filtered = initialDesigns.filter(d =>
  (d.tags ?? []).some(tag => tag.toLowerCase() === filters.placement.toLowerCase())
);
```

**Better pattern:** Move filtering to the DAL/database query, fetch only matching designs.

**Verdict:** HIGH value. Moves tag filtering from client to database. Essential as portfolio grows.

#### Batch API (db.batch) - APPLICABLE
**What:** Sends multiple SQL statements in a single network roundtrip. Different from transactions -- batch is about reducing latency, transactions are about atomicity.

**Where it applies:**
- **Dashboard stats** -- currently uses `Promise.all` with 5 separate queries. With batch, all 5 go in one network call:

```typescript
const [customers, appointments, sessions, revenue, recent] = await db.batch([
  db.select({ count: count() }).from(customer),
  db.select({ count: count() }).from(appointment),
  db.select({ count: count() }).from(tattooSession).where(eq(tattooSession.status, 'COMPLETED')),
  db.select({ total: sum(tattooSession.totalCost) }).from(tattooSession).where(eq(tattooSession.status, 'COMPLETED')),
  db.query.appointment.findMany({ orderBy: [desc(appointment.scheduledDate)], limit: 5 }),
]);
```

**Caveat:** `db.batch()` is available for Neon HTTP driver (`neon-http`) but the project uses the WebSocket-based `pg` driver. With `pg`, `Promise.all` on the same connection already pipelines queries efficiently.

**Verdict:** LOW priority given the WebSocket driver. Would require driver change for benefit.

### Priority Summary (Drizzle)

| Feature | Priority | Impact |
|---------|----------|--------|
| arrayContains | HIGH | Server-side tag filtering |
| .prepare() | HIGH | Hot-path query performance |
| $dynamic / conditional | HIGH | Cleaner filter building |
| between() | MEDIUM | Cleaner date range queries |
| exists() | MEDIUM | Analytics subqueries |
| db.batch() | LOW | Requires HTTP driver |

---

## Common Pitfalls

### Pitfall 1: HydrationBoundary Memory Leaks
**What goes wrong:** Creating a new QueryClient inside a server component on every request without cleanup.
**Why it happens:** Server components re-execute on every request. Each creates a new QueryClient that holds cached data.
**How to avoid:** Create QueryClient once per request in a wrapper, let it GC naturally after response.
**Warning signs:** Memory usage growing on server over time.

### Pitfall 2: framer-motion Full Bundle in One File
**What goes wrong:** A single file importing `motion` instead of `m + LazyMotion` adds ~19kb to the bundle.
**Why it happens:** Easy to forget the LazyMotion pattern when adding new components.
**How to avoid:** Lint rule or code review checklist -- never import `motion` directly from `framer-motion`.
**Warning signs:** Bundle analysis shows duplicate framer-motion chunks.

### Pitfall 3: Recharts 2.x to 3.x Breaking Changes
**What goes wrong:** Upgrading recharts to 3.x breaks existing chart components.
**Why it happens:** Major version with API changes.
**How to avoid:** Pin to 2.15.x. Upgrade separately with dedicated testing.

### Pitfall 4: Drizzle arrayContains with Empty Arrays
**What goes wrong:** `arrayContains(column, [])` throws an error.
**Why it happens:** Drizzle validates against empty arrays.
**How to avoid:** Guard: `tags.length > 0 ? arrayContains(media.tags, tags) : undefined`.

### Pitfall 5: Optimistic Updates with Multiple Query Keys
**What goes wrong:** Optimistic update updates one query key but forgets to cancel/update related queries.
**Why it happens:** Same entity appears under multiple query keys (e.g., customer in list and detail views).
**How to avoid:** Use `queryClient.invalidateQueries({ queryKey: ['media'] })` as base key to catch all variants.

### Pitfall 6: Stripe SDK Major Version
**What goes wrong:** stripe 20.4.1 is installed but 21.0.1 is latest. Major version includes breaking API changes.
**Why it happens:** Stripe bumps major versions with their API version changes.
**How to avoid:** Pin to current version (20.x). Read the migration guide before upgrading. The API version `2026-02-25.clover` in the project may differ from `2026-03-25.dahlia` in the latest SDK.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion package name | motion package name | Late 2024 | Import path change only, API identical |
| TanStack Query initialData SSR | HydrationBoundary + dehydrate | TQ v5 (2024) | Proper SSR hydration |
| Recharts 2.x | Recharts 3.x available | 2025 | Breaking changes, do not upgrade yet |
| Drizzle RQB v1 | Drizzle RQB v2 | Drizzle 1.0-beta | New where syntax, not yet stable |
| date-fns v3 | date-fns v4 | 2024 | Timezone support, dual ESM/CJS |

---

## Open Questions

1. **Recharts 3.x upgrade path**
   - What we know: 3.x is available with breaking changes
   - What's unclear: Specific breaking changes affecting this project's patterns
   - Recommendation: Research separately when planning a recharts upgrade phase

2. **Drizzle RQB v2**
   - What we know: New relational query builder with different where syntax is in beta
   - What's unclear: When it will be stable, whether current 0.45.1 patterns will need migration
   - Recommendation: Stay on current RQB v1 patterns until v2 is stable

3. **Stripe API version pinning**
   - What we know: Project pins to `2026-02-25.clover`, latest SDK has `2026-03-25.dahlia`
   - What's unclear: Whether the new API version has changes affecting this integration
   - Recommendation: Read Stripe changelog before upgrading to 21.x

---

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 Docs](https://tanstack.com/query/v5/docs) -- SSR guide, hooks reference
- [TanStack Table v8 Docs](https://tanstack.com/table/v8/docs) -- column defs, filtering, grouping
- [Recharts API](https://recharts.github.io/en-US/api/) -- all chart type documentation
- [Motion.dev - Reduce Bundle Size](https://motion.dev/docs/react-reduce-bundle-size) -- LazyMotion guide
- [Motion.dev - LazyMotion](https://motion.dev/docs/react-lazy-motion) -- feature bundles
- [Drizzle ORM - Dynamic Queries](https://orm.drizzle.team/docs/dynamic-query-building) -- $dynamic docs
- [Drizzle ORM - Filters](https://orm.drizzle.team/docs/operators) -- arrayContains, between, exists
- [Drizzle ORM - Prepared Statements](https://orm.drizzle.team/docs/perf-queries) -- .prepare() docs
- [Drizzle ORM - Batch API](https://orm.drizzle.team/docs/batch-api) -- batch for Neon
- [Vercel Blob - Client Uploads](https://vercel.com/docs/vercel-blob/client-upload) -- direct upload pattern
- [Sonner Toast API](https://sonner.emilkowal.ski/toast) -- all toast types
- [date-fns.org](https://date-fns.org/) -- v4 function reference

### Secondary (MEDIUM confidence)
- [LogRocket - React Animation Libraries 2026](https://blog.logrocket.com/best-react-animation-libraries/) -- bundle size comparisons
- [Resend - New Features 2025](https://resend.com/blog/new-features-in-2025) -- contacts, templates, inbound
- [Resend - Webhooks](https://resend.com/docs/webhooks/introduction) -- webhook event types
- [Stripe Docs](https://docs.stripe.com) -- SetupIntents, Tax, billing portal
- [Stripe Node.js GitHub Releases](https://github.com/stripe/stripe-node/releases) -- SDK version changes

### Tertiary (LOW confidence)
- npm registry version checks -- package versions verified via `npm view`

## Metadata

**Confidence breakdown:**
- TanStack Query: HIGH -- verified against official v5 docs and current project code
- TanStack Table: HIGH -- verified against official v8 docs and current data-table.tsx
- Recharts: HIGH -- verified against official API docs and source repo
- framer-motion: HIGH -- verified against motion.dev docs, current code audited
- Stripe: HIGH -- verified against official docs and current webhook handler
- Resend: HIGH -- verified against official docs and current email module
- Sonner: HIGH -- verified against official docs and current toast usage
- date-fns: HIGH -- verified against official docs and current format usage
- Drizzle ORM: HIGH -- verified against official docs and current DAL patterns
- Vercel Blob: HIGH -- verified against official docs and current upload handler

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable libraries, monthly validity)
