# Phase 17: Missing Pages -- Operations - Research

**Researched:** 2026-03-28
**Domain:** Dashboard pages (financial reports, notifications, design approvals), DB schema extension, client-side CSV export
**Confidence:** HIGH

## Summary

Phase 17 builds three operational dashboard capabilities: a financial reporting hub, an in-app notification system, and a design approval management page. The codebase already has strong foundations for all three: analytics DAL functions with SQL GROUP BY (Phase 14), Recharts chart components with dual Y-axis and Brush zoom (Phase 15), designs DAL with `getAllDesigns()` and `updateDesignApprovalStatus()`, and webhook handlers (Stripe, Cal.com) plus contact form actions that serve as notification trigger points.

The primary new work is (1) adding a `notification` table to the Drizzle schema with a pgEnum for notification types, running `db:generate` and `db:push`, (2) creating a notifications DAL with CRUD operations, (3) inserting notification creation calls into existing webhook handlers and server actions, (4) building a bell icon dropdown in the dashboard header with 30-second polling, and (5) creating three new page routes with their loading/error states. The financial reports page wires existing DAL functions into a new layout with a date range picker and adds one new DAL function for payment method breakdown. The design approval page uses a thumbnail grid layout with filter tabs.

**Primary recommendation:** Build the notification table and DAL first (it is a dependency for webhook integration), then build the three pages in parallel since they share no dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Claude's discretion for reports layout. Wire existing analytics DAL functions (getRevenueData, getClientAcquisitionData, getBookingTrends, getAppointmentTypeBreakdown) into reports page with date range picker, Recharts charts, and CSV export.
- D-02: Payment method breakdown needs new DAL function (group by payment method).
- D-03: Tax summary calculations -- derive from existing payment data (configurable tax rate in settings or hardcoded for now).
- D-04: CSV export -- client-side generation from displayed data (no server-side file generation needed).
- D-05: Bell icon with unread badge count in dashboard header. Click opens dropdown showing recent notifications. Link to full /dashboard/notifications page for history.
- D-06: Polling every 30 seconds for new notifications (not real-time WebSocket/SSE).
- D-07: New notification DB table: id, userId, type (enum: BOOKING, PAYMENT, CONTACT, LOW_STOCK), title, message, isRead, metadata (JSON), createdAt.
- D-08: All 4 event triggers: new bookings (Cal.com webhook), payments received (Stripe webhook), contact form submissions (contact action), low stock alerts (product stock check).
- D-09: Notification creation happens inside existing webhook handlers and server actions -- no separate notification service.
- D-10: Mark as read: click notification marks it read. "Mark all as read" button in dropdown.
- D-11: Thumbnail grid layout for designs. Each card: image, name, style, tags. Approve button sets isApproved=true. Reject button opens Dialog for rejection notes.
- D-12: Filter tabs: Pending / Approved / All.
- D-13: Uses existing getAllDesigns() and updateDesignApprovalStatus() from designs DAL. May need minor DAL additions for filtering by approval status.
- D-14: Approved designs automatically appear in public gallery (public site reads isApproved=true designs).

