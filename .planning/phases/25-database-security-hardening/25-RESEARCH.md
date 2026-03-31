# Phase 25: Database + Security Hardening - Research

**Researched:** 2026-03-30
**Domain:** Drizzle migrations, production seeding, CSP nonces (Next.js 16), Upstash rate limiting
**Confidence:** HIGH

## Summary

Phase 25 covers four independent hardening tasks: (1) consolidating 2 Drizzle migrations into a single baseline, (2) creating an idempotent production seed script, (3) replacing CSP `unsafe-inline`/`unsafe-eval` with nonce-based policies via Next.js 16 `proxy.ts`, and (4) adding Upstash-backed rate limiting to admin and upload API routes.

The migration consolidation is straightforward because there are only 2 existing migrations and Drizzle Kit's `generate` command can produce a fresh migration from the current schema. The tricky part is the production baseline approach -- the existing production database already has these tables, so the consolidated migration must be marked as "already applied" in production's `__drizzle_migrations` table.

CSP nonce implementation follows the official Next.js 16 documentation precisely. The project already has a `proxy.ts` file that needs to be extended with nonce generation and CSP header injection. A critical finding: `next/font/google` already self-hosts fonts at build time, meaning `fonts.googleapis.com` and `fonts.gstatic.com` can be removed from CSP entirely. The `chart.tsx` component uses `dangerouslySetInnerHTML` for inline `<style>` tags which will need nonce propagation.

Rate limiting reuses the existing `createLimiter()` factory pattern in `src/lib/security/rate-limiter.ts`. Two new limiters (`admin` and `upload`) need to be added to the `rateLimiters` object, then imported into each of the 7 admin/upload API route handlers.

**Primary recommendation:** Execute all four areas in parallel -- they are independent. Migration consolidation is the highest-risk area due to production database state; test thoroughly against a fresh database before touching production.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Squash existing 2 migrations (`0000_dry_human_torch.sql`, `0001_lively_whirlwind.sql`) into a single consolidated migration generated from current `schema.ts`. Delete old migration files and journal entries.
- **D-02:** Use manual baseline approach for production -- squash locally, then mark the consolidated migration as "already applied" in production's Drizzle journal. Document the one-time production step in DEPLOYMENT.md.
- **D-03:** Keep `db:migrate` and `db:seed` as separate commands. No `db:reset` script needed.
- **D-04:** Production database already exists with data -- consolidation must not break existing prod state.
- **D-05:** Seed script must be idempotent using upsert pattern (INSERT ... ON CONFLICT DO UPDATE). Safe to run multiple times without duplicating data.
- **D-06:** Artist profile seeded with placeholder data ("Studio Artist"), not real data. Owner fills in through admin dashboard.
- **D-07:** Consent form template seeded with a full legal tattoo consent document, ready to use immediately.
- **D-08:** Default studio settings seeded (hours, policies, contact info placeholders).
- **D-09:** Script exposed as `bun run db:seed` in package.json.
- **D-10:** Generate nonces in Next.js 16 `proxy.ts` (NOT middleware.ts -- middleware is deprecated in Next.js 16). Set nonce as a request header, read in layout.tsx via `headers()`.
- **D-11:** Remove `'unsafe-inline'` from both script-src and style-src, replacing with nonce-based allowlisting.
- **D-12:** Remove `'unsafe-eval'` entirely. If anything breaks, fix with proper nonces or restructuring.
- **D-13:** Keep Cal.com domain allowlisted in script-src (`https://app.cal.com`). Cal.com embed scripts loaded by domain, not by nonce.
- **D-14:** CSP header moves from static `next.config.ts` `headers()` to dynamic generation in proxy.ts (required for per-request nonces).
- **D-15:** Add separate Upstash-backed rate limiters for admin data routes and upload routes, following existing `rateLimiters` pattern in `src/lib/security/rate-limiter.ts`.
- **D-16:** Admin data routes (`/api/admin/*`): 60 requests/min threshold.
- **D-17:** Upload routes (`/api/upload/*`): 20 requests/min threshold (uploads are more expensive/abuse-prone).
- **D-18:** Rate limit returns 429 with `Retry-After` header (reuse existing `rateLimitResponse()` helper).

