# Phase 13: Security Hardening - Research

**Researched:** 2026-03-28
**Domain:** Auth enforcement, rate limiting, input sanitization, webhook idempotency, API error handling
**Confidence:** HIGH

## Summary

Phase 13 is a security remediation phase that hardens the existing v1.0 codebase across five domains: layout-level auth enforcement, persistent rate limiting, XSS input sanitization, webhook idempotency/safety, and API error codes. No new features are added -- this is defensive hardening of existing code.

The codebase is well-structured for these changes. Dashboard and portal layouts exist but have zero auth checks (confirmed: both `layout.tsx` files render content without calling `getCurrentSession()`). Server actions check `session?.user` but never validate `session.user.role`. The rate limiter is an in-memory `Map` on `globalThis` that resets on cold starts. The Stripe webhook has a non-atomic idempotency check (read-then-write race window). Cal.com webhook has Zod validation but no event tracking table. All admin API routes use a catch-all `catch` that returns 401 for every error type.

**Primary recommendation:** Use `@upstash/ratelimit` with Upstash Redis for persistent rate limiting (purpose-built for Vercel serverless), add `getCurrentSession()` + redirect in both layout files, create a `requireRole()` helper for server actions, use Zod `.refine()` checks for HTML sanitization (no external sanitization library needed), and fix Stripe idempotency with `INSERT ... ON CONFLICT DO NOTHING` atomic pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use layout-level auth checks (NOT middleware.ts -- middleware is deprecated in Next.js 16 in favor of proxy.ts). Dashboard and portal layouts call `getCurrentSession()` and redirect unauthenticated users before rendering any child content.
- **D-02:** Redirect unauthenticated users to `/login?callbackUrl=<attempted-url>` so they return to their intended page after signing in.
- **D-03:** Dashboard requires ADMIN+ role (ADMIN, SUPER_ADMIN). Staff/users who are authenticated but lack role see an access-denied page or redirect.
- **D-04:** Portal requires any authenticated user (USER+ role).
- **D-05:** Server actions validate roles explicitly before calling DAL functions.
- **D-06:** Replace in-memory Map rate limiter with persistent storage suitable for serverless (Claude decides: Upstash Redis, Vercel KV, or database-backed -- pick what fits the Vercel + Neon stack best).
- **D-07:** Rate limit ALL public API routes AND webhooks with separate per-route thresholds: contact form (5/min), store download (20/min), portal billing (10/min), webhooks (100/min).
- **D-08:** Return HTTP 429 with `Retry-After` header when rate limit is exceeded.
- **D-09:** Fix Stripe webhook race condition -- make idempotency check atomic (Claude decides approach: unique constraint + ON CONFLICT, or serializable transaction).
- **D-10:** Add event tracking table for Cal.com webhook events (similar to stripeEvent table) for full audit trail.
- **D-11:** API routes use proper HTTP status codes: 401 for missing/invalid auth, 403 for insufficient role, 500 for internal errors. Log internal errors with structured context.
- **D-12:** Cal.com webhook Zod validation already exists -- ensure error logging includes the payload shape that failed validation (not the raw body, just the Zod error path).
- **D-13:** Both-layers approach: sanitize on write (strip HTML/script tags before storing in DB) AND verify React escaping at render (audit for any dangerouslySetInnerHTML or unsafe patterns).
- **D-14:** Sanitize ALL free-text fields: customer names, notes, descriptions, appointment notes, session notes, contact form messages, product descriptions -- anything a user or admin types.
- **D-15:** Add Zod refinements to reject strings containing HTML/script patterns at the validation layer.
- **D-16:** Make `BLOB_PRIVATE_READ_WRITE_TOKEN` required in the Zod env schema (currently optional, SEC-10 requirement).

