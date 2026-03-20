# Domain Pitfalls

**Domain:** Tattoo studio platform consolidation (two Next.js repos into one)
**Researched:** 2026-03-20

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or extended downtime.

---

### Pitfall 1: Schema Identity Crisis — `uuid()` vs `cuid()` ID Generation

**What goes wrong:** The tattoo-website schema uses `@default(uuid())` for all IDs. The admin schema uses `@default(cuid())`. Both point at the same database. When you consolidate to one schema, you must pick one — but existing rows already have mixed ID formats. Prisma 7 generates IDs at the application level (not database level), so changing the schema `@default()` does not affect existing data. However, any code that validates ID format (regex checks, type guards) will break when encountering the "wrong" format.

**Why it happens:** Each project was developed independently with different Prisma version defaults. Prisma 6 defaulted examples to `cuid()`, while newer Prisma 7 documentation leans toward `uuid()`.

**Consequences:**
- Foreign key lookups work fine (they're just strings), but application-level ID validation breaks
- If you run Better Auth `generate` on the consolidated schema, it may regenerate table expectations with a different ID strategy
- Any client-side code that parses or displays IDs (e.g., URL slugs containing IDs) may have inconsistent formats

**Prevention:**
- Pick `uuid()` for the consolidated schema (aligns with Prisma 7 direction and the more mature public site)
- Audit both codebases for any ID format validation or parsing — search for regex patterns matching UUID or CUID formats
- Do NOT attempt to migrate existing IDs in the database — mixed formats in `String` columns are harmless at the database level
- Set `advanced.database.generateId: false` in Better Auth config (already done in admin) so Prisma controls ID generation, not Better Auth

**Detection:** Search both codebases for `/^c[a-z0-9]{24}$/` (CUID pattern) and UUID regex patterns. Any match is a potential breakpoint.

**Phase:** Schema consolidation (Phase 1)

**Confidence:** HIGH — verified by reading both schema files directly

---

### Pitfall 2: The `accounts` vs `account` Table Name Collision

**What goes wrong:** The tattoo-website maps the Account model to `@@map("accounts")` (plural). The admin maps it to `@@map("account")` (singular). Better Auth expects the singular form (`account`). Since both apps share the same database, one of these mappings reflects the actual table name in production. If the consolidated schema uses the wrong mapping, Better Auth auth flows break silently — sessions appear valid but account lookups fail.

**Why it happens:** The tattoo-website was likely scaffolded from NextAuth patterns (which use plural table names), while the admin was set up using Better Auth's CLI-generated schema (which uses singular names).

**Consequences:**
- Auth completely breaks if the schema mapping doesn't match the actual database table name
- Prisma migrations may attempt to rename the table (destructive) or create a duplicate
- Better Auth's Prisma adapter calls `prisma.account.create()` — this resolves to whatever `@@map` says

**Prevention:**
- Before writing any consolidated schema, check the actual database: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
- Match the `@@map` to whatever the production table is actually called
- If the table is `accounts` (plural), either rename it in a manual migration or use `@@map("accounts")` and configure Better Auth's `modelName` mapping
- Run `npx @better-auth/cli generate` against the consolidated auth config to verify expected table names

**Detection:** Run `\dt` in psql or check the Prisma Studio for actual table names before merging schemas.

**Phase:** Schema consolidation (Phase 1) — this must be resolved before anything else

**Confidence:** HIGH — verified by reading both schema.prisma files; the tattoo-website uses `@@map("accounts")` on line 81, admin uses `@@map("account")` on line 63

---

### Pitfall 3: Admin Session Model Missing `sessionToken` Field

**What goes wrong:** The tattoo-website Session model has both `token` and `sessionToken` fields (both `@unique`). The admin Session model only has `token`. If the consolidated schema drops `sessionToken`, any code in the public site that references it breaks. If you add it to a schema that didn't have it, you need a migration that adds a nullable column or populates it.

**Why it happens:** The tattoo-website was likely updated to match a newer Better Auth schema version that added `sessionToken` as a separate field, while the admin was built against an earlier version.

**Consequences:**
- If `sessionToken` is required (`String @unique`) in the consolidated schema but doesn't exist in the database, Prisma migration fails on the non-null constraint
- Better Auth may use either field depending on version — the wrong choice breaks authentication for all users

**Prevention:**
- Check which field Better Auth actually uses at runtime by inspecting the `better-auth` source code for your pinned version
- Add `sessionToken` as a nullable field initially, then backfill from `token` if needed
- Use the expand-and-contract pattern: add the column, deploy, backfill, then make it required

**Detection:** Compare the Session model fields between schemas side-by-side. Check Better Auth docs for the expected Session schema.

**Phase:** Schema consolidation (Phase 1)

**Confidence:** HIGH — verified by reading both schema files directly

---

### Pitfall 4: Prisma Migration History Conflict on Shared Database

**What goes wrong:** Both projects have independent `prisma/migrations/` directories with different migration histories, but they target the same database. The database has a `_prisma_migrations` table that tracks which migrations have been applied. When you create a new consolidated project and run `prisma migrate dev`, Prisma sees migrations in its folder that don't match the database's migration history and offers to **reset the entire database**.

**Why it happens:** Prisma Migrate tracks migration state per-project. Two projects with different migration folders pointing at the same database create an irreconcilable history. The tattoo-website has migrations starting from `20250531`, the admin from `20250612` — completely different lineages.

**Consequences:**
- Accidentally accepting Prisma's "reset" prompt **deletes all production data**
- Even without resetting, `prisma migrate dev` will error about drift between expected and actual schema
- `prisma migrate deploy` will refuse to run migrations that conflict with the recorded history

**Prevention:**
- NEVER run `prisma migrate dev` against the production database during consolidation
- Start the consolidated project with a **baseline migration**: use `prisma migrate diff` to compare the actual database schema against your new consolidated Prisma schema, generate a single SQL migration file, then use `prisma migrate resolve --applied "baseline"` to mark it as already applied
- Back up the database before any migration work: `pg_dump` the entire database
- Use a separate development database for testing the consolidated schema, not the production one
- Consider `prisma db push` for development iteration, then create proper migrations once the schema is stable

**Detection:** If you see "Prisma Migrate has detected that the migration history has been edited" or "We need to reset the database" — STOP immediately.

**Phase:** Schema consolidation (Phase 1) — this is the highest-risk operation in the entire project

**Confidence:** HIGH — this is a well-documented Prisma behavior ([Prisma docs: Patching & Hotfixing](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing))

---

### Pitfall 5: Prisma 7 Breaking Changes Cascade

**What goes wrong:** The admin runs Prisma 6.10, the public site runs Prisma 7.2. Prisma 7 has significant breaking changes: the `url` property is removed from the `datasource` block (must use `prisma.config.ts` instead), the CLI no longer auto-runs `generate` after migrate, `--skip-generate` and `--skip-seed` flags are removed, seeding no longer auto-runs, and Prisma 7 ships as ESM. Upgrading the admin codebase from 6 to 7 isn't just a version bump — it's a refactor.

**Why it happens:** Prisma 7 is a true major version with real breaking changes, not a minor bump. The admin's `package.json` uses `"prisma": "^6.10.0"` with caret range, so it won't auto-upgrade to 7.

**Consequences:**
- `datasource.url` removal means the admin's `schema.prisma` (which has `url = env("DATABASE_URL")` on line 9) needs to be restructured to use `prisma.config.ts`
- The admin's `postinstall` script (`prisma generate --no-engine`) may behave differently in Prisma 7 ESM mode
- Build scripts like `prisma generate --no-engine && next build` need updating since Prisma 7 changed flag behavior
- Prisma 7 + Next.js 16 Turbopack has a known compatibility issue resulting in "Cannot find module '.prisma/client/default'" errors

**Prevention:**
- Migrate to Prisma 7 as a dedicated step BEFORE the codebase merge, not during
- Create `prisma.config.ts` using the `defineConfig` helper for the consolidated project
- Test the Prisma 7 + Next.js 16 + Turbopack combination in isolation before integrating
- If Turbopack issues arise, fall back to Webpack (`--webpack` flag) until Prisma patches the compatibility
- Pin exact Prisma version (no caret) to avoid surprises

**Detection:** Build failures mentioning `.prisma/client/default`, `prisma.config.ts`, or ESM import errors.

**Phase:** Schema consolidation (Phase 1) — must be resolved before code merge

**Confidence:** HIGH — verified via [Prisma v7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) and [known Next.js 16 Turbopack issue](https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix)

---

### Pitfall 6: Vercel Domain Swap Causes SEO Catastrophe

**What goes wrong:** ink37tattoos.com is live with Google Search Console verification, sitemaps submitted, structured data indexed, and Bing webmaster tools configured. If you create a new Vercel project and move the domain, you can lose: the SSL certificate (brief downtime), all Vercel Analytics history, deployment logs, environment variables, cron job configurations, and — most critically — any SEO signals tied to the old Vercel project's edge config.

**Why it happens:** Moving a domain between Vercel projects is not the same as transferring a project. "Move domain" detaches it from one project and attaches to another. During the gap (even milliseconds on the edge), requests may 404, which Google crawls pick up.

**Consequences:**
- Google Search Console may flag the site as having errors during the transition
- Bing/Yandex webmaster verification files (in `/public/`) must be in the new project's build
- The cron job (`/api/cron/cleanup` at 2 AM daily) stops running if not configured in the new project
- Vercel environment variables (DATABASE_URL, CAL_API_KEY, STRIPE keys, etc.) must be manually recreated

**Prevention:**
- Use Vercel's **Transfer Project** feature instead of Move Domain — this preserves all configuration, deployments, env vars, and domains in one operation
- If Transfer Project isn't available (different team/scope), use the zero-downtime domain migration: add domain to new project first, pre-generate SSL certificate, verify with `curl --resolve`, then remove from old project
- Re-submit sitemaps to Google Search Console immediately after migration
- Verify all environment variables are set BEFORE moving the domain
- Keep the old project alive (don't delete it) for at least 30 days as a rollback option

**Detection:** Monitor Google Search Console for crawl errors in the 48 hours after migration. Check `https://ink37tattoos.com/api/health` endpoint immediately after the switch.

**Phase:** Deployment migration (final phase) — do this LAST, after the consolidated app is fully tested

**Confidence:** HIGH — Vercel's [official zero-downtime guide](https://vercel.com/kb/guide/how-to-move-a-domain-between-vercel-projects-with-zero-downtime) documents this process

---

## Moderate Pitfalls

Mistakes that cause significant rework but not data loss.

---

### Pitfall 7: Customer vs Client Model Semantic Split

**What goes wrong:** The public site has a `Customer` model (booking-centric: name, email, phone, address, allergies, notes). The admin has a `clients` model (clinical-centric: emergency contacts, medical conditions, preferred artist, date of birth). These represent the same real-world entity — a person getting a tattoo — but have different fields, different table names, and different relationship structures. Naively keeping both creates data fragmentation. Merging them wrong loses medical/emergency data.

**Why it happens:** Each app was built for a different audience. The public site needed booking-friendly fields. The admin needed clinical/legal fields (consent, emergency contacts, medical history). Neither developer knew about the other schema's design choices.

**Consequences:**
- Two tables in the database representing the same person — no foreign key linking them
- Admin staff see one set of client data; the booking system sees another
- Future client portal would need to query both tables or pick one — neither is complete
- The `clients` model has `email @unique` and `Customer` has `email @unique` — if the same person exists in both, they can't be linked by email without a migration

**Prevention:**
- Design a single unified `Customer` model that is a superset of both
- Map the consolidated model to whichever table has more production data (likely `clients` since admin manages all clients)
- Write a data migration script to merge records from the other table, matching on email
- Handle conflicts (e.g., same email but different phone numbers) with a "most recent wins" strategy and log conflicts for manual review
- Make clinical fields (emergency contacts, medical conditions) nullable so public-facing bookings don't require them

**Detection:** `SELECT COUNT(*) FROM customer; SELECT COUNT(*) FROM clients;` — if both have data, you need a merge strategy.

**Phase:** Schema consolidation (Phase 1)

**Confidence:** HIGH — verified by reading both schema files; the field overlap is significant but not identical

---

### Pitfall 8: Booking vs Appointment Model Collision

**What goes wrong:** Similar to Pitfall 7 — the public site has `Booking` (includes Cal.com fields: `calBookingUid`, `calEventTypeId`, `calStatus`, `calMeetingUrl`) and the admin has `appointments` (includes session details: `duration`, `type`, `reminderSent`, linked to `tattoo_artists`). The `Booking` model also has inline customer fields (`firstName`, `lastName`, `email`) for unauthenticated booking, while `appointments` requires a `clientId` foreign key.

**Why it happens:** The public booking flow allows anonymous visitors to submit bookings (no account required), while the admin system assumes all appointments are linked to known clients.

**Consequences:**
- Anonymous bookings from the public site can't be linked to admin appointments without a manual matching step
- Cal.com booking data lives only in the `Booking` model — the admin `appointments` model has no Cal.com fields
- Merging these into one table risks losing the Cal.com integration if the wrong fields are dropped
- The admin's `AppointmentStatus` enum has `IN_PROGRESS` which doesn't exist in the public site's `BookingStatus` enum

**Prevention:**
- Create a unified `Booking` model that includes ALL fields from both tables
- Add Cal.com fields to the unified model as nullable (they only exist for Cal-originated bookings)
- Create a migration step that links orphaned bookings to clients by email matching
- Unify the status enums into a superset: `PENDING, CONFIRMED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW`
- Keep inline customer fields (`firstName`, `lastName`, `email`) on the Booking model for the anonymous booking flow, but also have an optional `customerId` FK for linked bookings

**Detection:** Check the enum definitions in both schemas — mismatched values will cause migration errors.

**Phase:** Schema consolidation (Phase 1)

**Confidence:** HIGH — verified by reading both schema files

---

### Pitfall 9: Middleware Collision When Merging

**What goes wrong:** The public site's middleware adds SEO headers (canonical URLs, crawler optimization, security headers) to all non-API routes. The admin's middleware does authentication — checking Better Auth sessions and role verification on `/dashboard` and `/api/admin` routes. When merged into one `middleware.ts` (or `proxy.ts` in Next.js 16), these need to coexist without interfering. The public site middleware runs on EVERY request; the admin middleware only on protected routes. If merged naively, every public page request triggers a database hit for session validation.

**Why it happens:** Middleware in Next.js runs before the route handler. When two apps with fundamentally different middleware purposes merge, the execution model must change from "two separate middlewares" to "one middleware with conditional logic."

**Consequences:**
- Public site performance tanks if every request checks auth (the admin middleware calls `auth.api.getSession()` which hits the database)
- SEO headers get applied to admin routes (harmless but wasteful)
- Auth middleware applied to public routes redirects unauthenticated visitors to login (breaks the entire public site)
- The `config.matcher` patterns from both middlewares may conflict

**Prevention:**
- Design the merged middleware with explicit path-based branching:
  - `/dashboard/*` and `/api/admin/*` routes: run auth middleware
  - All other routes: run SEO/security header middleware only
- Use Next.js 16's route groups to separate concerns: `(public)` and `(dashboard)` groups with different layouts
- Do NOT call `auth.api.getSession()` in the middleware for public routes — use it only for the dashboard matcher
- Consider keeping `middleware.ts` (not migrating to `proxy.ts` yet) since it still works in Next.js 16 and OpenNext doesn't support `proxy.ts` yet

**Detection:** Monitor Time to First Byte (TTFB) on public pages after the merge. If it jumps by >100ms, auth middleware is likely running on public routes.

**Phase:** Codebase merge (Phase 2)

**Confidence:** HIGH — verified by reading both middleware files; the functional conflict is clear

---

### Pitfall 10: Zod 3 vs Zod 4 Coexistence Issues

**What goes wrong:** The admin uses Zod 3 (`"zod": "^3.25.67"`), the public site uses Zod 4 (`"zod": "4.3.4"`). A Zod 3 `ZodType` is not assignable to a Zod 4 `ZodType` — they are fundamentally different types. If you consolidate to one `package.json` with Zod 4, all admin validation schemas must be migrated. Key breaking changes: `.strict()` and `.passthrough()` on objects have been replaced, error customization APIs changed completely, and `.default()` with `.optional()` behaves differently.

**Why it happens:** The public site was built more recently and adopted Zod 4 early. The admin was built earlier with Zod 3. The coexistence strategy (`import from "zod/v3"` vs `"zod/v4"`) only works during transition — you don't want to ship both long-term.

**Consequences:**
- Forms validated with Zod 3 may silently pass invalid data through Zod 4 schemas (or vice versa)
- `react-hook-form` with `@hookform/resolvers` must match the Zod version — the admin uses `@hookform/resolvers ^5.1.1` which may not support Zod 4
- Better Auth's internal validation may depend on the Zod version in `node_modules`
- TypeScript compilation errors when Zod 3 schemas are passed to functions expecting Zod 4 types

**Prevention:**
- Use the `zod-v3-to-v4` codemod to auto-migrate admin schemas
- Migrate to Zod 4 for the consolidated project — don't try to maintain both
- Test all form submissions end-to-end after migration (especially `.default()` + `.optional()` combinations, which changed behavior)
- Pin `@hookform/resolvers` to a version that supports Zod 4
- Check Better Auth compatibility with Zod 4 before consolidating

**Detection:** TypeScript errors mentioning `ZodType`, `ZodSchema`, or "not assignable" when importing schemas across the former boundary.

**Phase:** Codebase merge (Phase 2)

**Confidence:** HIGH — verified via [Zod v4 migration guide](https://zod.dev/v4/changelog) and package.json comparison

---

### Pitfall 11: Stripe Integration Without Idempotency

**What goes wrong:** When adding payment processing (deposits, session payments) to the platform, the most common mistake is not handling webhook replay and network failures. Stripe sends webhooks at least once — if your handler creates a payment record but crashes before returning 200, Stripe retries and you get duplicate payment records. For a tattoo studio taking $200+ deposits, charging a customer twice is a business-ending mistake.

**Why it happens:** The "happy path" works fine in development. Failures only manifest in production under load, network issues, or serverless cold starts where the function times out before completing.

**Consequences:**
- Double charges to customers
- Payment records in the database that don't match Stripe's state
- Refund requests that reference non-existent Stripe charges
- Vercel serverless functions have a 30-second timeout (configured in `vercel.json`) — long-running webhook handlers may be killed mid-execution

**Prevention:**
- Store the Stripe event ID (`evt_xxx`) and use it as an idempotency key — check if the event has already been processed before creating records
- Use database transactions: wrap "create payment + update booking status" in a single `prisma.$transaction()`
- Return 200 to Stripe ASAP, then process asynchronously if needed (though on serverless this is tricky — the function dies after the response)
- Use Stripe's Embedded Checkout (not redirect) to keep users on your domain and reduce abandonment
- Pin the Stripe API version in both dashboard and SDK initialization
- NEVER expose `STRIPE_SECRET_KEY` to the client — only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Detection:** Check the `payment` table for duplicate `stripeId` values. Monitor Stripe dashboard for webhook delivery failures.

**Phase:** Payments integration (Phase 3)

**Confidence:** MEDIUM — based on general Stripe integration best practices and [Stripe + Next.js guides](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/), not verified against this specific codebase

---

### Pitfall 12: Better Auth Role Extension Breaks Existing Admin Access

**What goes wrong:** The admin currently uses Better Auth's admin plugin with a simple role check: `session.user.role !== 'admin'`. The PROJECT.md mentions 5 role levels (USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN), but the actual middleware code only checks for `role === 'admin'`. When you extend this to support client portal accounts (role: USER), any role not literally equal to "admin" gets redirected to `/access-denied`. This means STAFF, MANAGER, and SUPER_ADMIN roles are also locked out.

**Why it happens:** The `requireAdmin` function in auth.ts (line 150-153) doesn't actually check roles — it just calls `requireAuth()`. But the middleware DOES check `role !== 'admin'`. This inconsistency means the role check depends on which code path the request hits.

**Consequences:**
- Adding client accounts with role "user" works, but those users can access the auth system without being able to reach the dashboard (confusing UX)
- SUPER_ADMIN users are locked out of the dashboard (the middleware checks for exactly "admin", not a list of admin roles)
- Better Auth's admin plugin stores roles as comma-separated strings — a user with roles "admin,user" will fail a `!== 'admin'` check because the value is `"admin,user"` not `"admin"`

**Prevention:**
- Refactor the middleware role check to use an admin roles list: `['admin', 'super_admin', 'manager', 'staff'].includes(session.user.role)`
- Better yet, use Better Auth's built-in `createAccessControl` with proper statements for each resource
- Define clear permission boundaries: what can each role do? Document this BEFORE implementing
- Test with all 5 role levels, not just "admin" and "user"
- Be aware that Better Auth stores multiple roles as comma-separated strings — split before comparing

**Detection:** Try logging in as a SUPER_ADMIN user and see if you can access `/dashboard`. Spoiler: you probably can't.

**Phase:** Auth extension (Phase 2 or 3, depending on when client portal ships)

**Confidence:** HIGH — verified by reading the middleware at line 35 (`session.user.role !== 'admin'`) and the auth.ts `requireAdmin` function which has no role check

---

## Minor Pitfalls

Issues that cause friction but are recoverable.

---

### Pitfall 13: Bundle Bloat from Duplicate Dependencies

**What goes wrong:** Both projects use Shadcn/Radix UI components, Framer Motion, TanStack Query, Lucide icons, and date-fns. The admin also brings Recharts, dnd-kit, Zustand, react-hook-form, cmdk, and vaul. The public site brings @calcom/embed-react, Resend, and web-vitals. When combined into one `package.json`, the total dependency count explodes. With multiple root layouts (public vs dashboard), Next.js may duplicate shared dependencies across route group bundles.

**Why it happens:** Next.js uses a heuristic for chunk splitting — modules used in >50% of routes go into the shared bundle. When you merge two apps, the route count changes and this heuristic shifts. Libraries that were neatly isolated to one app may now be pulled into the shared bundle for all routes.

**Consequences:**
- Public site first-load JS increases because admin-only libraries (Recharts, dnd-kit) leak into shared chunks
- Build times increase significantly (the public site already allocates 4GB Node.js heap)
- Vercel has function size limits — serverless functions can't exceed 50MB compressed

**Prevention:**
- Use `next/dynamic` with `ssr: false` for admin-only heavy components (Recharts, dnd-kit, cmdk)
- Configure `optimizePackageImports` in `next.config.ts` for all Radix/Lucide packages (the public site already does this for 20+ packages)
- Use separate root layouts for `(public)` and `(dashboard)` route groups
- Run `@next/bundle-analyzer` after the merge to compare against pre-merge baseline
- Avoid barrel file exports (`index.ts` that re-exports everything) in shared component directories
- Keep admin-specific components in `src/app/(dashboard)/` not in `src/components/` — Next.js tree-shakes by route entry points

**Detection:** Compare First Load JS sizes before and after the merge using the build output table. Any public route showing >100KB first-load JS needs investigation.

**Phase:** Codebase merge (Phase 2) and ongoing optimization

**Confidence:** MEDIUM — based on Next.js bundling heuristics documented in [web.dev article on granular chunking](https://web.dev/articles/granular-chunking-nextjs) and [bundle optimization case study](https://blog.nazrulkabir.com/2026/01/nextjs-bundle-size-optimization-case-study/)

---

### Pitfall 14: Cal.com Embed Breaks in Route Group Layout

**What goes wrong:** The `@calcom/embed-react` package (v1.5.3) has a known issue where it renders an empty div in Next.js App Router contexts, particularly when used within route groups that have their own root layout. The embed relies on DOM manipulation that conflicts with React Server Components hydration.

**Why it happens:** Cal.com's embed-react package uses refs and direct DOM access. When placed inside a route group with a different root layout than the previous page, Next.js does a full page reload — which can interrupt the embed's initialization lifecycle.

**Consequences:**
- The booking page appears blank — users can't book appointments (core business flow broken)
- The embed may work in development but fail in production due to different hydration behavior
- Navigating from a `(public)` route to a booking page in the same group works, but navigating FROM a `(dashboard)` route to a booking page triggers a full reload that may break the embed

**Prevention:**
- Keep all booking-related pages in the same route group as the rest of the public site — don't isolate them
- Use `'use client'` with `dynamic(() => import(...), { ssr: false })` for the Cal.com embed component (the public site already does this pattern)
- Test the booking flow end-to-end after the merge, including navigation FROM dashboard routes
- If the embed breaks, fall back to Cal.com's redirect URL flow as a temporary measure
- Monitor the [GitHub issue](https://github.com/calcom/cal.com/issues/15772) for fixes in newer `@calcom/embed-react` versions

**Detection:** Visit the booking page after merge. If you see an empty `<div>` where the calendar should be, the embed is broken.

**Phase:** Codebase merge (Phase 2) — test immediately after route groups are set up

**Confidence:** MEDIUM — the GitHub issue exists but may be version-dependent; your current v1.5.3 may or may not be affected

---

### Pitfall 15: Next.js 15 to 16 Async API Enforcement

**What goes wrong:** The admin runs Next.js 15.3.8 where `params`, `searchParams`, `cookies()`, and `headers()` can be accessed synchronously (with deprecation warnings). Next.js 16 removes synchronous access entirely — all these must be `await`ed. The admin codebase likely has dozens of places that access these synchronously, since it was built on Next.js 15 where this was the common pattern.

**Why it happens:** Next.js 15 introduced async request APIs but allowed synchronous access as a transitionary measure. Next.js 16 drops the transitionary support. Every page, layout, and API route that uses `params` or `searchParams` needs updating.

**Consequences:**
- Runtime errors on every dynamic page: "params is a Promise, you must await it"
- Build may succeed (TypeScript might not catch all cases), but the app crashes at runtime
- The admin's middleware calls `auth.api.getSession({ headers: request.headers })` — this is fine since middleware's `request.headers` is synchronous, but any Server Component that does `headers()` without await will break

**Prevention:**
- Run the Next.js upgrade codemod: `npx @next/codemod@latest upgrade`
- Search the admin codebase for `(params)` and `(searchParams)` in page/layout function signatures — each needs to become `async` with `await`
- Search for `cookies()` and `headers()` calls — each needs `await`
- Upgrade the admin to Next.js 16 BEFORE the merge (not during), so you can test in isolation

**Detection:** Run `npx next build` with the consolidated Next.js 16 — any synchronous access will error at build time or runtime.

**Phase:** Pre-merge preparation — upgrade admin to Next.js 16 first

**Confidence:** HIGH — verified via [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)

---

### Pitfall 16: Environment Variable Namespace Collision

**What goes wrong:** Both projects use `DATABASE_URL`. Both use `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. But the admin's `BETTER_AUTH_URL` points to `https://admin.ink37tattoos.com/api/auth` while the consolidated app will serve auth from `https://ink37tattoos.com/api/auth`. If old environment variables aren't updated in Vercel, Better Auth generates tokens with the wrong issuer URL, sessions created on the new domain are validated against the old domain, and auth silently fails.

**Why it happens:** Copy-pasting environment variables from the old project to the new one without reviewing each value. The domain change from `admin.ink37tattoos.com` to `ink37tattoos.com` invalidates any env var that contains a URL.

**Consequences:**
- Auth redirects send users to `admin.ink37tattoos.com` (the old domain) instead of the consolidated app
- CSRF validation fails because the origin doesn't match
- Cal.com webhooks still point to the old endpoint URL
- Google OAuth redirect URIs in Google Cloud Console still point to the old domain

**Prevention:**
- Audit EVERY environment variable that contains a URL or domain name
- Update `BETTER_AUTH_URL` to the new consolidated URL
- Update Google OAuth redirect URIs in Google Cloud Console
- Update Cal.com webhook endpoints to point to the new app's API routes
- Update `NEXT_PUBLIC_SITE_URL` (used for sitemap generation)
- Update Stripe webhook endpoint URL in the Stripe dashboard when payments are added
- Keep the old Vercel project running with a redirect to the new domain for at least 30 days

**Detection:** Auth login flow redirects to wrong domain; Google OAuth returns "redirect_uri_mismatch" error.

**Phase:** Deployment migration (final phase)

**Confidence:** HIGH — verified by reading the admin's auth.ts line 44 which hardcodes the URL fallback

---

### Pitfall 17: Admin Models Use snake_case, Public Models Use PascalCase

**What goes wrong:** The admin schema uses snake_case for model names without `@@map`: `appointments`, `audit_logs`, `clients`, `tattoo_artists`, `tattoo_designs`, `tattoo_sessions`, `settings`. The public site uses PascalCase with `@@map`: `Customer` maps to `customer`, `Booking` maps to `booking`, etc. Prisma generates the client API based on the model name — so admin code calls `prisma.appointments.findMany()` while public code calls `prisma.booking.findMany()`. This inconsistency in the consolidated codebase is confusing and error-prone.

**Why it happens:** Different developer conventions. The admin followed a more database-native convention (snake_case table names = snake_case model names). The public site followed Prisma's recommended convention (PascalCase model names with `@@map` to snake_case tables).

**Consequences:**
- Developer confusion — is it `prisma.tattooDesign.findMany()` or `prisma.tattoo_designs.findMany()`?
- IDE autocomplete shows inconsistent naming
- If you standardize to PascalCase models, all admin code using `prisma.appointments.xxx()` must be refactored to `prisma.appointment.xxx()`

**Prevention:**
- Standardize on PascalCase model names with `@@map` to snake_case table names (Prisma's convention)
- Use find-and-replace across the admin codebase to update all Prisma client calls
- Rename models in the schema but keep `@@map` pointing to the existing table names to avoid database changes
- Example: `model Appointment { ... @@map("appointments") }` preserves the table but gives you `prisma.appointment.findMany()`

**Detection:** TypeScript errors after schema consolidation — any reference to the old model name will fail to compile.

**Phase:** Schema consolidation (Phase 1)

**Confidence:** HIGH — verified by reading both schema files

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Schema Consolidation** | Migration history conflict on shared DB (Pitfall 4) | Use baseline migration with `prisma migrate diff` + `resolve --applied` |
| **Schema Consolidation** | Table name mismatches — `accounts` vs `account` (Pitfall 2) | Query actual DB table names first |
| **Schema Consolidation** | Customer/Client and Booking/Appointment model merge (Pitfalls 7, 8) | Design superset models, write data migration scripts |
| **Schema Consolidation** | Prisma 7 breaking changes (Pitfall 5) | Upgrade Prisma 6 to 7 in isolation first |
| **Pre-merge Preparation** | Next.js 15 to 16 async APIs (Pitfall 15) | Upgrade admin to NX 16 before merging |
| **Codebase Merge** | Middleware collision (Pitfall 9) | Path-based branching in single middleware |
| **Codebase Merge** | Zod 3/4 type incompatibility (Pitfall 10) | Run zod-v3-to-v4 codemod on admin schemas |
| **Codebase Merge** | Bundle size explosion (Pitfall 13) | Dynamic imports for admin-only libraries; bundle analysis |
| **Codebase Merge** | Cal.com embed breakage (Pitfall 14) | Keep booking pages in same route group; test immediately |
| **Auth Extension** | Role check breaks SUPER_ADMIN access (Pitfall 12) | Refactor to role list check before adding new roles |
| **Payments** | Webhook idempotency failures (Pitfall 11) | Store Stripe event IDs, use DB transactions |
| **Deployment** | Domain swap SEO/config loss (Pitfall 6) | Use Transfer Project, not Move Domain |
| **Deployment** | Environment variable domain mismatch (Pitfall 16) | Audit every URL-containing env var |

---

## Sources

### Official Documentation
- [Prisma ORM v7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma Migrate: Patching & Hotfixing](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing)
- [Prisma Migrate: Squashing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/squashing-migrations)
- [Prisma + Better Auth Guide](https://www.prisma.io/docs/guides/betterauth-nextjs)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling)
- [Vercel: Zero-Downtime Domain Migration](https://vercel.com/kb/guide/how-to-move-a-domain-between-vercel-projects-with-zero-downtime)
- [Vercel: Transferring Projects](https://vercel.com/docs/projects/transferring-projects)
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog)
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin)
- [Better Auth Organization Plugin](https://better-auth.com/docs/plugins/organization)
- [Cal.com Webhook Docs](https://cal.com/docs/developing/guides/automation/webhooks)

### Issue Trackers & Discussions
- [Better Auth: Config/Prisma Schema Mismatch (GitHub #1414)](https://github.com/better-auth/better-auth/issues/1414)
- [Better Auth: Dynamic Roles Request (GitHub #4557)](https://github.com/better-auth/better-auth/issues/4557)
- [Prisma 7 Breaking Changes Discussion (GitHub #28573)](https://github.com/prisma/prisma/issues/28573)
- [Prisma v7 + Next.js 16 Turbopack Fix](https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix)
- [Cal.com Embed in App Router (GitHub #15772)](https://github.com/calcom/cal.com/issues/15772)
- [Zod 4 Coexistence Issues (GitHub #4923)](https://github.com/colinhacks/zod/issues/4923)
- [Cal.com Next.js Migration Case Study (Codemod)](https://codemod.com/blog/cal-next-migration)

### Community & Guides
- [Stripe + Next.js Complete Guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)
- [Next.js Bundle Optimization Case Study](https://blog.nazrulkabir.com/2026/01/nextjs-bundle-size-optimization-case-study/)
- [Granular Chunking in Next.js (web.dev)](https://web.dev/articles/granular-chunking-nextjs)
- [zod-v3-to-v4 Codemod](https://github.com/nicoespeon/zod-v3-to-v4)
