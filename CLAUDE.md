# Ink37 Tattoos

## Project Overview

Consolidated tattoo studio platform merging two existing repos:
- **tattoo-website** (`/Users/richard/Developer/tattoo-website/`) — Public-facing Next.js 16 site (gallery, Cal.com booking, contact, SEO)
- **admin-tattoo-website** (`/Users/richard/Developer/admin-tattoo-website/`) — Admin dashboard Next.js 15 (customers, appointments, sessions, analytics, RBAC)

## GSD Status

Project initialized via `/gsd:new-project`. All planning artifacts are in `.planning/`.

**Next step:** `/gsd:discuss-phase 1` or `/gsd:plan-phase 1`

### Phases

| # | Phase | Goal | Reqs |
|---|-------|------|------|
| 1 | Foundation | Schema merge, DAL, auth, route groups, package alignment | 8 |
| 2 | Public Site + Admin | Reconstruct both apps into unified codebase | 22 |
| 3 | Payments | Stripe deposits, session payments, webhooks | 6 |
| 4 | Client Portal | Client self-service experience | 6 |
| 5 | Online Store | Merch, prints, gift cards | 5 |

### Config

- Mode: YOLO (auto-approve)
- Granularity: Coarse
- Parallelization: Yes
- Auto-advance: Yes
- Research: Yes
- Plan check: Yes
- Verifier: Yes
- Model profile: Quality (Opus)

## Source Repos (Reference)

Both source repos should remain accessible for code migration:
- `../tattoo-website/` — Public site source code
- `../admin-tattoo-website/` — Admin dashboard source code

## Tech Stack Decisions (from Research)

- **Framework:** Next.js 16 + React 19.2
- **ORM:** Drizzle ORM 0.45.1 (migrated from Prisma 7 in Phase 8)
- **Database:** Neon PostgreSQL (migrate if not already)
- **Auth:** Better Auth (upgrade to v1.5.5) with 5-tier RBAC
- **Payments:** Stripe
- **State:** TanStack Query (server) + Zustand (client)
- **UI:** Shadcn/Radix + Tailwind CSS 4
- **Email:** Resend
- **Booking:** Cal.com embed
- **Storage:** Vercel Blob
- **Hosting:** Vercel

## Key Architecture Decisions

- Single app with route groups: (public), (auth), (dashboard), (portal), (store)
- Data Access Layer (DAL) pattern — auth checks in server-only DB functions, not just middleware
- Server Actions for mutations, Route Handlers for webhooks only
- Customer model gets optional `userId` FK for portal linking
- Drizzle ORM with single neon-serverless driver, schema in src/lib/db/schema.ts, relational query API for reads, SQL builder for aggregations
- Better Auth uses raw pg.Pool (not Drizzle adapter) for full feature decoupling
- Import db from @/lib/db, schema from @/lib/db/schema

## Critical Pitfalls (from Research)

1. Schema merge is highest risk — different ID strategies (uuid vs cuid), table name conflicts (`accounts` vs `account`)
2. Admin middleware has role check bug (`!== 'admin'` blocks SUPER_ADMIN etc.)
3. Must verify actual production table names before writing consolidated schema
4. Drizzle numeric() returns strings by default — all monetary columns use mode:'number'
5. Drizzle mutations need explicit .returning() — without it, only rowCount is returned
6. Drizzle relational API (db.query) does not support aggregations — use SQL builder with sql template literals
