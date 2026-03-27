# Roadmap: Ink37 Tattoos

## Milestones

- **v1.0 MVP** -- Phases 1-12 (shipped 2026-03-27) | [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Admin Panel** -- Phases 13-22 (active)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-12) -- SHIPPED 2026-03-27</summary>

- [x] Phase 1: Foundation (3/3 plans) -- completed 2026-03-20
- [x] Phase 2: Public Site + Admin Dashboard (7/7 plans) -- completed 2026-03-21
- [x] Phase 3: Payments (3/3 plans) -- completed 2026-03-21
- [x] Phase 4: Client Portal (2/2 plans) -- completed 2026-03-22
- [x] Phase 5: Online Store (5/5 plans) -- completed 2026-03-22
- [x] Phase 6: UI Stub Closure + UX Wiring (1/1 plans) -- completed 2026-03-23
- [x] Phase 7: Store Integration Fixes (1/1 plans) -- completed 2026-03-23
- [x] Phase 8: Drizzle Migration (3/3 plans) -- completed 2026-03-24
- [x] Phase 9: Cal.com Integration (2/2 plans) -- completed 2026-03-25
- [x] Phase 10: Tech Stack Audit (3/3 plans) -- completed 2026-03-26
- [x] Phase 11: Full Stack Integration (6/6 plans) -- completed 2026-03-27
- [x] Phase 12: Testing Foundation (3/3 plans) -- completed 2026-03-27

</details>

### v2.0 Admin Panel

- [ ] **Phase 13: Security Hardening** - Auth enforcement, rate limiting, input sanitization, webhook safety
- [ ] **Phase 14: Data Layer Fixes** - Pagination, consistent errors, DAL gaps, audit logging, webhook revalidation
- [ ] **Phase 15: UI Foundations** - Loading/error/empty states, responsive tables, accessibility, form UX patterns
- [ ] **Phase 16: Missing Pages -- Core** - Artist profile, calendar view, contacts management, gift card management
- [ ] **Phase 17: Missing Pages -- Operations** - Financial reports, notification center, design approval management
- [ ] **Phase 18: Feature Depth -- Records** - Enhanced customers, appointments, sessions, payments, products, orders
- [ ] **Phase 19: Feature Depth -- Platform** - Dashboard overview, media, analytics, settings, audit log, list export
- [ ] **Phase 20: Business Workflows** - Deposits, consent, aftercare, reminders, invoices, portal onboarding
- [ ] **Phase 21: Analytics Depth** - Revenue, booking, customer, and operational analytics
- [ ] **Phase 22: Testing and Tech Debt** - Server action tests, API tests, E2E, RBAC, webhook tests, debt cleanup

## Phase Details

### Phase 13: Security Hardening
**Goal**: All admin and portal routes are protected at the layout level, all public endpoints are rate-limited with persistent storage, all inputs are sanitized, and all webhooks handle edge cases safely
**Depends on**: Nothing (foundation for everything else)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10
**Success Criteria** (what must be TRUE):
  1. Unauthenticated user visiting any /dashboard or /portal route is redirected to login before any page content renders
  2. Hitting any public API route (store download, portal billing, contact, webhooks) rapidly returns 429 after threshold, backed by persistent storage that survives serverless cold starts
  3. Customer names and notes containing HTML/script tags render as escaped text in the dashboard, never as executable markup
  4. Sending the same Stripe webhook event twice does not create duplicate records or double-process the payment
  5. Cal.com webhook payloads missing required fields are rejected with a logged validation error instead of crashing
**Plans**: TBD

### Phase 14: Data Layer Fixes
**Goal**: All DAL list functions support pagination and search, all mutations return consistent results, all state changes revalidate the UI, and all missing DAL functions exist
**Depends on**: Phase 13 (auth/role checks must be solid before DAL relies on them)
**Requirements**: DAL-01, DAL-02, DAL-03, DAL-04, DAL-05, DAL-06, DAL-07, DAL-08, DAL-09, DAL-10, DAL-11, DAL-12
**Success Criteria** (what must be TRUE):
  1. Every list page in the dashboard supports paginating through results with configurable page size and searching by relevant text fields
  2. Every server action returns `{ success, data?, error? }` -- no action throws an unhandled error to the client
  3. Creating an appointment for a non-existent customer returns a clear validation error instead of a database constraint violation
  4. After a Stripe payment webhook fires, the dashboard payments page shows the updated record without requiring a manual refresh
  5. Entering an invalid gift card code at checkout displays an explicit error message to the user
**Plans**: TBD

