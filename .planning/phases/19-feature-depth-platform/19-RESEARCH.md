# Phase 19: Feature Depth -- Platform - Research

**Researched:** 2026-03-28
**Domain:** Dashboard UI enhancement, media management, analytics, settings, audit log, DataTable tooling
**Confidence:** HIGH

## Summary

Phase 19 enhances six platform-level pages with full feature sets. The codebase already has strong foundations: KPICard with trend support, DateRangePicker with URL param wiring, CSV export utility, Stirling PDF pipeline for HTML-to-PDF conversion, Recharts chart components, useUnsavedChanges hook, and a DataTable with sorting/filtering/pagination. The work is primarily composing existing building blocks into richer UIs and adding new DAL queries for the data these UIs need.

The main technical challenges are: (1) computing period-over-period comparison stats efficiently in SQL, (2) designing the media tag filtering UX with the existing `tags text[]` column on `tattoo_design`, (3) building the audit log diff viewer from the existing `metadata jsonb` column, and (4) enhancing DataTable without breaking the 8 pages that already use it.

**Primary recommendation:** Treat DataTable enhancements (FEAT-13) as the first task since all other list pages benefit from CSV export, show-all, and page-jump. Then do dashboard (FEAT-01), media (FEAT-09), analytics (FEAT-10), settings (FEAT-11), and audit log (FEAT-12) as independent parallel tracks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dashboard layout: Top section shows today's appointments list (clickable rows to appointment detail). Below: KPI cards (total customers, revenue, sessions, pending appointments) all clickable linking to their detail pages. Bottom: Revenue trend chart with DateRangePicker.
- **D-02:** KPI cards show percentage change vs previous period (green up arrow for growth, red down for decline).
- **D-03:** Quick-actions section with 3-4 buttons: New Appointment, New Customer, Upload Media (+ possibly New Session). Prominent placement above or beside KPIs.
- **D-04:** DateRangePicker wired to URL params (same pattern as reports page from Phase 17).
- **D-05:** Tag-based organization (not folders). Tags: portfolio, flash, reference, client. Filter by tag. Bulk tag assignment. Flat grid with tag chips.
- **D-06:** Bulk upload via existing Vercel Blob pattern. Select multiple files, upload all, assign tags during upload.
- **D-07:** Gallery approval workflow: media items have isApproved flag (like designs). Toggle visibility for public gallery.
- **D-08:** Analytics: Wire DateRangePicker, add CSV export (existing utility) + PDF export (Stirling PDF), period-over-period comparison toggle, compute new KPIs (CLV, no-show rate, avg session duration) from existing DAL data.
- **D-09:** Settings tabbed layout: Studio Info | Email Templates | Payment Config | Business Hours | Legal/Terms. Each tab is its own form with useUnsavedChanges hook. Saves independently per tab.
- **D-10:** Audit log: Add date range filter, action type filter, user filter, search, CSV export. Show before/after change diff in expandable row.
- **D-11:** DataTable: Add CSV export button to DataTable toolbar. "Show all" toggle fetches without pagination. Page number input for jump-to-page. Wire to all list pages.

