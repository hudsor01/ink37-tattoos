# Ink37 Tattoos

## What This Is

A unified tattoo studio platform consolidating two existing repos (public website + admin dashboard) into a single Next.js application. The public side showcases the studio's portfolio, handles bookings via Cal.com, and provides contact/service information. The admin side provides business management — customer tracking, appointment management, analytics, media management, and reporting. Future phases add payment processing, a client portal, and an online store.

## Core Value

The tattoo artist can manage their entire business — bookings, clients, portfolio, and payments — from one app, while clients get a polished experience for discovering the studio, booking appointments, and eventually managing their own history.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — these exist in the source repos. -->

- Public website with gallery, services, about, contact, FAQ pages
- Cal.com booking integration (consultation, design review, tattoo session, touch-up)
- Contact form with email notifications via Resend
- SEO infrastructure (sitemaps, structured data, robots.txt, search console verification)
- Admin dashboard with KPI overview
- Customer management (CRUD, medical info, emergency contacts)
- Appointment management (scheduling, status tracking, types)
- Tattoo session tracking (pricing, design details, consent, aftercare)
- Media management (image/video upload via Vercel Blob)
- Analytics and reporting with Recharts
- Settings management
- Better Auth with RBAC (5 role levels)
- Audit logging

### Active

- [ ] Consolidate two repos into single Next.js app
- [x] Unify schemas into one coherent data model (Drizzle ORM, 19 tables, 8 enums)
- [x] Modernize all packages to latest versions (Next.js 16, React 19.2, Drizzle ORM 0.45.1)
- [x] ORM migration: Drizzle ORM 0.45.1 replaces Prisma 7 (zero high/critical CVEs)
- [ ] Admin dashboard accessible at /dashboard route group
- [ ] Unified auth system (Better Auth) for admin and future client portal
- [ ] Payment processing integration (deposits, session payments)
- [ ] Client portal (clients view appointments, designs, history)
- [ ] Online store (merchandise, prints, gift cards)
- [ ] Deduplicate shared UI components (Shadcn/Radix)
- [ ] Unified state management strategy
- [ ] Performance optimization for consolidated bundle

### Out of Scope

- Mobile native app — web-first, responsive design handles mobile
- Multi-artist marketplace — this is a single-studio platform
- Real-time chat — Cal.com and contact form cover communication
- Custom CMS — admin dashboard handles content management needs

## Context

### Source Projects

**tattoo-website** (public-facing):
- Next.js 16.1.1, React 19.2.3, Prisma 7.2.0
- TanStack Query, Zod 4, Tailwind CSS 4, Framer Motion
- Cal.com booking, Resend email, Vercel Blob storage
- Full SEO suite, PWA support, mobile-optimized components
- GitHub: hudsor01/tattoo-website

**admin-tattoo-website** (admin dashboard):
- Next.js 15.3.8, React 19.1.0, Prisma 6.10.0
- Zustand + TanStack Query, Zod 3, Recharts
- Better Auth with full RBAC, audit logging
- Customer/appointment/session/media management
- GitHub: hudsor01/admin-tattoo-website

### Technical Notes

- Consolidated project uses PostgreSQL via Drizzle ORM (migrated from Prisma in Phase 8), Neon serverless driver
- Both use Shadcn UI (Radix primitives) — significant component overlap
- Both use TanStack Query, Zod, Tailwind, Framer Motion — version alignment needed
- Admin runs on port 3001, public on 3000 — will merge into single app
- Hosted on Vercel (Prisma Accelerate no longer needed -- Drizzle uses neon-serverless driver directly)
- Live domain: ink37tattoos.com
- Database provider needs investigation (Neon vs Supabase vs Vercel Postgres)

### Existing Auth Architecture

- Better Auth v1.2.9 with admin plugin
- 5 role levels: USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN
- Session management, OAuth (Google) ready
- Email verification, audit logging
- Will extend for client portal access

## Constraints

- **Domain**: ink37tattoos.com already live — zero-downtime migration required
- **Database**: Same PostgreSQL instance shared by both projects — schema merge must be backward-compatible during transition
- **Hosting**: Vercel — must stay on Vercel for deployment
- **Auth**: Better Auth already implemented — keep as auth solution
- **Booking**: Cal.com integration must be preserved — core business flow

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single app with /dashboard route group | Simpler deployment, shared auth, one codebase to maintain | — Pending |
| Phased rollout (merge first, features later) | Reduce risk, get consolidated app working before adding complexity | — Pending |
| Evaluate Prisma vs Drizzle during research | User open to either — let research guide the ORM decision | — Pending |
| Evaluate Neon vs Supabase during research | User open to either — need to identify current provider and compare | — Pending |
| Keep Better Auth | Already implemented with RBAC — proven in admin project | — Pending |
| Drizzle ORM 0.45.1 replaces Prisma 7 | Prisma 7 bundles Hono with unresolvable CVEs. Drizzle has zero runtime CVEs. | Phase 8 complete |

---
*Last updated: 2026-03-23 after Phase 8 Drizzle migration*