### Claude's Discretion
- Whether to use a `requireRole()` helper wrapper or inline checks per action -- pick the best pattern for consistency.
- How to handle the edge case where session exists but role is insufficient (403 page vs redirect).
- Exact choice of rate limiting library/storage backend.
- Whether to use sliding window or fixed window algorithm.
- IP extraction strategy for serverless (X-Forwarded-For handling).
- Exact atomic idempotency approach for Stripe (unique constraint vs transaction).
- Whether Resend webhook handler needs similar event tracking.
- Choice of sanitization library (sanitize-html, DOMPurify/isomorphic-dompurify, or custom regex).
- Exact Zod refinement patterns.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Dashboard layout enforces auth at layout level -- unauthenticated users redirected before any child page renders | Layout-level `getCurrentSession()` + `redirect()` pattern documented; current layout has zero auth (confirmed) |
| SEC-02 | Portal layout enforces auth at layout level -- unauthenticated users redirected before any child page renders | Same pattern as SEC-01; portal layout confirmed to have zero auth checks |
| SEC-03 | All public API routes have rate limiting (store download, portal billing, contact form, webhooks) | `@upstash/ratelimit` recommended with per-route limiters; all routes identified and catalogued |
| SEC-04 | Rate limiter uses persistent storage (not in-memory Map) suitable for serverless/distributed deployment | Upstash Redis recommended; current in-memory Map on `globalThis` confirmed unsuitable |
| SEC-05 | All server actions validate user role explicitly before calling DAL | `requireRole()` helper pattern documented; all 13 action files audited -- none check role today |
| SEC-06 | All string inputs sanitized for XSS before rendering in dashboard | Zod `.refine()` with HTML tag regex + `dangerouslySetInnerHTML` audit; only 2 safe uses found |
| SEC-07 | Stripe webhook handler prevents race conditions on duplicate event processing | Atomic `INSERT ... ON CONFLICT DO NOTHING` + check `rowCount` pattern documented |
| SEC-08 | Cal.com webhook validates payload structure with runtime schema checks beyond TypeScript casting | Already implemented via `CalWebhookPayloadSchema.safeParse()`; needs enhanced error logging |
| SEC-09 | API routes distinguish between auth failures and DB errors with appropriate status codes and logging | All admin routes audited -- all use catch-all 401; pattern for error discrimination documented |
| SEC-10 | BLOB_PRIVATE_READ_WRITE_TOKEN added to Zod env schema as required field | Single-line change in `src/lib/env.ts` -- `.optional()` to `.min(1)` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2 -- middleware.ts is deprecated, use proxy.ts or layout-level checks
- **ORM:** Drizzle ORM 0.45.1 -- use `.onConflictDoNothing()` for atomic idempotency, SQL builder for anything beyond relational queries
- **Database:** Neon PostgreSQL -- serverless, connection pooling via `@neondatabase/serverless`
- **Auth:** Better Auth v1.5.5 with admin plugin -- 5-tier RBAC (user, staff, manager, admin, super_admin)
- **Hosting:** Vercel -- serverless functions, cold starts reset in-memory state
- **Pattern:** DAL pattern -- auth checks belong in server-only DB functions AND server actions
- **Mutations:** Server Actions for mutations, Route Handlers for webhooks only
- **Imports:** `db` from `@/lib/db`, `schema` from `@/lib/db/schema`

## Standard Stack

### Core (existing, no new installs for most work)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.5.5 | Auth + session management | Already installed, has `getCurrentSession()` helper |
| drizzle-orm | 0.45.1 | ORM for DB operations | Already installed, `.onConflictDoNothing()` for idempotency |
| zod | 4.3.6 | Schema validation + XSS refinements | Already installed, Zod 4 has inline `.refine()` chaining |
| next | 16.2.0 | Framework (layouts, redirects, server components) | Already installed |

