# Phase 1: Foundation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

A working Next.js 16 project scaffold with unified Prisma 7 schema, data access pattern, Better Auth RBAC, route group structure, shared UI library, and all packages at target versions. Validated against a fresh database. This is the foundation everything else builds on.

</domain>

<decisions>
## Implementation Decisions

### Schema Merge Strategy
- Superset merge for Customer model — combine all fields from both repos (admin's emergency contacts + medical arrays + public's address fields). Nullable where one side didn't have the field.
- UUID everywhere — standardize on `uuid()` for all ID generation. Existing cuid IDs are valid strings and won't break.
- Fresh schema approach — create the unified schema clean rather than reconciling two migration histories. Low traffic makes this safe.
- Payment model deferred to Phase 3 — don't include in Phase 1 schema.
- Appointment vs Session structure — RESEARCH NEEDED. Investigate whether to keep separate models (Appointment for scheduling, TattooSession for work records) or merge. Decide based on best practices for this domain.
- Artist model — RESEARCH NEEDED. Investigate whether to include `tattoo_artists` model in Phase 1 or simplify for single-artist studio.
- Settings model — RESEARCH NEEDED. Determine if key/value settings table is the right pattern or if Next.js 16 config patterns are better.
- Cal.com integration — RESEARCH NEEDED. Deep investigation of current Cal.com open-source project to determine the correct way to integrate analytics/booking tracking. Current implementation is likely incomplete/incorrect. Don't carry forward the existing Cal analytics models blindly.

### Auth & Role Model
- RESEARCH DRIVEN — All auth decisions deferred to research:
  - Better Auth version and upgrade path (current: v1.2.9 in admin, different schema in public)
  - Role model and RBAC structure — don't assume current 5-tier hierarchy is correct
  - Self-registration flow and default roles
  - Session handling and plugin requirements (admin, ban, impersonation)
  - How client portal users fit into the auth model (Phase 4 prep)
- Research must determine best practices and align — fix what was incorrectly done, don't perpetuate bad patterns

### Data Access Patterns
- RESEARCH NEEDED — Investigate whether a formal DAL (Data Access Layer) is the right pattern for this project. Don't assume. Research Next.js 16 data access patterns (server components, server actions, `server-only` package) and determine the best approach.
- Gallery/portfolio content MUST be publicly accessible — no auth required to view artwork. This is a locked decision.

### Security Infrastructure
- RESEARCH NEEDED — Investigate what Next.js 16 handles natively (middleware security, headers config, server action CSRF protection) vs what needs custom implementation. The admin's hand-rolled security utils (csrf-protection.ts, rate-limiter.ts, security-headers.ts, database-security.ts, sanitization.ts) may be largely redundant with modern Next.js.

### State Management
- RESEARCH NEEDED — Investigate whether TanStack Query v5 alone can handle all state management needs (including UI state the admin currently uses Zustand for: sidebar state, filters, preferences). React 19 features may reduce the need for a separate client state library.

### Database Provider
- RESEARCH NEEDED — Not locked into Neon. Investigate best cloud Postgres provider for this use case (Neon vs Supabase vs Vercel Postgres vs others). Evaluate on value, developer experience, and features relevant to a low-traffic tattoo studio platform scaling up.

### Migration Safety
- Data preservation not required — low traffic, limited data. Check live DB to verify if there's anything worth keeping, but fresh start is acceptable.
- Downtime is acceptable — no rollback plan needed, fix forward.
- Fresh database — create new database instance with clean migration history. No legacy table conflicts.

### Why Prisma (Not Drizzle)
- Both repos already use Prisma — migration history, types, query patterns all built around it
- Prisma 7 closed the performance/DX gap (ESM-native, better edge support, faster engine)
- Switching ORMs during a merge of two existing Prisma codebases is double risk for no immediate gain
- Drizzle's advantages (SQL-like syntax, smaller bundle) don't matter at current scale

### Claude's Discretion
- Route group internal structure and file organization
- Shared UI component deduplication strategy (which Shadcn components to keep, which to consolidate)
- Package manager choice (npm vs bun vs pnpm) — align with what works best for the stack
- ESLint/Prettier/TypeScript configuration
- Environment variable naming conventions
- Folder structure within src/

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Repo Schemas
- `../tattoo-website/prisma/schema.prisma` — Public site schema: Customer, Booking, TattooDesign, Contact, Payment, Cal analytics models, Better Auth tables (uuid IDs, `accounts` plural mapping)
- `../admin-tattoo-website/prisma/schema.prisma` — Admin schema: clients, appointments, tattoo_sessions, tattoo_artists, tattoo_designs, settings, audit_logs, Better Auth tables (cuid IDs, `account` singular mapping)

### Source Repo Auth
- `../admin-tattoo-website/src/lib/auth.ts` — Better Auth server config with RBAC
- `../admin-tattoo-website/src/lib/auth-client.ts` — Better Auth client setup
- `../admin-tattoo-website/src/lib/authorization.ts` — Role-based authorization logic

### Source Repo Security
- `../admin-tattoo-website/src/lib/csrf-protection.ts` — CSRF implementation to evaluate
- `../admin-tattoo-website/src/lib/rate-limiter.ts` — Rate limiting implementation
- `../admin-tattoo-website/src/lib/security-headers.ts` — Security headers config
- `../admin-tattoo-website/src/lib/database-security.ts` — DB security patterns

### Source Repo State & Data
- `../admin-tattoo-website/src/lib/db-client.ts` — Current Prisma client setup
- `../admin-tattoo-website/src/lib/env-validation.ts` — Environment validation with Zod
- `../tattoo-website/src/lib/db/` — Public site database utilities
- `../tattoo-website/src/lib/cal/` — Cal.com integration code

### Package Manifests
- `../tattoo-website/package.json` — Public site dependencies (Next.js 16.1.1, React 19.2.3, Prisma 7.2.0)
- `../admin-tattoo-website/package.json` — Admin dependencies (Next.js 15.3.8, React 19.1.0, Prisma 6.10.0)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Both repos use Shadcn/Radix primitives with significant overlap — consolidation needed
- Admin has TanStack Table setup (`@tanstack/react-table`) for data tables
- Admin has drag-and-drop (`@dnd-kit`) for sortable interfaces
- Public site has Cal.com embed (`@calcom/embed-react`) integration
- Public site has Resend email integration
- Both use `class-variance-authority` + `clsx` + `tailwind-merge` for styling

### Established Patterns
- Admin uses `server-only` imports for sensitive server code
- Both use TanStack Query for data fetching
- Admin has Zustand stores (usage TBD by research)
- Public site uses Framer Motion for animations
- Admin uses `cmdk` for command palette

### Integration Points
- Route groups: `(public)`, `(auth)`, `(dashboard)`, `(portal)`, `(store)` — all placeholder pages in Phase 1
- Prisma client — single instance shared across all route groups
- Better Auth — single auth config serving admin and future client portal
- Tailwind CSS 4 — shared theme/design tokens across all route groups

</code_context>

<specifics>
## Specific Ideas

- Owner wants the project done RIGHT — research-driven decisions, not carrying forward mistakes from the original implementations
- "Just because it has current state of X does not mean it should continue to be so" — challenge existing patterns
- Cal.com integration was "half-assed the first time" — needs proper investigation of the actual Cal.com open-source project before reimplementing
- This is a low-traffic site being built to scale — make good architectural decisions now but don't over-engineer for traffic that doesn't exist yet

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-20*