### Claude's Discretion
- Whether to self-host Google Fonts or keep CDN with nonce -- **RESOLVED: self-host via next/font (already in place)**. See Google Fonts section below.
- Exact nonce propagation to `<script>` and `<style>` tags in layout.tsx and any inline scripts.
- Whether to key rate limits by IP or authenticated user ID -- pick the best approach for the threat model.
- Whether admin routes also need the synchronous `rateLimit()` fallback or only the async Upstash limiter.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | Drizzle migrations consolidated -- single clean migration from baseline to v3.0 schema | Migration consolidation approach documented; schema drift between 0000/0001 and current schema.ts identified (4 missing tables, 7+ missing columns); drizzle-kit generate + manual baseline approach verified |
| DB-02 | Production database seeded with initial data (artist profile, default settings, consent form) | Seed script patterns using Drizzle SQL builder with ON CONFLICT DO UPDATE documented; target tables identified (tattoo_artist, settings, consent_form) |
| INFRA-02 | CSP tightened -- replace unsafe-inline/unsafe-eval with nonce-based CSP where possible | Official Next.js 16 proxy.ts nonce pattern verified against docs (v16.2.1); inline script/style inventory completed; Google Fonts already self-hosted via next/font |
| INFRA-03 | Rate limiting added to admin API routes (/api/admin/*, /api/upload/*) | Existing rate limiter factory pattern analyzed; 7 route handlers identified; @upstash/ratelimit 2.0.8 API verified |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Package manager:** bun (never npm/yarn/pnpm). Use `bun add`, `bun run`.
- **Framework:** Next.js 16.2.0 + React 19.2.3
- **ORM:** Drizzle ORM 0.45.1 with drizzle-kit 0.31.10
- **Database:** Neon PostgreSQL via `@neondatabase/serverless`
- **Auth:** Better Auth uses raw pg.Pool (not Drizzle adapter)
- **Hosting:** Vercel (standalone output)
- **DB imports:** `db` from `@/lib/db`, schema from `@/lib/db/schema`
- **Drizzle numeric():** Returns strings by default -- all monetary columns use `mode:'number'`
- **Drizzle mutations:** Need explicit `.returning()` -- without it, only rowCount returned
- **GSD Workflow:** Must use GSD commands for file changes

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| drizzle-orm | 0.45.1 | ORM for schema, queries, seed script | Installed |
| drizzle-kit | 0.31.10 | Migration generation and application | Installed |
| @upstash/ratelimit | 2.0.8 | Distributed rate limiting | Installed |
| @upstash/redis | 1.37.0 | Redis client for rate limiter | Installed |
| next | 16.2.0 | Framework (proxy.ts for CSP nonces) | Installed |

### Supporting (Already Installed)
| Library | Version | Purpose |
|---------|---------|---------|
| @neondatabase/serverless | 1.0.2 | Neon PostgreSQL driver |
| @sentry/nextjs | 10.46.0 | Error tracking (CSP must allow Sentry domains) |
| ws | 8.20.0 | WebSocket for Neon serverless driver |

**No new packages needed.** All dependencies are already in place.

## Architecture Patterns

### Migration Consolidation Strategy

**Current state:** 2 migration files + significant schema drift
- `0000_dry_human_torch.sql`: 19 tables (initial schema)
- `0001_lively_whirlwind.sql`: 1 table (cal_event)
- **Missing from migrations (but in schema.ts):**
  - Tables: `consent_form`, `notification`, `product_image`
  - Columns on `tattoo_artist`: `profileImage`, `instagramHandle`, `yearsExperience`
  - Columns on `tattoo_session`: `consentFormVersion`, `consentExpiresAt`
  - Column on `tattoo_design`: `rejectionNotes`
  - Columns on `order`: `trackingNumber`, `trackingCarrier`

**Consolidation approach:**
1. Delete `drizzle/0000_dry_human_torch.sql`, `drizzle/0001_lively_whirlwind.sql`, `drizzle/meta/*`
2. Run `bun drizzle-kit generate` -- produces a single migration from current `schema.ts`
3. The new migration is the complete v3.0 schema (all 23 tables, all columns, all indexes)
4. New `drizzle/meta/_journal.json` has exactly 1 entry
5. `bun run db:migrate` on a fresh database applies this single migration

**Production baseline procedure (document in DEPLOYMENT.md):**
```sql
-- On production database, after deploying consolidated migration files:
-- Insert a record into __drizzle_migrations marking the new migration as applied
-- The hash and created_at must match what drizzle-kit would generate
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('<hash-from-new-journal>', <timestamp-from-new-journal>);
```
Drizzle Kit tracks migrations via a `__drizzle_migrations` table with `hash` and `created_at` columns. The hash comes from the migration file content. When `drizzle-kit migrate` runs, it checks this table to see which migrations are already applied, then runs any unapplied ones.

### Seed Script Pattern

**Location:** `src/lib/db/seed.ts` (server-only, runs via bun directly)
**Invocation:** `bun run db:seed` in package.json maps to `bun src/lib/db/seed.ts`

**Pattern: Idempotent upserts using Drizzle's `onConflictDoUpdate`:**
```typescript
import { db } from './index';
import { tattooArtist, settings, consentForm } from './schema';
import { sql } from 'drizzle-orm';

// Upsert artist profile
await db.insert(tattooArtist).values({
  name: 'Studio Artist',
  email: 'artist@ink37tattoos.com',
  hourlyRate: 150,
  specialties: ['Custom', 'Traditional', 'Japanese'],
  isActive: true,
  bio: 'Professional tattoo artist',
}).onConflictDoUpdate({
  target: tattooArtist.email,
  set: { updatedAt: new Date() },
});
```

**Target tables:**
1. `tattoo_artist` -- Single artist profile with placeholder data
2. `settings` -- Studio hours, policies, contact placeholders (keyed on `settings.key`)
3. `consent_form` -- Full legal consent document (keyed on `version` -- need to handle since version is not unique, use upsert on a combination or check-then-insert)

**Note on consent_form:** The `consent_form` table does not have a unique constraint on `version`. The seed script should check if version 1 exists before inserting, or add a unique constraint on `version` in the schema. Since the consolidated migration is being regenerated anyway, adding `unique()` to the version column is trivial.

### CSP Nonce Implementation (Next.js 16 proxy.ts)

**Official pattern from Next.js 16.2.1 docs (HIGH confidence):**

The existing `proxy.ts` handles auth redirects. It must be extended with nonce generation:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  // Build CSP header with per-request nonce
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://app.cal.com${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ''};
    font-src 'self';
    img-src 'self' data: blob: https:;
    frame-src 'self' https://app.cal.com;
    connect-src 'self' https://api.cal.com https://*.sentry.io https://*.ingest.sentry.io;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // ... existing auth redirect logic ...

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}
```

**How Next.js 16 applies nonces automatically:**
1. Proxy generates nonce, sets it in `x-nonce` header and CSP header
2. Next.js parses the CSP header during rendering, extracts the nonce
3. Next.js **automatically** attaches the nonce to framework scripts, page bundles, and inline styles/scripts
4. For custom inline scripts (like JSON-LD in layout.tsx), the nonce must be applied manually

**Key: `'strict-dynamic'` in script-src.** This tells the browser that any script loaded by a nonced script is also trusted, which covers dynamically loaded chunks.

### Rate Limiting Pattern

**Existing pattern in `src/lib/security/rate-limiter.ts`:**
```typescript
export const rateLimiters = {
  contact: createLimiter(5, '1 m', 'rl:contact'),
  storeDownload: createLimiter(20, '1 m', 'rl:download'),
  // ... add new ones:
  admin: createLimiter(60, '1 m', 'rl:admin'),
  upload: createLimiter(20, '1 m', 'rl:upload'),
};
```

**Route handler integration pattern (from existing codebase):**
```typescript
import { rateLimiters, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function GET(request: Request) {
  const ip = getRequestIp(request);
  const { success, reset } = await rateLimiters.admin.limit(ip);
  if (!success) return rateLimitResponse(reset);
  // ... rest of handler
}
```

### Anti-Patterns to Avoid

- **Never use `drizzle-kit push` on production** -- it applies schema changes directly without migration files. Only use `drizzle-kit migrate`.
- **Never remove `__drizzle_migrations` table in production** -- it tracks migration state.
- **Never set CSP `'unsafe-eval'` in production** -- development only (React debugging).
- **Never use `'unsafe-inline'` with nonce-based CSP** -- `'unsafe-inline'` is ignored when nonces are present (browser behavior), but including it creates confusion.
- **Never generate nonces with `Math.random()`** -- must use `crypto.randomUUID()` for cryptographic randomness.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom token bucket | `@upstash/ratelimit` + existing `createLimiter()` factory | Handles distributed state via Redis, has sliding window, graceful fallback |
| Nonce generation | Custom crypto nonce | `Buffer.from(crypto.randomUUID()).toString('base64')` | Standard pattern from Next.js docs, cryptographically secure |
| Migration squashing | Manual SQL editing | `drizzle-kit generate` (regenerate from schema) | Drizzle Kit generates correct DDL from TypeScript schema, including all indexes and constraints |
| Upsert logic | Raw SQL INSERT/ON CONFLICT | Drizzle's `.onConflictDoUpdate()` | Type-safe, handles conflict targets and update sets |

## Common Pitfalls

### Pitfall 1: Schema Drift in Consolidated Migration
**What goes wrong:** The consolidated migration generated by `drizzle-kit generate` may not exactly match what the production database has (since migrations were never fully caught up).
**Why it happens:** The 0000 migration was for 19 tables, but the schema.ts has 23 tables. Tables/columns were added via `drizzle-kit push` (no migration file).
**How to avoid:** The consolidated migration is generated from `schema.ts`, which IS the source of truth. For fresh databases, this works perfectly. For production, the manual baseline approach (D-02) marks it as "already applied" so it never runs against the existing data.
**Warning signs:** `drizzle-kit migrate` fails with "relation already exists" errors in production.

### Pitfall 2: Production Baseline Hash Mismatch
**What goes wrong:** The hash inserted into `__drizzle_migrations` doesn't match what `drizzle-kit migrate` expects, causing it to try to re-apply the migration.
**Why it happens:** The hash is derived from the migration file content. If the file is modified after the hash is computed, they won't match.
**How to avoid:** Extract the hash from the generated `meta/_journal.json` file, not from manual computation. The journal has the exact hash Drizzle Kit uses.
**Warning signs:** Running `drizzle-kit migrate` in production reports "1 migration to apply" when it should report 0.

### Pitfall 3: Dynamic Rendering Requirement with Nonces
**What goes wrong:** Pages that were previously statically rendered now require dynamic rendering because nonces are per-request.
**Why it happens:** Next.js can only inject nonces during server-side rendering. Static pages generated at build time have no request context.
**How to avoid:** Use `await connection()` from `next/server` on pages that need to be forced into dynamic rendering. However, the public pages (gallery, about) already use server-side data fetching, so most are already dynamic. The `proxy.ts` matcher should exclude `_next/static`, `_next/image`, and `favicon.ico`.
**Warning signs:** CSP violations in browser console for static assets, or pages that should have nonces don't.

### Pitfall 4: Chart.tsx Inline Styles
**What goes wrong:** The Shadcn chart component (`src/components/ui/chart.tsx`) uses `dangerouslySetInnerHTML` on a `<style>` tag to inject chart color CSS variables. Without a nonce, this is blocked by CSP.
**Why it happens:** Recharts/Shadcn chart theming requires dynamic CSS variables per chart instance.
**How to avoid:** Next.js 16 automatically applies nonces to inline styles/scripts generated during SSR. The `<style dangerouslySetInnerHTML>` in chart.tsx is rendered during SSR, so Next.js should apply the nonce automatically. If it doesn't (because chart.tsx is a client component), the nonce needs to be passed as a prop from a server component.
**Warning signs:** Chart components render without colors; CSP violation in console mentioning style-src.

### Pitfall 5: JSON-LD Script in Layout
**What goes wrong:** The structured data `<script type="application/ld+json">` in `layout.tsx` uses `dangerouslySetInnerHTML`. Without a nonce, CSP blocks it.
**Why it happens:** It's an inline script inserted via React's `dangerouslySetInnerHTML`.
**How to avoid:** Read the nonce from headers in the root layout (which is a server component) and add `nonce={nonce}` to the script tag. Note: `type="application/ld+json"` scripts are NOT executed by the browser, so they may not need a nonce -- but strict CSP policies may still block them. Test and add nonce if needed.
**Warning signs:** JSON-LD script blocked in browser console.

### Pitfall 6: Sentry SDK and CSP
**What goes wrong:** Sentry's client-side SDK may inject inline scripts for session replay or error capture that get blocked by CSP.
**Why it happens:** Sentry Replay records DOM mutations and may use inline styles/scripts.
**How to avoid:** `'strict-dynamic'` in script-src covers Sentry's dynamically loaded scripts. Keep `https://*.sentry.io` and `https://*.ingest.sentry.io` in `connect-src`. If Sentry Replay uses inline styles, they need nonces -- but Next.js should handle this if the scripts are loaded through the bundle.
**Warning signs:** Sentry error reporting stops working in production; Sentry Replay fails to initialize.

### Pitfall 7: Merge Conflicts in Route Files
**What goes wrong:** All admin route files currently have unresolved merge conflict markers from Phase 24 (logger import).
**Why it happens:** Two parallel worktree branches modified the logger imports differently.
**How to avoid:** These merge conflicts MUST be resolved before Phase 25 work begins. Phase 23 (Git Merge) should resolve these. If starting Phase 25 before Phase 23, resolve the conflicts as part of the rate limiting changes.
**Warning signs:** TypeScript compilation errors, build failures.

## Code Examples

### Migration Consolidation Commands
```bash
# 1. Delete old migrations
rm -rf drizzle/0000_dry_human_torch.sql drizzle/0001_lively_whirlwind.sql drizzle/meta/

# 2. Generate consolidated migration from schema.ts
bun drizzle-kit generate

# 3. Verify the new migration has all 23 tables
grep -c 'CREATE TABLE' drizzle/0000_*.sql
# Expected: 23

# 4. Test on fresh database
bun run db:migrate
```

### Seed Script Structure
```typescript
// src/lib/db/seed.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

const db = drizzle({
  connection: process.env.DATABASE_URL!,
  ws: ws,
  schema,
});

async function seed() {
  console.log('Seeding database...');

  // 1. Upsert artist profile
  await db.insert(schema.tattooArtist).values({
    name: 'Studio Artist',
    email: 'artist@ink37tattoos.com',
    hourlyRate: 150,
    specialties: ['Custom', 'Traditional', 'Japanese', 'Realism'],
    isActive: true,
    bio: 'Professional tattoo artist. Update this profile from the admin dashboard.',
  }).onConflictDoUpdate({
    target: schema.tattooArtist.email,
    set: { updatedAt: new Date() },
  });

  // 2. Upsert default settings (multiple rows)
  const defaultSettings = [
    { key: 'studio_name', value: '"Ink 37 Tattoos"', category: 'studio', description: 'Studio display name' },
    { key: 'studio_hours', value: '{"Mon-Sat":"10:00-18:00","Sun":"Closed"}', category: 'studio', description: 'Operating hours' },
    { key: 'deposit_percentage', value: '20', category: 'payment', description: 'Default deposit percentage' },
    // ... more settings
  ];
  for (const s of defaultSettings) {
    await db.insert(schema.settings).values({
      key: s.key,
      value: JSON.parse(s.value),
      category: s.category,
      description: s.description,
    }).onConflictDoUpdate({
      target: schema.settings.key,
      set: { updatedAt: new Date() },
    });
  }

  // 3. Upsert consent form (version 1)
  // Check if version 1 exists, insert if not
  const existing = await db.query.consentForm.findFirst({
    where: (cf, { eq }) => eq(cf.version, 1),
  });
  if (!existing) {
    await db.insert(schema.consentForm).values({
      version: 1,
      title: 'Tattoo Consent Form',
      content: `[Full legal consent document here]`,
      isActive: true,
    });
  }

  console.log('Seed complete.');
}

seed().catch(console.error).finally(() => process.exit(0));
```

### CSP Nonce in Root Layout
```typescript
// src/app/layout.tsx
import { headers } from 'next/headers';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" className={...}>
      <body>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Rate Limiter Addition
```typescript
// Addition to src/lib/security/rate-limiter.ts
export const rateLimiters = {
  contact: createLimiter(5, '1 m', 'rl:contact'),
  storeDownload: createLimiter(20, '1 m', 'rl:download'),
  portalBilling: createLimiter(10, '1 m', 'rl:billing'),
  webhook: createLimiter(100, '1 m', 'rl:webhook'),
  /** Admin data routes: 60 requests per minute */
  admin: createLimiter(60, '1 m', 'rl:admin'),
  /** Upload routes: 20 requests per minute */
  upload: createLimiter(20, '1 m', 'rl:upload'),
} as const;
```

## Discretion Recommendations

### Google Fonts: Keep next/font (Self-Hosted)
**Recommendation:** Do nothing -- already self-hosted.
**Evidence:** `src/styles/fonts.ts` uses `next/font/google` for Inter, Montserrat, Pacifico, and Satisfy. According to the official Next.js 16 font docs: "Fonts are stored as static assets and served from the same domain as your deployment, meaning no requests are sent to Google by the browser." This means `fonts.googleapis.com` and `fonts.gstatic.com` can be **removed** from the CSP entirely. The current CSP has `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` and `font-src 'self' https://fonts.gstatic.com` -- both Google domains are unnecessary. The consolidated CSP only needs `font-src 'self'` and `style-src 'self' 'nonce-...'`.
**Confidence:** HIGH -- verified against official Next.js 16 docs.