### New Dependencies Required
| Library | Version | Purpose | Why This Library |
|---------|---------|---------|-----------------|
| @upstash/ratelimit | 2.0.8 | Persistent rate limiting with sliding window | Purpose-built for Vercel serverless; HTTP-based Redis (no persistent connections); official Vercel integration template |
| @upstash/redis | latest | Redis client for @upstash/ratelimit | Required peer dependency; connectionless HTTP-based client works in serverless |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @upstash/ratelimit (Upstash Redis) | Database-backed (Neon PostgreSQL) | DB adds latency per request (~20-50ms vs ~5ms Redis); no battle-tested library for Drizzle+PG rate limiting; adds load to main DB |
| @upstash/ratelimit (Upstash Redis) | Vercel KV | Vercel KV is built on Upstash Redis anyway; using Upstash directly gives more control and avoids Vercel KV API overhead |
| isomorphic-dompurify | Zod refinements only | DOMPurify is overkill -- we reject (not sanitize) HTML input; Zod refinements at validation layer are simpler and sufficient for this use case |
| sanitize-html | Zod refinements only | Same reasoning; we don't need to allow "safe HTML" -- all free-text fields should contain zero HTML |

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Environment variables required (Upstash Redis):**
```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

## Architecture Patterns

### Recommended Project Structure Changes
```
src/
├── lib/
│   ├── auth.ts                    # ADD: requireRole() helper export
│   ├── security/
│   │   ├── rate-limiter.ts        # REPLACE: Upstash-backed implementation
│   │   ├── validation.ts          # MODIFY: Add XSS refinements to all text schemas
│   │   └── sanitize.ts            # NEW: stripHtml() utility for write-time sanitization
│   ├── env.ts                     # MODIFY: BLOB_PRIVATE_READ_WRITE_TOKEN required
│   └── db/
│       └── schema.ts              # MODIFY: Add calEvent table
├── app/
│   ├── (dashboard)/
│   │   └── layout.tsx             # MODIFY: Add auth check + redirect
│   ├── (portal)/
│   │   └── layout.tsx             # MODIFY: Add auth check + redirect
│   ├── (dashboard)/access-denied/
│   │   └── page.tsx               # NEW: 403 access denied page
│   └── api/
│       ├── webhooks/stripe/route.ts  # MODIFY: Atomic idempotency
│       ├── webhooks/cal/route.ts     # MODIFY: Event tracking + error logging
│       └── [all admin routes]        # MODIFY: Error discrimination
```

### Pattern 1: Layout-Level Auth Enforcement
**What:** Server component layout calls `getCurrentSession()` and redirects before any child renders.
**When to use:** All protected route group layouts.
**Example:**
```typescript
// src/app/(dashboard)/layout.tsx
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    const hdrs = await headers();
    const pathname = hdrs.get('x-pathname') || '/dashboard';
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  // D-03: Dashboard requires ADMIN+ role
  const ADMIN_ROLES = ['admin', 'super_admin'];
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect('/access-denied');
  }

  // ... existing layout JSX
}
```

### Pattern 2: requireRole() Helper for Server Actions
**What:** Centralized role validation helper that throws typed errors.
**When to use:** Every server action that requires role-based access.
**Recommendation:** Use a helper function, not inline checks -- it ensures consistency across 13+ action files.
**Example:**
```typescript
// Added to src/lib/auth.ts
type Role = 'user' | 'staff' | 'manager' | 'admin' | 'super_admin';
const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  staff: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

export async function requireRole(minimumRole: Role): Promise<Session & { user: NonNullable<Session['user']> }> {
  const session = await getCurrentSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  const userLevel = ROLE_HIERARCHY[session.user.role as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  if (userLevel < requiredLevel) {
    throw new Error('Forbidden');
  }
  return session as Session & { user: NonNullable<Session['user']> };
}
```

### Pattern 3: Upstash Rate Limiter with Per-Route Configs
**What:** Replace in-memory Map with Upstash Redis-backed sliding window limiter.
**Why sliding window:** More fair than fixed window (no burst-at-boundary problem); standard algorithm for API rate limiting.
**Example:**
```typescript
// src/lib/security/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Per-route rate limiters with different thresholds (D-07)
export const rateLimiters = {
  contact: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:contact',
  }),
  storeDownload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:download',
  }),
  portalBilling: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:billing',
  }),
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:webhook',
  }),
} as const;

// Helper to extract IP from request headers
export function getRequestIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

// Helper to create 429 response with Retry-After header (D-08)
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return Response.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Reset': String(reset),
      },
    },
  );
}
```

### Pattern 4: Atomic Stripe Idempotency with ON CONFLICT
**What:** Replace read-then-write with atomic INSERT ... ON CONFLICT DO NOTHING.
**Why ON CONFLICT over serializable transaction:** Simpler, no transaction overhead, guaranteed by unique constraint, standard PostgreSQL pattern.
**Example:**
```typescript
// In stripe webhook handler
// BEFORE (race condition between read and write):
// const existing = await db.query.stripeEvent.findFirst(...);
// if (existing) return;