### Claude's Discretion
- Financial reports layout (tabs vs sections vs dashboard-style)
- Tax calculation approach (settings-based rate vs hardcoded)
- Notification dropdown max items and pagination
- Low stock threshold configuration (settings or hardcoded)
- Design card layout details (aspect ratio, info density)
- Whether rejection notes are stored on the design record or in a separate field

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAGE-03 | Financial reports page -- revenue by period, payment method breakdown, tax summaries, expense tracking, data export | Existing analytics DAL (getRevenueData, getBookingTrends, etc.), Recharts chart components, react-day-picker v9 Calendar for date range, Blob API for CSV export |
| PAGE-06 | Notification center -- in-app notifications for new bookings, payments, contact submissions, low stock | New notification table + DAL, 30s polling via TanStack Query, bell icon in dashboard header, webhook/action integration points identified |
| PAGE-07 | Design approval management -- approve/reject designs for public gallery, manage approval queue | Existing getAllDesigns() + updateDesignApprovalStatus() DAL, tattooDesign schema with isApproved/isPublic/thumbnailUrl/style/tags fields |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2
- **ORM:** Drizzle ORM 0.45.1 with single neon-serverless driver
- **Schema location:** `src/lib/db/schema.ts` with relational query API for reads, SQL builder for aggregations
- **Auth:** Better Auth v1.5.5 with 5-tier RBAC
- **State:** TanStack Query (server) + Zustand (client)
- **UI:** Shadcn/Radix + Tailwind CSS 4
- **Pattern:** Server Actions for mutations, Route Handlers for webhooks only
- **DAL pattern:** Auth checks in server-only DB functions
- **Import convention:** `db` from `@/lib/db`, schema from `@/lib/db/schema`
- **Pitfall:** Drizzle numeric() returns strings -- all monetary columns use `mode:'number'`
- **Pitfall:** Drizzle relational API (db.query) does not support aggregations -- use SQL builder with sql template literals
- **Pitfall:** Drizzle mutations need explicit `.returning()` -- without it, only rowCount is returned

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | ORM for notification table, DAL queries | Project ORM -- schema in src/lib/db/schema.ts |
| drizzle-kit | 0.31.10 | Migration generation for new notification table | Project migration tool -- `db:generate` + `db:push` |
| recharts | 2.15.4 | Charts for financial reports (Area, Bar, Pie, Composed) | Already configured with ChartContainer pattern |
| date-fns | 4.1.0 | Date formatting and manipulation for reports | Already used in DatePicker component |
| react-day-picker | 9.14.0 | Calendar/date range picker for report period selection | Already installed, v9 compatible with current Calendar component |
| @tanstack/react-query | 5.91.3 | 30-second polling for notification count | Already installed for server state management |
| lucide-react | 0.462.0 | Bell icon, notification icons, design approval icons | Already installed, used throughout dashboard |
| sonner | 2.0.7 | Toast notifications for approve/reject/mark-read actions | Already configured with toast.promise pattern |
| zod | 4.3.6 | Input validation for server actions | Already used in all existing actions |

### No new packages needed
All required functionality can be built with existing dependencies. CSV export uses native Blob API. Date range picking uses the existing react-day-picker v9 Calendar component in `mode="range"`.

## Architecture Patterns

### New Files to Create
```
src/
  lib/
    db/
      schema.ts                          # ADD: notificationTypeEnum + notification table + relations
    dal/
      notifications.ts                   # NEW: getUnreadCount, getNotifications, markAsRead, markAllAsRead, createNotification
    actions/
      notification-actions.ts            # NEW: markNotificationRead, markAllNotificationsRead
      design-approval-actions.ts         # NEW: approveDesign, rejectDesign (wraps DAL)
    utils/
      csv-export.ts                      # NEW: exportToCsv utility
  components/
    dashboard/
      notification-bell.tsx              # NEW: Bell icon + unread badge + dropdown (client component)
      notification-item.tsx              # NEW: Single notification row in dropdown/list
      date-range-picker.tsx              # NEW: Date range picker using Calendar mode="range"
      design-approval-card.tsx           # NEW: Thumbnail card with approve/reject actions
      reports-charts.tsx                 # NEW: Report-specific chart variants (payment breakdown pie, tax summary)
  app/
    (dashboard)/
      dashboard/
        reports/
          page.tsx                       # NEW: Financial reports page
          reports-client.tsx             # NEW: Client component with date range + tabs
          loading.tsx                    # NEW: Skeleton loading state
          error.tsx                      # NEW: Error boundary
        notifications/
          page.tsx                       # NEW: Full notification history
          notifications-client.tsx       # NEW: Client component with list + mark-all-read
          loading.tsx                    # NEW: Skeleton loading state
          error.tsx                      # NEW: Error boundary
        designs/
          page.tsx                       # NEW: Design approval management
          designs-client.tsx             # NEW: Client component with grid + filter tabs
          loading.tsx                    # NEW: Skeleton loading state
          error.tsx                      # NEW: Error boundary
    api/
      notifications/
        route.ts                         # NEW: GET endpoint for polling (returns unread count + recent)
```

### Pattern 1: Notification Table Schema
**What:** New pgEnum and pgTable for notifications
**When to use:** Required for D-07 -- DB-backed notification system