### Phase 15: UI Foundations
**Goal**: Every dashboard page has proper loading, error, and empty states; all pages work on mobile; all forms show field-level validation; and all interactive elements are accessible
**Depends on**: Phase 14 (data layer must return consistent errors for error states to display correctly)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-13
**Success Criteria** (what must be TRUE):
  1. Navigating to any dashboard page shows skeleton placeholders while data loads, a retry-capable error view if the load fails, and an illustrated empty state if no data exists
  2. Viewing the dashboard on a mobile device shows tables collapsed to card views, forms stacked vertically, and the sidebar collapsed behind a menu toggle
  3. Deleting any record triggers an AlertDialog confirmation before proceeding -- no browser confirm() dialogs appear anywhere
  4. Submitting a form with invalid fields shows error messages directly below the invalid inputs, not just a toast notification
  5. All interactive elements are keyboard-navigable and have ARIA labels; screen reader announces all chart data via alt text
**Plans**: TBD
**UI hint**: yes

### Phase 16: Missing Pages -- Core
**Goal**: Artist can manage their profile, view appointments on a visual calendar, manage contact submissions, and administer gift cards
**Depends on**: Phase 14 (needs DAL-07 for artist profile CRUD and contact management functions)
**Requirements**: PAGE-01, PAGE-02, PAGE-04, PAGE-05
**Success Criteria** (what must be TRUE):
  1. Artist can edit their bio, specialties, profile photo, and business info from a dedicated profile page, and changes reflect on the public site
  2. Artist can view appointments in day/week/month calendar views with color-coded status and click any appointment to see its details
  3. Artist can list, filter, and search contact form submissions, update their status, and add admin notes
  4. Artist can view all issued gift cards with balances, issue new gift cards, and deactivate compromised cards
**Plans**: TBD
**UI hint**: yes

### Phase 17: Missing Pages -- Operations
**Goal**: Artist has a financial reporting hub, receives in-app notifications for business events, and can manage design approvals for the public gallery
**Depends on**: Phase 14 (needs DAL-03 for SQL-based analytics aggregation), Phase 16 (calendar and contacts pages establish patterns for new pages)
**Requirements**: PAGE-03, PAGE-06, PAGE-07
**Success Criteria** (what must be TRUE):
  1. Artist can view revenue by period with payment method breakdown, tax summaries, and export data to CSV
  2. Artist receives in-app notifications for new bookings, payments received, contact form submissions, and low stock alerts
  3. Artist can review a queue of designs pending approval, approve or reject each with notes, and approved designs appear in the public gallery
**Plans**: TBD
**UI hint**: yes

### Phase 18: Feature Depth -- Records
**Goal**: Core record management pages (customers, appointments, sessions, payments, products, orders) have full operational depth -- bulk actions, inline editing, conflict detection, and linked workflows
**Depends on**: Phase 15 (UI foundations must be in place -- responsive tables, confirmation dialogs, form validation patterns)
**Requirements**: FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-07, FEAT-08
**Success Criteria** (what must be TRUE):
  1. Artist can select multiple customers and bulk delete or export to CSV, and can import customers from a CSV file with duplicate detection
  2. Creating or editing an appointment that overlaps an existing one shows a conflict warning before saving
  3. Artist can click into a session detail view showing full info with linked payment records and image gallery, and can edit any field inline
  4. Artist can generate a PDF receipt for any payment and manage product image galleries with visibility toggles for the public store
  5. Artist can track order fulfillment through status steps, add shipping tracking numbers, and process returns
**Plans**: TBD
**UI hint**: yes

### Phase 19: Feature Depth -- Platform
**Goal**: Dashboard overview, media management, analytics page, settings, audit log, and all list pages have their full feature set -- date ranges, export, search, configuration
**Depends on**: Phase 15 (UI foundations), Phase 17 (notification center exists for dashboard widgets to link to)
**Requirements**: FEAT-01, FEAT-09, FEAT-10, FEAT-11, FEAT-12, FEAT-13
**Success Criteria** (what must be TRUE):
  1. Dashboard overview shows today's and this week's appointments, clickable KPI widgets linking to detail pages, and a configurable date range picker
  2. Media management supports bulk upload, folder organization, thumbnail grid view with tagging/search, and an approval workflow for gallery images
  3. Analytics page supports custom date ranges, CSV/PDF export, period-over-period comparison, and additional KPIs (CLV, no-show rate, avg session duration)
  4. Settings are organized into logical tabs (Studio, Email, Payment, Hours, Terms) with unsaved changes warnings and operating hours management
  5. Any list page in the dashboard can export data to CSV, switch between paginated and "show all" views, and jump to a specific page
