# Roadmap: Ink37 Tattoos

## Milestones

- **v1.0 MVP** -- Phases 1-12 (shipped 2026-03-27) | [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Admin Panel** -- Phases 13-22 (shipped 2026-03-30)
- **v3.0 Production Launch** -- Phases 23-28 (active)

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

<details>
<summary>v2.0 Admin Panel (Phases 13-22) -- SHIPPED 2026-03-30</summary>

- [x] Phase 13: Security Hardening -- completed 2026-03-28
- [x] Phase 14: Data Layer Fixes -- completed 2026-03-28
- [x] Phase 15: UI Foundations -- completed 2026-03-28
- [x] Phase 16: Missing Pages -- Core -- completed 2026-03-29
- [x] Phase 17: Missing Pages -- Operations -- completed 2026-03-29
- [x] Phase 18: Feature Depth -- Records -- completed 2026-03-29
- [x] Phase 19: Feature Depth -- Platform -- completed 2026-03-29
- [x] Phase 20: Business Workflows -- completed 2026-03-30
- [x] Phase 21: Analytics Depth -- completed 2026-03-30
- [x] Phase 22: Testing and Tech Debt -- completed 2026-03-30

</details>

### v3.0 Production Launch

- [ ] **Phase 23: Git Merge + CI/CD Pipeline** - Merge v2.0 branches to main, clean up branches, set up GitHub Actions CI and Vercel deploy
- [ ] **Phase 24: Monitoring + Observability** - Sentry error tracking, health check endpoint, structured logging, web vitals
- [ ] **Phase 25: Database + Security Hardening** - Migration consolidation, production seed data, CSP nonces, admin rate limiting
- [ ] **Phase 26: Assets + Infrastructure** - Gallery videos, search verification files, PWA manifest, n8n workflows, env var audit
- [ ] **Phase 27: Documentation** - Production deployment checklist and README update

## Phase Details

<details>
<summary>v1.0 MVP Phase Details (Phases 1-12)</summary>

### Phase 1: Foundation
**Goal**: Project scaffolding with unified schema, auth, and route groups
**Depends on**: Nothing
**Plans**: 3/3 complete

### Phase 2: Public Site + Admin Dashboard
**Goal**: Both apps reconstructed into unified codebase
**Depends on**: Phase 1
**Plans**: 7/7 complete

### Phase 3: Payments
**Goal**: Stripe deposits, session payments, webhooks
**Depends on**: Phase 2
**Plans**: 3/3 complete

### Phase 4: Client Portal
**Goal**: Client self-service experience
**Depends on**: Phase 3
**Plans**: 2/2 complete

### Phase 5: Online Store
**Goal**: Merch, prints, gift cards
**Depends on**: Phase 3
**Plans**: 5/5 complete

### Phase 6: UI Stub Closure + UX Wiring
**Goal**: Close UI gaps and wire UX flows
**Depends on**: Phase 5
**Plans**: 1/1 complete

### Phase 7: Store Integration Fixes
**Goal**: Fix store integration issues
**Depends on**: Phase 6
**Plans**: 1/1 complete

### Phase 8: Drizzle Migration
**Goal**: Migrate from Prisma to Drizzle ORM
**Depends on**: Phase 7
**Plans**: 3/3 complete

### Phase 9: Cal.com Integration
**Goal**: Cal.com booking webhook integration
**Depends on**: Phase 8
**Plans**: 2/2 complete

### Phase 10: Tech Stack Audit
**Goal**: Audit and align tech stack
**Depends on**: Phase 9
**Plans**: 3/3 complete

### Phase 11: Full Stack Integration
**Goal**: End-to-end integration of all features
**Depends on**: Phase 10
**Plans**: 6/6 complete

### Phase 12: Testing Foundation
**Goal**: Establish test infrastructure and coverage
**Depends on**: Phase 11
**Plans**: 3/3 complete

</details>

<details>
<summary>v2.0 Admin Panel Phase Details (Phases 13-22)</summary>

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
**Plans**: Complete

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
**Plans**: Complete

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
**Plans**: Complete
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
**Plans**: Complete
**UI hint**: yes

### Phase 17: Missing Pages -- Operations
**Goal**: Artist has a financial reporting hub, receives in-app notifications for business events, and can manage design approvals for the public gallery
**Depends on**: Phase 14 (needs DAL-03 for SQL-based analytics aggregation), Phase 16 (calendar and contacts pages establish patterns for new pages)
**Requirements**: PAGE-03, PAGE-06, PAGE-07
**Success Criteria** (what must be TRUE):
  1. Artist can view revenue by period with payment method breakdown, tax summaries, and export data to CSV
  2. Artist receives in-app notifications for new bookings, payments received, contact form submissions, and low stock alerts
  3. Artist can review a queue of designs pending approval, approve or reject each with notes, and approved designs appear in the public gallery
**Plans**: Complete
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
**Plans**: Complete
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
**Plans**: Complete
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
**Plans**: Complete

### Phase 21: Analytics Depth
**Goal**: Dashboard analytics provide actionable business intelligence -- revenue breakdowns, booking funnels, customer lifetime value, and operational efficiency metrics
**Depends on**: Phase 17 (financial reports page exists), Phase 19 (analytics page has date range and export)
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04
**Success Criteria** (what must be TRUE):
  1. Revenue analytics show breakdown by design type/size, average transaction value, payment success rate, and refund rate
  2. Booking analytics show a conversion funnel from inquiry to completed appointment, peak hours, and capacity utilization
  3. Customer analytics display lifetime value per client, repeat client percentage, and churn risk indicators
  4. Operational metrics show average session duration by type, no-show rate trends, and scheduling efficiency over time
**Plans**: Complete
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
**Plans**: Complete

</details>

### Phase 23: Git Merge + CI/CD Pipeline
**Goal**: All v2.0 work is merged to main via a clean PR, stale branches are deleted, and every push to main runs automated tests, builds, and deploys to Vercel
**Depends on**: Nothing (first v3.0 phase -- must happen before anything else can deploy)
**Requirements**: GIT-01, GIT-02, GIT-03, CICD-01, CICD-02, CICD-03
**Success Criteria** (what must be TRUE):
  1. All 223 v2.0 commits from phase branches are merged to main via a single clean PR with no merge conflicts
  2. All worktree-agent-* and gsd/phase-* branches are deleted from both local and remote after merge
  3. Opening a PR against main triggers a GitHub Actions workflow that runs `bun run test` and `bun run build` -- the PR cannot merge if either fails
  4. Merging a PR to main triggers an automatic Vercel production deployment via the Vercel GitHub integration
**Plans**: TBD

### Phase 24: Monitoring + Observability
**Goal**: Production errors are captured and reported automatically, the app exposes a health check for uptime monitoring, all logging is structured and queryable, and real user performance metrics are tracked
**Depends on**: Phase 23 (CI/CD must be in place so monitoring changes deploy correctly)
**Requirements**: MON-01, MON-02, MON-03, MON-04
**Success Criteria** (what must be TRUE):
  1. An unhandled error in production is captured by Sentry with stack trace, request context, and user info within 60 seconds
  2. Hitting GET /api/health returns 200 with `{ status: "ok", db: "connected" }` when healthy, or 503 with `{ status: "error", db: "disconnected" }` when the database is unreachable
  3. All server-side log output uses Pino structured JSON format with request IDs, timestamps, and log levels -- no raw console.log or console.error calls remain
  4. Vercel Analytics or Web Vitals tracking is enabled and reporting LCP, FID, and CLS metrics for the public site
**Plans**: 2 plans
Plans:
- [ ] 24-01-PLAN.md -- Sentry error tracking, health check endpoint, web vitals
- [x] 24-02-PLAN.md -- Pino structured logging replacing all console.* calls

### Phase 25: Database + Security Hardening
**Goal**: Drizzle migrations are consolidated into a clean baseline, the production database has seed data for first launch, CSP headers use nonces instead of unsafe-inline, and admin API routes are rate-limited
**Depends on**: Phase 24 (monitoring must be in place to catch migration or security issues in production)
**Requirements**: DB-01, DB-02, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Running `bun run db:migrate` on a fresh database applies a single consolidated migration that produces the complete v3.0 schema with no intermediate steps
  2. Running `bun run db:seed` populates the production database with an artist profile, default studio settings, and a current consent form template
  3. The Content-Security-Policy header uses nonce-based script/style sources instead of unsafe-inline or unsafe-eval -- inline scripts without a valid nonce are blocked by the browser
  4. Rapid requests to any /api/admin/* or /api/upload/* endpoint return 429 after threshold, preventing brute-force or abuse of authenticated routes
**Plans**: TBD

### Phase 26: Assets + Infrastructure
**Goal**: All missing public assets are in place (gallery videos, search verification, PWA manifest), n8n cron workflows are configured, and all production environment variables are documented and verified
**Depends on**: Phase 25 (database and security must be solid before completing infrastructure)
**Requirements**: ASSET-01, ASSET-02, ASSET-03, INFRA-01, INFRA-04
**Success Criteria** (what must be TRUE):
  1. All 7 gallery video files play correctly on the public gallery page with no 404 errors
  2. Bing and Google search verification files are accessible at their expected URLs and pass verification in respective webmaster tools
  3. The site has a valid manifest.json and service worker that enable "Add to Home Screen" on mobile devices
  4. n8n workflows at n8n.thehudsonfam.com run balance-due reminder emails daily and no-show follow-up emails hourly on schedule
  5. Every environment variable required for production is documented with its purpose, and all values are verified as set in the Vercel dashboard
**Plans**: TBD

### Phase 27: Documentation
**Goal**: The project has a complete deployment runbook and an up-to-date README that captures the final architecture, setup instructions, and operational procedures
**Depends on**: Phase 26 (documentation captures the final state after all infrastructure is in place)
**Requirements**: DOC-01, DOC-02
**Success Criteria** (what must be TRUE):
  1. DEPLOYMENT.md contains a step-by-step production deployment checklist covering env var setup, database migration, DNS cutover, smoke tests, and rollback procedures
  2. README.md provides a project overview, local development setup instructions, architecture diagram reference, and links to all operational documentation
Plans:
- [x] 27-01-PLAN.md -- Production deployment checklist and README update

### Phase 28: Fix PR #5 Notification Retention Policy Review Issues
**Goal**: All security, correctness, robustness, and code quality issues identified in the PR #5 review are resolved before merge
**Depends on**: Nothing (fixes apply to feature/notification-retention-policy branch)
**Requirements**: CRON-SEC-01, CRON-SEC-02, CRON-ROB-01, CRON-ROB-02, CRON-ROB-03, CRON-CLEAN-01, CRON-CLEAN-02, CRON-INFRA-01
**Success Criteria** (what must be TRUE):
  1. Bearer token comparison in /api/cron/notifications-cleanup uses crypto.timingSafeEqual — string === is eliminated
  2. Redis distributed lock stores a unique value per acquisition and only releases if the value matches — cross-process lock deletion is impossible
  3. Non-numeric env vars for retention days/batch size are caught at startup via zod coercion, not silently producing NaN at runtime
  4. Purge SQL queries do not use RETURNING clause — rowCount is used for counts with no unnecessary data transfer
  5. purgeOldNotifications has explicit documentation or guard clarifying it intentionally bypasses requireStaffRole for cron use
  6. Redis client instantiation is shared between tryAcquireLock and releaseLock — no duplicate new Redis() calls
  7. Env schema uses z.coerce.number().optional() for all three notification retention env vars
  8. n8n workflow at n8n.thehudsonfam.com is configured to POST to /api/cron/notifications-cleanup on a daily schedule
**Plans**: 2 plans

Plans:
- [x] 28-01-PLAN.md -- Shared cron auth utility, env schema coercion, env tests, n8n workflow JSON
- [x] 28-02-PLAN.md -- Update all 3 cron routes, fix DAL purge, cron route tests

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
| 13. Security Hardening | v2.0 | 4/4 | Complete | 2026-03-28 |
| 14. Data Layer Fixes | v2.0 | 4/4 | Complete | 2026-03-28 |
| 15. UI Foundations | v2.0 | 4/4 | Complete | 2026-03-28 |
| 16. Missing Pages -- Core | v2.0 | 4/4 | Complete | 2026-03-29 |
| 17. Missing Pages -- Operations | v2.0 | 3/3 | Complete | 2026-03-29 |
| 18. Feature Depth -- Records | v2.0 | 4/4 | Complete | 2026-03-29 |
| 19. Feature Depth -- Platform | v2.0 | 4/4 | Complete | 2026-03-29 |
| 20. Business Workflows | v2.0 | 4/4 | Complete | 2026-03-30 |
| 21. Analytics Depth | v2.0 | 4/4 | Complete | 2026-03-30 |
| 22. Testing and Tech Debt | v2.0 | 4/4 | Complete | 2026-03-30 |
| 23. Git Merge + CI/CD Pipeline | v3.0 | 0/? | Not started | - |
| 24. Monitoring + Observability | v3.0 | 2/2 | Complete   | 2026-03-31 |
| 25. Database + Security Hardening | v3.0 | 0/? | Not started | - |
| 26. Assets + Infrastructure | v3.0 | 0/? | Not started | - |
| 27. Documentation | v3.0 | 1/1 | Complete    | 2026-03-31 |
| 28. Fix PR #5 Cron Issues | v3.0 | 2/2 | Complete    | 2026-04-02 |

### Phase 29: Secret Scanning Pipeline

**Goal:** Self-hosted secret scanning on k3s with webhook-triggered + scheduled scans, dashboard, and notifications
**Requirements**: TBD
**Depends on:** Phase 28
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 29 to break down)
