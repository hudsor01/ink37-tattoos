# Ink37 Tattoos

## What This Is

A unified tattoo studio platform — public website, admin dashboard, client portal, and online store — running as a single Next.js 16 application. The artist manages bookings, clients, payments, portfolio, and merchandise from one dashboard. Clients discover the studio, book via Cal.com, pay via Stripe, and manage their tattoo journey through a self-service portal.

## Core Value

The tattoo artist manages their entire business from one app while clients get a polished experience for discovering, booking, paying, and tracking their tattoo journey.

## Current State

**Shipped:** v1.0 MVP (2026-03-27)
**Codebase:** 27,731 LOC TypeScript across 448 files
**Tests:** 354 tests (unit, integration, schema validation, MSW boundary)

### What's Live

- Public site: gallery with masonry/filtering, services, Cal.com booking, contact form, SEO
- Admin dashboard: customers, appointments, sessions, analytics, media, payments, orders, settings
- Client portal: appointment history, tattoo viewer, consent forms, payment history
- Online store: merchandise, prints, gift cards, cart, Stripe checkout, digital downloads
- Stripe: deposits, session payments, store checkout, webhooks, setupIntents
- Auth: Better Auth 1.5.5 with 5-tier RBAC (USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN)
- Email: Resend transactional emails (contact, payment, order, gift card, bounce handling)

## Requirements

### Validated

- Public website with gallery, services, about, contact, FAQ, booking — v1.0
- Cal.com webhook integration with appointment sync — v1.0
- Contact form with Resend email notifications — v1.0
- Full SEO infrastructure (sitemaps, structured data, robots.txt, Open Graph) — v1.0
- Admin dashboard with KPI overview, revenue charts — v1.0
- Customer management (CRUD, medical info, emergency contacts, session history) — v1.0
- Appointment management (scheduling, status tracking, filtering) — v1.0
- Tattoo session tracking (pricing, design details, consent, aftercare) — v1.0
- Media management (Vercel Blob uploads, gallery sync) — v1.0
- Analytics and reporting with Recharts (ComposedChart, dual Y-axes, Brush zoom) — v1.0
- Settings management — v1.0
- Better Auth RBAC (5 role levels) with admin plugin — v1.0
- Audit logging on all admin actions — v1.0
- Stripe payment integration (deposits, session payments, store checkout, webhooks) — v1.0
- Client portal (appointments, designs, consent forms, payment history) — v1.0
- Online store (merchandise, prints, gift cards, order management) — v1.0
- Drizzle ORM migration from Prisma (19 tables, zero CVEs) — v1.0
- Security headers, CSRF, rate limiting, Zod validation — v1.0
- HydrationBoundary SSR, DataTable with global+faceted filters — v1.0
- React 19 features (Context-as-provider, useFormStatus, resource preloading) — v1.0

### Active

(Defined during v2.0 milestone planning)

### Out of Scope

- Mobile native app — web-first, responsive design handles mobile
- Multi-artist marketplace — single-studio platform
- Real-time chat — Cal.com and contact form cover communication
- Custom CMS — admin dashboard handles content management
- Video consultations — Cal.com handles meeting links
- Inventory management — insufficient physical products to justify
- POS/in-person payments — not needed for web platform

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19.2 |
| ORM | Drizzle ORM 0.45.1 |
| Database | Neon PostgreSQL (neon-serverless driver) |
| Auth | Better Auth 1.5.5 (raw pg.Pool, not Drizzle adapter) |
| Payments | Stripe |
| State | TanStack Query (server) + Zustand (client) |
| UI | Shadcn/Radix + Tailwind CSS 4 |
| Email | Resend |
| Booking | Cal.com embed + webhooks |
| Storage | Vercel Blob |
| Hosting | Vercel |
| Testing | Vitest + MSW |

## Constraints

- **Domain**: ink37tattoos.com — live production site
- **Database**: Neon PostgreSQL — single instance
- **Hosting**: Vercel — must stay on Vercel
- **Auth**: Better Auth with raw pg.Pool — decoupled from ORM
- **Booking**: Cal.com integration — core business flow
- **ORM**: Drizzle 0.45.1 — relational API for reads, SQL builder for mutations/aggregations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single app with route groups | Simpler deployment, shared auth, one codebase | Shipped v1.0 |
| Drizzle ORM over Prisma | Prisma 7 bundles Hono with unresolvable CVEs | Shipped v1.0, zero CVEs |
| Better Auth with raw pg.Pool | Decouples auth from ORM version, full feature support | Shipped v1.0 |
| CSS columns masonry over JS grid | Broad browser support, no JS dependency | Shipped v1.0 |
| Custom rate limiter over better-auth plugin | Covers all public endpoints, not just auth routes | Shipped v1.0 |
| base-ui render prop over asChild | Valid HTML (no nested interactives), proper navigation | Shipped v1.0 |
| Single neon-serverless driver | Simplicity, transaction support, no dual-driver complexity | Shipped v1.0 |
| numeric mode:number for all monetary columns | Prevents silent string-number conversion bugs | Shipped v1.0 |

## Known Tech Debt (from v1.0 audit)

- TD-01: asChild prop in 4 files produces invalid HTML — needs render prop pattern
- TD-02: Orphaned contacts DAL with no consumer page
- TD-03: BLOB_PRIVATE_READ_WRITE_TOKEN not in Zod env schema
- TD-04: In-memory rate limiter resets per serverless instance (burst protection only)

---
*Last updated: 2026-03-27 after v1.0 milestone*
