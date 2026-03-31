# Ink37 Tattoos

A unified tattoo studio platform -- public website, admin dashboard, client portal, and online store -- running as a single Next.js 16 application.

The artist manages bookings, clients, payments, portfolio, and merchandise from one dashboard. Clients discover the studio, book via Cal.com, pay via Stripe, and manage their tattoo journey through a self-service portal.

**Live:** [ink37tattoos.com](https://ink37tattoos.com)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19.2 |
| Language | TypeScript 5.9 |
| ORM | Drizzle ORM 0.45.1 |
| Database | Neon PostgreSQL |
| Auth | Better Auth 1.5.5 (5-tier RBAC) |
| Payments | Stripe (deposits, sessions, store checkout) |
| State | TanStack Query (server) + Zustand (client) |
| UI | Shadcn/Radix + Tailwind CSS 4 |
| Email | Resend |
| Booking | Cal.com embed + webhooks |
| Storage | Vercel Blob |
| Monitoring | Sentry + Pino structured logging |
| Testing | Vitest + MSW |
| Hosting | Vercel |

## Features

### Public Site
- Tattoo gallery with masonry layout, category filtering, and lightbox
- Service pages with pricing and descriptions
- Cal.com booking embed for consultations, design reviews, sessions, and touch-ups
- Contact form with email notifications via Resend
- Full SEO: sitemaps, structured data, robots.txt, Open Graph
- About and FAQ pages

### Admin Dashboard
- KPI overview with revenue charts and upcoming appointments
- Customer management (CRUD, medical info, emergency contacts, CSV import/export)
- Appointment scheduling with calendar views (day/week/month) and conflict detection
- Tattoo session tracking (pricing, design details, consent, aftercare)
- Financial reports with revenue breakdowns, tax summaries, and CSV/PDF export
- Media management with bulk upload, folders, tagging, and gallery sync
- Analytics: revenue, booking funnels, customer lifetime value, operational metrics
- Product and order management with fulfillment workflows
- Gift card issuance and management
- Contact form submission management
- Notification center for business events
- Design approval queue for public gallery
- Audit logging on all admin actions
- Configurable settings (studio, email, payments, hours, terms)

### Client Portal
- Appointment history and upcoming bookings
- Tattoo design viewer
- Digital consent form signing with version tracking
- Payment history

### Online Store
- Merchandise, prints, and gift cards
- Shopping cart with Stripe checkout
- Digital download delivery
- Order tracking

### Platform
- 5-tier RBAC: USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN
- Data Access Layer (DAL) pattern with auth checks in server-only DB functions
- Server Actions for all mutations, Route Handlers for webhooks only
- Persistent rate limiting via Upstash Redis
- XSS sanitization, CSRF protection, security headers
- Stripe webhook idempotency (duplicate event protection)
- Health check endpoint at `/api/health`
- Structured JSON logging (Pino) with request ID tracing
- Web Vitals reporting to Sentry

## Architecture

The application uses Next.js route groups to organize five distinct user experiences in a single deployment:

```
src/app/
  (public)/     -- Public-facing site (gallery, services, booking, contact, FAQ)
  (auth)/       -- Authentication pages (login, register)
  (dashboard)/  -- Admin dashboard (customers, appointments, sessions, analytics, ...)
  (portal)/     -- Client self-service portal (appointments, tattoos, consent, payments)
  (store)/      -- Online store (products, gift cards, checkout)
  api/          -- API routes (webhooks, cron, health, admin, upload, ...)
```

### Key Patterns

- **Data Access Layer:** All database operations go through `src/lib/dal/` which enforces auth checks at the data layer, not just middleware
- **Server Actions:** Mutations use Next.js Server Actions (`src/lib/actions/`) with Zod validation and consistent `{ success, data?, error? }` return types
- **Route Handlers:** Only used for webhooks (`/api/webhooks/`) and endpoints that need HTTP method control
- **Auth:** Better Auth uses a raw `pg.Pool` connection, decoupled from Drizzle ORM, enabling independent version upgrades

## Project Structure

```
ink37-tattoos/
  src/
    app/                    -- Next.js App Router pages and layouts
      (public)/             -- Public site pages
      (auth)/               -- Login and register
      (dashboard)/          -- Admin dashboard pages (20+ sections)
      (portal)/             -- Client portal pages
      (store)/              -- Store pages
      api/                  -- API routes (webhooks, cron, health, admin, etc.)
    components/
      dashboard/            -- Admin dashboard components
      portal/               -- Client portal components
      public/               -- Public site components
      store/                -- Store components
      ui/                   -- Shadcn/Radix UI primitives
    hooks/                  -- Custom React hooks
    lib/
      actions/              -- Server Actions (22 action files)
      cal/                  -- Cal.com integration
      dal/                  -- Data Access Layer (21 DAL modules)
      db/                   -- Database connection and schema (23 tables)
      email/                -- Resend email templates and sending
      security/             -- Rate limiter, XSS sanitizer
      utils/                -- Shared utilities
      auth.ts               -- Better Auth configuration
      env.ts                -- Zod environment variable validation
      logger.ts             -- Pino structured logging
      stripe.ts             -- Stripe client initialization
    stores/                 -- Zustand client stores
    styles/                 -- Global styles
    __tests__/              -- Test suites (Vitest + MSW)
  docs/
    DEPLOYMENT.md           -- Production deployment guide
  drizzle/                  -- Drizzle migration files
  public/                   -- Static assets (images, videos, icons)
```

## Local Development

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)
- [Node.js](https://nodejs.org/) 22+ (Next.js runtime)
- Access to a PostgreSQL database (local or [Neon](https://neon.tech/) free tier)

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/hudsor02/ink37-tattoos.git
   cd ink37-tattoos
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values. At minimum you need:
   - `DATABASE_URL` -- PostgreSQL connection string
   - `BETTER_AUTH_SECRET` -- Random string (32+ characters)
   - `BETTER_AUTH_URL` -- `http://localhost:3000`
   - `NEXT_PUBLIC_APP_URL` -- `http://localhost:3000`
   - `STRIPE_SECRET_KEY` -- Stripe test key
   - `STRIPE_WEBHOOK_SECRET` -- Stripe webhook secret
   - `BLOB_PRIVATE_READ_WRITE_TOKEN` -- Vercel Blob token

4. **Set up the database:**

   ```bash
   # Apply migrations
   bun run db:migrate

   # Or push schema directly (dev only)
   bun run db:push
   ```

5. **Start the development server:**

   ```bash
   bun run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server with Turbopack |
| `bun run build` | Create production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run test` | Run all tests (Vitest) |
| `bun run test:coverage` | Run tests with coverage report |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:generate` | Generate migration from schema changes |
| `bun run db:push` | Push schema to database (dev only) |
| `bun run db:pull` | Pull schema from database |
| `bun run db:studio` | Launch Drizzle Studio |

## Testing

Tests use Vitest with MSW for API mocking:

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage

# Run specific test file
bunx vitest run src/__tests__/health.test.ts
```

Test coverage includes:
- Server action unit tests (auth, validation, DAL mocking)
- API route integration tests
- Webhook handler tests (malformed payloads, duplicate events)
- RBAC enforcement tests
- Schema validation tests

## Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** -- Production deployment checklist, env var reference, rollback procedures, monitoring setup

## License

Private repository. All rights reserved.
