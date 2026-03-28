---
phase: 13-security-hardening
plan: 02
subsystem: security
tags: [upstash, ratelimit, redis, xss, sanitization, zod, rate-limiting]

# Dependency graph
requires:
  - phase: 13-security-hardening plan 01
    provides: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars in Zod env schema
provides:
  - Upstash Redis-backed persistent rate limiter with per-route configurations
  - XSS sanitization utility (noHtml) for Zod schema refinements
  - Rate-limited store download, portal billing, and contact form routes
  - 429 response helper with Retry-After header
affects: [13-security-hardening plan 03 (webhook rate limiting), 14-data-layer-fixes, 22-testing]

# Tech tracking
tech-stack:
  added: ["@upstash/ratelimit@2.0.8", "@upstash/redis@1.37.0"]
  patterns: ["Upstash sliding window rate limiting with in-memory dev fallback", "Zod noHtml refinements for XSS prevention on all free-text fields"]

key-files:
  created:
    - src/lib/security/sanitize.ts
  modified:
    - src/lib/security/rate-limiter.ts
    - src/lib/security/validation.ts
    - src/app/api/store/download/route.ts
    - src/app/api/portal/billing/route.ts
    - src/lib/actions/contact-actions.ts
    - src/__tests__/rate-limiter.test.ts
    - src/__tests__/contact-form.test.ts

key-decisions:
  - "Used InMemoryRateLimiter class matching Upstash API surface for dev fallback instead of Upstash ephemeral mode (Ratelimit constructor requires redis instance)"
  - "Reject-not-sanitize approach for XSS: noHtml rejects HTML content at validation layer rather than stripping tags"
  - "Two dangerouslySetInnerHTML instances (Shadcn chart CSS + JSON-LD) confirmed safe and documented"

patterns-established:
  - "Rate limiting pattern: import rateLimiters.X, call .limit(ip), check success, return rateLimitResponse(reset) on failure"
  - "XSS validation pattern: use noHtml/noHtmlMessage Zod refinement on all free-text string fields"
  - "IP extraction: getRequestIp(request) for API routes, getHeaderIp(headers) for server actions"

requirements-completed: [SEC-03, SEC-04, SEC-06]

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 13 Plan 02: Rate Limiting + XSS Sanitization Summary

**Upstash Redis-backed persistent rate limiting on all public routes with per-route thresholds, XSS prevention via Zod noHtml refinements on 22 free-text fields**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T15:42:52Z
- **Completed:** 2026-03-28T15:50:40Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Replaced in-memory globalThis Map rate limiter with Upstash Redis-backed sliding window rate limiter (persistent across serverless instances)
- Created per-route rate limiters: contact (5/min), store download (20/min), portal billing (10/min), webhook (100/min)
- Created XSS sanitization utility and added Zod noHtml refinements to all 22 free-text string fields across 10 schemas
- Wired rate limiting to store download, portal billing, and contact form routes with 429 + Retry-After headers
- All 366 tests passing (16 new rate limiter tests, 12 updated contact form tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace rate limiter with Upstash + create XSS sanitize utility + add Zod refinements + render-layer audit** - `bcb4049` (feat)
2. **Task 2: Wire rate limiting to public API routes and contact action** - `9c97439` (feat)

## Files Created/Modified
- `src/lib/security/rate-limiter.ts` - Complete replacement: Upstash Redis-backed rate limiter with InMemoryRateLimiter dev fallback, per-route configurations, IP helpers, 429 response helper
- `src/lib/security/sanitize.ts` - NEW: noHtml XSS detection utility for Zod refinements
- `src/lib/security/validation.ts` - Added noHtml refinements to all free-text string fields across all schemas (22 fields)
- `src/app/api/store/download/route.ts` - Added rate limiting (20/min) at top of GET handler
- `src/app/api/portal/billing/route.ts` - Added rate limiting (10/min) at top of POST handler, updated signature to accept Request
- `src/lib/actions/contact-actions.ts` - Replaced old rateLimit() with rateLimiters.contact.limit() API
- `src/__tests__/rate-limiter.test.ts` - Rewritten for new async API (16 tests: limit, block, remaining, reset, IP extraction, 429 response)
- `src/__tests__/contact-form.test.ts` - Updated mock to match new rateLimiters API
- `package.json` - Added @upstash/ratelimit and @upstash/redis dependencies

## Decisions Made
- **InMemoryRateLimiter for dev fallback:** The Upstash Ratelimit constructor requires a Redis instance; ephemeral mode without Redis is not supported in v2.0.8. Created a custom InMemoryRateLimiter class with the same `.limit()` API surface for development environments where UPSTASH env vars are absent.
- **Reject-not-sanitize XSS approach:** Rather than stripping HTML tags (which can change user intent), the noHtml utility rejects strings containing HTML/script patterns entirely. This is cleaner for a tattoo studio app where no field needs HTML input.
- **Confirmed safe dangerouslySetInnerHTML:** Two instances found -- Shadcn chart CSS variable injection and JSON-LD structured data in layout. Both use developer-controlled data, no user input flows through them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] InMemoryRateLimiter class instead of ephemeral Ratelimit**
- **Found during:** Task 1 (rate limiter replacement)
- **Issue:** Plan assumed @upstash/ratelimit supports creating Ratelimit without redis instance for ephemeral mode. In v2.0.8, the constructor requires a `redis` property.
- **Fix:** Created InMemoryRateLimiter class implementing the same `.limit()` API, used when UPSTASH env vars are missing
- **Files modified:** src/lib/security/rate-limiter.ts
- **Verification:** 16 rate limiter tests pass using in-memory fallback
- **Committed in:** bcb4049

**2. [Rule 1 - Bug] Updated existing test files for new API**
- **Found during:** Task 1 (rate limiter replacement)
- **Issue:** Existing rate-limiter.test.ts and contact-form.test.ts used old synchronous rateLimit() API
- **Fix:** Rewrote rate-limiter tests for async API, updated contact-form mock to use rateLimiters.contact.limit()
- **Files modified:** src/__tests__/rate-limiter.test.ts, src/__tests__/contact-form.test.ts
- **Verification:** All 366 tests pass
- **Committed in:** bcb4049

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- npm install required --legacy-peer-deps due to vitest peer dependency conflict (existing issue, not caused by new packages)

## User Setup Required

Upstash Redis requires external service configuration for production rate limiting. The rate limiter gracefully degrades to in-memory for development when env vars are missing.

**Required for production:**
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST API URL (from Upstash console)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST API token (from Upstash console)

These should be added to the Vercel project environment variables. Plan 01 handles adding them to the Zod env schema.

## Known Stubs

None - all rate limiters are wired to real routes and the XSS utility is applied to all schemas.

## Next Phase Readiness
- Rate limiting infrastructure ready for webhook routes (Plan 03 will wire rateLimiters.webhook)
- XSS sanitization patterns established for any new schemas added in future phases
- All 366 tests passing, zero regressions

## Self-Check: PASSED

All 8 created/modified files exist. Both task commits (bcb4049, 9c97439) verified. SUMMARY.md present.

---
*Phase: 13-security-hardening*
*Completed: 2026-03-28*
