# Phase 25: Database + Security Hardening - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Consolidate Drizzle migrations into a single clean baseline, create an idempotent production seed script, replace CSP `unsafe-inline`/`unsafe-eval` with nonce-based policies, and add Upstash-backed rate limiting to all admin and upload API routes. No new features -- this is production hardening of the existing v3.0 codebase.

</domain>

<decisions>
## Implementation Decisions

### Migration Consolidation
- **D-01:** Squash existing 2 migrations (`0000_dry_human_torch.sql`, `0001_lively_whirlwind.sql`) into a single consolidated migration generated from current `schema.ts`. Delete old migration files and journal entries.
- **D-02:** Use manual baseline approach for production -- squash locally, then mark the consolidated migration as "already applied" in production's Drizzle journal. Document the one-time production step in DEPLOYMENT.md.
- **D-03:** Keep `db:migrate` and `db:seed` as separate commands. No `db:reset` script needed.
- **D-04:** Production database already exists with data -- consolidation must not break existing prod state.

### Production Seed Data
- **D-05:** Seed script must be idempotent using upsert pattern (INSERT ... ON CONFLICT DO UPDATE). Safe to run multiple times without duplicating data.
- **D-06:** Artist profile seeded with placeholder data ("Studio Artist"), not real data. Owner fills in through admin dashboard.
- **D-07:** Consent form template seeded with a full legal tattoo consent document, ready to use immediately.
- **D-08:** Default studio settings seeded (hours, policies, contact info placeholders).
- **D-09:** Script exposed as `bun run db:seed` in package.json.

### CSP Nonce Strategy
- **D-10:** Generate nonces in Next.js 16 `proxy.ts` (NOT middleware.ts -- middleware is deprecated in Next.js 16). Set nonce as a request header, read in layout.tsx via `headers()`.
- **D-11:** Remove `'unsafe-inline'` from both script-src and style-src, replacing with nonce-based allowlisting.
- **D-12:** Remove `'unsafe-eval'` entirely. If anything breaks, fix with proper nonces or restructuring.
- **D-13:** Keep Cal.com domain allowlisted in script-src (`https://app.cal.com`). Cal.com embed scripts loaded by domain, not by nonce.
- **D-14:** CSP header moves from static `next.config.ts` `headers()` to dynamic generation in proxy.ts (required for per-request nonces).

### Claude's Discretion (CSP)
- Whether to self-host Google Fonts or keep CDN with nonce -- pick what works best for CSP + performance.
- Exact nonce propagation to `<script>` and `<style>` tags in layout.tsx and any inline scripts.

### Admin Rate Limiting
- **D-15:** Add separate Upstash-backed rate limiters for admin data routes and upload routes, following existing `rateLimiters` pattern in `src/lib/security/rate-limiter.ts`.
- **D-16:** Admin data routes (`/api/admin/*`): 60 requests/min threshold.
- **D-17:** Upload routes (`/api/upload/*`): 20 requests/min threshold (uploads are more expensive/abuse-prone).
- **D-18:** Rate limit returns 429 with `Retry-After` header (reuse existing `rateLimitResponse()` helper).

### Claude's Discretion (Rate Limiting)
- Whether to key rate limits by IP or authenticated user ID -- pick the best approach for the threat model.
- Whether admin routes also need the synchronous `rateLimit()` fallback or only the async Upstash limiter.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & Migrations
- `src/lib/db/schema.ts` -- Complete Drizzle schema (source of truth for consolidated migration)
- `src/lib/db/index.ts` -- Database connection setup (Neon serverless driver)
- `drizzle/0000_dry_human_torch.sql` -- Initial migration (to be replaced)
- `drizzle/0001_lively_whirlwind.sql` -- Cal event migration (to be replaced)
- `drizzle/meta/_journal.json` -- Migration journal (must be regenerated)
- `package.json` -- Scripts section (add db:seed, verify db:migrate)

### Security Headers
- `next.config.ts` -- Current CSP and security headers (static, must move to dynamic)
- `src/app/layout.tsx` -- Root layout (nonce must be available here for script/style tags)

### Rate Limiting
- `src/lib/security/rate-limiter.ts` -- Existing Upstash + in-memory rate limiter pattern (extend with admin/upload limiters)
- `src/app/api/admin/sessions/route.ts` -- Admin sessions route (needs rate limiting)
- `src/app/api/admin/media/route.ts` -- Admin media route (needs rate limiting)
- `src/app/api/admin/customers/route.ts` -- Admin customers route (needs rate limiting)
- `src/app/api/admin/appointments/route.ts` -- Admin appointments route (needs rate limiting)
- `src/app/api/upload/route.ts` -- Upload route (needs rate limiting)
- `src/app/api/upload/token/route.ts` -- Upload token route (needs rate limiting)

### Prior Phase Context
- `.planning/phases/13-security-hardening/13-CONTEXT.md` -- Phase 13 security decisions (rate limiting, auth enforcement patterns established there)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rateLimiters` object in `src/lib/security/rate-limiter.ts` -- Extend with `admin` and `upload` entries using same `createLimiter()` factory
- `rateLimitResponse()` helper -- Returns 429 with Retry-After header, ready to use
- `getRequestIp()` / `getHeaderIp()` -- IP extraction helpers for rate limit keys
- `createLimiter()` factory -- Handles Upstash vs in-memory fallback transparently

### Established Patterns
- Rate limiters are module-level singletons created via `createLimiter(requests, window, prefix)`
- Each API route imports the specific limiter and checks at top of handler
- Drizzle migrations use `drizzle-kit migrate` command
- Security headers set in `next.config.ts` `headers()` function (currently static)

### Integration Points
- `next.config.ts` headers() -- CSP moves from here to proxy.ts for dynamic nonces
- `proxy.ts` (new file) -- Next.js 16 replacement for middleware, generates nonces
- `drizzle.config.ts` -- Drizzle Kit config, controls migration output directory
- All `/api/admin/*` and `/api/upload/*` route handlers -- add rate limiting at top of each

</code_context>

<specifics>
## Specific Ideas

- Production database already has data -- migration consolidation must use manual baseline approach (mark as applied in prod journal)
- Consent form should be a complete legal document, not a stub
- Next.js 16 uses proxy.ts not middleware.ts for request interception
- Existing rate limiter already supports Upstash Redis with graceful in-memory fallback

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 25-database-security-hardening*
*Context gathered: 2026-03-30*