```typescript
// In src/lib/db/schema.ts
export const notificationTypeEnum = pgEnum('NotificationType', [
  'BOOKING', 'PAYMENT', 'CONTACT', 'LOW_STOCK'
]);

export const notification = pgTable('notification', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('isRead').notNull().default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('notification_userId_isRead_idx').on(table.userId, table.isRead),
  index('notification_userId_createdAt_idx').on(table.userId, table.createdAt),
  index('notification_createdAt_idx').on(table.createdAt),
]);

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
}));

// Update userRelations to include notifications:
// notifications: many(notification),
```

### Pattern 2: Notification Polling via Route Handler + TanStack Query
**What:** GET API route returns unread count + recent notifications; client polls every 30s
**When to use:** D-05 + D-06 -- bell icon with polling

```typescript
// src/app/api/notifications/route.ts -- GET handler (no auth bypass needed,
// this is an authenticated API route for the dashboard user)
import { getCurrentSession } from '@/lib/auth';
import { getUnreadCount, getRecentNotifications } from '@/lib/dal/notifications';

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [unreadCount, recent] = await Promise.all([
    getUnreadCount(session.user.id),
    getRecentNotifications(session.user.id, 10),
  ]);

  return NextResponse.json({ unreadCount, recent });
}
```

```typescript
// Client component with TanStack Query polling
const { data } = useQuery({
  queryKey: ['notifications', 'unread'],
  queryFn: () => fetch('/api/notifications').then(r => r.json()),
  refetchInterval: 30_000, // 30 seconds
});
```

### Pattern 3: Client-Side CSV Export via Blob API
**What:** Convert displayed table data to CSV string, create Blob, trigger download
**When to use:** D-04 -- CSV export from financial reports

```typescript
// src/lib/utils/csv-export.ts
export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? '');
        // RFC 4180: quote fields containing commas, quotes, or newlines
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Pattern 4: Date Range Picker using Calendar mode="range"
**What:** Dual-calendar popover for selecting start/end date range
**When to use:** Financial reports date range selection

```typescript
// Uses existing Calendar component in mode="range"
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';

// Calendar already supports mode="range" via react-day-picker v9
<Calendar
  mode="range"
  selected={dateRange}
  onSelect={setDateRange}
  numberOfMonths={2}
/>
```

### Pattern 5: Notification Creation in Webhook Handlers
**What:** Insert notification records inside existing webhook switch cases
**When to use:** D-08 + D-09 -- notification triggers

The webhook handlers must create notifications for admin users. Since this is a solo-artist studio, notifications target all admin/super_admin users. The pattern is:

```typescript
// Inside existing webhook handler (e.g., Cal.com BOOKING_CREATED)
import { createNotificationForAdmins } from '@/lib/dal/notifications';

