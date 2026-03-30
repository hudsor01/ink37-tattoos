# Phase 21: Analytics Depth - Research

**Researched:** 2026-03-28
**Domain:** SQL aggregation analytics, Recharts charting, Drizzle ORM
**Confidence:** HIGH

## Summary

Phase 21 adds four analytics verticals (revenue, booking, customer, operational) to the existing Phase 19 analytics page. The existing codebase provides a strong foundation: Recharts charting with ChartContainer/ChartConfig, KPICard with trend arrows, DateRangePicker with URL-driven date ranges, CSV/PDF export, and period-over-period comparison. All new functionality is additive -- new DAL functions with SQL aggregation queries and new chart components rendered within the existing analytics page.

The data layer is well-suited for these queries. The `tattooSession` table has `style`, `size`, `totalCost`, `estimatedHours`, and `status` fields for revenue and operational analytics. The `appointment` table has `status`, `type`, `scheduledDate`, and `duration` for booking analytics. The `payment` table has `type`, `status`, `amount`, and `createdAt` for payment success/refund rates. The `customer` table's `createdAt` enables churn detection. The `contact` table serves as the top of the booking funnel. Business hours are stored in the `settings` table under key `business_hours` as JSON, enabling capacity utilization calculations.

**Primary recommendation:** Use tab-based navigation to organize the four verticals within the existing analytics page. Add ~10 new DAL functions using Drizzle SQL template literals for aggregation. Use Recharts FunnelChart (available in recharts 2.15.4) for the booking funnel and a CSS-grid heatmap for peak hours (Recharts has no native heatmap). Extend the existing AnalyticsData type and comparison system to cover new KPIs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Claude decides everything -- SQL queries, chart types, layout, KPI computation approach. All new analytics are additions to the existing analytics page from Phase 19.
- D-02: Use existing patterns: SQL GROUP BY with date_trunc (Phase 14), Recharts (existing), DateRangePicker (Phase 17), CSV/PDF export (Phase 19).
- D-03: Claude implements: revenue by design type/size, average transaction value, payment success rate, refund rate. New DAL functions with SQL aggregation.
- D-04: Claude implements: conversion funnel (contact->appointment->completed), peak booking hours, capacity utilization. Funnel chart or bar chart.
- D-05: Claude implements: CLV per client (sum of all payments), repeat client percentage, churn risk indicators (clients with no activity in X months).
- D-06: Claude implements: avg session duration by type, no-show rate trends over time, scheduling efficiency (gaps between appointments, utilization %).

### Claude's Discretion
- All SQL queries and aggregation logic
- Chart type per metric (bar, line, pie, heatmap, funnel, area)
- Layout arrangement (tabs per vertical, sections on one page, separate sub-pages)
- KPI card placement and trend indicators
- Churn risk threshold definition (e.g., no activity in 90 days)
- Peak hours visualization (heatmap vs bar chart)
- Capacity utilization calculation (booked hours / available hours)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANLYT-01 | Revenue analytics -- revenue by design type/size, average transaction value, payment success rate, refund rate | tattooSession.style, tattooSession.size, tattooSession.totalCost for type/size breakdowns; payment.status for success/refund rates; SQL GROUP BY with CASE expressions |
| ANLYT-02 | Booking analytics -- booking conversion funnel, lead time analysis, peak hours detection, capacity utilization | contact/appointment/tattooSession tables form funnel stages; extract(hour) for peak hours; business_hours setting for capacity calc; Recharts FunnelChart available |
| ANLYT-03 | Customer analytics -- customer lifetime value calculation, repeat client percentage, churn risk indicators, referral tracking | SUM(totalCost) GROUP BY customerId for per-client CLV; COUNT(DISTINCT) for repeat rate; last-activity date comparison for churn risk; no referral data in schema (skip referral tracking) |
| ANLYT-04 | Operational metrics -- average session duration by type, no-show rate trends, scheduling efficiency | tattooSession.estimatedHours by style/type; appointment NO_SHOW counts by month; gap analysis between sequential appointments |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15.4 | All chart visualizations | Already used throughout analytics/reports pages |
| drizzle-orm | 0.45.1 | SQL aggregation queries | Project ORM, sql template for GROUP BY/CASE/EXTRACT |
| date-fns | 4.1.0 | Date math for periods/ranges | Already used in analytics DAL |
| react-day-picker | 9.14.0 | DateRangePicker | Already wired in analytics page |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @base-ui/react | (installed) | Tabs component | Tab navigation for analytics verticals |
| lucide-react | (installed) | Icons for KPI cards | New KPI card icons |
| sonner | (installed) | Toast notifications | Export feedback |

