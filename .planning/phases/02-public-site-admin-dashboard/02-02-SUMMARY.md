---
phase: 02-public-site-admin-dashboard
plan: "02"
subsystem: public-site
tags: [layout, navigation, pages, seo, responsive]
dependency_graph:
  requires: [02-01]
  provides: [public-layout, public-nav, public-footer, home-page, about-page, faq-page, hero-section]
  affects: [02-03, 02-04, 02-05]
tech_stack:
  added: []
  patterns: [framer-motion-entrance, sheet-mobile-nav, accordion-faq, brand-accent-css-var]
key_files:
  created:
    - src/components/public/public-nav.tsx
    - src/components/public/mobile-nav.tsx
    - src/components/public/public-footer.tsx
    - src/components/public/hero-section.tsx
    - src/app/(public)/about/page.tsx
    - src/app/(public)/faq/page.tsx
  modified:
    - src/app/(public)/layout.tsx
    - src/app/(public)/page.tsx
    - src/app/globals.css
decisions:
  - "Brand accent uses oklch color space via CSS custom property --brand-accent"
  - "Button component uses @base-ui/react, not Radix; Link buttons use plain anchor styling with buttonVariants classes"
  - "MobileNav uses base-ui Sheet with render prop pattern for SheetTrigger and SheetClose composition"
metrics:
  completed: "2026-03-21"
---

# Phase 02 Plan 02: Public Layout + Core Pages Summary

Public site shell with sticky responsive navigation, 3-column footer, and three content pages (home with animated hero, about with process steps, FAQ with accordion).

## What Was Built

### Task 1: Public Layout with Navigation and Footer

**PublicNav** (`src/components/public/public-nav.tsx`):
- Fixed/sticky header (h-16, z-50) with white/95 backdrop blur
- Desktop: Logo left, nav links center (Gallery, Services, About, FAQ, Contact), brand-accent "Book a Consultation" CTA right
- Active link detection via `usePathname()` with semibold highlight
- Responsive: desktop nav hidden below md, MobileNav component shown instead

**MobileNav** (`src/components/public/mobile-nav.tsx`):
- Sheet-based hamburger menu opening from right side
- Vertical nav links with 44px minimum touch targets per UI spec
- Full-width brand-accent booking CTA at bottom
- SheetClose wraps each link so menu closes on navigation

**PublicFooter** (`src/components/public/public-footer.tsx`):
- Server component (no client interactivity needed)
- Dark bg-neutral-900, 3-column grid on lg, stacked on mobile
- Col 1: Brand name, studio description, copyright year
- Col 2: Quick Links (Gallery, Services, Booking, Contact)
- Col 3: Contact info (address, email, phone) + social icons (Instagram, Facebook) with brand-accent hover

**Public Layout** (`src/app/(public)/layout.tsx`):
- Composes PublicNav + main content (pt-16 for nav offset) + PublicFooter
- All public route group pages inherit this layout

**CSS** (`src/app/globals.css`):
- Added `--brand-accent` and `--brand-accent-foreground` CSS variables to `:root`
- Added `--color-brand-accent` mapping in `@theme inline` for Tailwind utility class support

### Task 2: Home Page, About Page, and FAQ Page

**HeroSection** (`src/components/public/hero-section.tsx`):
- Full-bleed dark section (bg-neutral-950, min-h-70vh)
- Headline: "Custom Tattoo Art by Fernando Govea" (2rem mobile, 2.5rem desktop)
- Subline with studio description
- Two CTAs: brand-accent "Book a Consultation" + outline "View Gallery"
- Framer Motion entrance animation: fade-in + slide-up (400ms, cubic bezier easing)

**Home Page** (`src/app/(public)/page.tsx`):
- SEO metadata with OpenGraph tags
- HeroSection (full-bleed)
- "Our Services" section: 3 cards (Consultation, Design Review, Tattoo Session) with lucide icons
- "Our Work" gallery preview: 6 skeleton placeholders (to be replaced when gallery data exists)
- Bottom CTA section: dark background with booking button

**About Page** (`src/app/(public)/about/page.tsx`):
- SEO metadata
- Studio description and artist bio sections (2-column layout on desktop)
- Artist card with initials placeholder, quote
- "Our Process" section: 4 numbered steps (Consultation, Design, Session, Aftercare) in responsive grid
- Bottom CTA with booking link

**FAQ Page** (`src/app/(public)/faq/page.tsx`):
- SEO metadata
- 10 FAQ items using shadcn Accordion (base-ui implementation)
- Topics: booking, pricing, preparation, aftercare, cover-ups, styles, age requirements, payment, guests, rescheduling
- Bottom CTA card with links to Contact and Booking pages

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Button composition pattern**
- **Found during:** Task 1
- **Issue:** The Button component uses `@base-ui/react/button`, not Radix. It does not support `asChild` prop. Cannot wrap Link inside Button for navigation.
- **Fix:** Used plain anchor/Link elements with manually applied styling classes matching the brand-accent pattern. For MobileNav, used Sheet's `render` prop pattern for composing SheetClose with Link.
- **Files modified:** src/components/public/public-nav.tsx, src/components/public/mobile-nav.tsx, src/components/public/hero-section.tsx

### Out of Scope Issues

**1. Pre-existing build failure in src/lib/dal/audit.ts**
- Type error: `Record<string, unknown> | null` not assignable to `NullableJsonNullValueInput | InputJsonValue | undefined`
- This is a Prisma 7 type compatibility issue from Phase 1, not caused by this plan's changes
- `npx tsc --noEmit` passes for all files created/modified in this plan

**2. Pre-existing missing module in test file**
- `src/__tests__/contact-form.test.ts` references `@/lib/actions/contact-actions` which does not exist yet (planned for a future plan)

## Known Stubs

**1. Gallery preview skeleton placeholders**
- File: `src/app/(public)/page.tsx`, line ~97
- Reason: Gallery data source not yet wired (gallery page with data fetching is a separate plan 02-03)
- Resolution: Plan 02-03 will implement gallery with real data; home page gallery preview will be updated then

**2. Contact information placeholders**
- File: `src/components/public/public-footer.tsx`, lines ~68-75
- Reason: Phone number and social media URLs are placeholder values
- Resolution: Owner will provide real contact info; these are easily updatable string values

## Verification

- `npx tsc --noEmit`: PASS (no errors in plan files; only pre-existing errors in unrelated files)
- `npm run build`: BLOCKED by pre-existing audit.ts type error (not caused by this plan)
- All acceptance criteria verified via grep checks

## Self-Check: PASSED

All 8 files verified present on disk:
- FOUND: src/components/public/public-nav.tsx
- FOUND: src/components/public/mobile-nav.tsx
- FOUND: src/components/public/public-footer.tsx
- FOUND: src/components/public/hero-section.tsx
- FOUND: src/app/(public)/layout.tsx
- FOUND: src/app/(public)/page.tsx
- FOUND: src/app/(public)/about/page.tsx
- FOUND: src/app/(public)/faq/page.tsx
- FOUND: src/app/globals.css (modified)

TypeScript compilation: PASS (no errors in plan files)