### Rate Limit Key: IP-Based
**Recommendation:** Key rate limits by IP address, not authenticated user ID.
**Rationale:** (1) Admin routes already verify auth before any data access. Rate limiting by IP catches brute-force attacks at the network level, including pre-auth attacks. (2) Keying by user ID would allow an attacker to hammer the auth check itself without rate limiting. (3) The existing pattern (`getRequestIp()`) extracts IP from `x-forwarded-for` (Vercel sets this), which is correct for serverless. (4) A single admin user from the same IP is the expected use case (solo artist studio) -- IP-based limiting won't cause false positives.

### Synchronous Fallback: Not Needed for Admin Routes
**Recommendation:** Only use the async Upstash limiter for admin/upload routes. Do not add the synchronous `rateLimit()` fallback.
**Rationale:** The synchronous `rateLimit()` function uses in-memory state and is designed for server actions that cannot await. API route handlers are async by nature and can await the Upstash limiter. The in-memory fallback is already built into `createLimiter()` for when Upstash env vars are missing (development), so there's no benefit to double-limiting.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` for CSP | `proxy.ts` for CSP | Next.js 16 (2025) | proxy.ts replaces middleware.ts as the request interception layer |
| `unsafe-inline` for styles | Nonce-based style-src | CSP Level 3 (2018, widely adopted 2024+) | Blocks XSS via inline style injection |
| Google Fonts CDN | `next/font` self-hosting | Next.js 13+ (2022) | No external requests, better privacy, simpler CSP |
| Manual migration editing | `drizzle-kit generate` from schema | Drizzle Kit 0.20+ | Schema-first migration generation |

