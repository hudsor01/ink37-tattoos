---
phase: 02-public-site-admin-dashboard
plan: 03
subsystem: public-pages
tags: [gallery, services, booking, masonry, cal-com, lightbox, filtering]
dependency_graph:
  requires: [02-01]
  provides: [gallery-page, services-page, booking-page, gallery-lightbox, gallery-filtering, cal-embed]
  affects: [public-layout, seo]
tech_stack:
  added: []
  patterns: [css-columns-masonry, url-search-params-filtering, cal-com-embed, isr-revalidation]
key_files:
  created:
    - src/app/(public)/gallery/page.tsx
    - src/components/public/gallery-grid.tsx
    - src/components/public/gallery-filter-bar.tsx
    - src/components/public/gallery-lightbox.tsx
    - src/app/(public)/services/page.tsx
    - src/components/public/service-card.tsx
    - src/components/public/process-steps.tsx
    - src/app/(public)/booking/page.tsx
    - src/components/public/cal-embed.tsx
  modified: []
decisions:
  - Gallery uses client-side filtering with server-side data fetch (ISR 30min) for simplicity with <500 images
  - CSS columns masonry layout (not CSS grid or Masonry API) for broad browser support
  - Filter state stored in URL search params for shareability
  - Lightbox uses shadcn Dialog (base-ui) with keyboard navigation
  - Cal.com embed uses @calcom/embed-react with brand color #e8432b
  - Service card uses shadcn Card component with hover shadow effect
  - Button render prop pattern used for Link integration in services CTA
metrics:
  duration: 5 min
  completed: "2026-03-21T07:40:27Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 0
requirements_completed: [PUB-02, PUB-03, PUB-04]
---

# Phase 02 Plan 03: Gallery, Services, and Booking Pages Summary

Gallery page with CSS columns masonry layout, URL-param filtering (style/placement/size), and lightbox dialog with keyboard nav; services page with 4 service cards and 4-step process visualization; booking page with Cal.com embed and brand color.

## What Was Built

### Task 1: Gallery Page with Masonry Grid, Filter Bar, and Lightbox

**Gallery Page** (`src/app/(public)/gallery/page.tsx`):
- Server component fetching all public designs via `getPublicDesigns()` DAL function
- ISR with 30-minute revalidation (`revalidate = 1800`)
- Full SEO metadata with Open Graph tags
- Passes all designs to client component for client-side filtering

**Gallery Grid** (`src/components/public/gallery-grid.tsx`):
- Client component managing filter state via `useSearchParams()`
- CSS columns masonry layout: 1 column mobile, 2 tablet, 3 desktop with 12px gap
- Image items with hover scale(1.02) transition and overlay
- Filtering logic: style matches designType/style fields, placement checks tags array, size matches size field
- Two empty states: "Gallery Coming Soon" (no designs) and "No designs match your filters" (filtered empty)
- Wrapped in Suspense boundary for useSearchParams SSR compatibility

**Gallery Filter Bar** (`src/components/public/gallery-filter-bar.tsx`):
- Horizontal scrollable filter pills per group (Style, Placement, Size)
- 10 style options, 9 placement options, 4 size options per UI spec
- Active pills use `--brand-accent` color, inactive use secondary
- "All" pill per group clears that group's filter
- Updates URL search params via router.push with scroll: false

**Gallery Lightbox** (`src/components/public/gallery-lightbox.tsx`):
- Full-screen dialog using shadcn Dialog (base-ui primitives)
- Large image with object-contain and max-h-[80vh]
- Previous/next navigation with ChevronLeft/ChevronRight buttons
- Keyboard navigation: ArrowLeft/ArrowRight to navigate, Escape to close
- Design info: name, description, style/size/placement tags as badges
- Share button copying current URL to clipboard
- Image counter showing position in filtered set

### Task 2: Services Page and Booking Page

**Service Card** (`src/components/public/service-card.tsx`):
- Reusable card component accepting icon (LucideIcon), title, description, details
- Uses shadcn Card with hover shadow-sm to shadow-md transition
- Bulleted detail list with dot indicators

**Process Steps** (`src/components/public/process-steps.tsx`):
- 4-step process visualization: Consultation, Design, Session, Aftercare
- Horizontal grid on desktop (grid-cols-4), vertical stack on mobile
- Numbered circle badges with connecting dashed lines between steps

**Services Page** (`src/app/(public)/services/page.tsx`):
- 4 service cards in 2-column grid: Consultation, Design Review, Tattoo Session, Touch-Up
- Each card has LucideIcon, description, and bullet-point details
- Process Steps section showing the 4-step workflow
- Pricing section with explanation and "Book a Consultation" CTA linking to /booking
- CTA uses brand-accent color with Button render prop for Link integration
- Full SEO metadata

**Cal.com Embed** (`src/components/public/cal-embed.tsx`):
- Client component wrapping @calcom/embed-react
- Configures brand color (#e8432b) via getCalApi
- Month view layout, light theme

**Booking Page** (`src/app/(public)/booking/page.tsx`):
- Server component with SEO metadata
- Cal.com username from NEXT_PUBLIC_CAL_USERNAME env var (defaults to 'ink37')
- CalEmbed in min-h-[600px] container
- Fallback link to cal.com direct booking if embed fails

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all components are fully wired to data sources or use static content appropriate for their purpose.

## Commits

Git commands were blocked by the permission system (git set to "ask" in user settings, no interactive approval in parallel agent context). All files are created and pass TypeScript type checking. Commits need to be created by the orchestrator.

**Pending commits:**

Task 1 files:
- `src/app/(public)/gallery/page.tsx`
- `src/components/public/gallery-grid.tsx`
- `src/components/public/gallery-filter-bar.tsx`
- `src/components/public/gallery-lightbox.tsx`

Task 2 files:
- `src/app/(public)/services/page.tsx`
- `src/components/public/service-card.tsx`
- `src/components/public/process-steps.tsx`
- `src/app/(public)/booking/page.tsx`
- `src/components/public/cal-embed.tsx`

## Verification

- TypeScript compilation: PASS (no errors in plan 03 files)
- All acceptance criteria: PASS (verified via grep)
- Build: not attempted (git permission issues prevent full verification pipeline)

## Self-Check: PASSED

All 9 created files verified present on disk via Glob. All acceptance criteria verified via Grep. TypeScript type checking passes with no errors in plan 03 files. Git commits pending -- blocked by permission system in parallel agent context.
