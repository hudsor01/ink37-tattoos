---
phase: 17-missing-pages-operations
plan: "01"
subsystem: notifications
tags: [notification, bell, polling, dal, schema, dashboard]
dependency_graph:
  requires: []
  provides: [notification-schema, notification-dal, notification-api, notification-bell, notification-page]
  affects: [dashboard-layout, admin-nav, schema]
tech_stack:
  added: []
  patterns: [tanstack-query-polling, popover-dropdown, server-actions, route-handler-polling]
key_files:
  created:
    - src/lib/dal/notifications.ts
    - src/lib/dal/types.ts
    - src/lib/actions/notification-actions.ts
    - src/app/api/notifications/route.ts
    - src/components/dashboard/notification-bell.tsx
    - src/components/dashboard/notification-item.tsx
    - src/app/(dashboard)/dashboard/notifications/page.tsx
    - src/app/(dashboard)/dashboard/notifications/notifications-client.tsx
    - src/app/(dashboard)/dashboard/notifications/loading.tsx
    - src/app/(dashboard)/dashboard/notifications/error.tsx
  modified:
    - src/lib/db/schema.ts
    - src/lib/dal/index.ts
    - src/app/(dashboard)/layout.tsx
    - src/components/dashboard/admin-nav.tsx
decisions:
  - "Used base-ui Popover (not asChild) matching project pattern for bell dropdown"
  - "Created shared PaginationParams/PaginatedResult types in dal/types.ts for reuse across DAL modules"
  - "Notification retention left as intentional TODO per plan -- future scheduled job"
metrics:
  duration_seconds: 295
  completed: "2026-03-29T20:43:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 4
---

# Phase 17 Plan 01: Notification System Infrastructure and UI Summary

DB-backed notification system with bell dropdown polling via TanStack Query (30s), full DAL with 6 CRUD functions, server actions for mark-as-read, and paginated notification history page.

## What Was Built

### Task 1: Notification schema, DAL, actions, and API route (ae4767a)

**Schema additions to `src/lib/db/schema.ts`:**
- Added `notificationTypeEnum` with BOOKING, PAYMENT, CONTACT, LOW_STOCK values
- Added `notification` table with userId FK, type, title, message, isRead, metadata (jsonb), createdAt
- Added 3 indexes: userId+isRead, userId+createdAt, createdAt
- Added `rejectionNotes` nullable text column to `tattooDesign` table (for Plan 17-03)
- Added `notificationRelations` and updated `userRelations` with `notifications: many(notification)`

**DAL (`src/lib/dal/notifications.ts`):**
- `getUnreadCount(userId)` -- cached count of unread notifications
- `getRecentNotifications(userId, limit)` -- cached recent notifications ordered by createdAt
- `getNotifications(userId, params)` -- paginated with search support (ilike on title/message)
- `markAsRead(notificationId, userId)` -- updates single notification with `.returning()`
- `markAllAsRead(userId)` -- bulk update all unread to read
- `createNotificationForAdmins(data)` -- batch insert for all admin/super_admin users

**Shared types (`src/lib/dal/types.ts`):**
- PaginationParams interface (page, pageSize, search, sortBy, sortOrder)
- PaginatedResult generic interface
- DEFAULT_PAGE_SIZE constant (20)

**Server actions (`src/lib/actions/notification-actions.ts`):**
- `markNotificationReadAction` -- auth guard, marks single notification read, revalidates path
- `markAllNotificationsReadAction` -- auth guard, marks all read, revalidates path

**API route (`src/app/api/notifications/route.ts`):**
- GET handler returns `{ unreadCount, recent }` for authenticated users, 401 for unauthenticated
- Calls getUnreadCount and getRecentNotifications in parallel via Promise.all

### Task 2: Bell icon dropdown, notification page, sidebar nav, and header integration (90fbc40)

**NotificationBell (`src/components/dashboard/notification-bell.tsx`):**
- TanStack Query polling at 30-second intervals via `refetchInterval: 30_000`
- Bell icon button with badge showing unread count (capped at 99+)
- Popover dropdown with recent notifications, mark-all-as-read button, and "View all" link
- Cache invalidation via `queryClient.invalidateQueries` after mark-as-read actions

**NotificationItem (`src/components/dashboard/notification-item.tsx`):**
- Type-based icons (Bell/CreditCard/MessageSquare/AlertTriangle)
- Unread indicator (blue dot), bold title for unread, relative timestamps with absolute tooltip
- Click-to-mark-read handler

**Dashboard layout integration:**
- NotificationBell added to header alongside ThemeToggle with flex container
- Notifications entry added to sidebar nav (between Contacts and Media)

**Notification history page (`/dashboard/notifications`):**
- Server component fetches paginated notifications for current user
- Client component with card-based notification list, type badges, mark-as-read
- URL-based pagination with Previous/Next controls
- Empty state with guidance text
- Loading skeleton and error boundary with retry

## Deviations from Plan

### Auto-added Missing Functionality

**1. [Rule 2] Created src/lib/dal/types.ts**
- **Found during:** Task 1
- **Issue:** Plan referenced PaginationParams and PaginatedResult from dal/types.ts but the file did not exist
- **Fix:** Created the types file with PaginationParams, PaginatedResult, and DEFAULT_PAGE_SIZE
- **Files created:** src/lib/dal/types.ts

## Known Stubs

None. The notification retention policy TODO is an intentional design decision documented in the plan, not a stub preventing functionality.

Note: The Drizzle migration (drizzle-kit generate/push) was not executed because it requires database connectivity. The schema changes are complete in code and will be applied when the migration is run against the database.

## Verification Results

1. TypeScript compiles: PASS (zero errors)
2. All 354 existing tests pass: PASS
3. Notification schema exists: PASS (9 references in schema.ts)
4. RejectionNotes column exists: PASS
5. Retention TODO exists: PASS
6. Bell icon in header: PASS (NotificationBell imported and rendered)
7. Polling interval: PASS (refetchInterval: 30_000)
8. API route exists: PASS

## Self-Check: PASSED

All 10 created files verified present. Both commit hashes (ae4767a, 90fbc40) verified in git log.