### Claude's Discretion
- Dashboard widget arrangement and responsive behavior
- Quick action button selection (which 3-4 actions)
- Media tag schema (JSON array on existing media table vs separate tags table)
- Analytics KPI computation approach (SQL vs client-side from existing data)
- Period comparison visualization (side-by-side charts, overlay, toggle)
- Audit log diff display (JSON diff, table diff, inline highlights)
- DataTable toolbar enhancement approach (props vs wrapper)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FEAT-01 | Dashboard overview -- configurable date range picker, upcoming appointments today/this week, clickable widgets linking to detail pages | Existing KPICard already has `trend` prop; DateRangePicker + URL param pattern from reports page; need new DAL function for today's appointments and period comparison stats |
| FEAT-09 | Media management -- bulk upload, folder/album organization, thumbnail grid view, tagging/search, approval workflow UI, linked sessions | Existing `tags text[]` column on tattoo_design schema; MediaUploader handles single file; need multi-file upload loop and tag filter UI |
| FEAT-10 | Analytics -- custom date range picker, data export (CSV/PDF), comparison views (period vs period), more KPIs (CLV, no-show rate, avg session duration) | CSV export utility exists; Stirling PDF receipt pipeline reusable; need new SQL queries for CLV, no-show rate, avg duration |
| FEAT-11 | Settings -- organized into logical tabs, unsaved changes warning, operating hours/days management | Existing tabs: Studio/Booking/Notifications/Appearance; need to restructure to required 5 tabs; useUnsavedChanges hook exists |
| FEAT-12 | Audit log -- advanced filtering, search, export, before/after change detail | Existing audit_log table has metadata jsonb with `changes` key; audit-log-client has basic resource/action filters with raw `<select>` elements |
| FEAT-13 | All list pages -- data export to CSV, "show all" option alongside pagination, jump-to-page control | DataTable uses TanStack Table with getPaginationRowModel; table.setPageSize and table.setPageIndex APIs available; 8 pages use DataTable |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2
- **ORM:** Drizzle ORM with `db.query` for reads, SQL builder for aggregations
- **UI:** Shadcn/Radix + Tailwind CSS 4
- **State:** TanStack Query (server) + Zustand (client)
- **Pattern:** Server Actions for mutations, Route Handlers for webhooks only
- **DAL pattern:** Auth checks in server-only DB functions
- **Import:** `db` from `@/lib/db`, schema from `@/lib/db/schema`
- **Drizzle pitfall:** `numeric()` returns strings -- all monetary columns use `mode:'number'`
- **Drizzle pitfall:** Relational API (db.query) does not support aggregations -- use SQL builder

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | DataTable pagination/sorting/filtering | Already powering all list pages |
| @tanstack/react-query | 5.91.3 | Server state management | Project standard for client data fetching |
| recharts | 2.15.4 | Chart rendering | Already used for analytics/dashboard charts |
| react-day-picker | 9.14.0 | Date range picker calendar | Used by DateRangePicker component |
| date-fns | 4.1.0 | Date formatting and manipulation | Project standard date utility |
| @vercel/blob | 2.3.1 | File upload storage | Existing media upload pipeline |
| sonner | 2.0.7 | Toast notifications | Project standard for notifications |
| lucide-react | 0.462.0 | Icons | Project standard icon library |

### No New Dependencies Needed

All phase requirements can be met with existing libraries. No new packages required.

## Architecture Patterns

### Recommended Task Structure
```
Task 1: DataTable enhancements (FEAT-13) -- affects all 8 list pages
Task 2: Dashboard overview (FEAT-01)
Task 3: Media management (FEAT-09)
Task 4: Analytics enhancements (FEAT-10)
Task 5: Settings restructure (FEAT-11)
Task 6: Audit log enhancements (FEAT-12)
```

Tasks 2-6 are independent after Task 1 completes.

### Pattern 1: DataTable Toolbar Enhancement via Props

**What:** Add optional props to the existing DataTable component for CSV export, show-all toggle, and page-jump input.
**When to use:** When enhancing a shared component used by 8 pages.
**Approach:** Add three new optional props to DataTable:

```typescript
interface DataTableProps<TData, TValue> {
  // ... existing props
  enableCsvExport?: boolean;
  csvFilename?: string;
  csvTransform?: (data: TData[]) => Record<string, unknown>[];
  enableShowAll?: boolean;
  enablePageJump?: boolean;
}
```

**Why props over wrapper:** The DataTable component is already imported directly by 8 page clients. Adding optional props is backward-compatible and requires zero changes to existing consumers unless they opt in. A wrapper approach would require updating all 8 import sites.

**Implementation notes:**
- CSV export: Use existing `exportToCsv()` utility. The `csvTransform` prop allows each page to define which columns to export and how to format them. Default export uses visible columns.
- Show all: `table.setPageSize(data.length)` when toggled on, restore to initial pageSize when toggled off.
- Page jump: Input field with `table.setPageIndex(n - 1)` on submit. Validate range 1..totalPages.

### Pattern 2: Period-Over-Period Dashboard Stats via SQL

**What:** Compute KPI percentage changes by running two date-range queries (current period + previous period of equal length).
**When to use:** Dashboard KPI cards with trend indicators.
**Approach:**

```typescript
// In analytics DAL
export async function getDashboardStatsWithTrend(from: Date, to: Date) {
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = from;

  const [current, previous] = await Promise.all([
    computePeriodStats(from, to),
    computePeriodStats(prevFrom, prevTo),
  ]);

  return {
    totalRevenue: {
      value: current.revenue,
      trend: calcTrendPercent(current.revenue, previous.revenue),
    },
    totalCustomers: {
      value: current.customers,
      trend: calcTrendPercent(current.customers, previous.customers),
    },
    // ...
  };
}

function calcTrendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
```