// AFTER (atomic -- single statement):
const [inserted] = await db.insert(schema.stripeEvent)
  .values({
    stripeEventId: event.id,
    type: event.type,
    processedAt: new Date(),
  })
  .onConflictDoNothing({ target: schema.stripeEvent.stripeEventId })
  .returning();

if (!inserted) {
  // Event already processed -- return 200 (idempotent success)
  return NextResponse.json({ received: true });
}

// Process the event...
```

### Pattern 5: Zod XSS Refinement
**What:** Add `.refine()` to all free-text Zod string fields to reject HTML/script content.
**Why Zod refinements instead of sanitization library:** The project doesn't need "safe HTML" -- all text fields should be plain text. Rejecting at validation is cleaner than silently stripping.
**Example:**
```typescript
// src/lib/security/sanitize.ts
const HTML_PATTERN = /<[^>]*>|&lt;|&gt;|javascript:|on\w+\s*=/i;

export function noHtml(value: string): boolean {
  return !HTML_PATTERN.test(value);
}

export const noHtmlMessage = 'Text must not contain HTML tags or script content';

// Usage in validation.ts (Zod 4 supports inline refine chaining):
export const CreateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).refine(noHtml, noHtmlMessage),
  lastName: z.string().min(1).max(100).refine(noHtml, noHtmlMessage),
  notes: z.string().optional().refine(
    (val) => !val || noHtml(val),
    noHtmlMessage
  ),
  // ... etc
});
```

### Pattern 6: Cal.com Event Tracking Table
**What:** Add `calEvent` table mirroring `stripeEvent` for Cal.com webhook audit trail.
**Example:**
```typescript
// Added to src/lib/db/schema.ts
export const calEvent = pgTable('cal_event', {
  id: uuid('id').defaultRandom().primaryKey(),
  calEventUid: text('calEventUid').notNull(),
  triggerEvent: text('triggerEvent').notNull(),
  processedAt: timestamp('processedAt').notNull().defaultNow(),
}, (table) => [
  index('cal_event_uid_idx').on(table.calEventUid),
]);

