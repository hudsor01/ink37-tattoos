# Technology Stack

**Project:** Ink37 Tattoos — Unified Tattoo Studio Platform
**Researched:** 2026-03-20
**Overall Confidence:** HIGH

---

## Executive Summary

This stack recommendation consolidates two existing Next.js projects into one. The guiding principles are: (1) stay on Vercel with its deepest integrations, (2) favor lightweight, serverless-native tools over heavy abstractions, (3) avoid unnecessary migration risk where the current tool is working well, and (4) choose tools that cover both the admin dashboard and future client portal without added complexity.

**The headline decisions:**
- **Keep Prisma 7** (not Drizzle) — migration cost outweighs marginal performance gains for this project
- **Use Neon** (not Supabase) — deeper Vercel integration, better serverless economics, branching for previews
- **Stripe** (not Square) — custom Next.js integration, deposits via Checkout Sessions, store via Stripe Products
- **Custom store** (not Medusa/Shopify) — small catalog (merch, prints, gift cards) does not justify a separate commerce backend
- **Keep Better Auth** — already implemented with RBAC, now at v1.5 with even more features
- **Keep Zustand + TanStack Query** — proven combo, no reason to change

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.2.x | App framework | Already in use; Turbopack stable + default, React Compiler support, Adapters API stable. Both source projects run Next.js. Upgrade admin from 15.3.8 to 16.2.x during consolidation. | HIGH |
| React | 19.2.x | UI library | Already in use; View Transitions, `useEffectEvent`, `<Activity />` component. Align both projects to 19.2.x. | HIGH |
| TypeScript | 5.7+ | Type safety | Required by Prisma 7 (>=5.4), beneficial everywhere. | HIGH |

**Rationale:** Next.js 16.2 is the latest stable (March 2026). Turbopack is now the default bundler for both dev and build. The React Compiler (stable in 16.x) automatically memoizes components. Breaking changes to note: AMP removed, `next lint` removed (use ESLint/Biome directly), PPR experimental flag removed.

### ORM & Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Prisma | 7.5.0 | ORM | See detailed analysis below | HIGH |
| Neon PostgreSQL | Latest | Database provider | See detailed analysis below | HIGH |
| Prisma Accelerate | Latest | Connection pooling + caching | Already in use; handles connection pooling for serverless, global edge caching | HIGH |

#### Decision: Prisma 7 over Drizzle ORM

**Recommendation: Stay with Prisma 7. Do not migrate to Drizzle.**

The case for Drizzle is real: smaller bundle (~7.4kb vs ~1MB), faster cold starts (~600ms vs ~1.5s), SQL-level control, no code generation step. In a greenfield project with no existing code, Drizzle would be a strong contender.

But this is not greenfield. The migration cost dominates:

1. **Two existing Prisma schemas** must be merged. That is already a significant task. Adding an ORM migration on top doubles the risk and timeline.
2. **Prisma 7 closed the performance gap significantly.** The Rust engine is gone; the client is now pure TypeScript/WASM. Edge deployment works. The old "Prisma is slow on serverless" argument is largely neutralized.
3. **Migration effort is ~21 hours** per community reports, plus manual relation definitions. For a project with customer data, appointments, sessions, medical info, consent records, and audit logs, the schema is non-trivial.
4. **Prisma Accelerate is already integrated.** This handles connection pooling and global caching, which mitigates Prisma's remaining cold-start overhead.
5. **Prisma Migrate is battle-tested** for production schema evolution. Drizzle Kit covers ~95% of cases but is less mature for complex migrations.

**Where Drizzle would win:** If this were a new project, or if Prisma Accelerate were not in the picture, or if edge function performance were the primary concern. None of those apply here.

**Risk to monitor:** If Prisma's bundle size or cold-start time causes measurable issues after consolidation, revisit this decision. Drizzle can be adopted incrementally (new features only) without migrating existing code.

#### Decision: Neon over Supabase

**Recommendation: Use Neon PostgreSQL.**