**Key insight:** The existing KPICard component already has a `trend` prop accepting `{ value: number; label: string }` with green/red arrow rendering. This just needs data wired in.

### Pattern 3: Tag-Based Media Filtering

**What:** Use the existing `tags text[]` column on `tattoo_design` for tag organization with filter UI.
**When to use:** Media management page.
**Recommendation: Use existing text[] column, not a separate tags table.**

**Rationale:** The `tattoo_design` table already has `tags: text('tags').array()`. The predefined tags (portfolio, flash, reference, client) are a small fixed set. A separate tags table adds unnecessary joins for this use case. Array containment queries (`@>` operator) with a GIN index are efficient for this scale.

```sql
-- Filter by tag (Drizzle SQL builder)
sql`${schema.tattooDesign.tags} @> ARRAY[${tag}]::text[]`
```

**Migration needed:** Add a GIN index on the tags column for efficient array containment queries:
```typescript
index('tattoo_design_tags_idx').using('gin', table.tags),
```

### Pattern 4: Bulk Upload with Tag Assignment

**What:** Upload multiple files sequentially, assign tags to all during upload.
**When to use:** Media bulk upload flow.
**Approach:**

The existing `MediaUploader` handles single file upload via Vercel Blob. For bulk upload:
1. Accept `multiple` on the file input.
2. Queue files and upload sequentially (Vercel Blob handles one at a time).
3. After all uploads complete, show a form to assign shared tags to all uploaded items.
4. Call `createMediaAction` for each uploaded file with the assigned tags.

**Why sequential, not parallel:** Vercel Blob's client upload generates tokens per-file. Parallel uploads can hit rate limits and complicate error handling. Sequential with a progress indicator (X of Y) is more reliable.

### Pattern 5: Analytics PDF Export via Stirling PDF

**What:** Reuse the receipt PDF pipeline for analytics report export.
**When to use:** Analytics page PDF export button.
**Approach:**

The existing receipt pipeline at `/api/receipts/[paymentId]/route.ts` demonstrates the pattern:
1. Render HTML template with data
2. POST to `https://pdf.thehudsonfam.com/api/v1/convert/html/pdf` with HTML as FormData
3. Return PDF blob response

For analytics, create a new route handler `/api/analytics/export/pdf` that:
1. Accepts date range params
2. Fetches analytics data via DAL
3. Renders an analytics report HTML template
4. Converts via Stirling PDF
5. Returns PDF download

The existing health-check pattern (5s timeout pre-ping) and error handling should be reused.

### Pattern 6: Audit Log Expandable Diff Rows

**What:** Show before/after change diffs in expandable rows.
**When to use:** Audit log page.
**Approach:**

The audit log metadata already stores `changes` in the jsonb column. For UPDATE actions, we need to store both old and new values. Current logging pattern (from media-actions.ts):
```typescript
metadata: { changes: data }
```

This only stores the new values. To show before/after diffs, we need to also capture the old values. However, this is a Phase 14 (DAL) concern -- the audit logging infrastructure was built in Phase 14.

**Current state analysis:** The `metadata` field stores `{ changes: {...} }` for mutations. For UPDATE actions, some already capture the change object. For proper before/after diff display:

**Option A (recommended):** Display the `metadata.changes` as "Changed fields" rather than a full before/after diff. This works with the data already being stored and doesn't require retroactive changes.

**Option B:** Modify audit logging to capture `{ before: oldValues, after: newValues }` for UPDATE actions. This requires changes to all server actions that log audit entries -- a cross-cutting concern.

**Recommendation:** Option A for this phase. Display the changes metadata in a structured table format within the expandable row. Use a simple key-value table showing field name and new value. The Collapsible component (`src/components/ui/collapsible.tsx`) is already available for expandable rows.

### Pattern 7: Settings Tab Restructure

**What:** Reorganize settings from 4 tabs to 5 tabs per D-09.
**When to use:** Settings page.
**Mapping:**

| Current Tab | Target Tab(s) | Changes |
|------------|---------------|---------|
| Studio Info | Studio Info | Keep as-is |
| Booking | (removed -- content moves to Business Hours) | Merge Cal.com/session config into Hours |
| Notifications | Email Templates | Rename, expand with template management |
| Appearance | (absorbed into Studio Info) | Move branding into Studio Info |
| (new) | Payment Config | Stripe keys, deposit %, currency |
| (new) | Business Hours | Operating hours/days + booking config |
| (new) | Legal/Terms | Terms of service, consent templates, policies |

