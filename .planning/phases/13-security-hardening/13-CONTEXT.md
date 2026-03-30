# Phase 13: Security Hardening - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden all admin and portal routes with auth enforcement at the layout level, add persistent rate limiting to all public API endpoints, sanitize all user inputs for XSS, and make all webhook handlers safe against duplicate events and malformed payloads. No new features — this is security remediation of the existing v1.0 codebase.

</domain>

<decisions>
## Implementation Decisions

### Auth Enforcement Strategy
- **D-01:** Use layout-level auth checks (NOT middleware.ts — middleware is deprecated in Next.js 16 in favor of proxy.ts). Dashboard and portal layouts call `getCurrentSession()` and redirect unauthenticated users before rendering any child content.
- **D-02:** Redirect unauthenticated users to `/login?callbackUrl=<attempted-url>` so they return to their intended page after signing in.
- **D-03:** Dashboard requires ADMIN+ role (ADMIN, SUPER_ADMIN). Staff/users who are authenticated but lack role see an access-denied page or redirect.
- **D-04:** Portal requires any authenticated user (USER+ role).
- **D-05:** Server actions validate roles explicitly before calling DAL functions.

### Claude's Discretion (Auth)
- Whether to use a `requireRole()` helper wrapper or inline checks per action — pick the best pattern for consistency.
- How to handle the edge case where session exists but role is insufficient (403 page vs redirect).

### Rate Limiting Approach
- **D-06:** Replace in-memory Map rate limiter with persistent storage suitable for serverless (Claude decides: Upstash Redis, Vercel KV, or database-backed — pick what fits the Vercel + Neon stack best).
- **D-07:** Rate limit ALL public API routes AND webhooks with separate per-route thresholds: contact form (5/min), store download (20/min), portal billing (10/min), webhooks (100/min).
- **D-08:** Return HTTP 429 with `Retry-After` header when rate limit is exceeded.

### Claude's Discretion (Rate Limiting)
- Exact choice of rate limiting library/storage backend.
- Whether to use sliding window or fixed window algorithm.
- IP extraction strategy for serverless (X-Forwarded-For handling).

### Webhook Idempotency & Safety
- **D-09:** Fix Stripe webhook race condition — make idempotency check atomic (Claude decides approach: unique constraint + ON CONFLICT, or serializable transaction).
- **D-10:** Add event tracking table for Cal.com webhook events (similar to stripeEvent table) for full audit trail.
- **D-11:** API routes use proper HTTP status codes: 401 for missing/invalid auth, 403 for insufficient role, 500 for internal errors. Log internal errors with structured context.
- **D-12:** Cal.com webhook Zod validation already exists — ensure error logging includes the payload shape that failed validation (not the raw body, just the Zod error path).

### Claude's Discretion (Webhooks)
- Exact atomic idempotency approach for Stripe (unique constraint vs transaction).
- Whether Resend webhook handler needs similar event tracking.

### Input Sanitization
- **D-13:** Both-layers approach: sanitize on write (strip HTML/script tags before storing in DB) AND verify React escaping at render (audit for any dangerouslySetInnerHTML or unsafe patterns).
- **D-14:** Sanitize ALL free-text fields: customer names, notes, descriptions, appointment notes, session notes, contact form messages, product descriptions — anything a user or admin types.
- **D-15:** Add Zod refinements to reject strings containing HTML/script patterns at the validation layer.

### Claude's Discretion (Sanitization)
- Choice of sanitization library (sanitize-html, DOMPurify/isomorphic-dompurify, or custom regex).
- Exact Zod refinement patterns.

### Env Schema Fix
- **D-16:** Make `BLOB_PRIVATE_READ_WRITE_TOKEN` required in the Zod env schema (currently optional, SEC-10 requirement).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & Session
- `src/lib/auth.ts` — Better Auth config, getCurrentSession() helper, session/role fields
- `src/lib/auth-client.ts` — Client-side auth utilities
- `src/app/(dashboard)/layout.tsx` — Dashboard layout (currently NO auth check — must add)
- `src/app/(portal)/layout.tsx` — Portal layout (currently NO auth check — must add)
- `src/app/(auth)/layout.tsx` — Auth layout (login/register pages)

### Rate Limiting
- `src/lib/security/rate-limiter.ts` — Current in-memory rate limiter (must replace)
- `src/app/api/store/download/route.ts` — Store download route (needs rate limiting)
- `src/app/api/portal/billing/route.ts` — Portal billing route (needs rate limiting)

### Webhooks
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook (has idempotency check, needs atomic fix)
- `src/app/api/webhooks/cal/route.ts` — Cal.com webhook (has Zod validation, needs event tracking)
- `src/app/api/webhooks/resend/route.ts` — Resend webhook handler
- `src/lib/security/validation.ts` — Zod schemas including CalWebhookPayloadSchema

### Input Validation
- `src/lib/security/validation.ts` — All Zod validation schemas (must add XSS refinements)
- `src/lib/db/schema.ts` — Database schema (text fields that store user input)

### Env
- `src/lib/env.ts` — Zod env schema (BLOB_PRIVATE_READ_WRITE_TOKEN currently optional)

### API Routes (all need error code audit)
- `src/app/api/admin/sessions/route.ts`
- `src/app/api/admin/media/route.ts`
- `src/app/api/admin/customers/route.ts`
- `src/app/api/admin/appointments/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/upload/token/route.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getCurrentSession()` in `src/lib/auth.ts` — session helper already exists, just needs to be called in layouts
- `CalWebhookPayloadSchema` in `src/lib/security/validation.ts` — Cal.com Zod validation already implemented
- `stripeEvent` table in schema — idempotency pattern exists, needs atomic upgrade
- Zod validation schemas in `src/lib/security/validation.ts` — can add XSS refinements to existing schemas

### Established Patterns
- Server-only imports with `import 'server-only'` — auth and env modules use this
- Zod schema validation — consistent pattern across all forms and webhooks
- `env()` singleton for environment variables — single source of truth
- Better Auth with admin plugin — role system already configured with 5 tiers

### Integration Points
- Dashboard layout is the single entry point for all /dashboard/* routes
- Portal layout is the single entry point for all /portal/* routes
- All API routes are in `src/app/api/` — rate limiter wraps each handler
- Server actions in `src/lib/actions/` — role checks go at the top of each action

</code_context>

<specifics>
## Specific Ideas

- Middleware.ts is deprecated in Next.js 16 — use layout-level auth checks, NOT middleware
- Cal.com event tracking table should mirror the stripeEvent pattern for consistency
- Rate limiting thresholds: contact (5/min), download (20/min), billing (10/min), webhooks (100/min)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-security-hardening*
*Context gathered: 2026-03-28*
