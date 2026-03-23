# Roadmap: Ink37 Tattoos

## Overview

Consolidate two existing Next.js applications (public tattoo website + admin dashboard) into a single unified platform, then extend with payments, a client portal, and an online store. The foundation phase is highest-risk (schema merge against a live database), followed by reconstructing both existing apps within the unified structure, then layering on new revenue-generating features in later phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Unified schema, DAL, auth, route groups, shared UI, and package alignment
- [x] **Phase 2: Public Site + Admin Dashboard** - Reconstruct both existing apps in unified codebase with security hardening
- [x] **Phase 3: Payments** - Stripe integration for deposits, session payments, and invoicing
- [ ] **Phase 4: Client Portal** - Client-facing authenticated experience for appointments, designs, and history
- [x] **Phase 5: Online Store** - E-commerce for merchandise, prints, and gift cards (completed 2026-03-22)
- [ ] **Phase 6: UI Stub Closure + UX Wiring** - Close Phase 2 UI stubs and fix cross-phase UX gaps (gap closure)
- [ ] **Phase 7: Store Integration Fixes** - Fix store download URLs, checkout guards, and gift card email (gap closure)
- [ ] **Phase 8: Drizzle Migration** - Replace Prisma ORM with Drizzle ORM, verify all functionality, clean up artifacts

## Phase Details

### Phase 1: Foundation
**Goal**: A working Next.js 16 project scaffold with unified Prisma 7 schema, DAL security boundary, Better Auth RBAC, route group structure, shared UI library, and all packages at target versions -- validated against the live database without data loss
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08
**Success Criteria** (what must be TRUE):
  1. `prisma migrate deploy` succeeds against the production database with zero data loss and the unified schema covers all tables from both source projects
  2. Every database query goes through the DAL with server-only auth checks -- no direct Prisma client usage in route handlers or Server Components
  3. An admin user can log in via Better Auth with their existing credentials and be assigned the correct RBAC role
  4. The app starts with route groups `(public)`, `(auth)`, `(dashboard)`, `(portal)`, `(store)` each rendering a placeholder page
  5. `next build` completes with zero errors on Next.js 16, React 19.2, Prisma 7, Zod 4, and Tailwind CSS 4
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold, Prisma 7 unified schema, env validation, package alignment
- [x] 01-02-PLAN.md — Better Auth with RBAC, Data Access Layer with server-only auth checks
- [x] 01-03-PLAN.md — Route groups, shared UI components, TanStack Query + Zustand providers

### Phase 2: Public Site + Admin Dashboard
**Goal**: Both existing applications fully reconstructed within the unified codebase -- the public site serves all pages with SEO and performance parity, the admin dashboard provides full business management, and security infrastructure protects all endpoints
**Depends on**: Phase 1
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, PUB-07, PUB-08, PUB-09, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09, SEC-01, SEC-02, SEC-03, SEC-04, SEC-06
**Success Criteria** (what must be TRUE):
  1. A visitor can browse the public site (home, gallery with filtering, services, about, FAQ, contact) and complete a booking via Cal.com -- all pages render with correct SEO metadata and score 90+ on Lighthouse performance
  2. The contact form sends email notifications to both admin and customer via Resend
  3. An admin can log in, view KPI dashboard, manage customers (CRUD with medical info), manage appointments (schedule/status/filter), track tattoo sessions, upload media to Vercel Blob, and view analytics charts
  4. All admin routes enforce RBAC -- a USER role is denied access to /dashboard routes, and all admin mutations are audit-logged
  5. Security headers (CSP, HSTS, X-Frame-Options), CSRF protection, rate limiting on public endpoints, and Zod validation on all API inputs are active and verifiable
**Plans**: 7 plans

