# Phase 17: Missing Pages — Operations - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build 3 operational dashboard capabilities: financial reporting hub (revenue, payment breakdown, tax summaries, CSV export), in-app notification system (DB-backed, bell icon + dropdown, webhook-triggered), and design approval management page (thumbnail grid, approve/reject with notes, sync to public gallery).

</domain>

<decisions>
## Implementation Decisions

### Financial Reports Page (PAGE-03)
- **D-01:** Claude's discretion for layout and structure. Analytics DAL already has `getRevenueData()`, `getClientAcquisitionData()`, `getBookingTrends()`, `getAppointmentTypeBreakdown()` from Phase 14. Wire these into a reports page with date range picker, Recharts charts, and CSV export.
- **D-02:** Payment method breakdown needs new DAL function (group by payment method).
- **D-03:** Tax summary calculations — derive from existing payment data (configurable tax rate in settings or hardcoded for now).
- **D-04:** CSV export — client-side generation from displayed data (no server-side file generation needed).

### Notification System (PAGE-06)
- **D-05:** Bell icon with unread badge count in dashboard header. Click opens dropdown showing recent notifications. Link to full `/dashboard/notifications` page for history.
- **D-06:** Polling every 30 seconds for new notifications (not real-time WebSocket/SSE).
- **D-07:** New `notification` DB table: id, userId, type (enum: BOOKING, PAYMENT, CONTACT, LOW_STOCK), title, message, isRead, metadata (JSON), createdAt.
- **D-08:** All 4 event triggers from requirements: new bookings (Cal.com webhook), payments received (Stripe webhook), contact form submissions (contact action), low stock alerts (product stock check).
- **D-09:** Notification creation happens inside existing webhook handlers and server actions — no separate notification service.
- **D-10:** Mark as read: click notification marks it read. "Mark all as read" button in dropdown.

### Design Approval Management (PAGE-07)
- **D-11:** Thumbnail grid layout showing designs where `isApproved=false` (pending). Each card: image, name, style, tags. Approve button → sets `isApproved=true` (appears in public gallery). Reject button → Dialog for rejection notes.
- **D-12:** Filter tabs: Pending / Approved / All.
- **D-13:** Uses existing `getAllDesigns()` and `updateDesignApprovalStatus()` from designs DAL. May need minor DAL additions for filtering by approval status.
- **D-14:** Approved designs automatically appear in public gallery (public site reads `isApproved=true` designs).

### Claude's Discretion
- Financial reports layout (tabs vs sections vs dashboard-style)
- Tax calculation approach (settings-based rate vs hardcoded)
- Notification dropdown max items and pagination
- Low stock threshold configuration (settings or hardcoded)
- Design card layout details (aspect ratio, info density)
- Whether rejection notes are stored on the design record or in a separate field

</decisions>

<canonical_refs>
## Canonical References

### Analytics DAL (Phase 14)
- `src/lib/dal/analytics.ts` — `getRevenueData()`, `getClientAcquisitionData()`, `getBookingTrends()`, `getAppointmentTypeBreakdown()`, `getDashboardStats()`

### Designs DAL
- `src/lib/dal/designs.ts` — `getAllDesigns()`, `updateDesignApprovalStatus()`, `getPublicDesigns()`
- `src/lib/db/schema.ts` — `tattooDesign` table (isApproved, isPublic, style, tags, fileUrl, thumbnailUrl)

### Webhook Handlers (notification triggers)
- `src/app/api/webhooks/stripe/route.ts` — Payment events
- `src/app/api/webhooks/cal/route.ts` — Booking events
- `src/lib/actions/contact-actions.ts` — Contact form submission

### Existing Charts
- `src/components/dashboard/analytics-chart.tsx` — Recharts integration (ComposedChart, Brush zoom)

### Dashboard Layout
- `src/app/(dashboard)/layout.tsx` — Header where bell icon goes
- `src/components/dashboard/admin-nav.tsx` — Sidebar nav (needs notification link)

### UI Components (Phase 15)
- All shared components: EmptyState, ResponsiveDataTable, StatusBadge, etc.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Analytics DAL functions with SQL GROUP BY (ready to wire)
- Recharts already configured with ComposedChart, dual Y-axes, Brush zoom
- Designs DAL with getAllDesigns and updateDesignApprovalStatus
- All Phase 15 UI foundation components
- Sonner toast.promise pattern
- AlertDialog for destructive actions

### What Needs Creating
- `/dashboard/reports/page.tsx` — Financial reports page
- `/dashboard/notifications/page.tsx` — Notification history page
- `/dashboard/designs/page.tsx` — Design approval management page
- `notification` table in schema.ts + Drizzle migration
- `src/lib/dal/notifications.ts` — Notification CRUD DAL
- Notification creation calls in webhooks and actions
- Bell icon component with dropdown in header
- Payment method breakdown DAL function
- CSV export utility
- Design approval grid component

</code_context>

<specifics>
## Specific Ideas

- Bell icon in dashboard header with unread count badge
- 30s polling interval for notification checking
- Notification dropdown shows recent items, links to full page
- Thumbnail grid for design approval (not list view)
- CSV export is client-side (download from displayed data)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-missing-pages-operations*
*Context gathered: 2026-03-29*