export const calEventRelations = relations(calEvent, () => ({}));
```

Note: `calEventUid` is NOT unique because Cal.com can send the same booking UID for CREATED, RESCHEDULED, CANCELLED events. The table is an audit trail, not an idempotency gate. Cal.com appointment upserts are already idempotent via `onConflictDoUpdate` on `calBookingUid`.

### Pattern 7: API Route Error Discrimination
**What:** Replace catch-all 401 with proper error type detection.
**Example:**
```typescript
// src/app/api/admin/sessions/route.ts
import { getCurrentSession } from '@/lib/auth';

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ADMIN_ROLES = ['admin', 'super_admin'];
  if (!ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const sessions = await getSessions();
    return NextResponse.json(sessions);
  } catch (err) {
    console.error('[API] GET /api/admin/sessions failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Anti-Patterns to Avoid
- **Middleware.ts for auth:** Deprecated in Next.js 16. Use layout-level checks instead.
- **In-memory rate limiting on serverless:** Resets on cold start, not shared across instances. Always use persistent storage.
- **Read-then-write idempotency:** Race condition between the read and write allows duplicate processing.
- **Catch-all 401 for all errors:** Masks real 500 errors as auth failures, making debugging impossible.
- **dangerouslySetInnerHTML with user input:** Only 2 uses found in codebase, both are safe (JSON-LD structured data and Shadcn chart CSS).
- **Relying on React escaping alone:** While React auto-escapes JSX interpolation, sanitizing on write provides defense-in-depth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent rate limiting | Custom PostgreSQL rate limiter | @upstash/ratelimit + Upstash Redis | Battle-tested algorithms (sliding window, token bucket), built for serverless, ~5ms latency vs ~30ms DB query |
| Sliding window algorithm | Custom time-bucket math | @upstash/ratelimit `slidingWindow()` | Edge cases around window boundaries, atomic increment/compare operations |
| IP extraction | Custom header parsing | Helper function wrapping `x-forwarded-for` | Vercel always sets this; first value is client IP; must handle comma-separated proxy chain |
| Auth session retrieval | Custom cookie parsing | `getCurrentSession()` from `@/lib/auth` | Already abstracts Better Auth session fetch with header forwarding |
| Zod 4 refinements | Custom validation middleware | Zod `.refine()` inline chaining | Zod 4 supports inline refinements (unlike Zod 3 which needed ZodEffects wrapper) |

**Key insight:** The project already has most infrastructure in place. This phase is about wiring existing tools correctly (auth in layouts, role checks in actions) and upgrading one dependency (rate limiter storage backend).

## Common Pitfalls

### Pitfall 1: Redirect Loop on Auth Check
**What goes wrong:** Layout redirects to `/login`, but `/login` is inside a route group with auth, causing infinite redirect.
**Why it happens:** Auth route group misconfiguration.
**How to avoid:** The `(auth)` route group already exists separately from `(dashboard)` and `(portal)`. The login page at `/login` is under `(auth)` which has NO auth check. Verify this is preserved.
**Warning signs:** Browser showing "too many redirects" error.

### Pitfall 2: callbackUrl Injection
**What goes wrong:** Attacker crafts `/login?callbackUrl=https://evil.com` to redirect after login.
**Why it happens:** Redirect destination not validated.
**How to avoid:** Better Auth's trustedOrigins config already validates redirect URLs. Additionally, verify callbackUrl starts with `/` (relative path) before using it.
**Warning signs:** Any absolute URL in callbackUrl parameter.

### Pitfall 3: X-Forwarded-For Spoofing
**What goes wrong:** Attacker sends fake `X-Forwarded-For` header to bypass rate limiting.
**Why it happens:** IP extracted from untrusted header.
**How to avoid:** On Vercel, `x-forwarded-for` is set by the platform and cannot be spoofed by the client (Vercel strips/replaces the header). This is safe for Vercel deployment. Document that if deployment moves off Vercel, IP extraction needs review.
**Warning signs:** Rate limiting ineffective against distributed attack.

### Pitfall 4: Zod 4 Refine on Optional Fields
**What goes wrong:** `.refine()` on optional field receives `undefined`, causing runtime error.
**Why it happens:** Zod 4 changed how refinements interact with optional/nullable.
**How to avoid:** For optional string fields, use pattern: `z.string().optional().refine((val) => !val || noHtml(val), message)` -- explicitly handle `undefined`.
**Warning signs:** Zod validation errors on empty optional fields.

### Pitfall 5: Stripe Webhook ON CONFLICT with Returning
**What goes wrong:** `.onConflictDoNothing().returning()` returns empty array on conflict, not the existing row.
**Why it happens:** PostgreSQL `ON CONFLICT DO NOTHING` skips the row entirely, so `.returning()` has nothing to return.
**How to avoid:** Check if the returned array is empty (conflict/already processed) vs non-empty (new insert). This is the correct behavior for idempotency.
**Warning signs:** Confusing empty array with error.

### Pitfall 6: Rate Limiter in Server Actions vs API Routes
**What goes wrong:** Applying Upstash rate limiter to server actions instead of API routes.
**Why it happens:** Contact form uses a server action, not an API route.
**How to avoid:** For server actions (like `submitContactAction`), the rate limiter must work with `headers()` from `next/headers` to get the IP, not from the `Request` object. Different calling patterns for server actions vs route handlers.
**Warning signs:** `request.headers` undefined in server action context.

### Pitfall 7: Upstash Redis Environment Variables Missing
**What goes wrong:** Rate limiter fails at runtime because UPSTASH_REDIS_REST_URL/TOKEN not set.
**Why it happens:** New external service dependency.
**How to avoid:** Add both vars to `src/lib/env.ts` Zod schema. Provide fallback to in-memory rate limiting for development (when env vars are not set).
**Warning signs:** Unhandled rejection from Redis client on first request.

## Code Examples

### Contact Server Action with Rate Limiting (Updated Pattern)
```typescript
// src/lib/actions/contact-actions.ts
'use server';
import { headers } from 'next/headers';
import { rateLimiters, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function submitContactAction(formData: FormData) {
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim()
    ?? hdrs.get('x-real-ip')
    ?? 'unknown';

  const { success, reset } = await rateLimiters.contact.limit(ip);
  if (!success) {
    return {
      success: false as const,
      error: 'Too many messages. Please try again later.',
    };
  }

  // ... existing validation and submission logic
}
```

### API Route with Rate Limiting
```typescript
// src/app/api/store/download/route.ts (modified)
import { rateLimiters, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function GET(request: NextRequest) {
  // Rate limit check
  const ip = getRequestIp(request);
  const { success, reset } = await rateLimiters.storeDownload.limit(ip);
  if (!success) {
    return rateLimitResponse(reset);
  }

  // ... existing download logic
}
```

### Cal.com Webhook with Event Tracking + Enhanced Error Logging
```typescript
// Modified Cal.com webhook handler
const parsed = CalWebhookPayloadSchema.safeParse(JSON.parse(body));
if (!parsed.success) {
  // D-12: Log Zod error paths, not raw body
  console.error('[Cal Webhook] Payload validation failed:', {
    errors: parsed.error.issues.map(i => ({
      path: i.path.join('.'),
      code: i.code,
      message: i.message,
    })),
  });
  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}

// D-10: Track event in calEvent table
await db.insert(schema.calEvent).values({
  calEventUid: parsed.data.payload.uid,
  triggerEvent: parsed.data.triggerEvent,
});
```

### Resend Webhook -- Event Tracking Decision
The Resend webhook handler currently only logs bounces and complaints. It does not create/modify database records. Adding an event tracking table for Resend is **not recommended** at this time because:
1. Resend events are informational (bounce/complaint logging only)
2. No idempotency concern (no state mutations)
3. Adding a table for logging that could be handled by structured logging is over-engineering

If future phases add Resend-triggered mutations (e.g., automatically marking emails as undeliverable), then add event tracking at that point.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js middleware for auth | Layout-level auth checks / proxy.ts | Next.js 16 (2025) | middleware.ts deprecated; layout checks are the canonical pattern |
| Zod 3 ZodEffects for refine | Zod 4 inline `.refine()` chaining | Zod 4 (2025) | Can chain `.refine()` with `.min()`, `.max()` etc. without wrapping |
| In-memory rate limiting | Persistent storage (Redis/KV) | Serverless adoption | In-memory resets on cold start; useless for distributed serverless |
| Better Auth `rateLimit.storage: "memory"` | `rateLimit.storage: "database"` or `"secondary-storage"` | Better Auth docs | Auth endpoint rate limiting should also use persistent storage |

**Deprecated/outdated:**
- `middleware.ts` in Next.js 16 -- replaced by `proxy.ts` for edge-level checks
- Zod 3's `superRefine` wrapping pattern -- Zod 4 supports inline refinements

## Open Questions

1. **Upstash Redis Account Setup**
   - What we know: @upstash/ratelimit requires Upstash Redis credentials (REST URL + token)
   - What's unclear: Whether the user already has an Upstash account or needs to create one
   - Recommendation: Include account setup instructions in Wave 0. Upstash has a generous free tier (10,000 requests/day) that covers development + low-traffic production. Add env vars to `.env.example` and `src/lib/env.ts`.

2. **Better Auth Built-in Rate Limiting Storage**
   - What we know: Better Auth has its own rate limiting with `storage: "database"` or `"secondary-storage"` options
   - What's unclear: Whether to also upgrade Better Auth's rate limiting storage to persistent (currently defaults to in-memory in serverless)
   - Recommendation: If Upstash Redis is being added anyway, configure Better Auth to use it as `secondaryStorage` for session caching AND rate limiting. This is a bonus hardening step, not strictly required by SEC-01 through SEC-10.

3. **x-pathname Header Availability**
   - What we know: Need the current URL path to construct callbackUrl for redirect
   - What's unclear: Whether `x-pathname` header is available in Next.js 16 server components without middleware
   - Recommendation: Use `headers()` to check for `x-pathname` or `x-invoke-path`. If unavailable, fall back to a hardcoded default (`/dashboard` or `/portal`). Alternatively, use `usePathname` in a client wrapper, but layout-level redirect in server component is preferred.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 22+ (via Next.js 16) | -- |
| PostgreSQL (Neon) | Database operations | Yes | Existing | -- |
| Upstash Redis | Rate limiting (SEC-03, SEC-04) | No (new) | -- | In-memory for dev, must provision for production |
| Vitest | Test runner | Yes | 3.1.1 | -- |

**Missing dependencies with no fallback:**
- Upstash Redis account + credentials for production rate limiting (Wave 0 setup task)

**Missing dependencies with fallback:**
- Upstash Redis for local development: fall back to in-memory rate limiter when `UPSTASH_REDIS_REST_URL` is not set (graceful degradation pattern)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Dashboard layout redirects unauthenticated | unit | `npx vitest run src/__tests__/dashboard-auth.test.ts -x` | No -- Wave 0 |
| SEC-02 | Portal layout redirects unauthenticated | unit | `npx vitest run src/__tests__/portal-auth.test.ts -x` | No -- Wave 0 |
| SEC-03 | Public routes return 429 after threshold | unit | `npx vitest run src/__tests__/rate-limiter.test.ts -x` | Yes (needs update) |
| SEC-04 | Rate limiter uses persistent storage | unit | `npx vitest run src/__tests__/rate-limiter.test.ts -x` | Yes (needs update) |
| SEC-05 | Server actions validate role | unit | `npx vitest run src/__tests__/server-actions.test.ts -x` | Yes (needs role assertions) |
| SEC-06 | XSS content rejected by validation | unit | `npx vitest run src/__tests__/validation-schemas.test.ts -x` | Yes (needs XSS cases) |
| SEC-07 | Stripe duplicate events are idempotent | unit | `npx vitest run src/__tests__/webhook-stripe.test.ts -x` | Yes (needs race test) |
| SEC-08 | Cal.com malformed payloads logged properly | unit | `npx vitest run src/__tests__/cal-webhook.test.ts -x` | Yes (needs error path test) |
| SEC-09 | API routes return correct status codes | unit | `npx vitest run src/__tests__/api-error-codes.test.ts -x` | No -- Wave 0 |
| SEC-10 | BLOB_PRIVATE_READ_WRITE_TOKEN required | unit | `npx vitest run src/__tests__/env.test.ts -x` | Yes (needs assertion update) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/dashboard-auth.test.ts` -- covers SEC-01 (layout auth redirect)
- [ ] `src/__tests__/portal-auth.test.ts` -- covers SEC-02 (layout auth redirect)
- [ ] `src/__tests__/api-error-codes.test.ts` -- covers SEC-09 (proper status codes)
- [ ] Update `src/__tests__/rate-limiter.test.ts` -- mock @upstash/ratelimit instead of in-memory Map
- [ ] Update `src/__tests__/server-actions.test.ts` -- add role-based rejection assertions
- [ ] Update `src/__tests__/validation-schemas.test.ts` -- add XSS refinement test cases
- [ ] Update `src/__tests__/webhook-stripe.test.ts` -- add atomic idempotency test
- [ ] Update `src/__tests__/cal-webhook.test.ts` -- add error logging structure test

## Audit of Existing Code

### Files That Need Auth Check Added
| File | Current State | Required Change |
|------|--------------|-----------------|
| `src/app/(dashboard)/layout.tsx` | Zero auth check | Add `getCurrentSession()` + redirect + ADMIN+ role check |
| `src/app/(portal)/layout.tsx` | Zero auth check | Add `getCurrentSession()` + redirect (any authenticated user) |

### Server Actions That Need Role Checks (SEC-05)
All 13 action files check `session?.user` but NONE check `session.user.role`:

| File | Current Check | Required Role |
|------|--------------|---------------|
| `customer-actions.ts` | `!session?.user` | admin+ |
| `appointment-actions.ts` | `!session?.user` | admin+ |
| `session-actions.ts` | `!session?.user` | admin+ |
| `media-actions.ts` | `!session?.user` | admin+ |
| `payment-actions.ts` | `!session?.user` | admin+ |
| `product-actions.ts` | `!session?.user` | admin+ |
| `order-actions.ts` | `!session?.user` | admin+ |
| `settings-actions.ts` | `!session?.user` | admin+ |
| `contact-status-action.ts` | `!session?.user` | admin+ |
| `store-actions.ts` | varies | public (no auth) |
| `gift-card-actions.ts` | varies | public (no auth) |
| `portal-actions.ts` | `!session?.user` | user+ (any authenticated) |
| `contact-actions.ts` | rate limit only | public (no auth) |

### API Routes That Need Error Discrimination (SEC-09)
| File | Current Pattern | Issue |
|------|----------------|-------|
| `api/admin/sessions/route.ts` | `catch { return 401 }` | All errors become auth errors |
| `api/admin/media/route.ts` | `catch { return 401 }` | All errors become auth errors |
| `api/admin/customers/route.ts` | `catch { return 401 }` | All errors become auth errors |
| `api/admin/appointments/route.ts` | `catch { return 401 }` | All errors become auth errors |
| `api/upload/route.ts` | Proper auth check | OK (uses session check inline) |
| `api/upload/token/route.ts` | Proper auth check | OK (uses session check inline) |

### dangerouslySetInnerHTML Audit (SEC-06)
Only 2 uses found, both safe:
1. `src/app/layout.tsx:113` -- JSON-LD structured data (developer-controlled, not user input)
2. `src/components/ui/chart.tsx:83` -- Shadcn chart CSS generation (developer-controlled theme config)

No unsafe uses of `dangerouslySetInnerHTML` with user input exist in the codebase.

### Zod Schemas That Need XSS Refinements (SEC-06, SEC-15)
All schemas in `src/lib/security/validation.ts` with free-text string fields:
- `ContactFormSchema` -- name, message
- `CreateCustomerSchema` -- firstName, lastName, address, city, state, notes, emergencyName, emergencyRel
- `UpdateCustomerSchema` -- all partial fields from above
- `CreateAppointmentSchema` -- firstName, lastName, description, notes
- `UpdateAppointmentSchema` -- notes
- `CreateSessionSchema` -- designDescription, placement, size, style, notes
- `UpdateSettingsSchema` -- key, description
- `ConsentSignSchema` -- signedName
- `UpdatePortalProfileSchema` -- firstName, lastName, address, city, state
- `CreateProductSchema` -- name, description
- `PurchaseGiftCardSchema` -- recipientName, senderName, personalMessage
- `UpdateOrderStatusSchema` -- notes

## Sources

### Primary (HIGH confidence)
- Existing codebase audit (all files read directly) -- auth patterns, rate limiter, webhooks, API routes, schemas
- Better Auth security skills -- `/.claude/skills/better-auth-security-best-practices/SKILL.md`
- Better Auth core skills -- `/.claude/skills/better-auth-best-practices/SKILL.md`
- [Drizzle ORM Upsert docs](https://orm.drizzle.team/docs/guides/upsert) -- onConflictDoNothing pattern
- [Zod 4 migration guide](https://zod.dev/v4/changelog) -- inline refinement chaining

### Secondary (MEDIUM confidence)
- [@upstash/ratelimit npm](https://www.npmjs.com/package/@upstash/ratelimit) -- v2.0.8, sliding window API
- [Upstash rate limiting docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) -- algorithm options, configuration
- [GitHub: upstash/ratelimit-js](https://github.com/upstash/ratelimit-js) -- source code, API surface
- [Vercel rate limit template](https://vercel.com/templates/next.js/ratelimit-with-upstash-redis) -- official Vercel integration
- [Next.js Auth Guide](https://nextjs.org/docs/app/guides/authentication) -- layout-level auth pattern

### Tertiary (LOW confidence)
- None -- all critical findings verified through codebase audit or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed except @upstash/ratelimit (well-documented, officially recommended by Vercel)
- Architecture: HIGH -- all patterns verified against existing codebase structure, minimal new patterns
- Pitfalls: HIGH -- all pitfalls derived from direct codebase audit and known serverless behaviors
- Rate limiting recommendation: MEDIUM -- @upstash/ratelimit is the standard choice but requires a new external service (Upstash Redis account)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain, no fast-moving changes expected)
