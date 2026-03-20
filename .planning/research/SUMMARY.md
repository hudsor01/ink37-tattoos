# Project Research Summary

**Project:** Ink37 Tattoos -- Unified Tattoo Studio Platform
**Domain:** Single-studio tattoo platform (public site + admin dashboard + client portal + store)
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

Ink37 Tattoos is a consolidation of two existing Next.js applications -- a public-facing tattoo studio website and an admin dashboard -- into a single unified platform. The expert approach for this class of project is a single Next.js application using route groups to isolate distinct user experiences (public, admin, client portal, store) while sharing authentication, database, and UI primitives. The recommended stack stays close to what already works: Next.js 16, Prisma 7, Better Auth, Zustand + TanStack Query, Stripe for payments, and Neon PostgreSQL -- avoiding unnecessary migrations (particularly Prisma to Drizzle) where the cost outweighs the benefit.

The most critical work is the foundation: merging two independent Prisma schemas that target the same database, upgrading the admin from Next.js 15/Prisma 6 to Next.js 16/Prisma 7, and establishing a Data Access Layer as the authoritative security boundary (not middleware, per CVE-2025-29927 lessons). The schema merge is the highest-risk operation in the entire project -- both schemas have conflicting table names (`accounts` vs `account`), different ID strategies (`uuid` vs `cuid`), different model naming conventions, and independent migration histories that could trigger a destructive database reset if mishandled.

The feature roadmap follows a clear dependency chain: foundation and schema merge first, then public site and admin dashboard reconstruction, then Stripe payment integration, then the client portal (the primary differentiator), and finally the online store and retention features. The client portal is what justifies a custom-built platform over off-the-shelf tattoo SaaS like Porter ($79-249/mo) -- most competitors lack a true client-facing self-service experience. Gift cards, flash sheet management, and email marketing are revenue-expanding features that belong in later phases.

## Key Findings

### Recommended Stack

The stack is high-confidence because most technologies are already in production across the two existing projects. The key decisions are what to keep, what to upgrade, and what NOT to migrate.

**Core technologies:**
- **Next.js 16.2 + React 19.2:** App framework -- already in use, Turbopack default, React Compiler stable. Admin needs major version upgrade from 15.3.
- **Prisma 7.5 + Neon PostgreSQL:** ORM and database -- keep Prisma (do NOT migrate to Drizzle; ~21h migration cost unjustified). Neon over Supabase for native Vercel integration, scale-to-zero, and database branching. ~$10-25/mo production cost.
- **Better Auth 1.5:** Authentication -- already implemented with 5-level RBAC. Upgrade from 1.2.9 to 1.5.5 during consolidation.
- **Stripe:** Payments -- deposits via Checkout Sessions, session payments, store checkout, gift cards all through one integration. Custom build with Stripe Products replaces the need for Medusa/Shopify for a <50 product catalog.
- **Zustand + TanStack Query:** State management -- proven combo, no change needed. TanStack Query for server state, Zustand for client state.
- **Zod 4.3:** Validation -- admin needs migration from Zod 3 using `zod-v3-to-v4` codemod.
- **Tailwind 4.1 + shadcn/ui + Motion:** Styling and animation -- already in use in both projects. De-duplicate shadcn components during merge.

**Highest-risk upgrades:** Admin Prisma 6.10 to 7.5 and Next.js 15.3 to 16.2. Do these before feature work.

### Expected Features

**Must have (table stakes):**
- Portfolio gallery with style/placement filtering (transforms archive into sales tool)
- Online booking with deposit collection (Cal.com + Stripe, partially built)
- Booking intake forms with reference image uploads (Vercel Blob)
- Digital consent/waiver forms with e-signature (legal requirement)
- Automated appointment reminders with prep instructions
- Client profiles with tattoo history, medical info, preferences
- Dashboard with tattoo-specific KPIs (revenue per session, no-show rate, booking conversion)
- Payment processing for full session completion (Stripe)
- Auth with 5-level RBAC (already built)

**Should have (differentiators):**
- Client portal -- self-service appointments, designs, aftercare, consent (core differentiator vs. competitors)
- Aftercare tracking with healed photo requests at 2-week and 6-week marks
- Design approval workflow within the portal (eliminates Instagram DM back-and-forth)
- Flash sheet management with flash drops and waitlist notification
- Gift card system (nearly universal across tattoo studio websites)
- Online store for merch and prints (passive revenue)
- Review/testimonial collection with automated post-session requests

**Defer (v2+):**
- Email marketing campaigns, waitlist management, loyalty program, smart gallery curation
- Never build: multi-artist marketplace, real-time chat, AI design generation, inventory management, dynamic pricing

### Architecture Approach

A single Next.js application with five route groups -- `(public)`, `(auth)`, `(dashboard)`, `(portal)`, `(store)` -- each with independent layouts, sharing a unified Prisma schema, a Data Access Layer that enforces all authorization, and Better Auth serving all user types. Server Actions handle mutations; Route Handlers serve webhooks and external integrations. Middleware is thin (cookie presence check and redirects only, never authoritative security).

