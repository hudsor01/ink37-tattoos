# Requirements: Ink37 Tattoos

**Defined:** 2026-03-27
**Core Value:** The tattoo artist manages their entire business from one app while clients get a polished experience for discovering, booking, paying, and tracking their tattoo journey.

## v2.0 Requirements

Requirements for admin panel rebuild. Each maps to roadmap phases. Derived from comprehensive codebase audit (310+ findings). 75 requirements across 9 categories..

### Security Hardening

- [ ] **SEC-01**: Dashboard layout enforces auth at layout level -- unauthenticated users redirected before any child page renders
- [ ] **SEC-02**: Portal layout enforces auth at layout level -- unauthenticated users redirected before any child page renders
- [ ] **SEC-03**: All public API routes have rate limiting (store download, portal billing, contact form, webhooks)
- [ ] **SEC-04**: Rate limiter uses persistent storage (not in-memory Map) suitable for serverless/distributed deployment
- [ ] **SEC-05**: All server actions validate user role explicitly before calling DAL (not relying on DAL throw for role errors)
- [ ] **SEC-06**: All string inputs sanitized for XSS before rendering in dashboard components (customer names, notes, descriptions)
- [ ] **SEC-07**: Stripe webhook handler prevents race conditions on duplicate event processing (atomic idempotency check)
- [ ] **SEC-08**: Cal.com webhook validates payload structure with runtime schema checks beyond TypeScript casting
- [ ] **SEC-09**: API routes distinguish between auth failures and DB errors with appropriate status codes and logging
- [ ] **SEC-10**: BLOB_PRIVATE_READ_WRITE_TOKEN added to Zod env schema as required field (TD-03)

### Data Layer

- [x] **DAL-01**: All list DAL functions support cursor/offset pagination with configurable page size
- [x] **DAL-02**: All list DAL functions support search/filter by relevant text fields (name, email, phone, description)
- [x] **DAL-03**: Analytics aggregation queries use SQL GROUP BY with date_trunc instead of loading all rows into JavaScript (revenue, client acquisition, booking trends)
- [x] **DAL-04**: All server actions return consistent `{ success, data?, error? }` pattern (no mixed throw/return)
- [ ] **DAL-05**: All DAL mutation functions validate foreign key references exist before insert (customerId, artistId)
- [ ] **DAL-06**: All DAL mutations that use `.returning()` handle empty result arrays gracefully
- [ ] **DAL-07**: Missing DAL functions created: artist profile CRUD, design approval status, contact management (update/delete)
- [ ] **DAL-08**: Webhook handlers (Stripe, Cal.com, Resend) call revalidatePath after state changes so dashboard reflects updates
- [ ] **DAL-09**: Store checkout page uses DAL function instead of direct db.query call
- [ ] **DAL-10**: All mutation server actions include audit logging (media, contacts, settings, portal actions currently missing)
- [ ] **DAL-11**: checkSchedulingConflict() function wired into appointment creation/update flow (currently orphaned)
- [ ] **DAL-12**: Gift card validation in store checkout returns explicit error to user when code is invalid (not silent fallback to 0)

### UI Quality

- [ ] **UI-01**: Every dashboard page has loading.tsx with skeleton placeholders appropriate to the page layout
- [ ] **UI-02**: Every dashboard page has error.tsx with retry button and user-friendly error message
- [ ] **UI-03**: Every list page has an empty state component when no data exists (not blank space)
- [ ] **UI-04**: All dashboard pages are responsive on mobile -- tables collapse to card views, forms stack vertically, sidebar collapses
- [ ] **UI-05**: All interactive elements have proper ARIA labels, all decorative icons have aria-hidden, all charts have alt text
- [ ] **UI-06**: All forms show field-level validation errors below inputs (not just toast on submit failure)
- [ ] **UI-07**: All destructive actions use AlertDialog confirmation (no browser confirm() calls)
- [ ] **UI-08**: All date inputs use date picker components (not raw text inputs)
- [ ] **UI-09**: Consistent toast patterns across all mutations (success, error, loading states via toast.promise)
- [ ] **UI-10**: Dynamic breadcrumbs on all dashboard pages reflecting current route (not hardcoded "Dashboard")
- [ ] **UI-11**: Unsaved changes warning on all forms when navigating away mid-edit
- [ ] **UI-12**: Dead imports removed, unused Tab imports cleaned up from customer/appointment forms
- [ ] **UI-13**: StatusBadge uses theme-aware color tokens (not hardcoded Tailwind classes)

### Missing Pages