**Deprecated/outdated:**
- `middleware.ts` in Next.js 16 -- replaced by `proxy.ts` (proxy is the new name for the same file convention)
- `unsafe-inline` in script-src -- any modern CSP should use nonces or hashes
- Google Fonts domains in CSP -- unnecessary when using `next/font/google`

## Open Questions

1. **Chart component nonce propagation**
   - What we know: `chart.tsx` is a client component that uses `<style dangerouslySetInnerHTML>`. Next.js 16 docs say it automatically applies nonces to inline scripts/styles during SSR.
   - What's unclear: Whether this automatic application works for client components rendered during SSR. The chart is from Shadcn and is widely used, so this is likely handled.
   - Recommendation: Implement the nonce-based CSP and test charts. If blocked, pass nonce as a prop through the chart's React context.

2. **Consent form version uniqueness**
   - What we know: The `consent_form` table has no unique constraint on `version`. The seed script needs to be idempotent.
   - What's unclear: Whether adding a unique constraint on `version` would break any existing behavior.
   - Recommendation: Since we're regenerating the migration from scratch, add `.unique()` to the `version` column in schema.ts. This enables clean `onConflictDoUpdate` in the seed script and prevents duplicate versions.

3. **Merge conflicts in route files**
   - What we know: All admin route files have unresolved merge conflict markers from Phase 24 parallel worktrees.
   - What's unclear: Whether Phase 23 (Git Merge) will resolve these before Phase 25 starts.
   - Recommendation: Phase 25 implementation should resolve these conflicts as needed. The rate limiting changes touch these files anyway.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | Consolidated migration applies cleanly on fresh DB | integration | Manual: `bun run db:migrate` on empty database | N/A -- CLI test |