Plans:
- [x] 02-01-PLAN.md — Dependencies, security headers, auth middleware, rate limiter, validation schemas, email service
- [x] 02-02-PLAN.md — Public site layout (nav + footer) and static pages (home, about, FAQ)
- [x] 02-03-PLAN.md — Gallery with masonry/filtering/lightbox, services page, Cal.com booking
- [x] 02-04-PLAN.md — Contact form with email, SEO infrastructure, 404 page, deployment docs
- [x] 02-05-PLAN.md — Admin layout with sidebar, DataTable, expanded DAL, Server Actions with audit logging
- [x] 02-06-PLAN.md — Dashboard overview KPIs, customer management CRUD, appointment management
- [x] 02-07-PLAN.md — Session tracking, media management with Vercel Blob, analytics charts, settings, audit log

### Phase 3: Payments
**Goal**: Stripe handles the full payment lifecycle -- deposits collected at booking, session balances paid after appointments, webhooks process all payment events reliably, and the admin can view complete payment history with receipts
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, SEC-05
**Success Criteria** (what must be TRUE):
  1. A client completing a booking is prompted to pay a deposit via Stripe Checkout, and the deposit amount appears in the admin payment history
  2. After a tattoo session, the admin can trigger a payment request for the remaining balance, and the client can pay via Stripe
  3. Stripe webhooks for payment success, failure, and refund events are processed idempotently (duplicate events do not create duplicate records)
  4. The admin can view a payment history table with status, amount, date, and a generated receipt/invoice for any completed payment
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Payment/StripeEvent models, Stripe SDK, env validation, currency helpers, Zod schemas
- [x] 03-02-PLAN.md — Payment DAL, Server Actions (deposit + balance), webhook handler, email template
- [x] 03-03-PLAN.md — Admin payments page with DataTable, KPI cards, request payment dialog, unit tests

### Phase 4: Client Portal
**Goal**: Clients have a self-service authenticated experience where they can view their tattoo journey -- appointments, designs, consent forms, payment history -- linked to their existing customer records in the admin system
**Depends on**: Phase 3
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06
**Success Criteria** (what must be TRUE):
  1. A new client can register with email/password and their portal account is automatically linked to their existing Customer record (matched by email)
  2. A logged-in client can view their upcoming bookings, past appointment history, and tattoo session details including design images
  3. A client can access, review, and digitally sign consent forms through the portal before their appointment
  4. A client can view their complete payment history with receipts for all deposits and session payments
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Schema migration, auth hooks, middleware, portal DAL, server actions, login/register pages
- [x] 04-02-PLAN.md — Portal layout with tab nav, overview/appointments/tattoos/payments pages, consent form

### Phase 5: Online Store
**Goal**: The studio earns passive revenue through an online store offering merchandise, prints, and gift cards -- all powered by Stripe Products with order management in the admin dashboard
**Depends on**: Phase 3
**Requirements**: STORE-01, STORE-02, STORE-03, STORE-04, STORE-05
**Success Criteria** (what must be TRUE):
  1. A visitor can browse a product catalog of merchandise and prints, add items to a cart, and complete checkout via Stripe
  2. A customer can purchase a gift card, receive it via email with a unique redemption code, and apply it during booking or store checkout
  3. After purchasing a digital product (print), the buyer receives a download link and can access the file
  4. The admin can manage products (add/edit/remove), view all orders with status, and fulfill/cancel orders from the dashboard
**Plans**: 5 plans

Plans:
- [x] 05-00-PLAN.md — Wave 0 test scaffolds (gift-card, validation, cart, checkout, order-status, download-token)
- [x] 05-01-PLAN.md — Schema models (Product, Order, GiftCard, DownloadToken), Zod schemas, cart store, store helpers
- [x] 05-02-PLAN.md — DAL modules, Server Actions, webhook extension, email templates, gift card at deposits (D-09), StatusBadge + AdminNav updates
- [x] 05-03-PLAN.md — Store public pages (catalog, detail, gift cards, cart, checkout, download route)
- [x] 05-04-PLAN.md — Admin product management CRUD and order management with fulfillment

