# Requirements: Ink37 Tattoos

**Defined:** 2026-03-20
**Core Value:** The tattoo artist manages their entire business from one app while clients get a polished experience for discovering, booking, paying, and tracking their tattoo journey.

## v1 Requirements

Requirements for initial consolidated release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Unified Prisma schema merges both repos (customer/clients, booking/appointments, tattoo_design/tattoo_designs, sessions, artists, auth, analytics, settings, payments, audit_logs)
- [x] **FOUND-02**: Data Access Layer (DAL) with server-only auth checks on every database query (not middleware-only)
- [x] **FOUND-03**: Better Auth configured with unified RBAC supporting admin roles (USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN) and future client accounts
- [x] **FOUND-04**: Next.js 16 App Router with route groups: (public), (auth), (dashboard), (portal), (store)
- [x] **FOUND-05**: Shared UI component library (deduplicated Shadcn/Radix primitives)
- [x] **FOUND-06**: Unified state management (TanStack Query for server state, Zustand for client state)
- [x] **FOUND-07**: All packages aligned to latest versions (Next.js 16, React 19.2, Prisma 7, Zod 4, Tailwind CSS 4)
- [x] **FOUND-08**: Environment variable validation with Zod for all config

### Public Site

- [x] **PUB-01**: Home page with hero, services overview, gallery preview, booking CTA
- [x] **PUB-02**: Gallery with filtering by style, size, and placement (masonry layout, lightbox, social sharing)
- [x] **PUB-03**: Services page with service cards, process steps, pricing info
- [x] **PUB-04**: Booking flow via Cal.com embed (consultation, design review, tattoo session, touch-up)
- [x] **PUB-05**: Contact form with email notifications (admin + customer confirmation via Resend)
- [x] **PUB-06**: About page and FAQ page with accordion
- [x] **PUB-07**: SEO infrastructure (sitemaps, structured data, robots.txt, search console verification, Open Graph)
- [x] **PUB-08**: Mobile-responsive design with mobile-specific navigation
- [x] **PUB-09**: Performance optimization (code splitting, lazy loading, image optimization AVIF/WebP)

### Admin Dashboard

- [x] **ADMIN-01**: Dashboard overview with KPIs (revenue, clients, bookings, completion rate, satisfaction)
- [x] **ADMIN-02**: Customer management (CRUD, medical info, emergency contacts, session history, search/filter)
- [x] **ADMIN-03**: Appointment management (scheduling, status tracking, types, stats, filtering)
- [x] **ADMIN-04**: Tattoo session tracking (pricing, design details, consent, aftercare, status)
- [x] **ADMIN-05**: Media/portfolio management (upload images/videos to Vercel Blob, gallery sync)
- [x] **ADMIN-06**: Analytics and reporting with charts (revenue trends, client acquisition, artist performance)
- [x] **ADMIN-07**: Settings management (studio info, Cal.com config, appearance, notifications)
- [x] **ADMIN-08**: Audit logging of all admin actions
- [x] **ADMIN-09**: Role-based access control enforced on all admin routes and API endpoints

### Payments

- [ ] **PAY-01**: Stripe integration for deposit collection on booking confirmation
- [ ] **PAY-02**: Session payment processing (full payment or remaining balance)
- [ ] **PAY-03**: Payment history and status tracking in admin dashboard
- [ ] **PAY-04**: Stripe webhook handling for payment events (success, failure, refund)
- [ ] **PAY-05**: Receipt/invoice generation for completed payments

### Client Portal

- [ ] **PORT-01**: Client registration and login (Better Auth with email/password)
- [ ] **PORT-02**: Client can view their appointment history and upcoming bookings
- [ ] **PORT-03**: Client can view their tattoo designs and session details
- [ ] **PORT-04**: Client can access and sign digital consent forms
- [ ] **PORT-05**: Client can view payment history and receipts
- [ ] **PORT-06**: Client account linked to existing Customer records in admin

### Online Store

