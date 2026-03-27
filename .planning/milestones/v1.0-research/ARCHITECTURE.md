# Architecture Patterns

**Domain:** Unified tattoo studio platform (public site + admin dashboard + future client portal/store)
**Researched:** 2026-03-20
**Overall confidence:** HIGH

## Recommended Architecture

A single Next.js application using **route groups** to isolate three distinct user experiences -- public marketing, admin dashboard, and future client portal -- with a shared Data Access Layer (DAL) enforcing all authorization, a unified Prisma schema on PostgreSQL, and Better Auth handling authentication for all user types.

### High-Level Component Map

```
ink37-tattoos/
  src/
    app/
      (public)/              # Public-facing pages (no auth required)
        page.tsx             # Home
        about/
        gallery/
        gallery/[id]/
        services/
        booking/
        booking/confirmation/
        booking/cancel/[bookingUid]/
        booking/cancelled/
        booking/reschedule/
        contact/
        faq/
        layout.tsx           # Public layout: nav, footer, SEO scripts
      (auth)/                # Auth pages (login, register, forgot-password)
        login/
        register/            # Future: client self-registration
        forgot-password/
        layout.tsx           # Minimal layout, no nav/footer
      (dashboard)/           # Admin dashboard (/dashboard/*)
        dashboard/
          page.tsx           # KPI overview
          customers/
          appointments/
          media-management/
          analytics/
          reports/
          settings/
          layout.tsx         # Sidebar + header layout
      (portal)/              # Future: client portal (/portal/*)
        portal/
          page.tsx
          appointments/
          designs/
          history/
          layout.tsx         # Client-facing portal layout
      (store)/               # Future: online store (/store/*)
        store/
          page.tsx
          products/
          cart/
          checkout/
          layout.tsx         # Store layout
      api/
        auth/[...all]/       # Better Auth catch-all handler
        webhooks/
          stripe/route.ts    # Stripe webhook handler
          cal/route.ts       # Cal.com webhook handler
        gallery/             # Public gallery API (cacheable GETs)
        contact/             # Contact form submission
        bookings/            # Public booking endpoints
        admin/               # Admin-only API routes
          customers/
          appointments/
          analytics/
          media/
          reports/
          settings/
        health/              # Health check endpoints
        cron/                # Scheduled jobs
      layout.tsx             # Root layout (html, body, providers)
    components/
      ui/                    # Shared Shadcn/Radix primitives (button, card, dialog, etc.)
      shared/                # Cross-concern components (error boundaries, loading states)
      public/                # Public-site-specific components (navigation, footer, hero, gallery)
      dashboard/             # Admin dashboard components (sidebar, data tables, charts)
      portal/                # Future: client portal components
      store/                 # Future: store components
      auth/                  # Auth-related components (login form, route guard)
    lib/
      dal/                   # Data Access Layer (THE security boundary)
        customers.ts
        appointments.ts
        bookings.ts
        gallery.ts
        payments.ts
        analytics.ts
        media.ts
        settings.ts
        auth.ts              # Session/user retrieval with auth checks
      auth/
        auth.ts              # Better Auth server config
        auth-client.ts       # Better Auth client config
        permissions.ts       # RBAC definitions (roles, permissions, access control)
      db/
        prisma.ts            # Prisma client singleton
        schema-types.ts      # Re-exported Prisma types
      email/
        resend.ts            # Resend email client
        templates/           # Email templates
      cal/
        client.ts            # Cal.com API integration
        webhooks.ts          # Cal.com webhook processing
      stripe/
        client.ts            # Stripe client
        webhooks.ts          # Stripe webhook processing
      storage/
        blob.ts              # Vercel Blob upload/management
      seo/
        config.ts            # SEO configuration
        structured-data.ts   # JSON-LD generators
      utils/
        env.ts               # Environment variable validation
        logger.ts            # Logging utility
    hooks/
      use-gallery.ts         # Gallery state management
      use-auth.ts            # Auth hooks wrapper
      use-permissions.ts     # Permission checking hooks
    types/
      index.ts               # Shared TypeScript types (UI-only, not data models)
    styles/
      globals.css
      fonts.ts
    middleware.ts             # Lightweight middleware (redirects only, NOT security)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **(public) route group** | Marketing pages, gallery, booking flow, contact, SEO | DAL (read-only: gallery, bookings), Cal.com (embeds), Contact API |
| **(dashboard) route group** | Business management UI for admin/staff | DAL (full CRUD), Vercel Blob (media), Admin API routes |
| **(auth) route group** | Login, registration, password reset | Better Auth API, DAL (session check) |
| **(portal) route group** | Client self-service (future) | DAL (scoped: own data only), Stripe (payment history) |
| **(store) route group** | Merchandise/gift cards (future) | DAL (products, orders), Stripe (checkout), Vercel Blob (product images) |
| **Data Access Layer (DAL)** | Authorization enforcement, data retrieval, mutation logic | Prisma, Better Auth sessions |
| **API Routes** | External integrations (webhooks, health checks) | DAL, Stripe SDK, Cal.com SDK |
| **Better Auth** | Authentication, session management, RBAC | PostgreSQL (via Prisma adapter), Google OAuth |
| **Prisma** | Database access, type generation | PostgreSQL |
| **Vercel Blob** | File storage (images, videos) | Vercel Blob API, next/image optimization |

### Data Flow

```
PUBLIC USER REQUEST FLOW:
  Browser
    -> (public) layout (nav, footer, SEO)
    -> Server Component (page)
    -> DAL function (no auth check for public data)
    -> Prisma query
    -> PostgreSQL
    -> Response rendered as RSC

