---
phase: 17-missing-pages-operations
verified: 2026-03-28T00:00:00Z
status: gaps_found
score: 17/20 must-haves verified
gaps:
  - truth: "Artist can view revenue by period in chart form with date range selection"
    status: partial
    reason: "DateRangePicker renders and captures state but dateRange is never passed to any data-fetching call. The charts always show 12-month server-side data regardless of picker value. No router.push, useQuery, or URL param update is triggered when the date range changes."
    artifacts:
      - path: "src/app/(dashboard)/dashboard/reports/reports-client.tsx"
        issue: "dateRange useState is set via onDateRangeChange={setDateRange} but is never consumed — no useEffect, router.push, or query call uses it. Charts remain static at the 12-month default."
    missing:
      - "Wire dateRange state to trigger re-fetch: either router.push with ?from=&to= URL params (server re-fetch) or a TanStack Query call using dateRange as part of the query key"
      - "Pass URL params from searchParams into page.tsx and call getRevenueByDateRange when from/to params are present"
  - truth: "Artist can export displayed report data to CSV and download it"
    status: partial
    reason: "CSV export exists and calls exportToCsv correctly. However it always exports the static 12-month server-side revenueData rather than the currently displayed (date-range-filtered) data. Because the date range picker is disconnected, the export reflects all data regardless of picker state. This is a consequence of the date range gap, not an independent failure — CSV export itself is wired, but to static data only."
    artifacts:
      - path: "src/app/(dashboard)/dashboard/reports/reports-client.tsx"
        issue: "handleExportCsv uses revenueData prop directly (12-month server data), not the date-range-filtered subset. When date range filtering is fixed, this function will also need to use the filtered data."
    missing:
      - "After date range wiring is added, update handleExportCsv to export the currently displayed (filtered) data rather than the static prop"
human_verification:
  - test: "Open /dashboard/notifications and confirm bell icon shows unread count badge"
    expected: "Bell icon visible in header, badge appears when unread notifications exist, badge updates within 30 seconds of a new notification"
    why_human: "Cannot verify live polling behavior or badge rendering without a running browser"
  - test: "Open /dashboard/designs, upload a design if needed, click Reject, enter notes, confirm"
    expected: "Dialog (not AlertDialog) opens with textarea. Notes persist on the card after rejection. Rejected design disappears from Pending tab."
    why_human: "Requires browser interaction and active DB to confirm Dialog UX and note persistence end-to-end"
  - test: "Verify date range picker on /dashboard/reports after gap is fixed"
    expected: "Selecting 'Last 30 days' preset updates revenue chart to show only that period"
    why_human: "Date range wiring requires code fix first; then needs browser verification of chart update"
---

# Phase 17: Missing Pages & Operations Verification Report