// After appointment creation:
await createNotificationForAdmins({
  type: 'BOOKING',
  title: 'New Booking',
  message: `${firstName} ${lastName} booked a ${appointmentType}`,
  metadata: { appointmentId: appointment.id, customerName: `${firstName} ${lastName}` },
});
```

The `createNotificationForAdmins` function queries all users with admin/super_admin roles and inserts one notification per user. For a solo-artist studio this is typically 1 user, so batch insert is efficient.

### Pattern 6: Design Approval Grid with Filter Tabs
**What:** Thumbnail grid with Pending/Approved/All tabs, approve/reject actions
**When to use:** D-11 + D-12 + D-13

```typescript
// Uses Tabs component + grid layout
// Each card: Image (thumbnailUrl or fileUrl), name, style, tags, action buttons
// Approve: server action calls updateDesignApprovalStatus(id, true)
// Reject: AlertDialog with textarea for notes, then server action
```

### Anti-Patterns to Avoid
- **Polling via setInterval instead of TanStack Query refetchInterval:** setInterval does not respect component lifecycle, does not retry on error, and runs even when tab is unfocused. TanStack Query's `refetchInterval` handles all of these.
- **Server-side CSV generation:** Unnecessary complexity for this use case. The data is already fetched for display; generating CSV client-side from the same data avoids a redundant server round-trip.
- **Creating a separate notifications service/microservice:** D-09 explicitly says notification creation happens inside existing webhook handlers and server actions. Do not create a separate service.
- **WebSocket/SSE for notifications:** D-06 explicitly locks on 30-second polling. Do not build real-time infrastructure.
- **Direct db.query in page components:** Always go through DAL functions. The reports page should call DAL functions, not query the database directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Custom CSV serializer | Blob API with RFC 4180 quoting utility | Edge cases with commas, quotes, unicode in field values |
| Date range selection | Custom dual-calendar widget | react-day-picker v9 `mode="range"` with existing Calendar component | Already installed and styled |
| Chart rendering | Canvas/SVG charts | Recharts with existing ChartContainer/ChartConfig pattern | 5 chart types already built |
| Notification polling | Raw setInterval + fetch | TanStack Query `refetchInterval` | Handles dedup, caching, tab focus, error retry |
| Toast notifications | Custom notification system | Sonner `toast.promise` pattern | Already configured with consistent styling |

## Common Pitfalls

### Pitfall 1: Webhook Notification Creation Failing Silently
**What goes wrong:** Notification insert fails in webhook handler, which throws and returns 500, causing Stripe/Cal.com to retry the entire webhook (including the main business logic).
**Why it happens:** Notification is a side effect, not the primary purpose of the webhook.
**How to avoid:** Wrap notification creation in try/catch within the webhook handler. Log errors but do not re-throw. The core business logic (payment update, appointment creation) must succeed independently of notification creation.
**Warning signs:** Duplicate payments or appointments appearing after webhook retries.

### Pitfall 2: N+1 Query for Admin User Lookup on Every Notification
**What goes wrong:** `createNotificationForAdmins` queries the user table on every webhook event to find admin users.
**Why it happens:** No caching of admin user IDs.
**How to avoid:** For a solo-artist studio with 1-2 admin users, this is acceptable. If needed, cache admin user IDs with a short TTL using React `cache()` or a module-level variable with timestamp. But do not over-engineer -- this is a low-volume system.

### Pitfall 3: Date Range Picker Timezone Issues
**What goes wrong:** Date range filter produces off-by-one-day results because the calendar returns local midnight but the DB stores UTC timestamps.
**Why it happens:** `new Date('2026-03-28')` creates a date at midnight local time, which may be the previous day in UTC.
**How to avoid:** When passing date ranges to DAL functions, explicitly set start to beginning of day and end to end of day in UTC. Use `date-fns` `startOfDay` and `endOfDay` with UTC handling, or explicitly construct UTC dates.

### Pitfall 4: Notification Count Badge Not Updating After Mark-As-Read
**What goes wrong:** User clicks a notification in the dropdown to mark it read, but the badge count does not decrement.
**Why it happens:** The polling query cache is stale until the next 30s interval.
**How to avoid:** After marking a notification as read, call `queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })` to immediately refetch.

### Pitfall 5: Design Approval Revalidation Missing
**What goes wrong:** Admin approves a design but the public gallery does not update.
**Why it happens:** Missing `revalidatePath` call after design approval.
**How to avoid:** The approve/reject server actions must call `revalidatePath('/dashboard/designs')` and `revalidatePath('/gallery')` (or the public gallery path) to bust the cache for both admin and public views.

### Pitfall 6: Payment Method Data Not Available in Payment Table
**What goes wrong:** The `payment` table does not store payment method (card, bank, etc.) -- only Stripe IDs.
**Why it happens:** Payment method is a Stripe-side concept not denormalized into the local DB.
**How to avoid:** The payment method breakdown DAL function can either (a) group by `payment.type` (DEPOSIT vs SESSION_BALANCE) which is available locally, or (b) aggregate by payment status. If actual Stripe payment method (card/bank/etc.) is needed, it would require Stripe API calls which is expensive for a report. Recommend grouping by `payment.type` as the "payment method breakdown" since this is the meaningful local distinction.

### Pitfall 7: Drizzle pgEnum Migration Ordering
**What goes wrong:** Adding a new pgEnum to schema.ts and running `db:generate` -- the enum must be created before the table that references it.
**Why it happens:** Drizzle Kit handles this automatically in generated migrations, but if manually editing SQL, the CREATE TYPE must come before CREATE TABLE.
**How to avoid:** Use `drizzle-kit generate` to create the migration, then `drizzle-kit push` to apply. Do not manually edit migration SQL unless necessary. Verify the generated SQL creates the enum type before the table.

## Code Examples

### Notification DAL Pattern
```typescript
// src/lib/dal/notifications.ts
import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { eq, and, desc, count, sql, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  const [result] = await db.select({ count: count() })
    .from(schema.notification)
    .where(and(
      eq(schema.notification.userId, userId),
      eq(schema.notification.isRead, false),
    ));
  return result?.count ?? 0;
});