### No New Dependencies Required
All functionality can be built with existing packages. Recharts includes FunnelChart, BarChart, LineChart, PieChart, AreaChart, ComposedChart, and LabelList. No heatmap library needed -- use CSS grid with colored cells for peak hours visualization.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    dal/
      analytics.ts           # Extend with ~10 new exported functions
  app/
    (dashboard)/
      dashboard/
        analytics/
          page.tsx            # Add new data fetching (extend getAnalyticsDataByDateRange)
          analytics-client.tsx # Add tab navigation, render new verticals
  components/
    dashboard/
      analytics-chart.tsx     # Add new chart components (funnel, heatmap, etc.)
```

### Pattern 1: Tab-Based Analytics Layout
**What:** Use Tabs component to organize four verticals (Revenue, Bookings, Customers, Operations) within the existing analytics page. Keep the header (DateRangePicker, export, comparison toggle) above tabs so it applies globally.
**When to use:** When adding multiple analytics sections that would create too much vertical scrolling on one page.
**Example:**
```typescript
// In analytics-client.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="revenue">
  <TabsList>
    <TabsTrigger value="revenue">Revenue</TabsTrigger>
    <TabsTrigger value="bookings">Bookings</TabsTrigger>
    <TabsTrigger value="customers">Customers</TabsTrigger>
    <TabsTrigger value="operations">Operations</TabsTrigger>
  </TabsList>
  <TabsContent value="revenue">
    {/* KPI cards + charts for revenue vertical */}
  </TabsContent>
  {/* ... */}
</Tabs>
```

### Pattern 2: Drizzle SQL Aggregation with EXTRACT/CASE
**What:** Use sql template literals for PostgreSQL-specific aggregation functions (EXTRACT, CASE WHEN, date_trunc) that Drizzle's query API does not support natively.
**When to use:** All analytics DAL functions that need aggregation, grouping, or conditional counting.
**Example:**
```typescript
// Peak hours query using EXTRACT
const peakHours = await db.select({
  hour: sql<number>`cast(extract(hour from ${appointment.scheduledDate}) as integer)`,
  count: sql<number>`cast(count(*) as integer)`,
})
  .from(appointment)
  .where(and(
    gte(appointment.scheduledDate, from),
    lte(appointment.scheduledDate, to),
  ))
  .groupBy(sql`extract(hour from ${appointment.scheduledDate})`);

