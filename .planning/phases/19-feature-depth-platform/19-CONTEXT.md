# Phase 19: Feature Depth — Platform - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance 6 platform-level pages with full feature sets: dashboard overview (today's appointments, clickable KPIs with trends, quick actions, date range filtering), media management (bulk upload, tag-based organization, gallery approval), analytics (custom date ranges, CSV/PDF export, period comparison, new KPIs), settings (tabbed layout with unsaved changes), audit log (advanced filtering, search, export, before/after diffs), and universal list page features (CSV export, show all, page jump).

</domain>

<decisions>
## Implementation Decisions

### Dashboard Overview (FEAT-01)
- **D-01:** Layout: Top section shows today's appointments list (clickable rows → appointment detail). Below: KPI cards (total customers, revenue, sessions, pending appointments) all clickable linking to their detail pages. Bottom: Revenue trend chart with DateRangePicker.
- **D-02:** KPI cards show percentage change vs previous period (green up arrow for growth, red down for decline).
- **D-03:** Quick-actions section with 3-4 buttons: New Appointment, New Customer, Upload Media (+ possibly New Session). Prominent placement above or beside KPIs.
- **D-04:** DateRangePicker wired to URL params (same pattern as reports page from Phase 17).

### Media Management (FEAT-09)
- **D-05:** Tag-based organization (not folders). Tags: portfolio, flash, reference, client. Filter by tag. Bulk tag assignment. Flat grid with tag chips.
- **D-06:** Bulk upload via existing Vercel Blob pattern. Select multiple files, upload all, assign tags during upload.
- **D-07:** Gallery approval workflow: media items have isApproved flag (like designs). Toggle visibility for public gallery.

### Analytics Enhancements (FEAT-10)
- **D-08:** Claude decides layout. Wire DateRangePicker, add CSV export (existing utility) + PDF export (Stirling PDF), period-over-period comparison toggle, compute new KPIs (CLV, no-show rate, avg session duration) from existing DAL data.

### Settings (FEAT-11)
- **D-09:** Tabbed layout: Studio Info | Email Templates | Payment Config | Business Hours | Legal/Terms. Each tab is its own form with useUnsavedChanges hook. Saves independently per tab.

### Audit Log (FEAT-12)
- **D-10:** Claude decides UI pattern. Add date range filter, action type filter, user filter, search, CSV export. Show before/after change diff in expandable row.

### Universal List Features (FEAT-13)
- **D-11:** Claude decides. Add CSV export button to DataTable toolbar. "Show all" toggle fetches without pagination. Page number input for jump-to-page. Wire to all list pages.

### Claude's Discretion
- Dashboard widget arrangement and responsive behavior
- Quick action button selection (which 3-4 actions)
- Media tag schema (JSON array on existing media table vs separate tags table)
- Analytics KPI computation approach (SQL vs client-side from existing data)
- Period comparison visualization (side-by-side charts, overlay, toggle)
- Audit log diff display (JSON diff, table diff, inline highlights)
- DataTable toolbar enhancement approach (props vs wrapper)

</decisions>

<canonical_refs>
## Canonical References

### Dashboard
- `src/app/(dashboard)/dashboard/page.tsx` — Current dashboard (KPI cards + charts)
- `src/components/dashboard/kpi-card.tsx` — KPI card component
- `src/components/dashboard/analytics-chart.tsx` — Recharts integration
- `src/components/dashboard/date-range-picker.tsx` — DateRangePicker (Phase 17)

### Media
- `src/app/(dashboard)/dashboard/media/page.tsx` — Current media page
- `src/app/(dashboard)/dashboard/media/media-page-client.tsx` — Media client
- `src/components/dashboard/media-uploader.tsx` — Upload component
- `src/app/api/upload/token/route.ts` — Vercel Blob token

### Analytics
- `src/app/(dashboard)/dashboard/analytics/page.tsx` — Current analytics page
- `src/lib/dal/analytics.ts` — All analytics DAL functions
- `src/lib/utils/csv-export.ts` — CSV export utility

### Settings
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Current settings page
- `src/lib/dal/settings.ts` — Settings CRUD
- `src/hooks/use-unsaved-changes.ts` — Unsaved changes hook (Phase 15)

### Audit Log
- `src/app/(dashboard)/dashboard/audit-log/page.tsx` — Current audit log page
- `src/lib/dal/audit.ts` — Audit log DAL

### DataTable
- `src/components/dashboard/data-table.tsx` — DataTable component
- `src/components/dashboard/responsive-data-table.tsx` — ResponsiveDataTable wrapper

### External
- `pdf.thehudsonfam.com` — Stirling PDF for analytics PDF export

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- DateRangePicker component (Phase 17)
- CSV export utility (Phase 17)
- Stirling PDF receipt pipeline (Phase 18) — reusable for analytics PDF
- useUnsavedChanges hook (Phase 15)
- ResponsiveDataTable with mobile card views
- Recharts already configured
- Notification bell in header (Phase 17)

### What Needs Creating
- Dashboard: today's appointments widget, clickable KPI cards, quick actions bar, date filtering
- Media: tag schema, tag filter UI, bulk upload with tagging, gallery approval toggle
- Analytics: period comparison toggle, new KPI calculations, PDF export
- Settings: tab layout, per-tab forms, operating hours component
- Audit log: filter toolbar, expandable diff rows, export
- DataTable: CSV export button, show-all toggle, page jump input

</code_context>

<specifics>
## Specific Ideas

- KPI cards show % change vs previous period (green/red arrows)
- 3-4 quick action buttons on dashboard
- Tag-based media organization (not folders)
- Tabbed settings with independent save per tab
- Stirling PDF reuse for analytics PDF export

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-feature-depth-platform*
*Context gathered: 2026-03-30*
