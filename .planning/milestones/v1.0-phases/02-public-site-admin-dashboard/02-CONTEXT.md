# Phase 2: Public Site + Admin Dashboard - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Reconstruct both existing applications (public tattoo website + admin dashboard) within the unified codebase. The public site serves all pages with SEO and performance parity. The admin dashboard provides full business management. Security infrastructure protects all endpoints. Source repos are reference for features/content — not to be ported blindly.

</domain>

<decisions>
## Implementation Decisions

### Public Site Visual Direction
- Rebuild with new design — source repo is reference for content/structure only, not visual approach
- Fresh Tailwind CSS 4 styling, new layout decisions, new aesthetic
- Masonry grid with lightbox for gallery — proven portfolio pattern, keep this approach
- Subtle and purposeful animations — light entrance animations, smooth transitions, hover effects. Performance-first, let artwork speak. Use Framer Motion sparingly.
- Gallery filtering categories — Claude's discretion based on research into what tattoo clients actually filter by

### Admin Dashboard Scope
- Full feature parity with existing admin — do not regress any functionality
- All features included: KPI dashboard, customer CRUD, appointment management, session tracking, media/portfolio management, analytics/reporting, settings, audit logging
- Rebuild with fresh design — not a port of existing admin UI. Consistent with "do it right" philosophy.
- No command palette (cmdk) — unnecessary complexity for single-user admin
- Charting library — Claude's discretion (evaluate Recharts vs alternatives during research)

### Data Fetching & Mutations
- TanStack Query for all data fetching — consistent pattern across public and admin
- Server Actions vs API Routes for mutations — Claude's discretion per use case (CLAUDE.md says Server Actions for mutations, Route Handlers for webhooks only)
- DAL functions remain the security boundary — all data access goes through DAL

### Cal.com Integration
- Research-driven integration — investigate Cal.com open-source project properly before implementing
- Don't carry forward the "half-assed" integration from the source repo
- Determine appropriate integration depth through research (embed only vs webhook sync vs full API)

### Migration Approach
- Claude evaluates each source file case-by-case: port proven logic vs rewrite
- Source repos are reference material, not source of truth
- All new code must conform to Phase 1 architecture (DAL, route groups, unified schema)

### Security Infrastructure
- Research-driven, native-first approach — determine what Next.js 16 / the tech stack handles natively before writing custom code
- Prioritize framework-native security features over hand-rolled utils
- Rate limiting scope — Claude's discretion based on threat model
- RBAC enforcement approach — Claude's discretion (DAL-level vs middleware+DAL, must fix the existing admin's role check bug)
- Audit logging: log ALL admin mutations — user ID, timestamp, entity type, entity ID, and changes
- Downtime acceptable during deployment cutover — no zero-downtime requirement

### Claude's Discretion
- Gallery filter categories (style, size, placement, or different taxonomy)
- Charting library choice (Recharts vs alternatives)
- Mutation pattern per use case (Server Actions vs Route Handlers)
- Port vs rewrite decisions per source file
- Rate limiting endpoint selection
- RBAC enforcement layer architecture
- Mobile navigation pattern
- Home page section structure and ordering
- Admin sidebar/navigation design
- Data table implementation (TanStack Table or alternatives)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Repo — Public Site
- `../tattoo-website/src/app/` — All public page implementations (home, gallery, services, about, FAQ, contact, booking)
- `../tattoo-website/src/app/gallery/` — Gallery page with masonry layout, filtering, lightbox
- `../tattoo-website/src/app/booking/` — Cal.com embed booking flow
- `../tattoo-website/src/app/contact/` — Contact form with Resend email
- `../tattoo-website/src/app/sitemap.ts` — SEO sitemap generation
- `../tattoo-website/src/app/robots.ts` — Robots.txt configuration
- `../tattoo-website/src/app/metadata.ts` — SEO metadata configuration
- `../tattoo-website/src/lib/cal/` — Cal.com integration code (needs investigation, not blind porting)
- `../tattoo-website/package.json` — Public site dependencies

### Source Repo — Admin Dashboard
- `../admin-tattoo-website/src/app/dashboard/` — All admin pages (overview, customers, appointments, sessions, media, analytics, settings)
- `../admin-tattoo-website/src/lib/auth.ts` — Better Auth server config
- `../admin-tattoo-website/src/lib/authorization.ts` — Role-based authorization logic
- `../admin-tattoo-website/src/lib/csrf-protection.ts` — CSRF implementation (evaluate vs Next.js 16 native)
- `../admin-tattoo-website/src/lib/rate-limiter.ts` — Rate limiting (evaluate vs native alternatives)
- `../admin-tattoo-website/src/lib/security-headers.ts` — Security headers (evaluate vs next.config.js headers)
- `../admin-tattoo-website/src/lib/database-security.ts` — DB security patterns
- `../admin-tattoo-website/src/lib/sanitization.ts` — Input sanitization
- `../admin-tattoo-website/package.json` — Admin dependencies

### Unified Codebase (Phase 1 Output)
- `prisma/schema.prisma` — Unified Prisma 7 schema
- `src/lib/dal/` — Data Access Layer with auth checks (customers, appointments, designs, users)
- `src/lib/auth.ts` — Better Auth server configuration
- `src/lib/auth-client.ts` — Better Auth client setup
- `src/lib/db.ts` — Prisma client instance
- `src/lib/env.ts` — Environment validation
- `src/components/ui/` — Shared Shadcn components (button, card, input)
- `src/components/providers.tsx` — TanStack Query + Zustand providers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Shadcn UI components** (button, card, input) — foundation exists, will need significant expansion (tables, dialogs, forms, dropdowns, etc.)
- **DAL functions** — customers, appointments, designs, users already have server-only CRUD with auth checks
- **Better Auth** — fully configured with RBAC, session management, admin plugin
- **TanStack Query provider** — already set up in providers.tsx
- **Prisma schema** — all models defined (Customer, Appointment, TattooSession, TattooDesign, etc.)

### Established Patterns
- DAL uses `requireStaffRole`/`requireAdminRole` for role enforcement
- Server-only imports for DAL modules
- Route groups: `(public)`, `(auth)`, `(dashboard)`, `(portal)`, `(store)` with layouts
- Tailwind CSS 4 with design tokens
- UUID-based IDs across all models

### Integration Points
- Public pages connect via `(public)/` route group — layout.tsx exists
- Admin pages connect via `(dashboard)/dashboard/` — layout.tsx exists
- Auth pages connect via `(auth)/` — login page exists
- API routes at `src/app/api/auth/[...all]/route.ts` for Better Auth
- Global layout at `src/app/layout.tsx` with providers

</code_context>

<specifics>
## Specific Ideas

- Owner wants everything "done right" — research-driven decisions, challenge existing patterns
- Cal.com integration was "half-assed the first time" — proper investigation required before reimplementing
- Full admin parity is non-negotiable — don't regress any existing functionality
- Public site gets a fresh design, not a port — let the new design emerge from modern best practices
- Admin also gets fresh design — consistent philosophy across both sides
- No command palette — keep admin focused and simple
- Downtime is acceptable — simplifies deployment, no need for complex cutover strategies

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-public-site-admin-dashboard*
*Context gathered: 2026-03-20*