export const getRecentNotifications = cache(async (userId: string, limit: number = 10) => {
  return db.select()
    .from(schema.notification)
    .where(eq(schema.notification.userId, userId))
    .orderBy(desc(schema.notification.createdAt))
    .limit(limit);
});

export async function markAsRead(notificationId: string, userId: string) {
  const [result] = await db.update(schema.notification)
    .set({ isRead: true })
    .where(and(
      eq(schema.notification.id, notificationId),
      eq(schema.notification.userId, userId),
    ))
    .returning();
  return result;
}

export async function markAllAsRead(userId: string) {
  await db.update(schema.notification)
    .set({ isRead: true })
    .where(and(
      eq(schema.notification.userId, userId),
      eq(schema.notification.isRead, false),
    ));
}

export async function createNotificationForAdmins(data: {
  type: typeof schema.notificationTypeEnum.enumValues[number];
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  // Find all admin/super_admin users
  const admins = await db.select({ id: schema.user.id })
    .from(schema.user)
    .where(inArray(schema.user.role, ['admin', 'super_admin']));

  if (admins.length === 0) return;

  // Batch insert one notification per admin
  await db.insert(schema.notification).values(
    admins.map(admin => ({
      userId: admin.id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata ?? null,
    }))
  );
}
```

### Payment Method Breakdown DAL
```typescript
// Add to src/lib/dal/analytics.ts
export const getPaymentMethodBreakdown = cache(async (startDate?: Date, endDate?: Date) => {
  await requireStaffRole();

  const conditions = [eq(schema.payment.status, 'COMPLETED')];
  if (startDate) conditions.push(sql`${schema.payment.createdAt} >= ${startDate}`);
  if (endDate) conditions.push(sql`${schema.payment.createdAt} <= ${endDate}`);

  const rows = await db.select({
    type: schema.payment.type,
    total: sql<number>`coalesce(sum(${schema.payment.amount}), 0)::numeric`,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(schema.payment)
    .where(and(...conditions))
    .groupBy(schema.payment.type);

  return rows.map(row => ({
    type: row.type,
    total: Number(row.total),
    count: row.count,
  }));
});
```

### Bell Icon with Dropdown
```typescript
// src/components/dashboard/notification-bell.tsx
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => fetch('/api/notifications').then(r => r.json()),
    refetchInterval: 30_000,
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        {/* Notification list + "Mark all read" + "View all" link */}
      </PopoverContent>
    </Popover>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side CSV generation | Client-side Blob API export | Standard since 2020+ | No server round-trip, instant download |
| WebSocket for notifications | Polling with TanStack Query refetchInterval | Project decision D-06 | Much simpler, appropriate for low-volume |
| Custom date range UI | react-day-picker v9 mode="range" | v9 (already installed) | Native support, no extra library |
| Separate notification tables per type | Single polymorphic notification table with type enum + metadata JSON | Standard pattern | Flexible, simple queries |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vitest.config.ts) |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAGE-03 | Revenue data DAL returns grouped data | unit | `bun run test -- src/__tests__/reports-dal.test.ts -x` | No -- Wave 0 |
| PAGE-03 | CSV export generates valid CSV string | unit | `bun run test -- src/__tests__/csv-export.test.ts -x` | No -- Wave 0 |
| PAGE-06 | Notification DAL creates/reads/marks read | unit | `bun run test -- src/__tests__/notification-dal.test.ts -x` | No -- Wave 0 |
| PAGE-06 | Notification API route returns unread count | unit | `bun run test -- src/__tests__/notification-api.test.ts -x` | No -- Wave 0 |
| PAGE-07 | Design approval action toggles isApproved | unit | `bun run test -- src/__tests__/design-approval.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/notification-dal.test.ts` -- covers PAGE-06 DAL CRUD
- [ ] `src/__tests__/csv-export.test.ts` -- covers PAGE-03 CSV utility
- [ ] `src/__tests__/design-approval.test.ts` -- covers PAGE-07 approve/reject actions

## Open Questions

1. **Rejection notes storage location**
   - What we know: D-11 says reject button opens dialog for rejection notes. The `tattooDesign` table currently has no `rejectionNotes` column.
   - What's unclear: Should notes be stored as a new column on `tattooDesign`, or in the notification metadata, or a separate `designReview` table?
   - Recommendation: Add a `rejectionNotes` text column to `tattooDesign` -- simplest approach, one migration covers both the notification table and this column. This avoids a separate table for a single text field. The column is nullable so it only carries data when a design has been rejected.

2. **Low stock threshold**
   - What we know: D-08 requires low stock alerts. Products have no `stock` or `quantity` column in the `product` table currently.
   - What's unclear: Without a stock/inventory column, "low stock" cannot be computed from existing data.
   - Recommendation: Since inventory management is explicitly out of scope (see REQUIREMENTS.md "Out of Scope" table), the low stock notification trigger should be deferred or stubbed. Create the notification type in the enum but do not implement the trigger until a stock tracking mechanism exists. Document this as a known gap.

3. **Tax rate configuration**
   - What we know: D-03 allows hardcoded or settings-based tax rate.
   - Recommendation: Use a hardcoded default (e.g., 0% or a configurable constant) with a note that Phase 19/20 settings enhancement could make it configurable. The settings table already supports key-value pairs, so a future `tax_rate` setting is trivial.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/lib/db/schema.ts` -- all 20+ table definitions, enums, relations
- Codebase inspection: `src/lib/dal/analytics.ts` -- existing SQL GROUP BY analytics functions
- Codebase inspection: `src/lib/dal/designs.ts` -- getAllDesigns(), updateDesignApprovalStatus()
- Codebase inspection: `src/lib/dal/payments.ts` -- payment table queries, no payment method column
- Codebase inspection: `src/app/api/webhooks/stripe/route.ts` -- Stripe webhook handler structure
- Codebase inspection: `src/app/api/webhooks/cal/route.ts` -- Cal.com webhook handler structure
- Codebase inspection: `src/lib/actions/contact-actions.ts` -- contact form action structure
- Codebase inspection: `src/components/dashboard/analytics-chart.tsx` -- 5 Recharts chart components
- Codebase inspection: `src/components/ui/calendar.tsx` -- react-day-picker v9 with mode="range" support
- Codebase inspection: `src/app/(dashboard)/layout.tsx` -- dashboard header structure for bell icon placement
- Codebase inspection: `src/components/dashboard/admin-nav.tsx` -- sidebar navigation items
- Codebase inspection: `package.json` -- all dependency versions verified

### Secondary (MEDIUM confidence)
- [GeeksforGeeks CSV Export](https://www.geeksforgeeks.org/javascript/how-to-create-and-download-csv-file-in-javascript/) -- Blob API CSV pattern
- [RFC 4180](https://copyprogramming.com/howto/javascript-to-csv-export-encoding-issue) -- CSV encoding best practices
- [shadcn Date Picker docs](https://ui.shadcn.com/docs/components/radix/date-picker) -- Date range picker pattern
- npm registry version checks: recharts 3.8.1 (latest), date-fns 4.1.0 (current), drizzle-orm 0.45.2 (latest, project on 0.45.1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and verified in codebase
- Architecture: HIGH -- patterns directly derived from existing codebase conventions (DAL, server actions, chart components, page structure)
- Pitfalls: HIGH -- identified from actual codebase inspection (missing payment method column, webhook retry risk, revalidation requirements)
- Notification system: HIGH -- straightforward DB table + polling, well-understood pattern
- Low stock alert: LOW -- product table lacks stock tracking; trigger cannot be fully implemented

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- all patterns use existing codebase conventions)