| Factor | Neon | Supabase | Winner |
|--------|------|----------|--------|
| Vercel integration | Native marketplace integration, preview branch per deployment | Works but not native | Neon |
| Serverless driver | `@neondatabase/serverless` — HTTP + WebSocket, edge-native | PgBouncer connection pooling | Neon |
| Scale-to-zero | Yes (5-min idle), saves money for low-traffic periods | Compute always on | Neon |
| Database branching | Instant copy-on-write branches for preview deployments | Available but less integrated | Neon |
| Auth built-in | No (use Better Auth) | Yes, but we already have Better Auth | Neutral |
| Realtime | No | Yes, but not needed | Neutral |
| Storage | No (use Vercel Blob) | Yes, but we already use Vercel Blob | Neutral |
| Pricing (production) | Launch plan: $5/mo min, $0.106/CU-hour, $0.30/GB-month | Pro: $25/mo base | Neon |
| Post-acquisition stability | Acquired by Databricks (2025), prices dropped 15-25% | Independent, acquired OrioleDB | Slight concern |

**Why not Supabase:** Supabase's value proposition is "full backend platform" — auth, storage, realtime, edge functions bundled together. But Ink37 already has Better Auth, Vercel Blob, and no realtime needs. Paying for Supabase means paying for features you will not use.

**Why Neon:** Vercel Postgres *is* Neon. The native integration means preview deployments automatically get database branches. Scale-to-zero means you pay nothing during overnight hours when a tattoo studio is closed. The serverless HTTP driver works natively in Vercel Edge Functions.

**Connection setup:** Use Prisma with Neon via Prisma Accelerate (already configured). Prisma Accelerate handles connection pooling, which is critical since Neon's serverless compute scales up/down.

**Pricing estimate for Ink37:**
- Launch plan at $5/mo minimum
- A single-studio tattoo shop will likely use 50-200 CU-hours/month (~$5-21/mo compute)
- 1-5 GB storage (~$0.30-1.50/mo)
- **Total: ~$10-25/mo** for production database

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Better Auth | 1.5.5 | Auth framework | Already implemented with RBAC. v1.5 adds OAuth provider capabilities, MCP support. 5 role levels already configured. | HIGH |

**Decision: Keep Better Auth. Do not switch.**

Better Auth v1.5 (released Feb 2026) is a major upgrade from the v1.2.9 currently in the admin project:
- 70 new features, 200 bug fixes
- OAuth 2.1 authorization server (`@better-auth/oauth-provider`)
- Organization plugin for team management
- ESM-only (aligns with Prisma 7 ESM-only)

For the client portal, Better Auth's existing USER role handles client accounts. The RBAC system already distinguishes USER / STAFF / MANAGER / ADMIN / SUPER_ADMIN. Clients sign up as USER, studio staff get elevated roles. No additional auth framework needed.

**Upgrade path:** v1.2.9 -> v1.5.5 during consolidation. Review migration guide for breaking changes between 1.2 and 1.5.

### Payment Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Stripe | SDK v20.4.1 | Payments | See analysis below | HIGH |
| @stripe/stripe-js | Latest | Client-side Stripe | Embedded Checkout, Payment Element | HIGH |

**Decision: Stripe over Square.**

| Factor | Stripe | Square | Winner |
|--------|--------|--------|--------|
| Custom Next.js integration | Excellent — Embedded Checkout, Server Actions, webhooks | Limited — primarily POS-focused | Stripe |
| Developer API quality | Industry-leading docs, TypeScript SDK | Good but less flexible | Stripe |
| Deposit handling | Checkout Sessions with metadata, partial captures | Built-in appointment deposits | Stripe |
| Online store | Stripe Products + Checkout = complete e-commerce | Square Online (separate platform) | Stripe |
| Gift cards | Native product type in Stripe | Supported | Tie |
| In-person payments | Stripe Terminal (additional hardware) | Free card reader, excellent POS | Square |
| Refund fees | Keeps processing fees on refund | Returns processing fees on refund | Square |
| Pricing | 2.9% + $0.30 online | 2.9% + $0.30 online | Tie |

**Why Stripe wins for Ink37:** This is a custom-built platform, not a POS system. Stripe's developer-first approach integrates naturally with Next.js Server Actions and the App Router. Deposits are handled as Checkout Sessions with custom metadata (appointment ID, deposit amount, cancellation policy). The online store uses Stripe Products with Embedded Checkout. Gift cards are just another product type.