- [ ] **PAGE-01**: Artist Profile page -- owner can edit bio, specialties, portfolio display preferences, business info, profile photo
- [ ] **PAGE-02**: Calendar view -- visual day/week/month calendar showing appointments with time slots, drag support optional
- [ ] **PAGE-03**: Financial reports page -- revenue by period, payment method breakdown, tax summaries, expense tracking, data export
- [ ] **PAGE-04**: Contacts management page -- list/filter/search submissions, update status, add admin notes, template responses
- [ ] **PAGE-05**: Gift card management page -- view all issued cards, check balances, issue new cards, deactivate cards
- [ ] **PAGE-06**: Notification center -- in-app notifications for new bookings, payments, contact submissions, low stock
- [ ] **PAGE-07**: Design approval management -- approve/reject designs for public gallery, manage approval queue

### Feature Depth -- Existing Pages

- [ ] **FEAT-01**: Dashboard overview -- configurable date range picker, upcoming appointments today/this week, clickable widgets linking to detail pages
- [ ] **FEAT-02**: Customer list -- bulk actions (delete, export CSV), customer import from CSV, duplicate detection, customer lifecycle stage indicator
- [ ] **FEAT-03**: Customer detail -- inline editing, create appointment/session from customer page, communication timeline, linked portal account indicator
- [ ] **FEAT-04**: Appointment list -- conflict detection on create/edit, appointment reminders toggle, bulk status updates, notes visible in list
- [ ] **FEAT-05**: Session management -- edit mode for existing sessions, session detail view with full expanded info, linked payment records, image gallery per session
- [ ] **FEAT-06**: Payment pages -- payment receipt PDF generation/download, payment plan support (split across sessions), late payment reminder trigger
- [ ] **FEAT-07**: Product management -- product image galleries (multiple images), product visibility toggle for public store, category/tagging
- [ ] **FEAT-08**: Order management -- order status timeline/history, shipping tracking field, fulfillment workflow steps, return management
- [ ] **FEAT-09**: Media management -- bulk upload, folder/album organization, thumbnail grid view, tagging/search, approval workflow UI, linked sessions
- [ ] **FEAT-10**: Analytics -- custom date range picker, data export (CSV/PDF), comparison views (period vs period), more KPIs (CLV, no-show rate, avg session duration)
- [ ] **FEAT-11**: Settings -- organized into logical tabs (Studio, Email, Payment, Hours, Terms), unsaved changes warning, operating hours/days management
- [ ] **FEAT-12**: Audit log -- advanced filtering (date range, user, action type), search, export, before/after change detail
- [ ] **FEAT-13**: All list pages -- data export to CSV, "show all" option alongside pagination, jump-to-page control

### Business Workflows

- [ ] **BIZ-01**: Deposit workflow -- configurable deposit requirements by appointment type, automatic balance calculation, balance due reminders
- [ ] **BIZ-02**: Consent management -- digital consent form capture with version tracking, expiration, admin view/download of signed forms
- [ ] **BIZ-03**: Aftercare workflow -- aftercare template management, automatic aftercare email after session completion
- [ ] **BIZ-04**: Appointment reminders -- configurable reminder emails before appointments (24h, 48h), no-show follow-up
- [ ] **BIZ-05**: Invoice generation -- generate and download invoice PDFs for completed payments, email invoice to customer
- [ ] **BIZ-06**: Customer portal onboarding -- automatic Customer record creation when portal user registers (currently only via Cal.com or admin)

### Analytics Depth

- [ ] **ANLYT-01**: Revenue analytics -- revenue by design type/size, average transaction value, payment success rate, refund rate
- [ ] **ANLYT-02**: Booking analytics -- booking conversion funnel, lead time analysis, peak hours detection, capacity utilization
- [ ] **ANLYT-03**: Customer analytics -- customer lifetime value calculation, repeat client percentage, churn risk indicators, referral tracking
- [ ] **ANLYT-04**: Operational metrics -- average session duration by type, no-show rate trends, scheduling efficiency

### Testing Coverage

- [ ] **TEST-01**: All server actions have unit tests with mocked auth and DAL (media, session, product, order, gift-card, settings actions)
- [ ] **TEST-02**: All API routes have integration tests covering auth enforcement, input validation, and error responses
- [ ] **TEST-03**: E2E test scenarios for critical flows: guest checkout, tattoo session payment, portal consent signing, admin CRUD
- [ ] **TEST-04**: RBAC tests verify role enforcement at route, action, and DAL levels (staff vs admin vs user rejection)
- [ ] **TEST-05**: Webhook handlers tested with malformed payloads, missing fields, and concurrent duplicate events
- [ ] **TEST-06**: Rate limiter tested under concurrent load conditions

### Tech Debt

- [ ] **DEBT-01**: Replace all asChild prop usage with base-ui render prop pattern in remaining files (TD-01)
- [ ] **DEBT-02**: Create contacts admin page or remove orphaned contacts DAL exports (TD-02 -- resolved by PAGE-04)
- [ ] **DEBT-03**: Audit log filter selects replaced with accessible Shadcn Select components
- [ ] **DEBT-04**: Session form converted from raw register() to Shadcn Form wrapper pattern (consistent with other forms)

## Future Requirements

Deferred beyond v2.0.

### Marketing & Retention