### Phase 6: UI Stub Closure + UX Wiring
**Goal**: Close the 2 unsatisfied Phase 2 requirements (PUB-01 gallery preview, ADMIN-01 revenue chart) by wiring existing components, fix admin sign-out to use proper auth client, and add portal link to payment success page
**Depends on**: Phase 5
**Requirements**: PUB-01, ADMIN-01, SEC-03
**Gap Closure**: Closes audit gaps PUB-01, ADMIN-01, INT-03, FLOW-01
**Success Criteria** (what must be TRUE):
  1. The home page gallery preview section renders up to 6 real portfolio designs from `getPublicDesigns` DAL (with Skeleton fallback only when no designs exist)
  2. The dashboard overview Revenue Overview card renders `RevenueChart` with data from `getRevenueData` (not a text stub)
  3. Admin sign-out calls `signOut()` from auth-client via POST (matching the portal header pattern)
  4. The `/payment/success` page includes a link to `/portal/payments` for authenticated users
**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md — Fix admin sign-out and add payment success portal link

### Phase 7: Store Integration Fixes
**Goal**: Fix store integration wiring so order confirmation emails contain working download links, checkout handles products without Stripe price IDs gracefully, and gift card purchasers receive confirmation emails
**Depends on**: Phase 5
**Requirements**: STORE-01, STORE-03, STORE-05
**Gap Closure**: Closes audit gaps INT-01, INT-02, FLOW-02, FLOW-03
**Success Criteria** (what must be TRUE):
  1. Order confirmation emails contain correct download URLs using `/api/store/download?token=TOKEN` format (not `/store/downloads/`)
  2. `storeCheckoutAction` returns a user-friendly error if any cart product lacks a `stripePriceId` instead of crashing
  3. Gift card purchasers receive a confirmation email acknowledging their purchase (separate from the recipient delivery email)
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Fix download URLs, stripePriceId guard, and gift card purchaser confirmation email

### Phase 8: Drizzle Migration
**Goal:** Replace Prisma ORM with Drizzle ORM across the entire codebase -- schema, connection, DAL, auth adapter, server actions, API routes, and tests. Verify all existing functionality still works via build + type-check + existing test suite. Clean up all Prisma artifacts and update project documentation. The database (Neon PostgreSQL) stays unchanged -- only the ORM layer is swapped.
**Depends on:** Phase 7
**Requirements**: DRZ-01, DRZ-02, DRZ-03, DRZ-04, DRZ-05, DRZ-06, DRZ-07, DRZ-08, DRZ-09, DRZ-10, DRZ-11, DRZ-12, DRZ-13, DRZ-14
**Success Criteria** (what must be TRUE):
  1. Drizzle ORM schema.ts matches the live Neon database (drizzle-kit generate produces empty diff)
  2. All 82 Prisma queries across 20 files are rewritten to Drizzle syntax
  3. Better Auth uses raw pg.Pool with Drizzle queries in databaseHooks
  4. `next build` completes with zero errors
  5. `npm run test` passes all existing tests
  6. `npm audit --audit-level=high` exits 0 (zero high/critical vulnerabilities)
  7. Zero Prisma references remain in src/ or package.json
  8. CLAUDE.md and PROJECT.md document Drizzle as the ORM
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Install Drizzle, introspect DB, build schema.ts, create db client, convert Better Auth
- [ ] 08-02-PLAN.md — Rewrite all 82 Prisma queries across DAL, actions, routes, and tests to Drizzle
- [ ] 08-03-PLAN.md — Delete Prisma artifacts, update scripts, verify build/test/audit, update documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-20 |
| 2. Public Site + Admin Dashboard | 7/7 | Complete | 2026-03-21 |
| 3. Payments | 3/3 | Complete | 2026-03-21 |
| 4. Client Portal | 0/2 | Not started | - |
| 5. Online Store | 5/5 | Complete   | 2026-03-22 |
| 6. UI Stub Closure + UX Wiring | 0/0 | Not started | - |
| 7. Store Integration Fixes | 0/1 | Not started | - |
| 8. Drizzle Migration | 0/3 | Not started | - |
