# Plan 11-06 Summary: Sonner Toast Types + date-fns Duration/Proximity

## What was done

### Task 1: Sonner Toast Types
- `toast.warning` for cancellations (appointments, orders) and refunds
- `toast.info` for order status updates (shipped, delivered)
- `toast.dismiss()` cleanup in useEffect return on 4 dashboard list pages (appointments, sessions, customers, media)
- Existing `toast.promise` patterns left intact

### Task 2: date-fns Duration/Proximity + Scheduling Conflicts
- Added `formatDuration` + `intervalToDuration` for session duration column (e.g., "2 hours 30 minutes")
- Added `differenceInDays` + `differenceInHours` for appointment proximity badges ("Tomorrow", "In 3 days")
- Proximity uses `destructive` variant for today/tomorrow, `secondary` for 2-7 days
- Added `checkSchedulingConflict` to appointments DAL using `isWithinInterval` + `addHours`

## Files Modified
- `src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx` (proximity, toast.warning, toast.dismiss)
- `src/app/(dashboard)/dashboard/sessions/session-list-client.tsx` (formatDuration, toast.dismiss)
- `src/app/(dashboard)/dashboard/customers/customer-list-client.tsx` (toast.dismiss)
- `src/app/(dashboard)/dashboard/media/media-page-client.tsx` (toast.dismiss)
- `src/app/(dashboard)/dashboard/orders/columns.tsx` (toast.warning, toast.info)
- `src/lib/dal/appointments.ts` (checkSchedulingConflict with isWithinInterval)

## Commit
`3d8bf92` feat(11-06): Sonner toast types + date-fns duration/proximity + scheduling conflicts