**Square's one advantage** — refunding processing fees — is not significant enough to justify worse developer integration. If the studio wants in-person payments, Stripe Terminal hardware can be added later.

**Implementation approach:**
- **Deposits:** Stripe Checkout Session with `payment_intent_data.capture_method: 'automatic'`, custom metadata linking to appointment
- **Session payments:** Stripe Checkout or Payment Links
- **Store:** Stripe Products + Embedded Checkout
- **Gift cards:** Stripe Products with delivery via email
- **Webhooks:** `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded` handled in Next.js API routes

### E-Commerce Approach

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom build + Stripe Products | N/A | Online store | See analysis below | MEDIUM |

**Decision: Custom build with Stripe as the commerce backend. No Medusa, no Shopify.**

**Why not Medusa:** Medusa is a full headless commerce engine requiring its own Node.js + PostgreSQL backend. For a tattoo studio selling ~10-50 products (t-shirts, prints, gift cards), this is massive overkill. It adds a second server to deploy, maintain, and monitor. The operational overhead is not justified.

**Why not headless Shopify:** Adds a $39+/mo subscription, a separate admin interface, and API complexity for a simple catalog. The studio owner would manage products in two places (Shopify admin + Ink37 admin).

**Why not Saleor:** Same problem as Medusa — enterprise headless commerce for a small merch shop.

**The right approach:** Store product data in the existing PostgreSQL database (Prisma models for `Product`, `ProductVariant`, `Order`, `OrderItem`). Use Stripe Products as the payment backend. The admin dashboard manages the catalog. The public site renders products using Server Components. Checkout goes through Stripe Embedded Checkout.

This keeps everything in one app, one database, one admin interface. For <50 products, this is the pragmatic choice.

**Risk:** If the store grows significantly (100+ products, complex inventory, wholesale), revisit this decision. At that scale, Medusa or Shopify Lite becomes worth the overhead.

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Query | 5.91.x | Server state | Caching, background refetching, mutations, optimistic updates | HIGH |
| Zustand | Latest | Client state | UI toggles, preferences, cart state, form wizards | HIGH |

**Decision: Keep both. They solve different problems.**

- **TanStack Query** = server state (API data, caching, deduplication, background sync)
- **Zustand** = client state (UI toggles, cart contents, form wizard steps, user preferences)

This is the recommended "dynamic duo" pattern for Next.js App Router in 2026. Do not collapse them into one tool. Do not add Redux. Do not store server data in Zustand (common mistake that creates sync bugs).

**With Server Components:** Use TanStack Query's `prefetchQuery()` in Server Components + `HydrationBoundary` pattern for initial data. Client components use `useQuery`/`useMutation` as normal. Teams report 40-70% faster initial loads with this pattern.

### Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zod | 4.3.x | Schema validation | Already in use (v4 in public, v3 in admin). Unify on Zod 4. 10x faster TS compilation, 57% smaller bundle. | HIGH |

**Migration note:** Zod 4 has breaking changes in error customization APIs and object schema methods. The public site already uses Zod 4; the admin site needs upgrading from Zod 3. Use the `zod-v3-to-v4` codemod to assist migration. Zod 4 supports incremental adoption via `"zod/v4"` subpath.

### Styling & UI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.1.x | Utility-first CSS | Already in use. CSS-first config (no `tailwind.config.js`), Oxide engine (Rust), smaller output. | HIGH |
| shadcn/ui | Latest | Component library | Already in use in both projects. Now fully supports Tailwind v4, React 19. `tw-animate-css` replaces `tailwindcss-animate`. | HIGH |
| Motion (framer-motion) | 12.36.x | Animations | Already in use. Rebranded from Framer Motion. Import from `motion/react`. React 19 compatible. | HIGH |

**De-duplication note:** Both projects use shadcn/ui. During consolidation, audit all `src/components/ui/` directories. Keep one canonical set. shadcn/ui components are copy-paste, so conflicts are possible if customizations diverged.

### Charts & Analytics

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Recharts | 3.6.x | Dashboard charts | Already in admin project. shadcn/ui's Chart component is built on Recharts. Keep it. | HIGH |

**Why not Tremor:** Tremor is built *on top of* Recharts. Adding it would be a wrapper around what you already have. shadcn/ui's `<Chart>` component provides the same DX advantage (pre-styled, themed, dark mode) without adding another dependency.

