# Phase 1: Foundation - Research

**Researched:** 2026-03-20
**Domain:** Next.js 16 project scaffold, Prisma 7 schema merge, Better Auth RBAC, data access patterns, state management
**Confidence:** HIGH

## Summary

Phase 1 builds the unified project scaffold from scratch -- new Next.js 16 project, fresh Prisma 7 schema (superset merge of both repos), Better Auth with RBAC, Data Access Layer, route groups, and aligned packages. Both source repos are on modern stacks already (public site: Next.js 16.1.1/Prisma 7.2.0, admin: Next.js 15.3.8/Prisma 6.10.0), so the public site's versions serve as the baseline. The fresh database approach eliminates schema migration risk entirely.

Key findings: (1) The DAL pattern is officially recommended by the Next.js team and is the right approach for this project. (2) Next.js 16 renames `middleware.ts` to `proxy.ts` and provides built-in CSRF protection for Server Actions -- the admin's hand-rolled CSRF/security implementations are largely redundant. (3) Better Auth v1.5.5 has a known compatibility concern with Prisma 7's driver adapter pattern -- may need to use native PrismaClient connection instead. (4) Neon is the recommended cloud Postgres provider for this use case. (5) Keep both TanStack Query and Zustand -- they solve different problems. (6) The admin's Cal.com analytics models (CalAnalyticsEvent, CalBookingFunnel, CalServiceAnalytics, CalRealtimeMetrics) are custom-built tracking tables with no actual Cal.com data pipeline feeding them -- they should be omitted from the Phase 1 schema.

**Primary recommendation:** Build a fresh Next.js 16 project with Prisma 7 (clean schema, fresh DB), Better Auth v1.5.5 with the admin plugin for RBAC, a `server-only` DAL layer, and `proxy.ts` for auth routing. Use Neon for Postgres. Omit the Cal.com analytics models entirely.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Superset merge for Customer model -- combine all fields from both repos (admin's emergency contacts + medical arrays + public's address fields). Nullable where one side didn't have the field.
- UUID everywhere -- standardize on `uuid()` for all ID generation.
- Fresh schema approach -- create the unified schema clean rather than reconciling two migration histories.
- Payment model deferred to Phase 3.
- Gallery/portfolio content MUST be publicly accessible -- no auth required to view artwork.
- Keep Prisma (do not switch to Drizzle) -- both repos already use Prisma, Prisma 7 closed the DX gap.
- Data preservation NOT required -- fresh start acceptable, low traffic.
- Downtime acceptable -- fix forward, no rollback plan needed.
- Fresh database -- create new database instance with clean migration history.

