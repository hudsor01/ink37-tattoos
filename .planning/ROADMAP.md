# Roadmap: Ink37 Tattoos

## Overview

Consolidate two existing Next.js applications (public tattoo website + admin dashboard) into a single unified platform, then extend with payments, a client portal, and an online store. The foundation phase is highest-risk (schema merge against a live database), followed by reconstructing both existing apps within the unified structure, then layering on new revenue-generating features in later phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Unified schema, DAL, auth, route groups, shared UI, and package alignment
- [ ] **Phase 2: Public Site + Admin Dashboard** - Reconstruct both existing apps in unified codebase with security hardening
- [ ] **Phase 3: Payments** - Stripe integration for deposits, session payments, and invoicing
- [ ] **Phase 4: Client Portal** - Client-facing authenticated experience for appointments, designs, and history
- [ ] **Phase 5: Online Store** - E-commerce for merchandise, prints, and gift cards

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
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Payments
**Goal**: Stripe handles the full payment lifecycle -- deposits collected at booking, session balances paid after appointments, webhooks process all payment events reliably, and the admin can view complete payment history with receipts
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, SEC-05
**Success Criteria** (what must be TRUE):
  1. A client completing a booking is prompted to pay a deposit via Stripe Checkout, and the deposit amount appears in the admin payment history
  2. After a tattoo session, the admin can trigger a payment request for the remaining balance, and the client can pay via Stripe
  3. Stripe webhooks for payment success, failure, and refund events are processed idempotently (duplicate events do not create duplicate records)
  4. The admin can view a payment history table with status, amount, date, and a generated receipt/invoice for any completed payment
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Client Portal
**Goal**: Clients have a self-service authenticated experience where they can view their tattoo journey -- appointments, designs, consent forms, payment history -- linked to their existing customer records in the admin system
**Depends on**: Phase 3
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06
**Success Criteria** (what must be TRUE):
  1. A new client can register with email/password and their portal account is automatically linked to their existing Customer record (matched by email)
  2. A logged-in client can view their upcoming bookings, past appointment history, and tattoo session details including design images
  3. A client can access, review, and digitally sign consent forms through the portal before their appointment
  4. A client can view their complete payment history with receipts for all deposits and session payments
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Online Store
**Goal**: The studio earns passive revenue through an online store offering merchandise, prints, and gift cards -- all powered by Stripe Products with order management in the admin dashboard
**Depends on**: Phase 3
**Requirements**: STORE-01, STORE-02, STORE-03, STORE-04, STORE-05
**Success Criteria** (what must be TRUE):
  1. A visitor can browse a product catalog of merchandise and prints, add items to a cart, and complete checkout via Stripe
  2. A customer can purchase a gift card, receive it via email with a unique redemption code, and apply it during booking or store checkout
  3. After purchasing a digital product (print), the buyer receives a download link and can access the file
  4. The admin can manage products (add/edit/remove), view all orders with status, and fulfill/cancel orders from the dashboard
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-20 |
| 2. Public Site + Admin Dashboard | 0/3 | Not started | - |
| 3. Payments | 0/1 | Not started | - |
| 4. Client Portal | 0/1 | Not started | - |
| 5. Online Store | 0/1 | Not started | - |