**Major components:**
1. **Route groups** -- isolate public/admin/portal/store UX with separate layouts, shared root providers
2. **Data Access Layer (DAL)** -- THE security boundary; every function checks session + role before touching the database; imports `'server-only'`
3. **Unified Prisma schema** -- superset merge of both existing schemas with PascalCase models, `@@map` to snake_case tables, `uuid()` IDs
4. **Better Auth** -- single auth system serving all user types; USER role for clients, STAFF+ for admin
5. **Stripe integration** -- webhooks for deposits, session payments, store checkout, gift cards; idempotent event processing
6. **Vercel Blob storage** -- gallery images, reference uploads, design files, product images; served via `next/image` optimization

### Critical Pitfalls

1. **Prisma migration history conflict (Pitfall 4)** -- Two independent migration histories targeting the same database. Running `prisma migrate dev` on the consolidated schema could trigger a full database reset. Use baseline migration with `prisma migrate diff` + `resolve --applied`. NEVER run `prisma migrate dev` against production.
2. **Table name collision: `accounts` vs `account` (Pitfall 2)** -- Better Auth expects singular; public site maps to plural. Query the actual database table names before writing the consolidated schema. Wrong mapping silently breaks all auth flows.
3. **Prisma 7 breaking changes (Pitfall 5)** -- `datasource.url` removed (use `prisma.config.ts`), ESM-only, Turbopack compatibility issue. Upgrade admin from Prisma 6 to 7 in isolation before merging codebases.
4. **Customer/Client and Booking/Appointment model merge (Pitfalls 7, 8)** -- Same real-world entities split across two tables with different fields and naming. Design superset models, write data migration scripts matching on email.
5. **Vercel domain swap SEO loss (Pitfall 6)** -- Use Transfer Project (not Move Domain) to preserve all configuration. Do this last, after the consolidated app is fully tested.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation -- Schema Consolidation and Project Scaffold
**Rationale:** Everything depends on the unified schema and project structure. The schema merge is the highest-risk operation and must be validated before any feature work begins.
**Delivers:** Consolidated Next.js 16 project with unified Prisma 7 schema, Better Auth 1.5 configuration, DAL skeleton, route group structure, and baseline migration applied to production database.
**Addresses:** Schema merge, version alignment (Next.js 16, Prisma 7, Zod 4, Better Auth 1.5), project scaffolding.
**Avoids:** Migration history conflict (Pitfall 4), table name collision (Pitfall 2), Prisma 7 breaking changes (Pitfall 5), ID strategy mismatch (Pitfall 1), model naming inconsistency (Pitfall 17).

### Phase 2: Public Site Reconstruction
**Rationale:** The public site is the revenue-generating face of the business. It must be fully functional before admin or portal work begins. Includes core table-stakes enhancements.
**Delivers:** Complete public site with gallery filtering, enhanced booking intake with reference uploads, digital consent forms, SEO infrastructure, contact form.
**Addresses:** Gallery filtering, booking intake forms, consent/waiver forms, media tagging, SEO, mobile responsiveness.
**Avoids:** Cal.com embed breakage (Pitfall 14), middleware collision (Pitfall 9), bundle bloat (Pitfall 13).

### Phase 3: Admin Dashboard Reconstruction
**Rationale:** Depends on foundation (schema, DAL, auth) being stable. Reconstruct the admin experience within the `(dashboard)` route group using the unified DAL.
**Delivers:** Full admin dashboard with customer management, appointment management, session tracking, media management, analytics/KPIs, settings.
**Addresses:** Dashboard KPIs, session tracking, payment recording, media management, analytics, settings.
**Avoids:** Role check breakage (Pitfall 12), Zod 3/4 incompatibility (Pitfall 10).

### Phase 4: Payments Integration (Stripe)
**Rationale:** Depends on foundation (schema) and dashboard (admin UI for viewing payments). Stripe integration touches both public (checkout) and admin (reporting) surfaces.
**Delivers:** Deposit collection at booking, session payment processing, Stripe webhook handling, payment history in admin.
**Addresses:** Deposit collection, session payments, payment processing table stakes.
**Avoids:** Webhook idempotency failures (Pitfall 11) -- store Stripe event IDs, use database transactions.

### Phase 5: Client Portal
**Rationale:** The primary differentiator. Depends on auth (USER role), customer records, appointment data, and payment history all being in place. This is what justifies a custom platform over off-the-shelf SaaS.
**Delivers:** Client self-service portal with appointment history, upcoming bookings, consent form status, aftercare instructions, design approval workflow.
**Addresses:** Client portal, aftercare tracking, design approval, review/testimonial collection.
**Avoids:** Role extension breakage (Pitfall 12) -- refactor role checks to support USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN before launch.

### Phase 6: Online Store and Revenue Expansion
**Rationale:** Depends on Stripe integration (Phase 4) being stable. Store is a revenue add-on, not core functionality.
**Delivers:** Product catalog, cart, Stripe Embedded Checkout, gift card system, flash sheet management with flash drops.
**Addresses:** Gift cards, online store, flash sheet management.
**Avoids:** Over-engineering -- custom build with Stripe Products, no Medusa/Shopify needed for <50 products.