Each tab gets its own form with `useUnsavedChanges(isDirty)` wired in. The hook only handles `beforeunload` -- it does not block React navigation. For tab switching, add an inline "You have unsaved changes" warning when `isDirty` is true and the user clicks a different tab.

### Anti-Patterns to Avoid

- **Over-fetching for dashboard:** Do not load all appointments and filter in JS to find "today's." Create a dedicated DAL function with a date range WHERE clause.
- **Client-side pagination bypass for "show all":** Do not fetch all data on page load and hide pagination. Use `table.setPageSize(data.length)` which works with client-side pagination that TanStack Table already manages.
- **Separate tag management system:** Do not build a full CRUD tags table, tag editor page, or tag hierarchy. The tags are a fixed set of 4 strings stored in an array column.
- **Custom diff library for audit log:** Do not install a JSON diff library. The changes metadata is simple key-value pairs that can be rendered as a table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV export | Custom CSV parser | `exportToCsv()` from `@/lib/utils/csv-export.ts` | Already handles escaping, quoting, BOM |
| PDF generation | Server-side PDF library | Stirling PDF API at `pdf.thehudsonfam.com` | Already integrated, HTML template approach |
| Date range selection | Custom date inputs | `DateRangePicker` component with presets | Already built with URL param pattern |
| Chart rendering | Custom SVG/Canvas | Recharts via `ChartContainer` | Already configured with shadcn/ui chart |
| Table pagination | Custom page management | TanStack Table `getPaginationRowModel` | Already manages page index/size/navigation |
| Unsaved changes | Custom form state tracking | `useUnsavedChanges` hook + RHF `formState.isDirty` | Already handles beforeunload |
| Toast notifications | Custom notification system | Sonner `toast.promise()` | Already project standard |
| File upload | Custom upload handler | Vercel Blob client upload via `/api/upload/token` | Already handles auth, progress, cleanup |

## Common Pitfalls

### Pitfall 1: DataTable "Show All" Memory Pressure
**What goes wrong:** Toggling "show all" on a table with thousands of rows causes browser lag.
**Why it happens:** TanStack Table renders all rows into the DOM at once.
**How to avoid:** Add a safety threshold (e.g., 500 rows). If data exceeds threshold, show a warning "Showing all 1,247 rows may slow your browser" with confirm. Alternatively, cap show-all at 500 and indicate "showing 500 of 1,247."
**Warning signs:** Page becomes unresponsive after toggling show-all.

### Pitfall 2: Bulk Upload Error Recovery
**What goes wrong:** File 5 of 10 fails to upload; user loses the other 4 successful uploads.
**Why it happens:** Sequential upload loop throws on error, doesn't track partial success.
**How to avoid:** Track upload status per file (pending/uploading/success/failed). Continue uploading remaining files after failure. Show per-file status in UI. Allow retry of failed files.
**Warning signs:** Upload progress stops and all uploaded files disappear.

### Pitfall 3: Period Comparison with Empty Previous Period
**What goes wrong:** Division by zero or misleading "100% growth" when previous period has no data.
**Why it happens:** New businesses or first-time date ranges have no historical data.
**How to avoid:** The `calcTrendPercent` function must handle `previous === 0`: show "+100%" only if current > 0, show "N/A" or "--" if both are 0.
**Warning signs:** KPI cards showing "Infinity%" or "NaN%".

### Pitfall 4: Settings Tab Switch Losing Unsaved Data
**What goes wrong:** User edits Studio Info tab, clicks Email Templates tab, Studio Info changes are lost.
**Why it happens:** Each tab manages its own form state; switching tabs unmounts the form.
**How to avoid:** Either (a) warn before switching tabs when isDirty, or (b) keep all tab forms mounted but hidden (use CSS display:none instead of conditional rendering). Recommendation: use Tabs with `forceMount` or persist form state in parent component state.
**Warning signs:** Users report settings changes being lost.

### Pitfall 5: Audit Log Expandable Row Performance
**What goes wrong:** Expanding many audit log rows simultaneously makes the page slow.
**Why it happens:** Each expanded row renders potentially large JSON metadata.
**How to avoid:** Only render expanded content when row is expanded (lazy render). Limit the number of simultaneously expanded rows, or collapse previous when expanding new.
**Warning signs:** Page becomes sluggish after expanding several audit entries.

