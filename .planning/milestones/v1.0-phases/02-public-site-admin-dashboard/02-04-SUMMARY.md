---
phase: 02-public-site-admin-dashboard
plan: 04
subsystem: public-site
tags: [contact-form, seo, deployment, email, rate-limiting]
dependency_graph:
  requires: [02-01]
  provides: [contact-page, seo-infrastructure, deployment-docs]
  affects: [public-site, admin-dashboard]
tech_stack:
  added: []
  patterns: [server-actions, useActionState, json-ld, sitemap-api, robots-api]
key_files:
  created:
    - src/lib/dal/contacts.ts
    - src/lib/actions/contact-actions.ts
    - src/components/public/contact-form.tsx
    - src/app/(public)/contact/page.tsx
    - src/app/sitemap.ts
    - src/app/robots.ts
    - src/app/not-found.tsx
    - .env.production.example
    - docs/DEPLOYMENT.md
  modified:
    - src/__tests__/contact-form.test.ts
    - src/app/layout.tsx
decisions:
  - Contact form uses useActionState (React 19) for progressive enhancement
  - Email notifications are fire-and-forget (non-blocking) with error logging
  - Rate limiting set to 5 requests per 15 minutes per IP
  - JSON-LD uses TattooParlor schema type
  - Deployment uses accepted-downtime DNS cutover approach
metrics:
  completed: "2026-03-21"
---

# Phase 02 Plan 04: Contact, SEO & Deployment Summary

Contact form with Zod validation, IP-based rate limiting (5/15min), DB storage via DAL, and non-blocking Resend email notifications. SEO infrastructure with dynamic sitemap (7 pages), robots.txt (blocking dashboard/portal/store/api/login), JSON-LD TattooParlor structured data, and global metadata with title template. Production deployment documented with DNS cutover checklist.

## What Was Built

### Task 1: Contact Form with Server Action, Email, and Rate Limiting

- **DAL** (`src/lib/dal/contacts.ts`): `createContact` (public, no auth), `getContacts` (admin listing), `getContactById`, `updateContactStatus` -- all using `server-only` and Prisma client
- **Server Action** (`src/lib/actions/contact-actions.ts`): `submitContactForm` validates with `ContactFormSchema`, rate-limits by IP via `x-forwarded-for` header, stores in DB via DAL, sends email via Resend (non-blocking with `.catch()` error logging)
- **ContactForm Component** (`src/components/public/contact-form.tsx`): Client component using `useActionState` (React 19), brand-accent submit button, Loader2 spinner on pending, inline field errors, sonner toast on success ("Message sent! We'll get back to you within 24 hours.") and error
- **Contact Page** (`src/app/(public)/contact/page.tsx`): Two-column layout (form left, studio info right), metadata with title/description, Card components for studio address/email/phone/hours/social
- **Tests** (`src/__tests__/contact-form.test.ts`): 12 tests covering schema validation (5 tests) and server action behavior (7 tests: success, invalid email, empty name, empty message, rate limiting, DB creation, email notification). Fixed mock isolation issue from prior plan (vi.clearAllMocks + async import pattern).

### Task 2: SEO Infrastructure, 404 Page, and Layout Metadata

- **Sitemap** (`src/app/sitemap.ts`): Dynamic sitemap with 7 public pages (/, /gallery, /services, /booking, /contact, /about, /faq) with priorities and change frequencies
- **Robots** (`src/app/robots.ts`): Allows `/`, disallows `/dashboard/`, `/portal/`, `/store/`, `/api/`, `/login`. Includes sitemap URL.
- **404 Page** (`src/app/not-found.tsx`): "Page Not Found" heading, descriptive body text, "Go Home" and "View Gallery" CTA buttons
- **Root Layout** (`src/app/layout.tsx`): Updated metadata with `metadataBase`, title template (`%s | Ink 37 Tattoos`), description, keywords, OG tags, robots directive. Added JSON-LD structured data with `@type: TattooParlor`

### Task 3: Deployment Documentation and Production Environment Template

- **Env Template** (`.env.production.example`): All required (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, RESEND_API_KEY, ADMIN_EMAIL, BLOB_READ_WRITE_TOKEN) and optional (CAL_API_KEY) vars with comments
- **Deployment Guide** (`docs/DEPLOYMENT.md`): Overview, pre-deployment checklist (9 items), DNS cutover steps (6 steps), post-deployment verification (9 checks), rollback procedure, database migration notes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test mock isolation in contact-form.test.ts**
- **Found during:** Task 1
- **Issue:** Tests using `vi.resetModules()` broke mock chain between action -> DAL -> db modules, causing spy assertions to fail (0 calls or wrong data)
- **Fix:** Replaced `vi.resetModules()` approach with `vi.clearAllMocks()` in `beforeEach` + async import to re-establish mock return values within same module registry
- **Files modified:** `src/__tests__/contact-form.test.ts`

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `src/app/(public)/contact/page.tsx` | ~50 | "Studio address coming soon" | Physical address not yet provided by studio owner |
| `src/app/(public)/contact/page.tsx` | ~61 | "info@ink37tattoos.com" | Placeholder email; actual contact email TBD |
| `src/app/(public)/contact/page.tsx` | ~69 | "Contact via form or social media" | Phone number not provided |
| `src/app/(public)/contact/page.tsx` | ~77 | "By appointment only" | Actual hours TBD |

These stubs are intentional -- they require studio owner input (physical address, phone, hours). The contact form itself is fully functional. These will be resolved when the studio owner provides business details.

## Verification

- Tests: 12/12 passing (`npx vitest run src/__tests__/contact-form.test.ts`)
- TypeScript: No errors in new files (`npx tsc --noEmit` -- pre-existing errors in customer-form.tsx are out of scope)
- Build verification: Pending (bash access was blocked during commit phase)

## Commits

Commits pending -- bash access was denied during the commit phase. All files are created and ready to be staged/committed.

## Self-Check: PENDING

File existence and commit verification requires bash access. All files were created via the Write/Edit tools and should exist on disk.