- [ ] **STORE-01**: Gift card purchase and delivery (email delivery with unique code)
- [ ] **STORE-02**: Product catalog for merchandise/prints (Stripe Products + custom UI)
- [ ] **STORE-03**: Shopping cart and Stripe Checkout integration
- [ ] **STORE-04**: Order management in admin dashboard
- [ ] **STORE-05**: Digital product delivery (prints as downloadable files)

### Security & Infrastructure

- [x] **SEC-01**: CSRF protection on all mutation endpoints (Next.js built-in origin verification for Server Actions)
- [x] **SEC-02**: Rate limiting on public endpoints (contact, booking, auth)
- [x] **SEC-03**: Input sanitization and Zod validation on all API inputs
- [x] **SEC-04**: Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
- [ ] **SEC-05**: Stripe webhook signature verification
- [x] **SEC-06**: Deployment migration from existing domain with DNS cutover (brief downtime accepted)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Marketing & Retention

- **MKT-01**: Email campaign system for client outreach
- **MKT-02**: Automated aftercare email sequences post-session
- **MKT-03**: Review/testimonial collection after completed sessions
- **MKT-04**: Loyalty program or referral system
- **MKT-05**: Waitlist for popular artists/time slots

### Enhanced Features

- **ENH-01**: Flash sheet management with "flash drops" and booking integration
- **ENH-02**: Multi-artist support with individual portfolios and scheduling
- **ENH-03**: Advanced analytics (booking funnel, conversion tracking, revenue forecasting)
- **ENH-04**: PWA with push notifications for appointment reminders
- **ENH-05**: Client design approval workflow (submit reference images, approve sketches)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first with responsive design handles mobile needs |
| Multi-studio marketplace | Single-studio platform by design |
| Real-time chat | Cal.com booking + contact form covers communication |
| Custom CMS | Admin dashboard handles content management |
| Video consultations | Cal.com handles meeting links if needed |
| Inventory management | Not enough physical products to justify complexity |
| POS/in-person payments | Square POS hardware not needed for web platform |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| FOUND-08 | Phase 1 | Complete |
| PUB-01 | Phase 2 | Complete |
| PUB-02 | Phase 2 | Complete |
| PUB-03 | Phase 2 | Complete |
| PUB-04 | Phase 2 | Complete |
| PUB-05 | Phase 2 | Complete |
| PUB-06 | Phase 2 | Complete |
| PUB-07 | Phase 2 | Complete |
| PUB-08 | Phase 2 | Complete |
| PUB-09 | Phase 2 | Complete |
| ADMIN-01 | Phase 2 | Complete |
| ADMIN-02 | Phase 2 | Complete |
| ADMIN-03 | Phase 2 | Complete |
| ADMIN-04 | Phase 2 | Complete |
| ADMIN-05 | Phase 2 | Complete |
| ADMIN-06 | Phase 2 | Complete |
| ADMIN-07 | Phase 2 | Complete |
| ADMIN-08 | Phase 2 | Complete |
| ADMIN-09 | Phase 2 | Complete |
| SEC-01 | Phase 2 | Complete |
| SEC-02 | Phase 2 | Complete |
| SEC-03 | Phase 2 | Complete |
| SEC-04 | Phase 2 | Complete |
| SEC-06 | Phase 2 | Complete |
| PAY-01 | Phase 3 | Pending |
| PAY-02 | Phase 3 | Pending |
| PAY-03 | Phase 3 | Pending |
| PAY-04 | Phase 3 | Pending |
| PAY-05 | Phase 3 | Pending |
| SEC-05 | Phase 3 | Pending |
| PORT-01 | Phase 4 | Pending |
| PORT-02 | Phase 4 | Pending |
| PORT-03 | Phase 4 | Pending |
| PORT-04 | Phase 4 | Pending |
| PORT-05 | Phase 4 | Pending |
| PORT-06 | Phase 4 | Pending |
| STORE-01 | Phase 5 | Pending |
| STORE-02 | Phase 5 | Pending |
| STORE-03 | Phase 5 | Pending |
| STORE-04 | Phase 5 | Pending |
| STORE-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