### Pitfall 6: Analytics Page Becoming a Server Component Bottleneck
**What goes wrong:** Analytics page loads slowly because it fetches all data server-side before rendering.
**Why it happens:** The current analytics page is a server component that awaits 4 parallel DAL queries. Adding date range filtering means the page must re-render server-side on every date change.
**How to avoid:** Convert analytics to a client component pattern (like reports page) where DateRangePicker triggers URL param changes and the page re-fetches. Use the same pattern as `reports-client.tsx`.
**Warning signs:** Date range changes cause full page reload instead of smooth chart updates.

## Code Examples

### Example 1: DataTable CSV Export Button Integration

```typescript
// In DataTable component, add to toolbar
{enableCsvExport && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => {
      const rows = csvTransform
        ? csvTransform(table.getFilteredRowModel().rows.map(r => r.original))
        : table.getFilteredRowModel().rows.map(r => {
            const row: Record<string, unknown> = {};
            for (const col of table.getVisibleFlatColumns()) {
              if (col.id !== 'select' && col.id !== 'actions') {
                row[col.id] = r.getValue(col.id);
              }
            }
            return row;
          });
      exportToCsv(csvFilename ?? 'export.csv', rows);
    }}
  >
    <Download className="mr-2 h-4 w-4" />
    Export CSV
  </Button>
)}
```

### Example 2: Page Jump Input

```typescript
// In DataTable pagination footer
{enablePageJump && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">Go to:</span>
    <Input
      type="number"
      min={1}
      max={table.getPageCount()}
      defaultValue={table.getState().pagination.pageIndex + 1}
      className="w-16 h-8"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const page = Number((e.target as HTMLInputElement).value);
          if (page >= 1 && page <= table.getPageCount()) {
            table.setPageIndex(page - 1);
          }
        }
      }}
    />
  </div>
)}
```

### Example 3: Show All Toggle

```typescript
// In DataTable pagination footer
{enableShowAll && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      const currentSize = table.getState().pagination.pageSize;
      if (currentSize >= data.length) {
        table.setPageSize(pageSize); // restore default
      } else {
        table.setPageSize(data.length);
      }
    }}
  >
    {table.getState().pagination.pageSize >= data.length ? 'Paginate' : 'Show All'}
  </Button>
)}
```

### Example 4: Today's Appointments DAL Function

```typescript
// In src/lib/dal/analytics.ts
export const getTodayAppointments = cache(async () => {
  await requireStaffRole();

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  return db.query.appointment.findMany({
    where: and(
      gte(appointment.scheduledDate, startOfToday),
      lte(appointment.scheduledDate, endOfToday),
    ),
    orderBy: [asc(appointment.scheduledDate)],
    with: {
      customer: { columns: { firstName: true, lastName: true } },
    },
  });
});
```

### Example 5: Media Tag Filter with Drizzle Array Containment

```typescript
// In media DAL
import { sql, and, desc } from 'drizzle-orm';

export const getMediaItemsByTag = cache(async (
  tag?: string,
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
) => {
  await requireStaffRole();

  const conditions = [];
  if (tag) {
    conditions.push(sql`${schema.tattooDesign.tags} @> ARRAY[${tag}]::text[]`);
  }
  if (params.search) {
    conditions.push(
      sql`${schema.tattooDesign.searchVector} @@ plainto_tsquery('english', ${params.search})`
    );
  }

  // ... pagination query with conditions
});
```

### Example 6: Audit Log Diff Display Component