| DB-02 | Seed script populates artist, settings, consent form idempotently | unit | `bun run test src/__tests__/seed.test.ts -x` | Wave 0 |
| INFRA-02 | CSP header contains nonce, no unsafe-inline/unsafe-eval | unit | `bun run test src/__tests__/csp.test.ts -x` | Wave 0 |
| INFRA-03 | Admin/upload routes return 429 after threshold | unit | `bun run test src/__tests__/rate-limit-admin.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/seed.test.ts` -- tests seed script idempotency (upsert behavior)
- [ ] `src/__tests__/csp.test.ts` -- tests CSP header generation in proxy (nonce format, no unsafe-inline)
- [ ] `src/__tests__/rate-limit-admin.test.ts` -- tests admin/upload rate limiter thresholds and 429 response

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bun | All scripts | Yes | 1.3.11 | -- |
| node | Runtime | Yes | v25.8.2 | -- |
| drizzle-kit | Migration generation | Yes | 0.31.10 | -- |
| @upstash/ratelimit | Rate limiting | Yes | 2.0.8 | In-memory fallback (already built in) |
| Neon PostgreSQL | Database | Yes (remote) | -- | Requires DATABASE_URL env var |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Upstash Redis (env vars) -- falls back to in-memory rate limiter in development.

## Route Inventory (Rate Limiting Targets)