**Plans**: TBD
**UI hint**: yes

### Phase 20: Business Workflows
**Goal**: Core tattoo business workflows are automated -- deposit tracking, consent management, aftercare emails, appointment reminders, invoice generation, and portal onboarding
**Depends on**: Phase 18 (record pages must support the UI for deposits, consent, payments), Phase 14 (DAL-11 scheduling conflict check wired in)
**Requirements**: BIZ-01, BIZ-02, BIZ-03, BIZ-04, BIZ-05, BIZ-06
**Success Criteria** (what must be TRUE):
  1. Artist can configure deposit requirements by appointment type, and the system automatically calculates remaining balance and sends balance-due reminders
  2. Clients sign digital consent forms with version tracking; artist can view, download, and see expiration status of all signed forms
  3. After marking a session complete, the system automatically sends an aftercare email using a configurable template
  4. Clients receive automated reminder emails 24h and 48h before appointments, and no-shows trigger a follow-up email
  5. Artist can generate and download invoice PDFs for completed payments and email them directly to customers
**Plans**: TBD

### Phase 21: Analytics Depth
**Goal**: Dashboard analytics provide actionable business intelligence -- revenue breakdowns, booking funnels, customer lifetime value, and operational efficiency metrics
**Depends on**: Phase 17 (financial reports page exists), Phase 19 (analytics page has date range and export)
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04
**Success Criteria** (what must be TRUE):
  1. Revenue analytics show breakdown by design type/size, average transaction value, payment success rate, and refund rate
  2. Booking analytics show a conversion funnel from inquiry to completed appointment, peak hours, and capacity utilization
  3. Customer analytics display lifetime value per client, repeat client percentage, and churn risk indicators
  4. Operational metrics show average session duration by type, no-show rate trends, and scheduling efficiency over time
**Plans**: TBD
**UI hint**: yes

### Phase 22: Testing and Tech Debt
**Goal**: All server actions, API routes, and critical user flows have automated test coverage; all identified tech debt is resolved
**Depends on**: All previous phases (tests validate the features built in phases 13-21)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. Every server action has a unit test covering success path, auth rejection, and validation failure with mocked DAL
  2. Every API route has an integration test verifying auth enforcement, input validation, and correct error status codes
  3. E2E tests pass for guest checkout, tattoo session payment, portal consent signing, and admin CRUD flows
  4. RBAC tests confirm that USER role cannot access admin actions, STAFF cannot perform ADMIN-only operations, and unauthenticated requests are rejected at all levels
  5. All asChild prop usage is replaced with base-ui render prop pattern, orphaned contacts DAL is consumed by PAGE-04, and audit log uses Shadcn Select components
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-20 |
| 2. Public Site + Admin | v1.0 | 7/7 | Complete | 2026-03-21 |
| 3. Payments | v1.0 | 3/3 | Complete | 2026-03-21 |
| 4. Client Portal | v1.0 | 2/2 | Complete | 2026-03-22 |
| 5. Online Store | v1.0 | 5/5 | Complete | 2026-03-22 |
| 6. UI Stub Closure | v1.0 | 1/1 | Complete | 2026-03-23 |
| 7. Store Integration Fixes | v1.0 | 1/1 | Complete | 2026-03-23 |
| 8. Drizzle Migration | v1.0 | 3/3 | Complete | 2026-03-24 |
| 9. Cal.com Integration | v1.0 | 2/2 | Complete | 2026-03-25 |
| 10. Tech Stack Audit | v1.0 | 3/3 | Complete | 2026-03-26 |
| 11. Full Stack Integration | v1.0 | 6/6 | Complete | 2026-03-27 |
| 12. Testing Foundation | v1.0 | 3/3 | Complete | 2026-03-27 |
| 13. Security Hardening | v2.0 | 0/? | Not started | - |
| 14. Data Layer Fixes | v2.0 | 0/? | Not started | - |
| 15. UI Foundations | v2.0 | 0/? | Not started | - |
| 16. Missing Pages -- Core | v2.0 | 0/? | Not started | - |
| 17. Missing Pages -- Operations | v2.0 | 0/? | Not started | - |
| 18. Feature Depth -- Records | v2.0 | 0/? | Not started | - |
| 19. Feature Depth -- Platform | v2.0 | 0/? | Not started | - |
| 20. Business Workflows | v2.0 | 0/? | Not started | - |
| 21. Analytics Depth | v2.0 | 0/? | Not started | - |
| 22. Testing and Tech Debt | v2.0 | 0/? | Not started | - |