### Phase 7: Retention, Marketing, and Deployment
**Rationale:** Growth features that layer on top of the complete platform. Deployment migration (domain swap) happens here when everything is tested and stable.
**Delivers:** Email marketing campaigns, waitlist management, loyalty program, smart gallery curation, production deployment with domain migration.
**Addresses:** Email marketing, waitlist, loyalty, gallery enhancements, production cutover.
**Avoids:** Domain swap SEO catastrophe (Pitfall 6), environment variable mismatch (Pitfall 16).

### Phase Ordering Rationale

- **Foundation first** because every other phase depends on the unified schema, DAL, and auth system. The schema merge is also the riskiest operation -- doing it first means catching data issues before building features on top.
- **Public site before admin** because the public site generates revenue (bookings). If the consolidation stalls, the public site must be functional.
- **Payments before portal** because the portal needs to display payment history, and Stripe webhook infrastructure must be tested before client-facing features depend on it.
- **Portal before store** because the portal is the primary differentiator and touches more of the system (auth, appointments, designs, aftercare). The store is simpler and more isolated.
- **Deployment last** because domain migration is irreversible in practice, and everything must be tested before the cutover.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Foundation):** Schema merge is project-specific -- needs hands-on inspection of the actual production database tables, column types, and data before writing migration scripts. No generic guide covers this.
- **Phase 4 (Payments):** Stripe deposit-to-session payment flow with Cal.com integration needs API-level research -- how Cal.com's Stripe integration interacts with custom Stripe Checkout Sessions.
- **Phase 5 (Client Portal):** Customer-User linking pattern (existing customers claim portal accounts) needs careful design -- edge cases around duplicate emails, pre-existing records, and data ownership scoping.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Public Site):** Well-documented Next.js App Router patterns. Gallery, forms, SEO are standard.
- **Phase 3 (Admin Dashboard):** Existing admin is being reconstructed, not designed from scratch. Patterns are established.
- **Phase 6 (Store):** Stripe Products + Embedded Checkout is a well-documented pattern. The "Your Next Store" template provides a reference implementation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies already in production across the two projects. Decisions are "keep and upgrade" not "evaluate and choose." Official docs and version-specific guides consulted. |
| Features | MEDIUM-HIGH | Based on competitor analysis (Porter, Venue Ink, TattooPro, Tattoogenda) and industry guides. Feature prioritization is informed by domain research, but actual user validation has not occurred. |
| Architecture | HIGH | Route groups, DAL pattern, Server Components data fetching are all officially recommended Next.js patterns. CVE-2025-29927 provides concrete evidence for DAL-over-middleware approach. |
| Pitfalls | HIGH | 17 pitfalls identified, most verified by reading the actual schema files and source code from both projects. Migration history conflicts and table name collisions are provably present. |

**Overall confidence:** HIGH

### Gaps to Address

- **Actual database state:** The schema files show what SHOULD be in the database, but the actual table names, column types, and data need verification by querying the production database directly before writing migration scripts.
- **Cal.com + Stripe deposit interaction:** How Cal.com's built-in Stripe payment integration coexists with custom Stripe Checkout Sessions for deposits. May need to disable Cal.com's payment and handle deposits entirely through custom code.
- **Better Auth 1.2.9 to 1.5.5 migration:** The upgrade guide exists but breaking changes between minor versions need validation against the specific plugins and configuration in use.
- **Prisma 7 + Next.js 16 Turbopack compatibility:** Known issue documented but may be resolved by the time implementation begins. Needs testing in isolation.
- **Flash sheet/flash drop UX patterns:** Limited reference implementations in the tattoo domain. Flashbook.ink is the closest reference but is a SaaS, not open source.

## Sources

### Primary (HIGH confidence)
- Prisma v7 Upgrade Guide -- breaking changes, migration path, ESM requirements
- Next.js 16 Upgrade Guide -- async API enforcement, Turbopack default
- Next.js Data Security Guide -- DAL pattern, middleware limitations
- Better Auth Official Docs -- RBAC, admin plugin, Prisma adapter
- Stripe + Next.js Integration Guides -- Embedded Checkout, webhooks, Server Actions
- Neon PostgreSQL Docs -- Vercel integration, serverless driver, pricing
- Zod v4 Migration Guide -- breaking changes, codemod

### Secondary (MEDIUM confidence)
- Competitor analysis (Porter, Venue Ink, TattooPro, Tattoogenda, Anolla) -- feature landscape
- Community guides (MakerKit, DesignRevision, DEV.to) -- architecture patterns, stack comparisons
- Bundle optimization case studies -- chunking heuristics, dynamic import strategies

### Tertiary (LOW confidence)
- Cal.com embed-react App Router compatibility -- GitHub issue, version-dependent
- Prisma 7 + Turbopack fix -- community blog post, may be outdated by implementation time
- Tattoo industry KPI benchmarks -- general industry sources, not verified for single-studio context

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
