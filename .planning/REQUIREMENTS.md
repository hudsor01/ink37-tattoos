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

- [x] **PAY-01**: Stripe integration for deposit collection on booking confirmation
- [x] **PAY-02**: Session payment processing (full payment or remaining balance)
- [x] **PAY-03**: Payment history and status tracking in admin dashboard
- [x] **PAY-04**: Stripe webhook handling for payment events (success, failure, refund)
- [x] **PAY-05**: Receipt/invoice generation for completed payments

### Client Portal

- [x] **PORT-01**: Client registration and login (Better Auth with email/password)
- [x] **PORT-02**: Client can view their appointment history and upcoming bookings
- [x] **PORT-03**: Client can view their tattoo designs and session details
- [x] **PORT-04**: Client can access and sign digital consent forms
- [x] **PORT-05**: Client can view payment history and receipts
- [x] **PORT-06**: Client account linked to existing Customer records in admin

### Online Store

- [x] **STORE-01**: Gift card purchase and delivery (email delivery with unique code)
- [x] **STORE-02**: Product catalog for merchandise/prints (Stripe Products + custom UI)
- [x] **STORE-03**: Shopping cart and Stripe Checkout integration
- [x] **STORE-04**: Order management in admin dashboard
- [x] **STORE-05**: Digital product delivery (prints as downloadable files)

### Security & Infrastructure

- [x] **SEC-01**: CSRF protection on all mutation endpoints (Next.js built-in origin verification for Server Actions)
- [x] **SEC-02**: Rate limiting on public endpoints (contact, booking, auth)
- [x] **SEC-03**: Input sanitization and Zod validation on all API inputs
- [x] **SEC-04**: Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
- [x] **SEC-05**: Stripe webhook signature verification
- [x] **SEC-06**: Deployment migration from existing domain with DNS cutover (brief downtime accepted)

### Cal.com Integration

- [ ] **CAL-01**: Webhook handler receives Cal.com booking events (BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED) and processes them idempotently
- [ ] **CAL-02**: Incoming bookings auto-create appointment records with cal fields populated (calBookingUid, calEventTypeId, calStatus, calMeetingUrl)
- [ ] **CAL-03**: Customer matching — incoming bookings match to existing customers by email, or create a new customer record if none exists
- [ ] **CAL-04**: Booking status sync — rescheduling updates scheduledDate + calStatus, cancellation sets appointment status to CANCELLED
- [ ] **CAL-05**: Admin dashboard displays Cal.com booking source and live status alongside manually-created appointments
- [ ] **CAL-06**: Client portal displays Cal.com-synced appointments automatically without manual admin entry
- [ ] **CAL-07**: Webhook signature verification using Cal.com signing secret for security

### Tech Stack Audit & Full Integration

- [ ] **STACK-01**: Audit all 32 runtime deps — document used vs available APIs per dependency
- [ ] **STACK-02**: Remove unused dependencies (ws, @radix-ui/react-slot if confirmed dead)
- [x] **STACK-03**: Add nuqs — replace manual useSearchParams in gallery, store filter, admin tables
- [x] **STACK-04**: Activate TanStack Query — useQuery/useMutation for client-side data operations
- [ ] **STACK-05**: Integrate framer-motion AnimatePresence for page/list transitions
- [ ] **STACK-06**: Expand date-fns usage — relative timestamps, appointment proximity
- [x] **STACK-07**: Leverage Next.js 16 features — after(), granular caching, useOptimistic
- [x] **STACK-08**: Enhance sonner — promise toasts on all async mutations
- [ ] **STACK-09**: Expand react-table features — column visibility, row selection where useful
- [ ] **STACK-10**: Audit better-auth plugin ecosystem for applicable plugins

### Full Stack Integration (Phase 11)