### Claude's Discretion
- Route group internal structure and file organization
- Shared UI component deduplication strategy
- Package manager choice (npm vs bun vs pnpm)
- ESLint/Prettier/TypeScript configuration
- Environment variable naming conventions
- Folder structure within src/

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Unified Prisma schema merges both repos | Schema analysis complete -- superset merge strategy defined, table-by-table mapping documented, Cal.com analytics models flagged for omission |
| FOUND-02 | Data Access Layer with server-only auth checks | DAL pattern validated as Next.js official recommendation; implementation pattern documented with code examples |
| FOUND-03 | Better Auth with unified RBAC | Better Auth v1.5.5 researched; admin plugin provides role management; Prisma adapter compatibility issue documented with workaround |
| FOUND-04 | Route groups: (public), (auth), (dashboard), (portal), (store) | Next.js 16 route group structure documented; proxy.ts replaces middleware.ts |
| FOUND-05 | Shared UI component library | Shadcn/Radix deduplication strategy defined; both repos use same primitives |
| FOUND-06 | Unified state management | TanStack Query v5 for server state + Zustand v5 for client UI state confirmed as best practice |
| FOUND-07 | All packages aligned to latest versions | Version matrix documented with verified npm versions; breaking changes catalogued for Prisma 7, Zod 4, Tailwind CSS 4, Next.js 16 |
| FOUND-08 | Environment variable validation with Zod | Zod 4 migration documented; env validation pattern with `server-only` defined |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.0 | React framework | Latest stable; public site already on 16.1.1 |
| react / react-dom | 19.2.3 | UI library | Already used by public site |
| prisma / @prisma/client | 7.5.0 | ORM + type-safe DB client | Both repos use Prisma; v7 is ESM-native, driver-adapter based |
| @prisma/adapter-pg | 7.5.0 | PostgreSQL driver adapter | Required by Prisma 7 -- replaces internal engine |
| pg | latest | PostgreSQL driver | Required by @prisma/adapter-pg |
| better-auth | 1.5.5 | Authentication framework | Already used in admin; v1.5 has security improvements |
| zod | 4.3.6 | Schema validation | Public site already on Zod 4; admin needs upgrade from Zod 3 |
| tailwindcss | 4.2.2 | CSS framework | Both repos use Tailwind; v4 is CSS-first config |
| @tailwindcss/postcss | 4.2.2 | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 with Next.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.91.3 | Server state management | All data fetching / caching / mutations |
| zustand | 5.0.12 | Client state management | UI state: sidebar, modals, filters, preferences |
| server-only | 0.0.1 | Build-time server boundary | Import in all DAL files and server-only modules |
| @radix-ui/* | latest | Accessible UI primitives | All form inputs, dialogs, dropdowns, etc. |
| class-variance-authority | 0.7.1 | Component variant styling | Shadcn component pattern |
| clsx + tailwind-merge | latest | Class name composition | All component className props |
| lucide-react | latest | Icon library | Used by both repos |
| next-themes | 0.4.6 | Theme management | Dark/light mode |
| sonner | latest | Toast notifications | User feedback |
| date-fns | 4.x | Date utilities | Date formatting/manipulation |
| @calcom/embed-react | 1.5.3 | Cal.com booking embed | Public booking pages (Phase 2, but schema prep in Phase 1) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Neon (Postgres) | Supabase | Supabase is BaaS with built-in auth/storage -- overkill when using Better Auth + Vercel Blob; Neon is pure Postgres with instant branching and Vercel-native integration |
| Neon (Postgres) | Vercel Postgres | Vercel Postgres IS Neon under the hood but more expensive; go direct with Neon |
| Zustand | No client state lib | React 19 `use` + URL state could handle some cases, but sidebar/modal/filter state genuinely benefits from a lightweight store |
| better-auth | @supabase/ssr | Would require Supabase platform lock-in; Better Auth is already implemented in admin |

**Installation:**
```bash
# Initialize project
npm init -y

# Core framework
npm install next@16.2.0 react@19.2.3 react-dom@19.2.3

# Database
npm install @prisma/client@7.5.0 @prisma/adapter-pg@7.5.0 pg
npm install -D prisma@7.5.0

# Auth
npm install better-auth@1.5.5

# Validation
npm install zod@4.3.6

# State management
npm install @tanstack/react-query@5.91.3 zustand@5.0.12

# UI framework
npm install -D tailwindcss@4.2.2 @tailwindcss/postcss@4.2.2 postcss

# Server boundary
npm install server-only

# Utilities
npm install class-variance-authority clsx tailwind-merge lucide-react next-themes sonner date-fns

# Dev tools
npm install -D typescript@5.9.3 @types/node @types/react @types/react-dom
npm install -D eslint eslint-config-next@16.2.0
```

## Architecture Patterns

### Recommended Project Structure

```
ink37-tattoos/
├── prisma/
│   ├── schema.prisma            # Unified schema (all models)
│   └── seed.ts                  # Development seed data
├── prisma.config.ts             # Prisma 7 runtime config (connection URL)
├── src/
│   ├── app/
│   │   ├── (public)/            # Public pages (gallery, services, about, contact)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx         # Home page (placeholder Phase 1)
│   │   ├── (auth)/              # Auth pages (login, register, verify)
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/         # Admin dashboard
│   │   │   ├── layout.tsx       # Auth-gated layout
│   │   │   └── dashboard/page.tsx
│   │   ├── (portal)/            # Client portal (Phase 4)
│   │   │   ├── layout.tsx
│   │   │   └── portal/page.tsx
│   │   ├── (store)/             # Online store (Phase 5)
│   │   │   ├── layout.tsx
│   │   │   └── store/page.tsx
│   │   ├── api/
│   │   │   └── auth/[...all]/route.ts  # Better Auth catch-all
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Tailwind v4 imports
│   ├── lib/
│   │   ├── auth.ts              # Better Auth server config
│   │   ├── auth-client.ts       # Better Auth client
│   │   ├── dal/                 # Data Access Layer
│   │   │   ├── index.ts         # Re-exports
│   │   │   ├── customers.ts     # Customer queries (server-only)
│   │   │   ├── appointments.ts  # Appointment queries (server-only)
│   │   │   ├── designs.ts       # Design/gallery queries (server-only)
│   │   │   └── users.ts         # User management queries (server-only)
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── env.ts               # Zod env validation (server-only)
│   │   └── utils.ts             # Shared utilities (cn, etc.)
│   ├── components/
│   │   ├── ui/                  # Shadcn primitives
│   │   └── shared/              # App-level shared components
│   ├── stores/                  # Zustand stores
│   │   └── ui-store.ts
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # Shared TypeScript types
│   └── styles/                  # Additional CSS if needed
├── proxy.ts                     # Next.js 16 proxy (replaces middleware.ts)
├── next.config.ts               # Next.js configuration
├── tsconfig.json
├── package.json                 # type: "module" for Prisma 7 ESM
└── .env.local                   # Environment variables
```

### Pattern 1: Data Access Layer (DAL)

**What:** Centralized server-only module for all database operations with embedded auth checks.
**When to use:** Every database read and write in the application.

```typescript
// src/lib/dal/customers.ts
import 'server-only';

import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Public DAL function -- no auth required (gallery data)
export const getPublicDesigns = cache(async (filters?: { style?: string }) => {
  return db.tattooDesign.findMany({
    where: {
      isApproved: true,
      ...(filters?.style && { designType: filters.style }),
    },
    orderBy: { createdAt: 'desc' },
  });
});

// Authenticated DAL function -- requires admin role
export const getCustomers = cache(async () => {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  // Role check embedded in DAL
  const role = session.user.role;
  if (!role || !['staff', 'manager', 'admin', 'super_admin'].includes(role)) {
    throw new Error('Insufficient permissions');
  }

  return db.customer.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      // Omit sensitive fields like medical data unless specifically requested
    },
  });
});
```

### Pattern 2: Prisma 7 Client Singleton

**What:** Single Prisma client instance with driver adapter.
**When to use:** Imported only by DAL files, never directly by components or actions.

```typescript
// src/lib/db.ts
import 'server-only';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

### Pattern 3: Better Auth Configuration

**What:** Better Auth server setup with admin plugin for RBAC.
**When to use:** Single auth configuration serving all route groups.

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { db } from '@/lib/db';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  plugins: [
    nextCookies(),
    admin({
      defaultRole: 'user',
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,       // 24 hours
  },
});

// API route handler
// src/app/api/auth/[...all]/route.ts
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';
export const { GET, POST } = toNextJsHandler(auth);
```

**IMPORTANT: Prisma 7 + Better Auth Compatibility Note**

There is a reported issue with Better Auth's `prismaAdapter` and Prisma 7's `@prisma/adapter-pg` driver adapter pattern (GitHub Discussion #6529). If the adapter-based PrismaClient causes `P1010 "User was denied access"` errors with Better Auth, the workaround is to create a **separate** PrismaClient instance for Better Auth that uses the native connection (without the driver adapter):

```typescript
// Workaround if adapter-based client fails with Better Auth
import { PrismaClient } from '@prisma/client';

const authPrisma = new PrismaClient(); // native connection, no adapter
export const auth = betterAuth({
  database: prismaAdapter(authPrisma, { provider: 'postgresql' }),
  // ...
});
```

### Pattern 4: Server Actions (Thin Wrappers)

**What:** Server Actions that delegate to DAL, not containing business logic directly.
**When to use:** All mutations from Client Components.

```typescript
// src/app/(dashboard)/dashboard/customers/actions.ts
'use server';

import { createCustomer, updateCustomer } from '@/lib/dal/customers';
import { z } from 'zod';

const CreateCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email().optional(),
  phone: z.string().optional(),
});

export async function createCustomerAction(formData: FormData) {
  const parsed = CreateCustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }
  // DAL handles auth check internally
  return createCustomer(parsed.data);
}
```

### Pattern 5: Proxy-Based Auth Routing (Next.js 16)

**What:** `proxy.ts` replaces `middleware.ts` for request interception.
**When to use:** Route protection, redirects, and header injection.

```typescript
// proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dashboard routes require authentication
  if (pathname.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get('better-auth.session_token');
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Portal routes require authentication
  if (pathname.startsWith('/portal')) {
    const sessionToken = request.cookies.get('better-auth.session_token');
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}
```

### Anti-Patterns to Avoid

- **Direct Prisma imports in components:** Never import `db` outside of DAL files. The DAL is the security boundary.
- **Auth checks only in proxy.ts:** Proxy provides UX-level redirects; real authorization MUST happen in the DAL. Proxy is not a security boundary (lesson from CVE-2025-29927).
- **Heavy business logic in Server Actions:** Actions should validate input with Zod and delegate to DAL functions. Keep them thin.
- **Mixing Prisma 6 and 7 patterns:** Prisma 7 requires driver adapters and `prisma.config.ts`. Do not use `datasource.url` in schema or old generator provider names.
- **Hand-rolling CSRF for Server Actions:** Next.js 16 provides built-in CSRF via Origin/Host header comparison. Only add custom CSRF for Route Handlers used by external clients.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSRF protection for Server Actions | Custom token generation/validation | Next.js built-in Origin/Host check | Next.js 16 handles this natively; custom CSRF adds complexity for no gain on actions. Upgrade to 16.1.7+ to fix CVE-2026-27978. |
| Security headers | Custom middleware header injection | `next.config.ts` `headers()` for static headers; `proxy.ts` only for dynamic CSP nonces | Declarative config is simpler, more maintainable, harder to misconfigure |
| Rate limiting | In-memory Map-based limiter | Vercel's built-in rate limiting OR upstash/ratelimit with Redis | In-memory rate limiting doesn't work across serverless function instances |
| Authentication | Custom session management | Better Auth with admin plugin | Already implemented, handles sessions, OAuth, email verification, ban, impersonation |
| Database connection pooling | Manual PG pool management | Prisma 7 driver adapter + Neon connection pooling | Neon's pooler handles serverless connection management natively |
| Input sanitization (DOMPurify) | isomorphic-dompurify server-side | Zod validation + React's built-in XSS protection | React escapes output by default; Zod validates input shapes; DOMPurify is for rendering raw HTML which this app shouldn't do |

**Key insight:** The admin repo has ~800 lines of hand-rolled security infrastructure (CSRF, rate limiting, security headers, database security) that is largely redundant with Next.js 16 built-in features + Better Auth + Vercel platform capabilities. Don't port these files -- use the platform.

## Common Pitfalls

### Pitfall 1: Prisma 7 ESM Requirements

**What goes wrong:** Build fails because Prisma 7 requires ESM.
**Why it happens:** Prisma 7 is ESM-only. Missing `"type": "module"` in package.json or wrong tsconfig settings.
**How to avoid:** Set `"type": "module"` in package.json, use `"module": "ESNext"` and `"moduleResolution": "bundler"` in tsconfig.json. Use `prisma-client` (not `prisma-client-js`) as the generator provider.
**Warning signs:** `ERR_REQUIRE_ESM` errors, "Cannot use import statement outside a module".

### Pitfall 2: Prisma 7 Configuration Migration

**What goes wrong:** `prisma migrate dev` fails because it can't find database URL.
**Why it happens:** Prisma 7 removes `datasource.url` from schema. Connection URL must be in `prisma.config.ts`.
**How to avoid:** Create `prisma.config.ts` at project root with `defineConfig()` that reads `DATABASE_URL` from env.
**Warning signs:** "datasource url is required" errors, migration commands failing silently.

### Pitfall 3: Better Auth + Prisma 7 Driver Adapter Compatibility

**What goes wrong:** Better Auth's `prismaAdapter` throws `P1010` errors with Prisma 7's `@prisma/adapter-pg`.
**Why it happens:** The adapter-based PrismaClient handles connections differently than the native client.
**How to avoid:** Test early. If adapter-based client fails, use a separate native PrismaClient for Better Auth.
**Warning signs:** Runtime errors on auth endpoints, "User was denied access" messages.

### Pitfall 4: Better Auth Table Name Conflicts

**What goes wrong:** Better Auth expects specific table names that conflict with your schema.
**Why it happens:** The two source repos map Better Auth tables differently -- public site uses `@@map("accounts")` (plural), admin uses `@@map("account")` (singular).
**How to avoid:** Use Better Auth CLI to generate the expected schema (`npx @better-auth/cli generate`), then integrate those table definitions into the unified schema. Better Auth's expectations win -- match whatever it generates.
**Warning signs:** Auth routes return 500 errors, "table not found" in logs.

### Pitfall 5: Zod 4 String Validator Changes

**What goes wrong:** `z.string().email()` works but the recommended pattern is now `z.email()`.
**Why it happens:** Zod 4 moved string format validators to top-level functions.
**How to avoid:** Use `z.email()`, `z.uuid()`, `z.url()` etc. Also note `z.string().uuid()` validation is stricter in v4 (RFC 4122 compliant) -- use `z.guid()` if existing UUIDs don't comply.
**Warning signs:** Validation failures on data that worked with Zod 3.

### Pitfall 6: Tailwind CSS 4 Config Migration

**What goes wrong:** Styles break or classes don't apply after upgrading.
**Why it happens:** Tailwind v4 replaces `tailwind.config.js` with CSS-first `@theme` configuration. Border defaults changed from `gray-200` to `currentColor`. Several utility names renamed (shadow, rounded sizes).
**How to avoid:** Since this is a fresh project, start with Tailwind v4 patterns from scratch. Use `@import "tailwindcss"` in CSS, configure theme via `@theme {}` in CSS. Don't carry over old `tailwind.config.js` files.
**Warning signs:** Missing styles, unexpected border colors, wrong shadow/rounded sizes.

### Pitfall 7: Proxy.ts vs Middleware.ts (Next.js 16)

**What goes wrong:** Using deprecated `middleware.ts` which will be removed in a future version.
**Why it happens:** Next.js 16 renames middleware.ts to proxy.ts, moving from Edge to Node.js runtime.
**How to avoid:** Use `proxy.ts` at project root, export a function named `proxy` (not `middleware`). Config flags rename too: `skipProxyUrlNormalize` instead of `skipMiddlewareUrlNormalize`.
**Warning signs:** Deprecation warnings, Edge runtime limitations.

## Code Examples

### Prisma 7 Configuration (prisma.config.ts)

```typescript
// prisma.config.ts
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  migrate: {
    async resolveUrl() {
      return process.env.DATABASE_URL!;
    },
  },
});
```

### Prisma 7 Schema Generator

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

### Zod 4 Environment Validation

```typescript
// src/lib/env.ts
import 'server-only';

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  CAL_API_KEY: z.string().optional(),
  NEXT_PUBLIC_CAL_USERNAME: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  VERCEL_BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

### Tailwind CSS 4 Setup

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --color-brand: oklch(0.7 0.15 250);
  --color-background: oklch(0.98 0 0);
  --color-foreground: oklch(0.15 0 0);
  /* Extend as needed */
}
```

## Schema Merge Analysis

### Models to Include in Phase 1

| Unified Model | Source: Public | Source: Admin | Notes |
|---------------|---------------|---------------|-------|
| User | User (uuid, @@map("user")) | User (cuid, @@map("user")) | Better Auth managed -- use UUID, include banned/banReason/banExpires from public schema |
| Session | Session (uuid) | Session (cuid) | Better Auth managed -- include impersonatedBy from public schema |
| Account | Account (uuid, @@map("accounts")) | Account (cuid, @@map("account")) | Better Auth managed -- use whatever table name Better Auth CLI generates |
| Verification | Verification (uuid) | Verification (cuid) | Better Auth managed |
| Customer | Customer (uuid) | clients (cuid) | **Superset merge** -- all fields from both, nullable where needed |
| Booking | Booking (uuid) | appointments (cuid) | Merge into single Appointment model with Cal.com fields |
| TattooDesign | TattooDesign (uuid) | tattoo_designs (cuid) | Merge into single unified model |
| TattooSession | (none) | tattoo_sessions (cuid) | Keep as separate model for session tracking |
| TattooArtist | (inline fields) | tattoo_artists (cuid) | Include -- needed for multi-artist prep even if single artist now |
| Contact | Contact (uuid) | (none) | Keep from public schema |
| AuditLog | (none) | audit_logs (cuid) | Keep from admin schema |
| Settings | (none) | settings (cuid) | Keep from admin schema -- key/value pattern is fine for studio config |

### Models to OMIT from Phase 1

| Model | Source | Reason |
|-------|--------|--------|
| Payment | Public schema | Deferred to Phase 3 per user decision |
| RateLimit | Public schema | Don't use DB for rate limiting -- use platform-level solution |
| CalAnalyticsEvent | Public schema | Custom analytics tracking with no actual data pipeline. These tables exist in the schema but the public site has no mechanism to populate them with real Cal.com data. The Cal.com API client has functions for fetching bookings/event types but nothing feeds into these analytics models. Rebuild tracking properly in Phase 2 if analytics are needed. |
| CalBookingFunnel | Public schema | Same as above -- aspirational tracking tables with no data flow |
| CalServiceAnalytics | Public schema | Same as above |
| CalRealtimeMetrics | Public schema | Same as above |

### Customer Superset Merge Detail

```
Unified Customer model fields:
- id: String @id @default(uuid())
- firstName: String
- lastName: String
- email: String? @unique              -- From both (required in admin, optional in public)
- phone: String?                      -- From both (required in admin, optional in public)
- userId: String? @unique             -- NEW: optional FK to User for portal linking (Phase 4)
- dateOfBirth: DateTime?              -- From admin (required -> now optional)
- address: String?                    -- From public
- city: String?                       -- From public
- state: String?                      -- From public
- postalCode: String?                 -- From public
- country: String?                    -- From public
- emergencyName: String?              -- From admin (required -> now optional)
- emergencyPhone: String?             -- From admin (required -> now optional)
- emergencyRel: String?               -- From admin (required -> now optional)
- allergies: String[]                 -- From admin (keep as array)
- medicalConditions: String[]         -- From admin (renamed from medicalConds)
- preferredArtist: String?            -- From admin
- birthDate: DateTime?                -- From public (redundant with dateOfBirth, pick one)
- notes: String?                      -- From public
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
```

**Decision needed:** `dateOfBirth` (admin) vs `birthDate` (public) -- use `dateOfBirth` as the canonical name (more descriptive).

### Appointment/Booking Merge

The admin has separate `appointments` and `tattoo_sessions` models. The public site has a single `Booking` model that combines scheduling with Cal.com data. Recommendation:

- **Appointment model:** Scheduling and status tracking (merge admin's `appointments` + public's `Booking` Cal.com fields). This is the "when are you coming in?" record.
- **TattooSession model:** Work record for completed sessions (keep admin's `tattoo_sessions`). This is the "what did we do?" record.
- An Appointment can optionally link to a TattooSession once work begins.

### Artist Model Decision

Include `TattooArtist` in Phase 1. Even for a single-artist studio:
1. The admin schema already has it with appointments and sessions referencing it
2. It provides a clean FK for designs and sessions rather than inline strings
3. Low cost -- single row, but enables multi-artist later without schema changes

## Database Provider Recommendation

**Recommendation: Neon**

| Criteria | Neon | Supabase | Vercel Postgres |
|----------|------|----------|----------------|
| Pure Postgres | Yes | Yes (+ BaaS extras) | Yes (is Neon) |
| Scale to zero | Yes | No (always-on) | Yes (via Neon) |
| Vercel integration | Native | Good | Native |
| Branching | Instant (copy-on-write) | Slower (migration-based) | Via Neon |
| Price (low traffic) | Free tier generous | Free tier generous | More expensive than Neon direct |
| Auth bundled | No (BYO) | Yes | No |
| Relevance | Pure DB -- we use Better Auth | Redundant auth/storage | Just Neon with markup |

**Why Neon:** This project uses Better Auth (not Supabase Auth), Vercel Blob (not Supabase Storage), and has no need for Supabase's realtime features. Neon gives pure serverless Postgres with instant branching for previews, scale-to-zero for cost savings, and native Vercel integration. Vercel Postgres is just Neon with higher pricing.

**Neon free tier includes:** 0.5 GiB storage, autosuspend after 5 min idle, 1 branch (more on paid). Sufficient for a low-traffic tattoo studio.

## State Management Decision

**Recommendation: TanStack Query v5 + Zustand v5 (keep both)**

The admin repo's Zustand usage is legitimate -- sidebar state, modal state, loading indicators, search filters, time range selections, and user preferences. These are genuinely client-side concerns that TanStack Query doesn't handle.

**TanStack Query v5** owns:
- All server data (customers, appointments, sessions, designs)
- Caching, background refetching, optimistic updates
- Pagination, infinite scroll queries

**Zustand v5** owns:
- UI state: sidebar open/collapsed, modal visibility
- Filter/search state across dashboard pages
- User preferences (theme, density, table page size)
- Time range selection for analytics

The admin's `auth-store.ts` and `dashboard-store.ts` Zustand stores should be evaluated -- auth state should come from Better Auth's session (not a separate store), and dashboard KPI data should come from TanStack Query. Only `ui-store.ts` patterns carry forward.

## Security Architecture (Next.js 16)

### What Next.js 16 Handles Natively

| Security Concern | Built-in Solution | Custom Needed? |
|------------------|-------------------|----------------|
| CSRF for Server Actions | Origin/Host header comparison | No -- upgrade to 16.1.7+ for CVE fix |
| XSS prevention | React escapes output by default | No (unless rendering raw HTML) |
| Server-only code isolation | `server-only` package, Server Components | No |
| HTTPS enforcement | Vercel handles TLS termination | No |
| Action ID encryption | Built-in encryption of Server Action IDs | No |

### What Needs Custom Implementation

| Security Concern | Recommended Approach |
|------------------|---------------------|
| Security headers (static) | `next.config.ts` `headers()` function |
| CSP with nonces (dynamic) | `proxy.ts` for per-request nonce generation |
| Auth routing | `proxy.ts` for redirect-to-login |
| Rate limiting | Vercel WAF or `@upstash/ratelimit` (not in-memory) |
| Input validation | Zod schemas on all Server Action inputs and Route Handlers |
| RBAC | DAL-level role checks (not proxy-level) |
| Audit logging | DAL-level logging on mutations |

### Admin Security Files Assessment

| File | Verdict | Reason |
|------|---------|--------|
| csrf-protection.ts | **DROP** | Server Actions have built-in CSRF. Route Handlers for webhooks verify webhook signatures instead. |
| rate-limiter.ts | **DROP** | In-memory Map doesn't work across serverless instances. Use Vercel WAF or Upstash. |
| security-headers.ts | **REPLACE** | Move to `next.config.ts` `headers()`. Simpler, declarative, no custom code. |
| database-security.ts | **DROP** | DAL pattern replaces this -- auth checks in DAL functions. |
| sanitization.ts | **DROP** | Zod validation + React's built-in escaping. DOMPurify is only needed for rendering user-supplied HTML. |

## Cal.com Integration Assessment

### Current State

The public site has two layers of Cal.com integration:
1. **@calcom/embed-react** (v1.5.3) -- The actual embed component for booking pages. This is the real integration.
2. **Cal.com API client** (`src/lib/cal/api.ts`) -- A comprehensive REST API client for the Cal.com v2 API, with booking management, event types, webhooks, and analytics endpoints.
3. **Cal.com analytics models** (4 Prisma models) -- Custom analytics tracking tables that are NOT fed by any actual data pipeline.

### Assessment

The embed component is all that's needed for Phase 1 schema preparation. The API client is useful for Phase 2 when we need to sync Cal.com bookings with internal appointment records (via webhooks). The analytics models are aspirational -- they track things like "booking funnel steps" and "realtime metrics" but there's no code that actually writes to these tables from Cal.com data.

**Phase 1 action:** Include a `calBookingUid` field on the Appointment model to link Cal.com bookings. Do NOT include the 4 analytics models. Proper Cal.com webhook integration (receiving booking events and creating/updating Appointment records) belongs in Phase 2.

### Cal.com Webhook Pattern (Phase 2 prep)

Cal.com sends webhooks for booking events (created, rescheduled, cancelled). The correct pattern is:
1. Configure webhook URL in Cal.com dashboard: `https://ink37tattoos.com/api/webhooks/calcom`
2. Route Handler receives webhook, verifies signature, creates/updates Appointment record
3. No custom analytics tables -- use the Appointment model as the source of truth

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts (Edge) | proxy.ts (Node.js) | Next.js 16 (2025) | Better API access, no Edge limitations |
| prisma-client-js generator | prisma-client generator | Prisma 7 (2025) | ESM-only, TypeScript-native client |
| Prisma internal engine | Driver adapter (@prisma/adapter-pg) | Prisma 7 (2025) | Explicit DB driver, no Rust binary |
| datasource url in schema | prisma.config.ts | Prisma 7 (2025) | Runtime config separated from schema |
| tailwind.config.js | CSS @theme {} | Tailwind v4 (2025) | CSS-first config, no JS config file |
| z.string().email() | z.email() | Zod 4 (2025) | Top-level format validators |
| Auth checks in middleware only | DAL-level auth checks | Post-CVE-2025-29927 | Middleware/proxy is NOT a security boundary |