ADMIN REQUEST FLOW:
  Browser
    -> middleware (cookie check -> redirect if no session)
    -> (dashboard) layout (auth check in layout, sidebar, header)
    -> Server Component (page)
    -> DAL function (validates session + role >= STAFF)
    -> Prisma query
    -> PostgreSQL
    -> Response rendered as RSC

MUTATION FLOW (Server Action):
  Client Component (form submit)
    -> Server Action ('use server')
    -> DAL function (validates session + permission)
    -> Prisma mutation
    -> revalidatePath/revalidateTag
    -> Updated UI

WEBHOOK FLOW (Stripe/Cal.com):
  External Service
    -> POST /api/webhooks/stripe (or /cal)
    -> Signature verification
    -> DAL function (no user session, service-level access)
    -> Prisma mutation
    -> 200 OK response

FILE UPLOAD FLOW:
  Client Component (file picker)
    -> Server Action
    -> DAL auth check
    -> Vercel Blob upload (put())
    -> Save URL to database via Prisma
    -> Return blob URL to client
```

## Critical Architecture Decision: Data Access Layer as Security Boundary

**Confidence: HIGH** -- This is the officially recommended pattern from the Next.js team, reinforced by CVE-2025-29927.

### Why NOT Middleware for Auth

In March 2025, CVE-2025-29927 demonstrated that Next.js middleware can be bypassed via the `x-middleware-subrequest` header. While this was patched in Next.js 14.2.25 and 15.2.3, the security lesson is clear: **middleware is a UX optimization layer, not a security boundary**.

The Next.js team now explicitly recommends:
- Middleware for **redirects and UX optimization** (redirect unauthenticated users to login)
- **Data Access Layer** for **actual authorization enforcement** (every data query checks auth)

### DAL Pattern Implementation

```typescript
// src/lib/dal/auth.ts
import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

// Cached per-request session retrieval
export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

export const requireAuth = cache(async () => {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
});

export const requireRole = cache(async (minimumRole: string) => {
  const session = await requireAuth();
  // Role hierarchy check
  if (!hasMinimumRole(session.user.role, minimumRole)) {
    redirect('/access-denied');
  }
  return session;
});
```

```typescript
// src/lib/dal/customers.ts
import 'server-only';
import { requireRole } from './auth';
import { prisma } from '@/lib/db/prisma';

