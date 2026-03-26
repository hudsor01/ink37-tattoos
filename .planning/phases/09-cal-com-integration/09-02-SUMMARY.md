---
phase: 09-cal-com-integration
plan: 02
subsystem: admin-appointments
tags: [cal-com, appointments, admin, filtering]
dependency_graph:
  requires: [09-01]
  provides: [CAL-05-source-visibility]
  affects: [dashboard-appointments]
tech_stack:
  added: []
  patterns: [source-badge-component, multi-filter-pattern]
key_files:
  created:
    - src/components/dashboard/source-badge.tsx
  modified:
    - src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx
decisions:
  - "SourceBadge returns null for non-cal.com sources (render unconditionally, component decides visibility)"
  - "Source defaults to 'website' via nullish coalescing for pre-existing appointments"
metrics:
  duration: 7min
  completed: 2026-03-26
---

# Phase 09 Plan 02: Cal.com Source Badge and Filter Summary

SourceBadge component with indigo Cal.com pill indicator and dual-filter appointment list (status + source)

## What Was Done

### Task 1: Create SourceBadge component and update appointment list with source column and filter

**Commit:** e8f2ce9

Created `src/components/dashboard/source-badge.tsx` following the StatusBadge pattern:
- Renders indigo pill with Calendar icon and "Cal.com" text when source is 'cal.com'
- Returns null for any other source value (safe to render unconditionally)
- Accepts className prop for style overrides via cn utility

Updated `src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx`:
- Added `source: string` field to Appointment interface
- Added SOURCE_OPTIONS constant (All Sources / Manual / Cal.com)
- Added sourceFilter state alongside existing statusFilter
- Updated filteredAppointments to filter by both status AND source
- Added Source column between Type and Status columns in the table
- Added source filter Select dropdown next to existing status filter

### Task 2: Visual verification (auto-approved)

Auto-approved per auto_advance configuration. TypeScript compilation validates component integration.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all components are fully wired to real data.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | e8f2ce9 | feat(09-02): add Cal.com source badge and source filter to appointment list |

## Self-Check: PASSED
