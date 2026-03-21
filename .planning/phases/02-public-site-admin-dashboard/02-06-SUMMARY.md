---
phase: 02-public-site-admin-dashboard
plan: 06
subsystem: admin-dashboard
tags: [admin, dashboard, kpi, customers, appointments, crud, tanstack-query]
dependency_graph:
  requires: [02-05]
  provides: [admin-dashboard-overview, customer-management, appointment-management, admin-api-routes]
  affects: [02-07]
tech_stack:
  added: []
  patterns: [server-component-initialData-to-client-useQuery, form-with-zodResolver, crud-dialog-pattern]
key_files:
  created:
    - src/components/dashboard/kpi-card.tsx
    - src/app/api/admin/customers/route.ts
    - src/app/api/admin/appointments/route.ts
    - src/components/dashboard/customer-form.tsx
    - src/app/(dashboard)/dashboard/customers/page.tsx
    - src/app/(dashboard)/dashboard/customers/customer-list-client.tsx
    - src/app/(dashboard)/dashboard/customers/[id]/page.tsx
    - src/components/dashboard/appointment-form.tsx
    - src/app/(dashboard)/dashboard/appointments/page.tsx
    - src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx
  modified:
    - src/app/(dashboard)/dashboard/page.tsx
decisions:
  - zodResolver with Zod 4 requires type assertion (as any) due to known type incompatibility between @hookform/resolvers and Zod 4
  - base-ui Select onValueChange provides nullable value, wrapped with fallback handlers
  - Date serialization in server components before passing to client components as initialData
metrics:
  duration: ~15 min
  completed: "2026-03-21"
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 1
---

# Phase 02 Plan 06: Admin Dashboard, Customers, and Appointments Summary

KPI dashboard overview with 4 metric cards, full customer CRUD with medical info and detail pages, appointment management with status tracking and filtering, all using TanStack Query hybrid pattern (server initialData + client useQuery + API routes).

## Tasks Completed

### Task 1: Dashboard Overview with KPI Cards

- Created `KPICard` component with title, value, icon, description, and optional trend indicator
- Rebuilt dashboard page as server component calling `getDashboardStats()` and `getRevenueData(6)`
- Four KPI cards: Total Revenue (currency formatted), Total Clients, Appointments, Sessions Completed
- Recent Appointments table showing 5 most recent with customer name, date, type, and StatusBadge
- Revenue Overview card with placeholder for Recharts (to be implemented in 02-07)
- Empty states per UI-SPEC: "No appointments scheduled", "Charts will appear once you have session data."

### Task 2: Customer & Appointment Management + Admin API Routes

**API Routes:**
- `GET /api/admin/customers` - Returns all customers via DAL (auth enforced inside DAL)
- `GET /api/admin/appointments` - Returns all appointments via DAL (auth enforced inside DAL)

**Customer Management:**
- Server page provides `getCustomers()` initialData, passes serialized data to client component
- Client component uses `useQuery({ queryKey: ['customers'], initialData })` for cache management
- DataTable with sortable Name, Email, Phone, Created columns
- Search by last name with debounced SearchInput
- Add Customer dialog with CustomerForm (react-hook-form + zodResolver + shadcn Form)
- Edit Customer dialog with pre-filled CustomerForm
- Delete Customer with AlertDialog confirmation per UI-SPEC copy
- Empty state: "No customers yet" / "Add your first customer to start tracking their tattoo journey."
- CustomerForm uses Tabs (Basic Info, Medical, Emergency, Additional) for organized data entry
- Medical tab handles allergies and medical conditions as comma-separated strings converted to arrays
- All mutations call Server Actions, invalidate TanStack Query cache, show sonner toasts

**Customer Detail Page:**
- Server component calling `getCustomerWithDetails(id)` with full includes
- Contact info card (email, phone, address)
- Medical info card (allergies as badges, medical conditions as badges, emergency contact)
- Appointment history table with date, type, status, description
- Session history table with date, design, placement, status, cost
- Back navigation to customer list
- 404 handling via `notFound()`

**Appointment Management:**
- Server page provides `getAppointments()` initialData with customer includes
- Client component uses `useQuery({ queryKey: ['appointments'], initialData })` for cache management
- DataTable with sortable Customer, Date, Type, Status columns
- Status filter dropdown (All, Pending, Confirmed, Scheduled, In Progress, Completed, Cancelled, No Show)
- New Appointment dialog with AppointmentForm
- Quick status updates via dropdown menu (Confirm, Mark Completed, Mark No-Show)
- Cancel Appointment with AlertDialog confirmation per UI-SPEC copy
- Empty state: "No appointments scheduled" / "Create an appointment to get started."
- AppointmentForm includes all fields: customer, scheduling, contact, tattoo details, notes
- Select component for appointment type with all 5 options (Consultation, Design Review, Tattoo Session, Touch-Up, Removal)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] zodResolver type assertion for Zod 4 compatibility**
- **Found during:** Task 2 (CustomerForm)
- **Issue:** `@hookform/resolvers` 5.2.2 `zodResolver` returns types incompatible with `react-hook-form` when using Zod 4 schemas. TypeScript error on `resolver`, `control`, and `handleSubmit`.
- **Fix:** Added `as any` type assertion on `zodResolver(CreateCustomerSchema)` call. This is a known Zod 4 migration issue that affects all forms using zodResolver.
- **Files modified:** `src/components/dashboard/customer-form.tsx`

**2. [Rule 1 - Bug] base-ui Select onValueChange null handling**
- **Found during:** Task 2 (AppointmentListClient, AppointmentForm)
- **Issue:** base-ui Select's `onValueChange` passes `(value: string | null, eventDetails)` but state setters and form field onChange expect non-null strings.
- **Fix:** Wrapped with fallback handlers: `(val) => setStatusFilter(val ?? 'ALL')` and `(val) => field.onChange(val ?? 'CONSULTATION')`
- **Files modified:** `src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx`, `src/components/dashboard/appointment-form.tsx`

## Pre-existing Issues (Out of Scope)

- `src/app/not-found.tsx` uses `asChild` prop on Button which is a Radix pattern not available in base-ui (uses `render` prop instead). Not introduced by this plan.
- Session form/list files from a prior plan had type errors that were not in scope for this plan.

## Verification

- `npx tsc --noEmit` passes for all 02-06 files (0 errors in plan scope)
- Pre-existing errors in `not-found.tsx` (2 errors) are unrelated to this plan
- All acceptance criteria from the plan are met

## Known Stubs

- Revenue Overview chart is a deliberate placeholder -- plan explicitly states "skeleton placeholder for now" with full implementation in 02-07 using Recharts
- CustomerForm's customer ID field for appointments uses a plain text input for customer UUID -- a customer search/select dropdown would be a future enhancement

## Self-Check: PENDING

Git commits could not be created due to bash permission restrictions on git commands. Files exist on disk and TypeScript compiles cleanly. Commits need to be created manually.

**Files created (verified on disk):**
- src/components/dashboard/kpi-card.tsx
- src/app/api/admin/customers/route.ts
- src/app/api/admin/appointments/route.ts
- src/components/dashboard/customer-form.tsx
- src/app/(dashboard)/dashboard/customers/page.tsx
- src/app/(dashboard)/dashboard/customers/customer-list-client.tsx
- src/app/(dashboard)/dashboard/customers/[id]/page.tsx
- src/components/dashboard/appointment-form.tsx
- src/app/(dashboard)/dashboard/appointments/page.tsx
- src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx

**Files modified:**
- src/app/(dashboard)/dashboard/page.tsx