**Phase Goal:** Artist has a financial reporting hub, receives in-app notifications for business events, and can manage design approvals for the public gallery
**Verified:** 2026-03-28
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bell icon in dashboard header shows unread notification count badge | VERIFIED | `notification-bell.tsx` renders Bell icon with conditional Badge at absolute -top-1 -right-1; imported in `layout.tsx` within `ml-auto flex` container |
| 2 | Clicking bell opens dropdown with recent notifications | VERIFIED | Popover with PopoverContent (align="end" w-80) renders `NotificationItem` list for `recent` array from TanStack Query |
| 3 | Notification dropdown has 'Mark all as read' button that clears unread count | VERIFIED | `handleMarkAllRead` calls `markAllNotificationsReadAction()` then `queryClient.invalidateQueries` — immediate badge refresh confirmed |
| 4 | Full notification history page at /dashboard/notifications lists all notifications | VERIFIED | `page.tsx` (server) fetches paginated `getNotifications`, passes to `NotificationsClient` which renders card list with pagination |
| 5 | Clicking a notification marks it as read and updates the badge count immediately | VERIFIED | `handleMarkRead` in bell and `handleMarkRead` in client both call server action then `queryClient.invalidateQueries` / `router.refresh()` |
| 6 | Notification count polls every 30 seconds via TanStack Query refetchInterval | VERIFIED | `notification-bell.tsx` line 43: `refetchInterval: 30_000` |
| 7 | Artist can view revenue by period in chart form with date range selection | PARTIAL | `DateRangePicker` renders; `RevenueComposedChart` renders 12-month server data. BUT `dateRange` state is never connected to any refetch — picker is decorative only |
| 8 | Artist can see payment type breakdown (deposit vs session balance) in a pie/bar chart | VERIFIED | `PaymentBreakdownChart` PieChart wired to `paymentBreakdown` prop from `getPaymentMethodBreakdown()` in `page.tsx` |
| 9 | Artist can view a tax summary section derived from payment data | VERIFIED | `TaxSummaryTable` renders per-month revenue, tax, net with total row; amber "Tax not configured" banner when `DEFAULT_TAX_RATE = 0` |
| 10 | Artist can export displayed report data to CSV and download it | PARTIAL | `exportToCsv` called correctly on button click; exports static 12-month `revenueData` prop. Export is wired but not to date-range-filtered data (consequence of truth #7 gap) |
| 11 | Reports page is accessible from sidebar navigation | VERIFIED | `admin-nav.tsx` line 51: `{ label: 'Reports', href: '/dashboard/reports', icon: FileBarChart }` |
| 12 | Tax rate is defined as a named constant and UI indicates when tax is not configured | VERIFIED | `DEFAULT_TAX_RATE = 0` exported from `reports-charts.tsx`; amber banner renders when `taxRate === 0` |
| 13 | Artist can view a grid of designs with filter tabs for Pending, Approved, and All | VERIFIED | `designs-client.tsx` renders `Tabs` with Pending/Approved/All triggers; tab change calls `updateUrlParams('status', value)` for server re-fetch |
| 14 | Artist can approve a pending design and it becomes visible in the public gallery | VERIFIED | `approveDesignAction` calls `updateDesignApprovalStatus(id, true)`, revalidates `/gallery` and `/dashboard/designs` |
| 15 | Artist can reject a design with notes explaining the reason, and notes persist on the design record | VERIFIED | `rejectDesignAction` stores notes via `updateDesignApprovalStatus(id, false, notes)`; `rejectionNotes` column confirmed in schema.ts line 252 and designs.ts |
| 16 | New booking creates a BOOKING notification for admin users | VERIFIED | `cal/route.ts` BOOKING_CREATED case wraps `createNotificationForAdmins({type:'BOOKING',...})` in try/catch after `handleBookingCreated` |
| 17 | Payment received creates a PAYMENT notification for admin users | VERIFIED | `stripe/route.ts` checkout.session.completed case wraps `createNotificationForAdmins({type:'PAYMENT',...})` in try/catch covering all order types |
| 18 | Contact form submission creates a CONTACT notification for admin users | VERIFIED | `contact-actions.ts` `submitContactForm` wraps `createNotificationForAdmins({type:'CONTACT',...})` in try/catch after DB insert |
| 19 | Design approval and rejection actions are recorded in the audit log | VERIFIED | Both `approveDesignAction` and `rejectDesignAction` call `logAudit` via `after()` with DESIGN_APPROVED / DESIGN_REJECTED action and designId |
| 20 | Notification page is accessible from sidebar navigation | VERIFIED | `admin-nav.tsx` line 47: `{ label: 'Notifications', href: '/dashboard/notifications', icon: Bell }` |

**Score:** 17/20 truths verified (2 partial, 1 partial dependent on same root cause)

---

## Required Artifacts

### Plan 17-01 Artifacts (PAGE-06)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | notificationTypeEnum + notification table + rejectionNotes | VERIFIED | Line 39: notificationTypeEnum; line 487: notification table; line 252: rejectionNotes |
| `src/lib/dal/notifications.ts` | Notification CRUD DAL, 6 exports | VERIFIED | All 6 functions present: getUnreadCount, getRecentNotifications, getNotifications, markAsRead, markAllAsRead, createNotificationForAdmins; server-only import; retention TODO comment at top |
| `src/app/api/notifications/route.ts` | GET endpoint for polling | VERIFIED | Returns `{ unreadCount, recent }` via Promise.all; 401 for unauthenticated |
| `src/components/dashboard/notification-bell.tsx` | Bell icon with badge and dropdown | VERIFIED | Popover with TanStack Query polling, badge, mark-all-as-read, cache invalidation |
| `src/app/(dashboard)/dashboard/notifications/page.tsx` | Full notification history page | VERIFIED | Server component fetching paginated notifications, serializing dates, passing to NotificationsClient |

### Plan 17-02 Artifacts (PAGE-03)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/dal/analytics.ts` | getPaymentMethodBreakdown export | VERIFIED | Lines 172-193: cached function grouping completed payments by type with optional date range params |
| `src/lib/utils/csv-export.ts` | exportToCsv utility | VERIFIED | RFC 4180 quoting with UTF-8 BOM; Blob API download |
| `src/app/(dashboard)/dashboard/reports/page.tsx` | Financial reports page | VERIFIED | Server component fetching 4 DAL functions in parallel, passing to ReportsClient |
| `src/components/dashboard/date-range-picker.tsx` | Date range picker with presets | VERIFIED | Dual calendar, 5 presets, startOfDay/endOfDay, controlled via Popover |
| `src/components/dashboard/reports-charts.tsx` | PaymentBreakdownChart + TaxSummaryTable | VERIFIED | PieChart with DEPOSIT/SESSION_BALANCE/REFUND colors; TaxSummaryTable with amber indicator; DEFAULT_TAX_RATE exported |

### Plan 17-03 Artifacts (PAGE-06, PAGE-07)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(dashboard)/dashboard/designs/page.tsx` | Design approval management page | VERIFIED | Reads searchParams, calls getDesignsByApprovalStatus, passes to DesignsClient |
| `src/components/dashboard/design-approval-card.tsx` | Thumbnail card with Next.js Image, approve/reject | VERIFIED | next/image with fill + loading=lazy + responsive sizes; Dialog (not AlertDialog) for rejection |
| `src/lib/actions/design-approval-actions.ts` | Server actions with audit logging | VERIFIED | approveDesignAction + rejectDesignAction; logAudit via after(); revalidatePath for both /dashboard/designs and /gallery |
| `src/lib/dal/designs.ts` | getDesignsByApprovalStatus + updated updateDesignApprovalStatus | VERIFIED | Status filter (pending/approved/all), ilike search, rejectionNotes in return type; updateDesignApprovalStatus accepts rejectionNotes param |
| `src/app/api/webhooks/stripe/route.ts` | PAYMENT notification on checkout.session.completed | VERIFIED | Lines 80-93: createNotificationForAdmins in try/catch after all orderType branches |
| `src/app/api/webhooks/cal/route.ts` | BOOKING notification on BOOKING_CREATED | VERIFIED | Lines 67-79: createNotificationForAdmins in try/catch after handleBookingCreated |
| `src/lib/actions/contact-actions.ts` | CONTACT notification on form submission | VERIFIED | Lines 50-59: createNotificationForAdmins in try/catch after createContact |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `notification-bell.tsx` | `/api/notifications` | TanStack Query refetchInterval: 30_000 | WIRED | `queryFn: () => fetch('/api/notifications').then(r => r.json()), refetchInterval: 30_000` |
| `api/notifications/route.ts` | `dal/notifications.ts` | getUnreadCount + getRecentNotifications | WIRED | Both called in Promise.all at lines 11-14 |
| `(dashboard)/layout.tsx` | `notification-bell.tsx` | NotificationBell in header | WIRED | Imported line 12; rendered line 32 inside ml-auto flex container |
| `reports/reports-client.tsx` | `csv-export.ts` | exportToCsv call on button click | WIRED | handleExportCsv calls exportToCsv('financial-report.csv', rows) |
| `reports/page.tsx` | `dal/analytics.ts` | getRevenueData + getPaymentMethodBreakdown | WIRED | Promise.all at lines 17-22 fetches all 4 DAL functions |
| `date-range-picker.tsx` | `react-day-picker` | Calendar mode="range" | WIRED | `<Calendar mode="range" numberOfMonths={2} selected={dateRange} onSelect={onDateRangeChange} />` |
| `reports-client.tsx` | `dal/analytics.ts` (via date range) | date range updates triggering re-fetch | NOT WIRED | dateRange useState is set but never used in any fetch call — CRITICAL GAP |
| `design-approval-actions.ts` | `dal/designs.ts` | updateDesignApprovalStatus with rejectionNotes | WIRED | Both approveDesignAction and rejectDesignAction call updateDesignApprovalStatus |
| `design-approval-actions.ts` | revalidatePath | /dashboard/designs + /gallery | WIRED | Lines 33-34 and 62-63 respectively |
| `design-approval-actions.ts` | `dal/audit` | logAudit via after() | WIRED | logAudit called for DESIGN_APPROVED and DESIGN_REJECTED with metadata |
| `webhooks/stripe/route.ts` | `dal/notifications.ts` | createNotificationForAdmins PAYMENT | WIRED | Lines 83-88; import at line 10 |
| `webhooks/cal/route.ts` | `dal/notifications.ts` | createNotificationForAdmins BOOKING | WIRED | Lines 71-76; import at line 10 |
| `contact-actions.ts` | `dal/notifications.ts` | createNotificationForAdmins CONTACT | WIRED | Lines 51-58; import at line 9 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `notification-bell.tsx` | `data.unreadCount`, `data.recent` | `/api/notifications` → `getUnreadCount` + `getRecentNotifications` → DB | Yes — DB queries on notification table with real userId filter | FLOWING |
| `notifications/page.tsx` | `result.data` | `getNotifications(userId, params)` → DB select from notification table with pagination | Yes — real DB query | FLOWING |
| `reports/page.tsx` | `revenueData`, `paymentBreakdown`, `bookingTrends`, `stats` | analytics.ts DAL functions → DB | Yes — real DB queries on tattooSession, payment, appointment tables | FLOWING |
| `reports-client.tsx` | `dateRange` | useState only, no data source | No — date range picker state never populates filtered data | HOLLOW_PROP |
| `designs/page.tsx` | `designs.data` | `getDesignsByApprovalStatus(status, params)` → DB select from tattoo_design | Yes — real DB query with approval status filter | FLOWING |
| `design-approval-card.tsx` | `design.thumbnailUrl`, `design.rejectionNotes` | Props from designs/page.tsx → DAL → DB | Yes — DAL includes thumbnailUrl, rejectionNotes in select columns | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Notification API route file exists | `ls src/app/api/notifications/route.ts` | File present | PASS |
| refetchInterval wired at 30s | grep `refetchInterval.*30` in notification-bell.tsx | Line 43: `refetchInterval: 30_000` | PASS |
| DAL index exports notifications | grep `notifications` in dal/index.ts | Lines 112-120 export all 6 functions | PASS |
| rejectionNotes in schema | grep `rejectionNotes` in schema.ts | Line 252 in tattooDesign table | PASS |
| Date range not wired | grep `dateRange` in reports-client.tsx | Only setState and prop pass — no fetch trigger | FAIL |
| DEFAULT_TAX_RATE exported | grep `DEFAULT_TAX_RATE` in reports-charts.tsx | Line 28: `export const DEFAULT_TAX_RATE = 0` | PASS |
| Stripe notification trigger | grep `createNotificationForAdmins` in stripe/route.ts | Lines 83-88 with try/catch | PASS |
| Cal notification trigger | grep `createNotificationForAdmins` in cal/route.ts | Lines 71-76 with try/catch | PASS |
| Contact notification trigger | grep `createNotificationForAdmins` in contact-actions.ts | Lines 51-58 with try/catch | PASS |
| Dialog not AlertDialog in design card | grep `AlertDialog` in design-approval-card.tsx | Zero matches; Dialog imports only | PASS |
| Next.js Image in design card | grep `next/image` in design-approval-card.tsx | Line 4: `import Image from 'next/image'` | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAGE-06 | 17-01, 17-03 | Notification center -- in-app notifications for new bookings, payments, contact submissions, low stock | SATISFIED | Full notification system: schema, DAL, API, bell UI, history page, and triggers in all 3 event sources. LOW_STOCK documented as deferred (product table lacks stock tracking). |
| PAGE-07 | 17-03 | Design approval management -- approve/reject designs for public gallery, manage approval queue | SATISFIED | /dashboard/designs with filter tabs, thumbnail grid, approve/reject with Dialog, rejection notes persistence, audit logging, revalidation of public gallery |
| PAGE-03 | 17-02 | Financial reports page -- revenue by period, payment method breakdown, tax summaries, expense tracking, data export | PARTIAL | Reports page exists with all chart types and CSV export. Date range selection is present in UI but NOT connected to data re-fetching. REQUIREMENTS.md confirms status is still "Pending". |

**Note on PAGE-03 "expense tracking":** The requirement mentions expense tracking, but no expense tracking feature exists in any plan or implementation. The plans scoped this to revenue/payment reporting only. This is not flagged as a gap since the plans (not the requirement) define the contract for this phase, and expense tracking was not planned.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `reports-client.tsx` | 31, 63-64 | `dateRange` useState set but never consumed in any data fetch | Blocker | Date range picker appears functional but has no effect on chart data — user selects a range and nothing happens |
| `reports-client.tsx` | 38-48 | `handleExportCsv` exports static `revenueData` prop | Warning | CSV always exports 12-month default data regardless of date picker state (dependent on blocker above) |

**Stub classification note:** `dateRange` state begins as `undefined` and is set via the picker. It is NOT a "never gets populated" stub — it correctly stores the picker value. The issue is that the value is never forwarded to any fetch, making it a HOLLOW_PROP (data flows into state but terminates there rather than driving a query).

---

## Human Verification Required

### 1. Notification Bell Live Polling

**Test:** Log in as an admin user. Note the current bell badge count (or 0 if none). Trigger a test notification (submit a contact form, or create a notification directly via DB). Wait up to 30 seconds.
**Expected:** Badge count increments without a page reload. Within 30 seconds the new notification appears in the dropdown.
**Why human:** Cannot verify polling interval behavior without a running browser and live server.

### 2. Design Rejection Dialog UX

**Test:** Navigate to /dashboard/designs. On any pending design card, click "Reject". Observe the modal that opens.
**Expected:** A Dialog (not full-screen AlertDialog) opens with a "Reject Design" title, a description, and a Textarea for notes. The "Reject" button is disabled until text is entered. After confirming, the card shows the rejection notes preview.
**Why human:** Dialog render and Textarea interaction require browser.

### 3. Date Range Picker (After Gap Fix)

**Test:** After the date range wiring fix is applied, select "Last 30 days" preset on /dashboard/reports.
**Expected:** Revenue Trend chart updates to show only the last 30 days of data. CSV export downloads data for that same period.
**Why human:** Requires a running app with real data and browser interaction to verify chart responsiveness.

---

## Gaps Summary

Two truths from Plan 17-02 (PAGE-03 / financial reports) are partially verified. The root cause is a single disconnected state variable:

**Root cause:** In `src/app/(dashboard)/dashboard/reports/reports-client.tsx`, the `dateRange` state is captured from the `DateRangePicker` component but never used to trigger a data refetch. The plan's Task 2 specified using "URL params approach matching the contacts page pattern" — this was not implemented. The fix requires either:
1. `router.push` with `?from=<date>&to=<date>` URL params when `dateRange` changes (server re-fetch approach), then reading those params in `page.tsx` to call `getRevenueByDateRange` instead of `getRevenueData(12)`, or
2. A TanStack Query `useQuery` with `dateRange` in the query key that calls a client-accessible endpoint.

The CSV export gap is a cascade of this same root cause — once date filtering works, `handleExportCsv` also needs to export the filtered data.

All other phase features (notification system, design approvals, notification triggers) are fully implemented and wired. PAGE-06 and PAGE-07 are complete. PAGE-03 remains at "Pending" status in REQUIREMENTS.md as of verification.

---

_Verified: 2026-03-28_
_Verifier: Claude (gsd-verifier)_