- **MKT-01**: Email campaign system for client outreach
- **MKT-02**: Automated aftercare email sequences post-session
- **MKT-03**: Review/testimonial collection after completed sessions
- **MKT-04**: Loyalty program or referral system
- **MKT-05**: Waitlist for popular time slots

### Enhanced Features

- **ENH-01**: Flash sheet management with booking integration
- **ENH-02**: Advanced design approval workflow (submit reference images, approve sketches)
- **ENH-03**: PWA with push notifications for appointment reminders
- **ENH-04**: Expense tracking and profit margin analysis
- **ENH-05**: Customer communication history dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first, responsive design handles mobile |
| Multi-staff management | Solo artist studio -- no team scheduling needed |
| Real-time chat | Cal.com and contact form cover communication |
| Inventory management | Insufficient physical products to justify complexity |
| POS/in-person payments | Not needed for web platform |
| Video consultations | Cal.com handles meeting links |
| Multi-location support | Single studio operation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 13 | Pending |
| SEC-02 | Phase 13 | Pending |
| SEC-03 | Phase 13 | Pending |
| SEC-04 | Phase 13 | Pending |
| SEC-05 | Phase 13 | Pending |
| SEC-06 | Phase 13 | Pending |
| SEC-07 | Phase 13 | Pending |
| SEC-08 | Phase 13 | Pending |
| SEC-09 | Phase 13 | Pending |
| SEC-10 | Phase 13 | Pending |
| DAL-01 | Phase 14 | Complete |
| DAL-02 | Phase 14 | Complete |
| DAL-03 | Phase 14 | Complete |
| DAL-04 | Phase 14 | Complete |
| DAL-05 | Phase 14 | Pending |
| DAL-06 | Phase 14 | Pending |
| DAL-07 | Phase 14 | Pending |
| DAL-08 | Phase 14 | Pending |
| DAL-09 | Phase 14 | Pending |
| DAL-10 | Phase 14 | Pending |
| DAL-11 | Phase 14 | Pending |
| DAL-12 | Phase 14 | Pending |
| UI-01 | Phase 15 | Pending |
| UI-02 | Phase 15 | Pending |
| UI-03 | Phase 15 | Pending |
| UI-04 | Phase 15 | Pending |
| UI-05 | Phase 15 | Pending |
| UI-06 | Phase 15 | Pending |
| UI-07 | Phase 15 | Pending |
| UI-08 | Phase 15 | Pending |
| UI-09 | Phase 15 | Pending |
| UI-10 | Phase 15 | Pending |
| UI-11 | Phase 15 | Pending |
| UI-12 | Phase 15 | Pending |
| UI-13 | Phase 15 | Pending |
| PAGE-01 | Phase 16 | Pending |
| PAGE-02 | Phase 16 | Pending |
| PAGE-04 | Phase 16 | Pending |
| PAGE-05 | Phase 16 | Pending |
| PAGE-03 | Phase 17 | Pending |
| PAGE-06 | Phase 17 | Pending |
| PAGE-07 | Phase 17 | Pending |
| FEAT-02 | Phase 18 | Pending |
| FEAT-03 | Phase 18 | Pending |
| FEAT-04 | Phase 18 | Pending |
| FEAT-05 | Phase 18 | Pending |
| FEAT-06 | Phase 18 | Pending |
| FEAT-07 | Phase 18 | Pending |
| FEAT-08 | Phase 18 | Pending |
| FEAT-01 | Phase 19 | Pending |
| FEAT-09 | Phase 19 | Pending |
| FEAT-10 | Phase 19 | Pending |
| FEAT-11 | Phase 19 | Pending |
| FEAT-12 | Phase 19 | Pending |
| FEAT-13 | Phase 19 | Pending |
| BIZ-01 | Phase 20 | Pending |
| BIZ-02 | Phase 20 | Pending |
| BIZ-03 | Phase 20 | Pending |
| BIZ-04 | Phase 20 | Pending |
| BIZ-05 | Phase 20 | Pending |
| BIZ-06 | Phase 20 | Pending |
| ANLYT-01 | Phase 21 | Pending |
| ANLYT-02 | Phase 21 | Pending |
| ANLYT-03 | Phase 21 | Pending |
| ANLYT-04 | Phase 21 | Pending |
| TEST-01 | Phase 22 | Pending |
| TEST-02 | Phase 22 | Pending |
| TEST-03 | Phase 22 | Pending |
| TEST-04 | Phase 22 | Pending |
| TEST-05 | Phase 22 | Pending |
| TEST-06 | Phase 22 | Pending |
| DEBT-01 | Phase 22 | Pending |
| DEBT-02 | Phase 22 | Pending |
| DEBT-03 | Phase 22 | Pending |
| DEBT-04 | Phase 22 | Pending |

**Coverage:**
- v2.0 requirements: 75 total
- Mapped to phases: 75
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after v2.0 roadmap creation*