All routes that need rate limiting added:

| Route | File | HTTP Methods | Limiter | Current Auth |
|-------|------|-------------|---------|--------------|
| `/api/admin/sessions` | `src/app/api/admin/sessions/route.ts` | GET | `admin` (60/min) | Yes (ADMIN_ROLES check) |
| `/api/admin/media` | `src/app/api/admin/media/route.ts` | GET | `admin` (60/min) | Yes (ADMIN_ROLES check) |
| `/api/admin/customers` | `src/app/api/admin/customers/route.ts` | GET | `admin` (60/min) | Yes (ADMIN_ROLES check) |
| `/api/admin/appointments` | `src/app/api/admin/appointments/route.ts` | GET | `admin` (60/min) | Yes (ADMIN_ROLES check) |
| `/api/admin/calendar` | `src/app/api/admin/calendar/route.ts` | GET | `admin` (60/min) | Yes (DAL-level via requireStaffRole) |
| `/api/upload` | `src/app/api/upload/route.ts` | POST | `upload` (20/min) | Yes (ADMIN_ROLES check) |
| `/api/upload/token` | `src/app/api/upload/token/route.ts` | POST | `upload` (20/min) | Yes (ADMIN_ROLES check) |

**Note:** The `/api/admin/calendar` route uses DAL-level auth (`requireStaffRole()`) rather than an explicit ADMIN_ROLES check. Rate limiting should still be added at the route level before any processing.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) -- Official documentation for nonce-based CSP with proxy.ts, version 16.2.1, updated 2026-03-25
- [Next.js 16 Font Optimization](https://nextjs.org/docs/app/getting-started/fonts) -- Confirms next/font/google self-hosts fonts with no external requests
- [drizzle-kit migrate docs](https://orm.drizzle.team/docs/drizzle-kit-migrate) -- Migration tracking via `__drizzle_migrations` table
- [Drizzle ORM Migrations overview](https://orm.drizzle.team/docs/migrations) -- Journal format, snapshot tracking
- [@upstash/ratelimit GitHub](https://github.com/upstash/ratelimit-js) -- API surface, sliding window, prefix configuration

### Secondary (MEDIUM confidence)
- [Drizzle Kit migration squash discussion](https://github.com/drizzle-team/drizzle-orm/discussions/3492) -- Community approaches to squashing migrations
- [Next.js CSP + cacheComponents issue](https://github.com/vercel/next.js/issues/89754) -- Known incompatibility (not relevant for this project since cacheComponents is not enabled)
- [Upstash blog on Next.js rate limiting](https://upstash.com/blog/nextjs-ratelimiting) -- Integration patterns

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and in use; no new dependencies
- Architecture: HIGH -- migration consolidation approach is standard Drizzle Kit workflow; CSP nonce pattern from official Next.js 16 docs; rate limiter extends existing proven pattern
- Pitfalls: HIGH -- schema drift comprehensively audited; inline script/style inventory complete; merge conflict state documented

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable technologies, no fast-moving APIs)