```typescript
// Expandable metadata viewer for audit log entries
function AuditDiffView({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== 'object') return null;

  const changes = (metadata as Record<string, unknown>).changes;
  if (!changes || typeof changes !== 'object') return null;

  const entries = Object.entries(changes as Record<string, unknown>);

  return (
    <div className="mt-2 rounded-md border bg-muted/50 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Changes</p>
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between text-xs">
            <span className="font-mono text-muted-foreground">{key}</span>
            <span className="max-w-[60%] truncate text-right">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 7: Analytics Report HTML Template for PDF Export

```typescript
// src/lib/analytics-report-template.ts -- follows receipt-template.ts pattern
export function renderAnalyticsReportHtml(data: {
  dateRange: { from: string; to: string };
  kpis: { label: string; value: string; trend?: string }[];
  revenueData: { month: string; revenue: number; count: number }[];
}): string {
  // Same escapeHtml pattern as receipt-template.ts
  // Tabular HTML layout (no charts -- PDF doesn't render JS)
  // Revenue table with monthly breakdown
  // KPI summary cards at top
  return `<!DOCTYPE html>...`;
}
```

**Key constraint:** Stirling PDF renders static HTML only -- no JavaScript execution. Charts must be represented as HTML tables or simple CSS bar graphs in the PDF template.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side date filtering on analytics | URL param-driven server re-fetch | Phase 17 (reports page) | Must convert analytics page to same pattern |
| Raw `<select>` for audit filters | Shadcn Select components | Identified in DEBT-03 | This phase should fix as part of FEAT-12 |
| Single file upload only | Multi-file sequential upload | This phase | New bulk upload capability |

**Deprecated/outdated:**
- The analytics page currently fetches all data server-side with hardcoded 6-month window. This must change to client-driven date range filtering.
- The audit log client uses raw HTML `<select>` elements instead of accessible Shadcn Select components. DEBT-03 specifically calls this out.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `bunx vitest run --reporter=verbose` |
| Full suite command | `bunx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEAT-01 | Dashboard stats with trend calculation | unit | `bunx vitest run src/__tests__/dashboard-stats.test.ts -t "trend" --reporter=verbose` | No -- Wave 0 |
| FEAT-09 | Media tag filtering DAL | unit | `bunx vitest run src/__tests__/media-tags.test.ts --reporter=verbose` | No -- Wave 0 |
| FEAT-10 | Analytics KPI calculations (CLV, no-show, avg duration) | unit | `bunx vitest run src/__tests__/analytics-kpis.test.ts --reporter=verbose` | No -- Wave 0 |
| FEAT-11 | Settings upsert by category | unit | Already covered in `src/__tests__/server-actions.test.ts` | Yes (partial) |
| FEAT-12 | Audit log filtering | unit | `bunx vitest run src/__tests__/audit.test.ts --reporter=verbose` | Yes (partial) |
| FEAT-13 | CSV export utility | unit | Already covered (utility is pure function) | Yes (via csv-export usage) |

### Sampling Rate
- **Per task commit:** `bunx vitest run --reporter=verbose`
- **Per wave merge:** `bunx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/dashboard-stats.test.ts` -- covers FEAT-01 trend calculation
- [ ] `src/__tests__/media-tags.test.ts` -- covers FEAT-09 tag filtering logic
- [ ] `src/__tests__/analytics-kpis.test.ts` -- covers FEAT-10 CLV, no-show rate, avg duration

## Open Questions

1. **Audit log "before" state for diffs**
   - What we know: Current audit logging stores `metadata: { changes: newValues }` for mutations. There is no "before" snapshot.
   - What's unclear: Whether we should modify all server actions to capture old values for proper before/after diffs.
   - Recommendation: Display available change metadata as "Changed fields" table (Option A). Proper before/after diff would require touching all server actions and is better suited for Phase 22 tech debt.

2. **Settings tab content for Email Templates and Legal/Terms**
   - What we know: D-09 specifies these tabs exist. Current settings schema is key-value with categories.
   - What's unclear: What specific email templates and legal content fields to include.
   - Recommendation: Email Templates tab: template for appointment confirmation, reminder, and aftercare. Legal/Terms tab: consent form text, cancellation policy text, privacy policy URL. All stored as settings key-value pairs.

3. **Analytics PDF -- charts vs tables**
   - What we know: Stirling PDF converts static HTML to PDF. Recharts requires JavaScript to render.
   - What's unclear: Whether users expect charts in the PDF.
   - Recommendation: Use HTML tables and simple CSS-based progress bars for the PDF. Charts are only available in the browser. Note this in the UI: "PDF export includes tabular data only."

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: `src/components/dashboard/data-table.tsx` -- DataTable with TanStack Table 8.21.3
- Project codebase analysis: `src/components/dashboard/kpi-card.tsx` -- KPICard with existing trend prop
- Project codebase analysis: `src/lib/dal/analytics.ts` -- Existing analytics DAL functions
- Project codebase analysis: `src/lib/receipt-template.ts` + `/api/receipts/[paymentId]/route.ts` -- Stirling PDF pipeline
- Project codebase analysis: `src/lib/db/schema.ts` -- tattoo_design.tags text[], audit_log.metadata jsonb, settings key-value schema

### Secondary (MEDIUM confidence)
- [TanStack Table Pagination API](https://tanstack.com/table/v8/docs/api/features/pagination) -- setPageIndex, setPageSize APIs for show-all and page-jump features

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- all patterns derived from existing codebase patterns
- Pitfalls: HIGH -- derived from analysis of actual code and data structures

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- all internal codebase patterns)