- [ ] **STACK-11**: Install all missing shadcn/ui components (calendar, date-picker, drawer, command, popover, checkbox, progress, avatar, scroll-area, collapsible, radio-group, slider, toggle, toggle-group, input-otp, hover-card)
- [ ] **STACK-12**: Optimize framer-motion bundle -- fix gallery-grid.tsx to use LazyMotion+m pattern, update React 19 Context-as-provider in form/chart/sidebar
- [ ] **STACK-13**: Next.js 16 route conventions -- loading.tsx, error.tsx, not-found.tsx for every route group, remove all force-dynamic exports
- [ ] **STACK-14**: React 19 features -- resource preloading (prefetchDNS, preconnect) in public layout, useFormStatus SubmitButton component
- [ ] **STACK-15**: TanStack Query SSR -- replace initialData with HydrationBoundary+dehydrate on all dashboard list pages
- [ ] **STACK-16**: TanStack Table full -- global filter (multi-column search), faceted filters with getFacetedRowModel and getFacetedUniqueValues
- [ ] **STACK-17**: Recharts full -- ComposedChart with dual Y-axes (revenue bars + session count line), Brush zoom, BookingTrendsChart with LineChart
- [ ] **STACK-18**: Drizzle ORM full -- arrayContains for gallery tag filtering, .prepare() on hot DAL queries, between() for analytics date ranges
- [ ] **STACK-19**: Stripe full -- setupIntents for saved payment methods, listPaymentMethods for portal
- [ ] **STACK-20**: External services -- Resend bounce webhook handler, Vercel Blob client-side direct uploads with handleUpload token endpoint
- [ ] **STACK-21**: Sonner full -- toast.warning for cancellations/conflicts, toast.info for status updates, toast.dismiss for navigation cleanup
- [ ] **STACK-22**: date-fns full -- formatDuration/intervalToDuration for session durations, differenceInDays for appointment proximity, isWithinInterval for scheduling conflicts
- [ ] **STACK-23**: Resend idempotency -- X-Entity-Ref-ID headers on transactional emails to prevent duplicate sends

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
| PUB-01 | Phase 6 | Complete |
| PUB-02 | Phase 2 | Complete |
| PUB-03 | Phase 2 | Complete |
| PUB-04 | Phase 2 | Complete |
| PUB-05 | Phase 2 | Complete |
| PUB-06 | Phase 2 | Complete |
| PUB-07 | Phase 2 | Complete |
| PUB-08 | Phase 2 | Complete |
| PUB-09 | Phase 2 | Complete |
| ADMIN-01 | Phase 6 | Complete |
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
| PAY-01 | Phase 3 | Complete |
| PAY-02 | Phase 3 | Complete |
| PAY-03 | Phase 3 | Complete |
| PAY-04 | Phase 3 | Complete |
| PAY-05 | Phase 3 | Complete |
| SEC-05 | Phase 3 | Complete |
| PORT-01 | Phase 4 | Complete |
| PORT-02 | Phase 4 | Complete |
| PORT-03 | Phase 4 | Complete |
| PORT-04 | Phase 4 | Complete |
| PORT-05 | Phase 4 | Complete |
| PORT-06 | Phase 4 | Complete |
| STORE-01 | Phase 5 | Complete |
| STORE-02 | Phase 5 | Complete |
| STORE-03 | Phase 5 | Complete |
| STORE-04 | Phase 5 | Complete |
| STORE-05 | Phase 5 | Complete |

| STACK-01 | Phase 10 | Not started |
| STACK-02 | Phase 10 | Not started |
| STACK-03 | Phase 10 | Complete |
| STACK-04 | Phase 10 | Complete |
| STACK-05 | Phase 10 | Not started |
| STACK-06 | Phase 10 | Not started |
| STACK-07 | Phase 10 | Complete |
| STACK-08 | Phase 10 | Complete |
| STACK-09 | Phase 10 | Not started |
| STACK-10 | Phase 10 | Not started |
| STACK-11 | Phase 11 | Not started |
| STACK-12 | Phase 11 | Not started |
| STACK-13 | Phase 11 | Not started |
| STACK-14 | Phase 11 | Not started |
| STACK-15 | Phase 11 | Not started |
| STACK-16 | Phase 11 | Not started |
| STACK-17 | Phase 11 | Not started |
| STACK-18 | Phase 11 | Not started |
| STACK-19 | Phase 11 | Not started |
| STACK-20 | Phase 11 | Not started |
| STACK-21 | Phase 11 | Not started |
| STACK-22 | Phase 11 | Not started |
| STACK-23 | Phase 11 | Not started |

**Coverage:**
- v1 requirements: 68 total
- Mapped to phases: 68
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-26 after Phase 11 planning*