**Deprecated/outdated:**
- `middleware.ts` -- renamed to `proxy.ts` in Next.js 16; deprecated but still works
- `prisma-client-js` generator -- use `prisma-client` in Prisma 7
- `datasource.url` in schema -- removed in Prisma 7; use `prisma.config.ts`
- `@tailwind base/components/utilities` directives -- use `@import "tailwindcss"` in v4
- `z.string().email()/uuid()/url()` -- still works but `z.email()/uuid()/url()` is canonical in Zod 4

## Open Questions

1. **Better Auth + Prisma 7 adapter compatibility**
   - What we know: GitHub discussion reports P1010 errors with adapter-based PrismaClient
   - What's unclear: Whether this is fixed in latest versions (Better Auth 1.5.5 + Prisma 7.5.0)
   - Recommendation: Test early in implementation. Have fallback ready (separate native PrismaClient for auth).

2. **Better Auth generated schema table names**
   - What we know: Public site maps to `accounts` (plural), admin maps to `account` (singular)
   - What's unclear: What Better Auth's CLI generates as default
   - Recommendation: Run `npx @better-auth/cli generate` first, use whatever it produces as the source of truth.

3. **Cal.com embed React 19 peer dependency**
   - What we know: @calcom/embed-react v1.5.3 may not list React 19 as peer dep (GitHub issue #20814)
   - What's unclear: Whether it actually works with React 19 despite the peer dep listing
   - Recommendation: Install with `--legacy-peer-deps` if needed. The embed is only used in Phase 2.

4. **Prisma 7 `output` directive for generated client**
   - What we know: Prisma 7 recommends `output = "../src/generated/prisma"` for explicit generation location
   - What's unclear: Whether this is required or optional
   - Recommendation: Use explicit output path for clarity. Import from `@/generated/prisma` instead of `@prisma/client`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (admin repo already uses it) |
| Config file | None yet -- Wave 0 creates `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Unified schema generates valid Prisma client | unit | `npx prisma validate && npx prisma generate` | Wave 0 |
| FOUND-02 | DAL functions enforce auth checks | unit | `npx vitest run src/lib/dal/ --reporter=verbose` | Wave 0 |
| FOUND-03 | Better Auth login returns session with role | integration | `npx vitest run tests/auth.test.ts --reporter=verbose` | Wave 0 |
| FOUND-04 | Route groups render placeholder pages | smoke | `npx next build` (build success validates routes) | Wave 0 |
| FOUND-05 | Shadcn components render without errors | unit | `npx vitest run src/components/ui/ --reporter=verbose` | Wave 0 |
| FOUND-06 | TanStack Query provider wraps app | smoke | `npx next build` (build success) | Wave 0 |
| FOUND-07 | All packages resolve and build succeeds | smoke | `npx next build` | Wave 0 |
| FOUND-08 | Env validation catches missing vars | unit | `npx vitest run src/lib/env.test.ts --reporter=verbose` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage && npx next build`
- **Phase gate:** Full suite green + `npx next build` succeeds with zero errors

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration for the project
- [ ] `tests/auth.test.ts` -- Better Auth integration test
- [ ] `src/lib/dal/__tests__/` -- DAL unit tests with mocked Prisma
- [ ] `src/lib/env.test.ts` -- Environment validation tests
- [ ] Framework install: `npm install -D vitest @testing-library/react jsdom`

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- proxy.ts, breaking changes
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security) -- DAL pattern, server-only
- [Next.js Security Blog](https://nextjs.org/blog/security-nextjs-server-components-actions) -- Server Action CSRF, auth patterns
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) -- ESM, driver adapters, config changes
- [Zod 4 Migration Guide](https://zod.dev/v4/changelog) -- Breaking changes, new APIs
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) -- CSS-first config, renamed utilities
- [Better Auth Prisma Adapter](https://better-auth.com/docs/adapters/prisma) -- Configuration, CLI schema generation
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin) -- Role management, RBAC
- npm registry -- verified all package versions (2026-03-20)