export async function getCustomers(filters?: CustomerFilters) {
  // Authorization happens HERE, not in middleware or components
  await requireRole('staff');

  return prisma.customer.findMany({
    where: buildWhereClause(filters),
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCustomer(id: string) {
  await requireRole('staff');
  return prisma.customer.findUnique({ where: { id } });
}

export async function createCustomer(data: CustomerCreateInput) {
  await requireRole('staff');
  return prisma.customer.create({ data });
}
```

Every DAL function:
1. Imports `'server-only'` -- cannot accidentally run on client
2. Checks session/role before touching the database
3. Returns minimal data (DTOs when needed, not full Prisma models with relations)

## Middleware Strategy

The middleware file should be **thin**. It handles:
1. Cookie-based session presence check (optimistic, NOT authoritative)
2. Redirect unauthenticated users away from protected route groups
3. Nothing else

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/portal'];
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie (optimistic check, NOT security)
  const sessionCookie = request.cookies.get('better-auth.session_token');
  const hasSession = !!sessionCookie;

  // Redirect unauthenticated users away from protected routes
  if (!hasSession && PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && AUTH_PAGES.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, images, and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
```

**The real auth check happens in the DAL.** If someone bypasses middleware, they hit the DAL's `requireAuth()` / `requireRole()` and get redirected anyway.

## Route Group Strategy

### Why Route Groups (Not Separate Apps)

| Approach | Pros | Cons |
|----------|------|------|
| **Route groups (chosen)** | Shared auth, single deploy, shared components, single DB client | Larger bundle if not careful |
| Separate Vercel projects | Full isolation | Auth sync nightmare, duplicated code, two deploys, CORS issues |
| Turborepo monorepo | Code sharing via packages | Overkill for this scale, operational complexity |

Route groups are the right choice because:
- Single studio, single domain (ink37tattoos.com)
- Shared authentication system (Better Auth serves all route groups)
- Shared database and Prisma client
- Shared UI primitives (Shadcn components)
- Simple Vercel deployment (one project)

### Route Group Isolation

Each route group gets its own:
- **Layout** -- completely independent visual chrome (public has nav/footer, dashboard has sidebar, portal has client nav)
- **Loading/error states** -- tailored to the context
- **Metadata** -- SEO metadata for public pages, no-index for dashboard/portal

Each route group shares:
- **Root layout** -- html/body structure, providers (QueryClient, ThemeProvider, AuthProvider)
- **UI primitives** -- `components/ui/*` (button, card, dialog, etc.)
- **DAL** -- all data access goes through the same layer
- **Auth** -- Better Auth session management

### URL Structure

| Route Group | URL Prefix | Auth Required | Layout |
|-------------|------------|---------------|--------|
| `(public)` | `/` (root) | No | Public nav + footer |
| `(auth)` | `/login`, `/register`, etc. | No (redirect if logged in) | Minimal centered |
| `(dashboard)` | `/dashboard/*` | Yes (STAFF+) | Sidebar + admin header |
| `(portal)` | `/portal/*` | Yes (USER) | Client portal nav |
| `(store)` | `/store/*` | No (auth for checkout) | Store nav + cart |

## Unified Database Schema Strategy

### Schema Merge Approach

The two existing schemas have significant overlap but different naming conventions and granularity. The merge strategy:

**1. Keep the public website schema as the base** -- it is more recent (Prisma 7, cleaner naming with `@@map` annotations).

**2. Merge admin-specific models in** -- the admin schema has models the public schema lacks:
- `clients` -> merge into `Customer` (add emergency contact fields, medical conditions)
- `tattoo_artists` -> Add as new model (even though single-artist now, future-proof)
- `appointments` -> Merge concepts into `Booking` (add duration, artistId, type enum)
- `tattoo_sessions` -> Add as new model (detailed session tracking with pricing)
- `tattoo_designs` (admin) -> Merge into `TattooDesign` (add tags, estimatedHours, popularity)
- `audit_logs` -> Add as new model
- `settings` -> Add as new model

**3. Resolve naming conflicts:**
- Admin uses `snake_case` table names (`clients`, `tattoo_sessions`)
- Public uses `camelCase` models with `@@map` to snake_case tables
- **Decision:** Use PascalCase Prisma models, `@@map` to snake_case tables (consistent with public schema pattern)

**4. Resolve ID strategy:**
- Admin uses `@default(cuid())`
- Public uses `@default(uuid())`
- **Decision:** Use `@default(uuid())` consistently (already in production on the public site)

### Unified Schema (Core Models)

```
User (Better Auth)
  |-- Account (OAuth)
  |-- Session
  |-- AuditLog (1:many)

Customer
  |-- Booking (1:many)
  |-- TattooSession (1:many)
  |-- TattooDesign (1:many, custom designs)
  |-- User? (optional link for portal access)

TattooArtist
  |-- Booking (1:many)
  |-- TattooSession (1:many)
  |-- TattooDesign (1:many)

Booking
  |-- Payment (1:many)
  |-- Customer? (optional)
  |-- TattooArtist? (optional)
  |-- Cal.com fields (calBookingUid, calEventTypeId, etc.)

TattooSession
  |-- Customer
  |-- TattooArtist
  |-- Payment tracking fields

TattooDesign
  |-- TattooArtist
  |-- Customer? (if custom)
  |-- Gallery display fields

Payment
  |-- Booking? (optional)
  |-- Stripe fields (stripeId, metadata)

Contact (standalone)
AuditLog (standalone with User FK)
Settings (key-value config store)
Verification (Better Auth)
RateLimit (standalone)

-- Analytics models (CalAnalyticsEvent, CalBookingFunnel, etc.) --
```

### Key Schema Decision: Customer-User Linking

For the future client portal, customers need to optionally link to a User account:

```prisma
model Customer {
  id         String  @id @default(uuid())
  userId     String? @unique  // Optional link to User for portal access
  user       User?   @relation(fields: [userId], references: [id])
  // ... existing fields plus merged admin fields
}
```

This enables:
- Existing customers (created by admin) have no User link
- When a client registers for the portal, their Customer record gets linked to their User
- Admin can pre-create Customer records, and clients claim them during registration
- DAL can scope portal queries: `where: { userId: session.user.id }`

## API Layer Architecture

### Server Actions vs API Routes: When to Use Each

| Use Case | Mechanism | Rationale |
|----------|-----------|-----------|
| Form submissions (contact, booking) | Server Action | Type-safe, progressive enhancement, no manual fetch |
| CRUD mutations (customers, appointments) | Server Action | Internal app mutations, called from components |
| Dashboard data fetching | Server Component + DAL | Direct database access in RSC, no API needed |
| Public gallery listing | Server Component + DAL | SSR/SSG with ISR, no client fetch needed |
| File upload | Server Action | Vercel Blob SDK works in server actions |
| Stripe webhooks | Route Handler (POST) | External service needs a static URL endpoint |
| Cal.com webhooks | Route Handler (POST) | External service needs a static URL endpoint |
| Health checks | Route Handler (GET) | External monitoring needs HTTP endpoints |
| CSRF token | Route Handler (GET) | Stateless token generation |
| Cron jobs | Route Handler (GET) | Vercel cron needs HTTP endpoint |
| TanStack Query client fetches | Route Handler (GET) | Client components that need polling/refetching |

### Server Action Pattern

```typescript
// src/app/(dashboard)/dashboard/customers/actions.ts
'use server';

import { createCustomer, updateCustomer } from '@/lib/dal/customers';
import { customerCreateSchema } from '@/lib/validations/customer';
import { revalidatePath } from 'next/cache';

export async function createCustomerAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const validated = customerCreateSchema.parse(raw);

  const customer = await createCustomer(validated); // DAL handles auth

  revalidatePath('/dashboard/customers');
  return { success: true, id: customer.id };
}
```

### Route Handler Pattern (Webhooks)

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processStripeEvent } from '@/lib/stripe/webhooks';

export async function POST(request: NextRequest) {
  const body = await request.text(); // Raw body for signature verification
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    await processStripeEvent(body, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
```

## Shared Component Strategy

### Layer 1: UI Primitives (`components/ui/`)

These are Shadcn/Radix components used everywhere. Both source projects already have significant overlap here. The consolidation approach:

1. Take the **superset** of both projects' UI components
2. Align on latest Shadcn/Radix versions
3. Components: button, card, dialog, input, label, select, badge, skeleton, table, tabs, tooltip, sheet, separator, accordion, alert-dialog, checkbox, dropdown-menu, popover, radio-group, slider, switch, sonner (toast), and more from admin (avatar, breadcrumb, calendar, carousel, chart, collapsible, command, drawer, form, pagination, progress, scroll-area, sidebar)

### Layer 2: Shared Components (`components/shared/`)

Cross-concern components used by multiple route groups:
- Error boundaries (generic)
- Loading spinners/skeletons (generic)
- Data tables (used in admin and potentially portal)
- Theme toggle
- Auth status indicator

### Layer 3: Route-Group-Specific Components

| Folder | Components | Used By |
|--------|------------|---------|
| `components/public/` | NavigationSystem, Footer, Hero, GalleryClient, BookingModal, ContactForm, CTASection, ServiceCard, SEO components, Mobile components | `(public)` route group only |
| `components/dashboard/` | AppSidebar, SiteHeader, DashboardStatsCards, MetricsCard, ChartAreaInteractive, CustomerDialog, AppointmentDialog, DataTable (admin variant), MediaUpload | `(dashboard)` route group only |
| `components/auth/` | LoginForm, LogoutButton, AdminRoute guard, AuthErrorBoundary | `(auth)` route group |
| `components/portal/` | (Future) ClientNav, AppointmentHistory, DesignViewer | `(portal)` route group |
| `components/store/` | (Future) ProductGrid, Cart, CheckoutForm | `(store)` route group |

### Tree-Shaking Benefit

Because route groups have separate layouts, components from `components/dashboard/` are never loaded in the public site bundle. Next.js App Router's code-splitting handles this automatically as long as imports are scoped to the correct route group pages.

## Auth Architecture: Better Auth with Extended RBAC

### Role Hierarchy (Existing + Extended)

```
SUPER_ADMIN (level 4) -- Full system access, all permissions
  ADMIN (level 3)     -- User management, system config, audit logs
    MANAGER (level 2) -- Delete operations, analytics, exports, bulk ops
      STAFF (level 1) -- Read/create/update customers, appointments, media, dashboard
        USER (level 0) -- Client portal access (own data only)
```

### Better Auth Configuration (Consolidated)

```typescript
// src/lib/auth/auth.ts
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { prisma } from '@/lib/db/prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  plugins: [
    nextCookies(),
    admin({
      // Custom access control can be defined here
      // using createAccessControl + custom roles
    }),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // 24 hours
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
});
```

### Permission Enforcement Points

```
Middleware (optimistic)     -> Session cookie exists? Redirect if not.
Layout (server component)  -> getSession() in layout, show/hide UI.
DAL (authoritative)        -> requireRole() before every data access.
Client (cosmetic)          -> useSession() to show/hide UI elements.
```

The DAL is the **only** authoritative check. Everything else is UX optimization.

## File/Image Storage Architecture

### Vercel Blob for All Media

Both repos already use Vercel Blob. The consolidated approach:

```typescript
// src/lib/storage/blob.ts
import 'server-only';
import { put, del, list } from '@vercel/blob';

export async function uploadImage(file: File, folder: string) {
  const blob = await put(`${folder}/${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  });
  return blob;
}

export async function deleteImage(url: string) {
  await del(url);
}
```

### Image Optimization Pipeline

```
Upload -> Vercel Blob (storage)
  -> Save blob URL to database (TattooDesign.fileUrl)
  -> Serve via next/image component (automatic WebP/AVIF, resizing)
  -> CDN caching (Vercel Edge Network)
```

No need for a separate thumbnail generation pipeline -- `next/image` handles responsive sizing and format optimization at the edge.

### Storage Organization

```
blob-store/
  gallery/          # Portfolio images (public)
  media/            # Admin-managed media (images + videos)
  designs/          # Custom design files (private, per-customer)
  products/         # Future: store product images
  uploads/          # Temporary upload staging
```

## Payment Webhook Architecture

### Stripe Integration (Future Phase)

```
Client (checkout)
  -> Server Action: createCheckoutSession()
  -> Stripe API: create session with line items
  -> Redirect to Stripe Checkout (or embedded checkout)
  -> User completes payment
  -> Stripe sends webhook to POST /api/webhooks/stripe
  -> Verify signature (stripe.webhooks.constructEvent)
  -> Process event:
      checkout.session.completed -> Create/update Payment record
      payment_intent.succeeded   -> Mark Payment as COMPLETED
      charge.refunded            -> Mark Payment as REFUNDED
  -> 200 OK

Database is source of truth for app.
Stripe is source of truth for Stripe.
Webhooks keep them in sync.
```

### Key Webhook Route Configuration

Webhook routes must:
1. NOT go through CSRF protection (external requests)
2. NOT go through session auth (Stripe signs with webhook secret)
3. Use `request.text()` not `request.json()` (raw body for signature verification)
4. Be idempotent (Stripe retries on failure)

## Patterns to Follow

### Pattern 1: Feature Colocation

**What:** Keep feature-specific logic (components, actions, types) close to their routes.
**When:** For complex features with multiple related files.
**Example:**

```
app/(dashboard)/dashboard/customers/
  page.tsx           # Server component entry point
  actions.ts         # Server actions for customer CRUD
  loading.tsx        # Loading skeleton
  error.tsx          # Error boundary
  _components/       # Colocated components (underscore = not a route)
    customers-table.tsx
    customer-dialog.tsx
    customer-filters.tsx
```

### Pattern 2: Server Component Data Fetching

**What:** Fetch data in Server Components, pass to Client Components as props.
**When:** Always, unless you need client-side polling or real-time updates.
**Example:**

```typescript
// page.tsx (Server Component)
import { getCustomers } from '@/lib/dal/customers';
import { CustomersTable } from './_components/customers-table';

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomersTable data={customers} />;
}
```

### Pattern 3: Optimistic UI with Server Actions

**What:** Use `useOptimistic` with Server Actions for instant UI feedback.
**When:** For mutations where immediate visual feedback matters (status updates, toggles).

### Pattern 4: Parallel Routes for Dashboard Widgets

**What:** Use `@slot` parallel routes for dashboard overview cards that load independently.
**When:** Dashboard overview page with multiple data-heavy widgets.
**Why:** Each widget streams in independently, no waterfall loading.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Auth in Middleware Only

**What:** Relying solely on middleware for authentication/authorization.
**Why bad:** CVE-2025-29927 proved middleware can be bypassed. Middleware runs at the edge and cannot make database calls in older runtimes.
**Instead:** Use middleware for optimistic redirects, enforce auth in the DAL.

### Anti-Pattern 2: Direct Prisma Calls in Components

**What:** Importing Prisma directly in page components or server actions.
**Why bad:** Scatters authorization logic, makes it easy to forget auth checks.
**Instead:** Always go through the DAL. Components call DAL functions, never Prisma directly.

### Anti-Pattern 3: Duplicating Types Between Repos

**What:** Creating manual TypeScript interfaces that mirror Prisma models.
**Why bad:** Types drift from schema, causes runtime errors.
**Instead:** Import types from `@prisma/client`. Extend with `Prisma.CustomerGetPayload<>` for typed includes.

### Anti-Pattern 4: Fat Client Components

**What:** Making everything a Client Component to use hooks/state.
**Why bad:** Bloats client bundle, loses SSR/streaming benefits.
**Instead:** Keep components as Server Components by default. Extract interactive bits into small Client Components.

### Anti-Pattern 5: Shared Layout Between Public and Admin

**What:** Using the root layout for navigation that serves both public and admin.
**Why bad:** Public users load admin nav code, admin loads SEO scripts.
**Instead:** Route groups each get their own layout. Root layout is minimal (html, body, providers only).

## Build Order (Dependencies)

This ordering reflects what blocks what. Each phase can ship independently.

```
Phase 1: Foundation
  [Project scaffold] -> [Prisma unified schema] -> [Better Auth config]
                                                 -> [DAL skeleton]
  These must exist before anything else works.

Phase 2: Public Site
  [DAL: gallery, bookings, contact] -> [(public) route group pages]
                                    -> [Cal.com integration]
                                    -> [SEO infrastructure]
  Depends on: Foundation (schema, DAL)

Phase 3: Admin Dashboard
  [DAL: customers, appointments, sessions, media, analytics]
    -> [(dashboard) route group pages]
    -> [Sidebar/header layout]
    -> [Data tables, charts]
  Depends on: Foundation (schema, DAL, auth)

Phase 4: Payments
  [Stripe integration] -> [Webhook handler] -> [DAL: payments]
                                             -> [Payment UI in dashboard]
  Depends on: Foundation (schema), Dashboard (admin UI for viewing payments)

Phase 5: Client Portal
  [Customer-User linking] -> [DAL: scoped queries]
                          -> [(portal) route group]
                          -> [Client registration flow]
  Depends on: Foundation (auth, schema), Public site (customer records exist)

Phase 6: Online Store
  [Product schema] -> [DAL: products, orders]
                   -> [(store) route group]
                   -> [Cart/checkout with Stripe]
  Depends on: Foundation, Payments (Stripe already integrated)
```

### Dependency Graph (What Blocks What)

```
Prisma Schema ─────┬─> DAL Functions ──┬─> Public Site Pages
                   │                   ├─> Dashboard Pages
                   │                   ├─> Portal Pages (future)
                   │                   └─> Store Pages (future)
                   │
Better Auth ───────┼─> Middleware (thin)
                   │
                   └─> Auth DAL Functions
                        ├─> requireAuth()
                        └─> requireRole()

Vercel Blob ───────────> Storage DAL Functions
                          ├─> Gallery (public)
                          └─> Media Management (admin)

Stripe SDK ────────────> Webhook Route Handler
                          └─> Payment DAL Functions

Cal.com SDK ───────────> Booking Integration
                          ├─> Webhook Route Handler
                          └─> Embed Components (public)
```

## Scalability Considerations

| Concern | Current (1 artist) | At 10K clients | Notes |
|---------|-------------------|----------------|-------|
| Database | Single PostgreSQL | Same (with connection pooling) | Prisma Accelerate already in use for connection pooling |
| Auth sessions | In-database | In-database (fine at this scale) | Better Auth handles session cleanup |
| Image storage | Vercel Blob | Vercel Blob (S3-priced, scales infinitely) | CDN handles traffic |
| Gallery loading | SSR + ISR | SSR + ISR with pagination | Already paginated, add cursor-based if needed |
| Admin dashboard | Direct queries | Add caching layer (TanStack Query staleTime) | Already using TanStack Query |
| Search | SQL LIKE queries | Consider pg_trgm or Meilisearch | Only if search becomes a bottleneck |
| Real-time | Not needed | SSE for admin notifications | Only if real-time features added |

This is a single-studio platform. Scalability to millions of users is explicitly out of scope. The architecture handles thousands of clients and tens of thousands of gallery views comfortably with standard PostgreSQL + Vercel Edge caching.

## Sources

- [Next.js Official Docs -- App Router](https://nextjs.org/docs/app)
- [Next.js Data Security Guide (DAL Pattern)](https://nextjs.org/docs/app/guides/data-security)
- [CVE-2025-29927 Analysis -- ProjectDiscovery](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Next.js Security Blog Post](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Better Auth -- Admin Plugin Docs](https://better-auth.com/docs/plugins/admin)
- [Better Auth -- Next.js Integration](https://better-auth.com/docs/integrations/next)
- [MakerKit -- Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)
- [MakerKit -- Next.js 16 Project Structure Guide](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure)
- [Stripe + Next.js Complete Guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)
- [DEV Community -- Next.js App Router Patterns 2026](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146)
- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob)
- [Next.js Authentication Best Practices 2025](https://www.franciscomoretti.com/blog/modern-nextjs-authentication-best-practices)