### Existing Integrations (Keep As-Is)

| Technology | Purpose | Notes |
|------------|---------|-------|
| Cal.com | Booking | Core business flow. Preserve existing integration. |
| Resend | Email | Contact form notifications, booking confirmations. Keep. |
| Vercel Blob | File storage | Media uploads (portfolio, tattoo photos). Keep. |
| Vercel Analytics | Web analytics | Already integrated. Keep. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Prisma 7 | Drizzle 0.45 | Migration cost (~21h+), two schemas to merge first, Prisma Accelerate already handles perf |
| Database | Neon | Supabase | Paying for unused features (auth, realtime, storage), less native Vercel integration |
| Database | Neon | Vercel Postgres | Vercel Postgres IS Neon now; go direct for better pricing and features |
| Payments | Stripe | Square | Worse developer API, POS-focused, this is a custom web app |
| E-commerce | Custom + Stripe | Medusa 2.x | Overkill — separate backend for <50 products |
| E-commerce | Custom + Stripe | Shopify Headless | $39+/mo subscription, split admin, API overhead for small catalog |
| E-commerce | Custom + Stripe | Saleor | Enterprise-grade, massive overhead for merch shop |
| Auth | Better Auth 1.5 | Auth.js (NextAuth) | Better Auth already implemented with RBAC, more features out of box |
| Auth | Better Auth 1.5 | Clerk | Managed service cost ($25+/mo), vendor lock-in, Better Auth already working |
| State | Zustand + TQ | Redux Toolkit | Overkill for this app size, Zustand is simpler |
| State | Zustand + TQ | Jotai | Zustand already in use, no compelling reason to switch |
| Charts | Recharts | Tremor | Tremor wraps Recharts; shadcn/ui Chart already provides styled Recharts |
| Animation | Motion | None | Already in use, provides value for portfolio/gallery UX |

---

## Version Alignment Matrix

Both source projects need version alignment during consolidation:

| Package | Public Site | Admin Site | Target |
|---------|-------------|------------|--------|
| Next.js | 16.1.1 | 15.3.8 | 16.2.x |
| React | 19.2.3 | 19.1.0 | 19.2.x |
| Prisma | 7.2.0 | 6.10.0 | 7.5.0 |
| Zod | 4.x | 3.x | 4.3.x |
| Better Auth | -- | 1.2.9 | 1.5.5 |
| TanStack Query | 5.x | 5.x | 5.91.x |
| Tailwind CSS | 4.x | 4.x | 4.1.x |
| Motion | 12.x | 12.x | 12.36.x |

**Highest risk upgrade:** Admin site Prisma 6.10 -> 7.5 and Next.js 15.3 -> 16.2. These are major version jumps with breaking changes. Do them before feature work.

---

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest

# ORM + Database
npm install prisma@latest @prisma/client@latest
npm install -D prisma

# Auth
npm install better-auth@latest

# Payments
npm install stripe@latest @stripe/stripe-js@latest

# State management
npm install @tanstack/react-query@latest @tanstack/react-query-devtools@latest
npm install zustand@latest

# Validation
npm install zod@latest

# Styling
npm install tailwindcss@latest @tailwindcss/postcss@latest
npm install tw-animate-css
npm install motion@latest

# Charts
npm install recharts@latest

# Existing integrations
npm install resend@latest
npm install @vercel/blob@latest @vercel/analytics@latest

# Dev dependencies
npm install -D typescript@latest @types/react@latest @types/node@latest
npm install -D drizzle-kit  # Only if using Drizzle Studio for DB browsing
```

---

## Architecture Notes for Stack

### Prisma + Neon on Vercel

```
Browser -> Vercel Edge/Serverless -> Prisma Client (TypeScript/WASM)
                                        |
                                        v
                                   Prisma Accelerate (connection pool + cache)
                                        |
                                        v
                                   Neon PostgreSQL (serverless, scale-to-zero)
```

Prisma Accelerate sits between the Prisma Client and Neon, handling:
- Connection pooling (critical for serverless where each invocation is a new process)
- Global edge caching (reduce database round-trips for read-heavy pages like gallery, services)
- Query-level caching with `cacheStrategy` in Prisma Client

### Stripe Integration Architecture

```
Public Site                          Admin Dashboard
    |                                     |
    v                                     v