### Secondary (MEDIUM confidence)
- [CVE-2026-27978](https://advisories.gitlab.com/pkg/npm/next/CVE-2026-27978/) -- Next.js CSRF bypass, requires 16.1.7+
- [Neon vs Supabase comparisons](https://www.bytebase.com/blog/neon-vs-supabase/) -- Database provider analysis
- [TanStack Query: Does this replace client state?](https://tanstack.com/query/v5/docs/framework/react/guides/does-this-replace-client-state) -- Official guidance on Query + Zustand
- [Better Auth + Prisma 7 compatibility discussion](https://github.com/better-auth/better-auth/discussions/6529) -- P1010 error with adapter

### Tertiary (LOW confidence)
- Cal.com embed React 19 peer dependency status -- [GitHub Issue #20814](https://github.com/calcom/cal.com/issues/20814), may be resolved

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified against npm, versions confirmed current
- Architecture: HIGH -- DAL pattern is officially recommended by Next.js team, patterns verified against docs
- Pitfalls: HIGH -- documented from official migration guides and CVE reports
- Schema merge: HIGH -- both source schemas analyzed line by line
- Better Auth + Prisma 7 compat: MEDIUM -- known issue documented but may be resolved in latest versions
- Cal.com integration: MEDIUM -- embed works, but analytics models assessment based on code analysis

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days -- stable stack, no fast-moving dependencies)
