---
phase: 18-feature-depth-records
plan: 03
subsystem: ui, database, api
tags: [dnd-kit, drizzle, vercel-blob, product-images, order-fulfillment, drag-reorder]

# Dependency graph
requires:
  - phase: 05-online-store
    provides: product and order schemas, product edit page, order detail page
provides:
  - productImage table with sortOrder and visibility controls
  - Product image gallery with drag-to-reorder using @dnd-kit
  - Automatic primary image sync (product.imageUrl from first visible gallery image)
  - Blob cleanup on product image deletion via @vercel/blob del()
  - Order tracking columns (trackingNumber, trackingCarrier)
  - OrderFulfillmentTimeline visual component with status progression
  - Tracking number management with carrier selection
affects: [19-feature-depth-platform, 20-business-workflows, 22-testing]

# Tech tracking
tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"]
  patterns: [sortable-grid-with-optimistic-reorder, primary-image-sync-from-gallery, blob-cleanup-on-delete]

key-files:
  created:
    - src/lib/db/migrations/add-product-images-and-order-tracking.sql
    - src/lib/dal/product-images.ts
    - src/lib/actions/product-image-actions.ts
    - src/components/dashboard/sortable-image-grid.tsx
    - src/components/dashboard/product-image-gallery.tsx
    - src/components/dashboard/order-fulfillment-timeline.tsx
  modified:
    - src/lib/db/schema.ts
    - src/lib/dal/orders.ts
    - src/lib/actions/order-actions.ts
    - src/components/dashboard/order-detail.tsx
    - src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx

key-decisions:
  - "Used direct db.update for syncPrimaryImage to support null imageUrl (bypasses Zod URL validation)"
  - "Separated SortableImageGrid (presentational) from ProductImageGallery (action wiring) for clean architecture"
  - "Optimistic reorder with rollback on error for smooth drag-and-drop UX"
  - "Tracking form inline in order detail rather than separate modal for simpler workflow"

patterns-established:
  - "Sortable grid pattern: @dnd-kit with SortableContext + rectSortingStrategy + optimistic state"
  - "Primary image sync: gallery mutations always call syncPrimaryImage after to keep product.imageUrl in sync"
  - "Blob lifecycle: del() from @vercel/blob in try/catch after DB delete so blob failure does not block"

requirements-completed: [FEAT-07, FEAT-08]

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 18 Plan 03: Product Image Gallery and Order Fulfillment Summary

**Multi-image product gallery with @dnd-kit drag-to-reorder, visibility toggles, and blob cleanup; order fulfillment timeline with tracking number management**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-30T04:06:45Z
- **Completed:** 2026-03-30T04:15:04Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Product images stored in separate table with sortOrder and independent visibility, supporting multi-image galleries
- Drag-to-reorder grid using @dnd-kit with optimistic updates and rollback on error
- Automatic primary image sync keeps product.imageUrl aligned with the first visible gallery image
- Blob cleanup on image deletion prevents orphaned files in Vercel Blob storage
- Visual order fulfillment timeline shows Paid > Processing > Shipped > Delivered progression
- Tracking number and carrier management with inline form and copyable tracking display

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema changes + product image gallery** - `02855b4` (feat)
2. **Task 2: Order fulfillment timeline and tracking** - `066f881` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added productImage table, trackingNumber/trackingCarrier to order, productImage relations
- `src/lib/db/migrations/add-product-images-and-order-tracking.sql` - SQL migration for schema additions
- `src/lib/dal/product-images.ts` - Product image CRUD, reorder, and syncPrimaryImage
- `src/lib/actions/product-image-actions.ts` - Server actions for add/delete/reorder/visibility with blob cleanup
- `src/components/dashboard/sortable-image-grid.tsx` - @dnd-kit sortable grid with visibility toggles and upload
- `src/components/dashboard/product-image-gallery.tsx` - Wrapper wiring SortableImageGrid to server actions
- `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx` - Added image gallery Card section below product form
- `src/components/dashboard/order-fulfillment-timeline.tsx` - Visual status step timeline with tracking display
- `src/components/dashboard/order-detail.tsx` - Enhanced with timeline, tracking form, streamlined status actions
- `src/lib/dal/orders.ts` - Added updateOrderTracking function
- `src/lib/actions/order-actions.ts` - Added updateOrderTrackingAction, enhanced status action with tracking

## Decisions Made

- Used direct `db.update` in `syncPrimaryImage` instead of going through the `updateProduct` DAL function, because the Zod `UpdateProductSchema` requires `imageUrl` to be a URL string (not null), but clearing the primary image requires setting it to null
- Separated `SortableImageGrid` (presentational @dnd-kit component) from `ProductImageGallery` (server action wiring) for testability and reuse
- Used optimistic state updates for drag reorder with rollback on server error for smooth UX
- Placed tracking info form inline in the order detail sidebar rather than a separate modal for simpler single-artist workflow
- Used `--legacy-peer-deps` for @dnd-kit installation due to peer dependency conflicts with vitest version

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Select onValueChange null type mismatch**
- **Found during:** Task 2 (OrderDetail enhancement)
- **Issue:** base-ui Select's `onValueChange` passes `string | null` but `setTrackingCarrier` expects `string`. TypeScript error.
- **Fix:** Wrapped with `(v) => setTrackingCarrier(v ?? '')` to handle null case
- **Files modified:** src/components/dashboard/order-detail.tsx
- **Committed in:** 066f881

**2. [Rule 3 - Blocking] Installed dnd-kit with --legacy-peer-deps**
- **Found during:** Task 1 (dependency installation)
- **Issue:** npm peer dependency conflict between @dnd-kit packages and vitest version
- **Fix:** Used `npm install --legacy-peer-deps` flag
- **Committed in:** 02855b4

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correct compilation and installation. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required. The SQL migration file needs to be run against the production database when deploying.

## Known Stubs

None - all data flows are wired to server actions and DAL functions.

## Next Phase Readiness

- Product image gallery ready for use on product edit pages
- Order fulfillment timeline ready for use on order detail pages
- Schema migration needs to be applied to production database

---
*Phase: 18-feature-depth-records*
*Completed: 2026-03-30*