Stripe Embedded Checkout          Stripe Dashboard / API
    |                                     |
    v                                     v
Webhook (checkout.session.completed)  Manual refunds, reporting
    |
    v
Database (Order, Payment records)
```

Deposits, session payments, and store purchases all flow through Stripe Checkout Sessions. Webhooks update the local database. The admin dashboard reads payment data from both the local DB and Stripe API.

---

## Sources

### Prisma vs Drizzle
- [Drizzle vs Prisma ORM in 2026 - MakerKit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [Prisma vs Drizzle: Performance, DX & Migration Paths - DesignRevision](https://designrevision.com/blog/prisma-vs-drizzle)
- [Prisma ORM vs Drizzle - Official Prisma Docs](https://www.prisma.io/docs/orm/more/comparisons/prisma-and-drizzle)
- [Drizzle vs Prisma in 2026 - Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Migrate from Prisma to Drizzle - Drizzle Docs](https://orm.drizzle.team/docs/migrate/migrate-from-prisma)

### Neon vs Supabase
- [Neon vs Supabase: Benchmarks, Pricing & When to Use Each - DesignRevision](https://designrevision.com/blog/supabase-vs-neon)
- [Neon vs Supabase - Bytebase](https://www.bytebase.com/blog/neon-vs-supabase/)
- [Neon Plans - Official Docs](https://neon.com/docs/introduction/plans)
- [Neon Pricing](https://neon.com/pricing)
- [Neon for Vercel - Vercel Marketplace](https://vercel.com/marketplace/neon)
- [Install the Neon Postgres Native Integration - Neon Docs](https://neon.com/docs/guides/vercel-native-integration)

### Stripe
- [The Ultimate Guide to Stripe + Next.js 2026 - DEV](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33)
- [Stripe Payment Integration: Complete Dev Guide 2026](https://www.digitalapplied.com/blog/stripe-payment-integration-developer-guide-2026)
- [Getting Started with Next.js, TypeScript, and Stripe - Vercel KB](https://vercel.com/kb/guide/getting-started-with-nextjs-typescript-stripe)
- [Stripe vs Square: 2025 Comparison - TailoredPay](https://tailoredpay.com/blog/stripe-vs-square/)

### Better Auth
- [Better Auth Official Site](https://better-auth.com/)
- [Better Auth 1.5 Release](https://better-auth.com/blog/1-5)
- [Better Auth GitHub Releases](https://github.com/better-auth/better-auth/releases)

### Next.js 16
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [Next.js 16.1](https://nextjs.org/blog/next-16-1)
- [Next.js 16.2](https://nextjs.org/blog/next-16-2)
- [Next.js Upgrade Guide v16](https://nextjs.org/docs/app/guides/upgrading/version-16)

### State Management
- [Zustand + TanStack Query: The Dynamic Duo](https://javascript.plainenglish.io/zustand-and-tanstack-query-the-dynamic-duo-that-simplified-my-react-state-management-e71b924efb90)
- [TanStack Query + RSC: 2026 Data-Fetching Power Duo - DEV](https://dev.to/krish_kakadiya_5f0eaf6342/react-server-components-tanstack-query-the-2026-data-fetching-power-duo-you-cant-ignore-21fj)
- [React State: Redux vs Zustand vs Jotai 2026](https://inhaq.com/blog/react-state-management-2026-redux-vs-zustand-vs-jotai.html)

### Zod 4
- [Zod 4 Release Notes](https://zod.dev/v4)
- [Zod 4 Migration Guide](https://zod.dev/v4/changelog)

### E-Commerce
- [Your Next Store - Commerce with Next.js and Stripe](https://yournextstore.com/)
- [Medusa.js Discussion: Why Choose It](https://github.com/medusajs/medusa/discussions/5136)
- [Best Next.js E-commerce Templates 2026 - DesignRevision](https://designrevision.com/blog/best-nextjs-ecommerce-templates)

### Tailwind / shadcn
- [Tailwind v4 - shadcn/ui Docs](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui Chart Component](https://ui.shadcn.com/docs/components/radix/chart)
- [Motion (Framer Motion) Official](https://motion.dev/)