// Revenue by style with CASE for grouping
const revenueByStyle = await db.select({
  style: tattooSession.style,
  revenue: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)::numeric`,
  count: sql<number>`cast(count(*) as integer)`,
})
  .from(tattooSession)
  .where(and(
    eq(tattooSession.status, 'COMPLETED'),
    gte(tattooSession.appointmentDate, from),
    lte(tattooSession.appointmentDate, to),
  ))
  .groupBy(tattooSession.style);
```

### Pattern 3: Extended Data Interface
**What:** Extend the existing AnalyticsData interface to include new vertical data, keeping backward compatibility with existing charts.
**When to use:** When adding new data to the server -> client data pipeline.
**Example:**
```typescript
// Extend existing interface
export interface AnalyticsDataExtended extends AnalyticsData {
  revenueByStyle: { style: string; revenue: number; count: number }[];
  revenueBySize: { size: string; revenue: number; count: number }[];
  paymentSuccessRate: { successRate: number; refundRate: number; total: number };
  bookingFunnel: { stage: string; value: number; fill: string }[];
  peakHours: { hour: number; count: number }[];
  customerCLV: { customerId: string; name: string; clv: number; sessions: number }[];
  repeatRate: number;
  churnRisk: { customerId: string; name: string; lastActivity: Date; daysSince: number }[];
  durationByType: { type: string; avgDuration: number; count: number }[];
  noShowTrends: { month: string; rate: number; total: number; noShows: number }[];
  schedulingEfficiency: number;
}
```

### Pattern 4: Recharts FunnelChart for Booking Funnel
**What:** Use Recharts' built-in FunnelChart component for the contact->appointment->completed conversion funnel.
**When to use:** Booking analytics vertical.
**Example:**
```typescript
import { FunnelChart, Funnel, Tooltip, LabelList } from 'recharts';

const funnelData = [
  { name: 'Contacts', value: 120, fill: CHART_COLORS[0] },
  { name: 'Appointments', value: 80, fill: CHART_COLORS[1] },
  { name: 'Completed', value: 55, fill: CHART_COLORS[2] },
];

<ChartContainer config={funnelConfig} className="min-h-[300px] w-full">
  <FunnelChart>
    <Tooltip content={<ChartTooltipContent />} />
    <Funnel dataKey="value" data={funnelData} isAnimationActive>
      <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
    </Funnel>
  </FunnelChart>
</ChartContainer>
```

### Pattern 5: CSS Grid Heatmap for Peak Hours
**What:** Build a custom heatmap component using CSS grid and color interpolation for peak booking hours by day-of-week and hour. Recharts has no native heatmap component.
**When to use:** Peak hours visualization in booking analytics.
**Example:**
```typescript
// Simple CSS-grid heatmap for 7 days x 8-10 hour slots
function PeakHoursHeatmap({ data }: { data: { day: number; hour: number; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="grid grid-cols-[auto_repeat(8,1fr)] gap-1 text-xs">
      {/* header row with hours */}
      {/* data rows with colored cells */}
      {data.map(cell => (
        <div
          key={`${cell.day}-${cell.hour}`}
          className="rounded h-8 flex items-center justify-center"
          style={{ backgroundColor: `hsl(220, 70%, ${100 - (cell.count / maxCount) * 50}%)` }}
        >
          {cell.count}
        </div>
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Loading all rows into JavaScript for aggregation:** Always use SQL GROUP BY / SUM / AVG / COUNT at the database level. The existing `getRevenueData` and `getClientAcquisitionData` functions actually do JS-side aggregation (Map loop) -- new functions MUST use SQL GROUP BY as mandated by DAL-03 and established in Phase 14.
- **Separate API routes for each analytics query:** Use server component data fetching with Promise.all, not individual API endpoints. Follow the existing pattern in `analytics/page.tsx`.
- **Overloading a single query:** Each analytics metric should have its own DAL function for clarity and reusability. Don't try to compute all metrics in one giant SQL query.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Funnel visualization | Custom SVG trapezoid shapes | Recharts FunnelChart + Funnel + LabelList | Built into recharts 2.15.4, handles sizing/animation/labels |
| Date range filtering | Custom date state management | Existing DateRangePicker + URL searchParams pattern | Already wired in analytics page with server component revalidation |
| Period comparison | Manual previous-period logic | Existing getComparisonPeriodData pattern | Auto-calculates previous period from date range |
| CSV export | Custom serialization | Existing exportToCsv utility | Already handles escaping, blob download |
| PDF export | Custom PDF generation | Existing Stirling PDF route + HTML template | Already wired with health check, error handling |

**Key insight:** Phase 19 built all the analytics infrastructure (date ranges, export, comparison). Phase 21 only adds new DAL queries and chart components -- the plumbing is done.

## Common Pitfalls

### Pitfall 1: Drizzle numeric() returns strings
**What goes wrong:** SQL aggregation results like SUM, AVG return string representations from PostgreSQL numeric columns.
**Why it happens:** Drizzle's numeric type with mode:'number' only applies to schema-defined columns, not to arbitrary sql<> template results.
**How to avoid:** Always cast with `::numeric` in the SQL and wrap with `Number()` in TypeScript: `sql<number>\`coalesce(sum(...), 0)::numeric\``. The existing analytics DAL already does this correctly -- follow the same pattern.
**Warning signs:** Chart axes showing "NaN" or data points at 0 when data exists.

### Pitfall 2: GROUP BY clause must match SELECT expression exactly
**What goes wrong:** Drizzle generates different SQL for the SELECT column vs GROUP BY expression, causing PostgreSQL error "column must appear in GROUP BY clause or be used in an aggregate function".
**Why it happens:** If you write `sql\`extract(hour from ...)\`` in select and `sql\`extract(hour from ...)\`` in groupBy separately, Drizzle treats them as different expressions.
**How to avoid:** Define the expression once as a variable and reference it in both select and groupBy:
```typescript
const hourExpr = sql<number>`cast(extract(hour from ${appointment.scheduledDate}) as integer)`;
const result = await db.select({ hour: hourExpr, count: count() })
  .from(appointment)
  .groupBy(hourExpr);
```
**Warning signs:** PostgreSQL error about GROUP BY clause.

### Pitfall 3: Booking funnel requires cross-table counting, not joins
**What goes wrong:** Attempting to JOIN contact -> appointment -> session to build funnel counts double-counts or misses records.
**Why it happens:** Contact, appointment, and session are not always linked (contacts can exist without appointments, appointments without sessions).
**How to avoid:** Run three separate COUNT queries for each funnel stage, not a single JOIN query:
1. COUNT(*) from contact WHERE createdAt in range
2. COUNT(*) from appointment WHERE scheduledDate in range
3. COUNT(*) from tattooSession WHERE status='COMPLETED' AND appointmentDate in range
**Warning signs:** Funnel shows more completed than contacted, or zero at a stage.

### Pitfall 4: Churn risk needs a "last activity" concept
**What goes wrong:** Querying customers with no sessions in X months misses customers who had appointments but no sessions.
**Why it happens:** Activity can mean appointment, session, or payment -- using only one table gives incomplete picture.
**How to avoid:** Use the MAX of multiple activity dates:
```sql
GREATEST(
  MAX(appointment.scheduledDate),
  MAX(tattooSession.appointmentDate),
  customer.createdAt
) as lastActivity
```
**Warning signs:** Regular customers showing as "at risk" because they have appointments but no sessions yet.

### Pitfall 5: Capacity utilization requires business hours data
**What goes wrong:** Calculating utilization as booked_hours / total_hours without knowing operating hours gives meaningless results.
**Why it happens:** Total available hours depend on the business_hours setting (stored as JSON in settings table).
**How to avoid:** Fetch business hours from settings, calculate available hours per day based on open/close times, multiply by number of open days in the date range. Default to 8 hours/day Mon-Sat if no setting exists.
**Warning signs:** Utilization percentages over 100% or under 5%.

### Pitfall 6: Referral tracking has no data source
**What goes wrong:** ANLYT-03 mentions "referral tracking" but there is no referral field in any schema table.
**Why it happens:** The requirement includes it but the data model doesn't support it.
**How to avoid:** Skip referral tracking in this phase. Document it as a future enhancement requiring schema changes (e.g., a `referralSource` field on customer or appointment).
**Warning signs:** N/A -- this is a data gap, not a code bug.

## Code Examples

### Revenue by Design Style (ANLYT-01)
```typescript
// Source: Existing pattern in analytics.ts getPaymentMethodBreakdown
export const getRevenueByStyle = cache(async (from: Date, to: Date) => {
  await requireStaffRole();

  const rows = await db.select({
    style: tattooSession.style,
    revenue: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)::numeric`,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(tattooSession)
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ))
    .groupBy(tattooSession.style);

  return rows.map(r => ({
    style: r.style,
    revenue: Number(r.revenue),
    count: r.count,
  }));
});
```

### Payment Success/Refund Rates (ANLYT-01)
```typescript
export const getPaymentRates = cache(async (from: Date, to: Date) => {
  await requireStaffRole();

  const rows = await db.select({
    total: sql<number>`cast(count(*) as integer)`,
    completed: sql<number>`cast(sum(case when ${payment.status} = 'COMPLETED' then 1 else 0 end) as integer)`,
    refunded: sql<number>`cast(sum(case when ${payment.status} = 'REFUNDED' then 1 else 0 end) as integer)`,
    failed: sql<number>`cast(sum(case when ${payment.status} = 'FAILED' then 1 else 0 end) as integer)`,
  })
    .from(payment)
    .where(and(
      gte(payment.createdAt, from),
      lte(payment.createdAt, to),
    ));

  const r = rows[0];
  const total = r?.total ?? 0;
  return {
    total,
    successRate: total > 0 ? (r.completed / total) * 100 : 0,
    refundRate: total > 0 ? (r.refunded / total) * 100 : 0,
    failureRate: total > 0 ? (r.failed / total) * 100 : 0,
  };
});
```

### Booking Funnel (ANLYT-02)
```typescript
export const getBookingFunnel = cache(async (from: Date, to: Date) => {
  await requireStaffRole();

  const [contacts, appointments, completed] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(contact)
      .where(and(gte(contact.createdAt, from), lte(contact.createdAt, to))),
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(appointment)
      .where(and(gte(appointment.scheduledDate, from), lte(appointment.scheduledDate, to))),
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tattooSession)
      .where(and(
        eq(tattooSession.status, 'COMPLETED'),
        gte(tattooSession.appointmentDate, from),
        lte(tattooSession.appointmentDate, to),
      )),
  ]);

  return [
    { stage: 'Inquiries', value: contacts[0]?.count ?? 0, fill: CHART_COLORS[0] },
    { stage: 'Appointments', value: appointments[0]?.count ?? 0, fill: CHART_COLORS[1] },
    { stage: 'Completed', value: completed[0]?.count ?? 0, fill: CHART_COLORS[2] },
  ];
});
```

### Peak Hours (ANLYT-02)
```typescript
export const getPeakHours = cache(async (from: Date, to: Date) => {
  await requireStaffRole();

  const hourExpr = sql<number>`cast(extract(hour from ${appointment.scheduledDate}) as integer)`;
  const rows = await db.select({
    hour: hourExpr,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(appointment)
    .where(and(
      gte(appointment.scheduledDate, from),
      lte(appointment.scheduledDate, to),
    ))
    .groupBy(hourExpr)
    .orderBy(hourExpr);

  return rows;
});
```

### Customer CLV (ANLYT-03)
```typescript
export const getCustomerCLV = cache(async (from: Date, to: Date, limit: number = 20) => {
  await requireStaffRole();

  const rows = await db.select({
    customerId: tattooSession.customerId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    clv: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)::numeric`,
    sessions: sql<number>`cast(count(*) as integer)`,
  })
    .from(tattooSession)
    .innerJoin(customer, eq(tattooSession.customerId, customer.id))
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ))
    .groupBy(tattooSession.customerId, customer.firstName, customer.lastName)
    .orderBy(desc(sql`sum(${tattooSession.totalCost})`))
    .limit(limit);

  return rows.map(r => ({
    customerId: r.customerId,
    name: `${r.firstName} ${r.lastName}`,
    clv: Number(r.clv),
    sessions: r.sessions,
  }));
});
```

### Churn Risk (ANLYT-03)
```typescript
export const getChurnRiskCustomers = cache(async (thresholdDays: number = 90) => {
  await requireStaffRole();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  // Customers whose most recent activity is before the threshold
  const rows = await db.select({
    customerId: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    lastSession: sql<Date>`max(${tattooSession.appointmentDate})`,
    lastAppointment: sql<Date>`max(${appointment.scheduledDate})`,
  })
    .from(customer)
    .leftJoin(tattooSession, eq(customer.id, tattooSession.customerId))
    .leftJoin(appointment, eq(customer.id, appointment.customerId))
    .groupBy(customer.id, customer.firstName, customer.lastName, customer.email)
    .having(
      sql`greatest(
        coalesce(max(${tattooSession.appointmentDate}), ${customer.createdAt}),
        coalesce(max(${appointment.scheduledDate}), ${customer.createdAt})
      ) < ${cutoff}`
    );

  return rows.map(r => ({
    customerId: r.customerId,
    name: `${r.firstName} ${r.lastName}`,
    email: r.email,
    lastActivity: r.lastSession ?? r.lastAppointment ?? null,
  }));
});
```

### No-Show Trends (ANLYT-04)
```typescript
export const getNoShowTrends = cache(async (from: Date, to: Date) => {
  await requireStaffRole();

  const monthExpr = sql`to_char(${appointment.scheduledDate}, 'YYYY-MM')`;
  const rows = await db.select({
    month: sql<string>`${monthExpr}`,
    total: sql<number>`cast(count(*) as integer)`,
    noShows: sql<number>`cast(sum(case when ${appointment.status} = 'NO_SHOW' then 1 else 0 end) as integer)`,
  })
    .from(appointment)
    .where(and(
      gte(appointment.scheduledDate, from),
      lte(appointment.scheduledDate, to),
    ))
    .groupBy(monthExpr)
    .orderBy(monthExpr);

  return rows.map(r => ({
    month: r.month,
    total: r.total,
    noShows: r.noShows,
    rate: r.total > 0 ? (r.noShows / r.total) * 100 : 0,
  }));
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS-side Map aggregation | SQL GROUP BY | Phase 14 (DAL-03) | All new analytics MUST use SQL aggregation |
| Individual months param | DateRange (from/to) | Phase 19 | All new DAL functions accept (from: Date, to: Date) |
| Hardcoded chart components | ChartContainer + ChartConfig | Phase 19 | All new charts use shadcn chart wrapper pattern |
| Raw Recharts imports | figure + sr-only figcaption | Phase 15 (UI-05) | All charts wrapped in accessible figure elements |

**Already established patterns to follow:**
- `cache()` wrapper on all DAL functions
- `requireStaffRole()` auth check
- `Number()` conversion on SQL numeric results
- `sql<number>` type annotation on aggregations
- `figure role="img"` with `sr-only figcaption` for chart accessibility

## Open Questions

1. **Referral tracking data gap**
   - What we know: ANLYT-03 mentions "referral tracking" but no schema field exists for referral source
   - What's unclear: Whether this should be added to the schema or deferred
   - Recommendation: Skip referral tracking in this phase. The schema has no referralSource field on customer, appointment, or contact tables. Adding a field would require a migration and is better suited to a future marketing phase.

2. **Existing JS-side aggregation in analytics.ts**
   - What we know: `getRevenueData`, `getClientAcquisitionData`, and `getBookingTrends` use JavaScript Map loops instead of SQL GROUP BY
   - What's unclear: Whether to refactor these in this phase or leave them
   - Recommendation: Do not refactor existing functions in this phase. They work correctly and changing them is out of scope. All NEW functions must use SQL GROUP BY.

3. **Tab state persistence via URL**
   - What we know: The DateRangePicker already uses URL searchParams
   - What's unclear: Whether the active tab should also be URL-persisted
   - Recommendation: Add a `tab` searchParam for deep-linking (e.g., `?tab=bookings`) so users can share or bookmark specific verticals.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `bunx vitest run --reporter=verbose` |
| Full suite command | `bunx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLYT-01 | Revenue by style/size returns grouped data | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "revenue by style"` | Wave 0 |
| ANLYT-01 | Payment success/refund rates calculated correctly | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "payment rates"` | Wave 0 |
| ANLYT-02 | Booking funnel counts contacts/appointments/completed | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "booking funnel"` | Wave 0 |
| ANLYT-02 | Peak hours grouped by hour-of-day | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "peak hours"` | Wave 0 |
| ANLYT-03 | CLV calculated as sum per customer | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "customer CLV"` | Wave 0 |
| ANLYT-03 | Churn risk identifies inactive customers | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "churn risk"` | Wave 0 |
| ANLYT-04 | No-show trends computed by month | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "no-show trends"` | Wave 0 |
| ANLYT-04 | Avg session duration by type | unit | `bunx vitest run src/__tests__/analytics-depth.test.ts -t "session duration"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bunx vitest run src/__tests__/analytics-depth.test.ts`
- **Per wave merge:** `bunx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/analytics-depth.test.ts` -- covers ANLYT-01 through ANLYT-04 DAL functions
- [ ] Mock patterns for db.select with SQL aggregation (follow existing `dal-logic.test.ts` patterns)

## Project Constraints (from CLAUDE.md)

- **ORM:** Drizzle ORM 0.45.1 -- use sql template literals for aggregations, db.query for reads
- **Framework:** Next.js 16 + React 19.2 -- server components for data fetching
- **Auth:** requireStaffRole() in every DAL function
- **Numeric columns:** Always use mode:'number' for schema, Number() wrapper for sql<> results
- **Pattern:** Server Actions for mutations, Route Handlers for webhooks only (analytics is read-only, no actions needed)
- **Import paths:** db from @/lib/db, schema from @/lib/db/schema
- **Critical pitfall:** Drizzle relational API (db.query) does not support aggregations -- use SQL builder

## Sources

### Primary (HIGH confidence)
- Project source code: `src/lib/dal/analytics.ts` -- existing DAL patterns, SQL aggregation examples
- Project source code: `src/lib/db/schema.ts` -- all table definitions, column types, available fields
- Project source code: `src/components/dashboard/analytics-chart.tsx` -- existing Recharts patterns
- Project source code: `src/app/(dashboard)/dashboard/analytics/analytics-client.tsx` -- existing analytics UI
- Project source code: `src/components/ui/tabs.tsx` -- Tabs component (Base UI based)

### Secondary (MEDIUM confidence)
- [Recharts FunnelChart API](https://recharts.github.io/en-US/api/FunnelChart/) -- FunnelChart props and usage
- [Recharts Funnel API](https://recharts.github.io/en-US/api/Funnel/) -- Funnel component within FunnelChart
- [Drizzle ORM SQL operator](https://orm.drizzle.team/docs/sql) -- sql template literal documentation
- [Drizzle ORM Select](https://orm.drizzle.team/docs/select) -- groupBy, having patterns

### Tertiary (LOW confidence)
- [Drizzle GROUP BY discussion #2893](https://github.com/drizzle-team/drizzle-orm/discussions/2893) -- date_trunc/extract patterns in GROUP BY (community-sourced, but aligns with existing project code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in project
- Architecture: HIGH -- extending existing analytics page with proven patterns
- Pitfalls: HIGH -- identified from actual codebase analysis and schema inspection
- SQL patterns: HIGH -- verified against existing analytics DAL functions that use identical patterns

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- no moving targets, all deps locked)
