# Phase 21: Analytics Depth - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Add 4 analytics verticals to the existing analytics page: revenue breakdowns (by design type/size, avg transaction, payment success/refund rates), booking funnels (inquiry→confirmed→completed, peak hours, capacity utilization), customer analytics (CLV per client, repeat %, churn risk), and operational metrics (avg session duration by type, no-show trends, scheduling efficiency). All build on Phase 19's analytics page with date ranges, export, and comparison.

</domain>

<decisions>
## Implementation Decisions

### All Analytics Verticals
- **D-01:** Claude decides everything — SQL queries, chart types, layout, KPI computation approach. All new analytics are additions to the existing analytics page from Phase 19.
- **D-02:** Use existing patterns: SQL GROUP BY with date_trunc (Phase 14), Recharts (existing), DateRangePicker (Phase 17), CSV/PDF export (Phase 19).

### Revenue Analytics (ANLYT-01)
- **D-03:** Claude implements: revenue by design type/size, average transaction value, payment success rate, refund rate. New DAL functions with SQL aggregation.

### Booking Analytics (ANLYT-02)
- **D-04:** Claude implements: conversion funnel (contact→appointment→completed), peak booking hours, capacity utilization. Funnel chart or bar chart.

### Customer Analytics (ANLYT-03)
- **D-05:** Claude implements: CLV per client (sum of all payments), repeat client percentage, churn risk indicators (clients with no activity in X months).

### Operational Metrics (ANLYT-04)
- **D-06:** Claude implements: avg session duration by type, no-show rate trends over time, scheduling efficiency (gaps between appointments, utilization %).

### Claude's Discretion
- All SQL queries and aggregation logic
- Chart type per metric (bar, line, pie, heatmap, funnel, area)
- Layout arrangement (tabs per vertical, sections on one page, separate sub-pages)
- KPI card placement and trend indicators
- Churn risk threshold definition (e.g., no activity in 90 days)
- Peak hours visualization (heatmap vs bar chart)
- Capacity utilization calculation (booked hours / available hours)

</decisions>

<canonical_refs>
## Canonical References

### Analytics (Phase 19)
- `src/app/(dashboard)/dashboard/analytics/page.tsx` — Analytics page
- `src/app/(dashboard)/dashboard/analytics/analytics-client.tsx` — Client component with DateRangePicker, KPI cards, comparison
- `src/lib/dal/analytics.ts` — All analytics DAL functions (getRevenueData, getBookingTrends, getAnalyticsKPIs, etc.)
- `src/components/dashboard/analytics-chart.tsx` — Recharts charts
- `src/components/dashboard/date-range-picker.tsx` — DateRangePicker

### Reports (Phase 17)
- `src/app/(dashboard)/dashboard/reports/page.tsx` — Financial reports page
- `src/components/dashboard/reports-charts.tsx` — Payment breakdown charts

### Schema
- `src/lib/db/schema.ts` — appointment, tattooSession, payment, customer tables (data sources)

### External
- `pdf.thehudsonfam.com` — Stirling PDF for analytics PDF export (already wired from Phase 19)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Analytics DAL with SQL GROUP BY (Phase 14)
- DateRangePicker + CSV/PDF export (Phase 19)
- Recharts with ComposedChart, dual Y-axes, Brush zoom
- Period-over-period comparison toggle
- KPICard with trend arrows

### What Needs Creating
- Revenue breakdown by design type/size DAL function
- Payment success/refund rate DAL function
- Booking funnel DAL function (contact→appointment→completed counts)
- Peak hours DAL function (GROUP BY hour-of-day)
- CLV per client DAL function
- Repeat client percentage DAL function
- Churn risk DAL function
- Avg session duration by type DAL function
- No-show rate trends DAL function
- Scheduling efficiency DAL function
- New chart components or sections for each vertical
- Possibly tab-based navigation within the analytics page

</code_context>

<specifics>
## Specific Ideas

- All new analytics are SQL aggregation queries in the DAL
- Existing analytics page gets new sections/tabs for each vertical
- Reuse existing Recharts + KPICard patterns throughout

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-analytics-depth*
*Context gathered: 2026-03-30*
