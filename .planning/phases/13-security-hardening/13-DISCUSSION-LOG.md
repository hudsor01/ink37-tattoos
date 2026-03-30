# Phase 13: Security Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 13-security-hardening
**Areas discussed:** Auth enforcement strategy, Rate limiting approach, Webhook idempotency & safety, Input sanitization scope

---

## Auth Enforcement Strategy

### Q1: How should dashboard and portal routes be protected?

| Option | Description | Selected |
|--------|-------------|----------|
| Layout-level auth check | Add getCurrentSession() in dashboard/portal layouts with redirect to /login. Server-side, no page content leaks. | ✓ |
| Middleware redirect | Add middleware.ts matching /dashboard/* and /portal/* routes. Faster but can't do DB role checks. | |
| Both layers | Middleware for fast cookie check + layout for full session/role validation. | |

**User's choice:** Layout-level auth check
**Notes:** User noted middleware is deprecated in Next.js 16 in favor of proxy.ts.

### Q2: How should server actions validate user roles?

| Option | Description | Selected |
|--------|-------------|----------|
| Helper wrapper | Create a requireRole('ADMIN') helper. Consistent pattern, one place to maintain. | |
| Inline checks per action | Each action calls getCurrentSession() and checks manually. | |
| You decide | Claude picks the best pattern. | ✓ |

**User's choice:** You decide

### Q3: Minimum role level for dashboard access?

| Option | Description | Selected |
|--------|-------------|----------|
| ADMIN+ only | Dashboard restricted to ADMIN and SUPER_ADMIN. | ✓ |
| STAFF+ can view | STAFF and above can access dashboard. | |
| Any authenticated user | Dashboard visible to all logged-in users. | |

**User's choice:** ADMIN+ only

### Q4: Where to redirect unauthenticated/unauthorized users?

| Option | Description | Selected |
|--------|-------------|----------|
| /login with return URL | Redirect to /login?callbackUrl=/dashboard/... | ✓ |
| Just /login | Simple redirect, no return URL tracking. | |
| You decide | Claude picks. | |

**User's choice:** /login with return URL

---

## Rate Limiting Approach

### Q1: Persistent storage for rate limiter?

| Option | Description | Selected |
|--------|-------------|----------|
| Upstash Redis | Serverless Redis with @upstash/ratelimit. Purpose-built for serverless. | |
| Vercel KV | Vercel's managed Redis (powered by Upstash). | |
| Database-backed | Store counters in Neon PostgreSQL. | |
| You decide | Claude picks for Vercel + Neon stack. | ✓ |

**User's choice:** You decide

### Q2: Which public endpoints to rate limit?

| Option | Description | Selected |
|--------|-------------|----------|
| All public APIs + webhooks | Contact (5/min), download (20/min), billing (10/min), webhooks (100/min). | ✓ |
| Critical routes only | Only contact form and store download. | |
| You decide | Claude determines routes and thresholds. | |

**User's choice:** All public APIs + webhooks

---

## Webhook Idempotency & Safety

### Q1: Fix Stripe webhook race condition?

| Option | Description | Selected |
|--------|-------------|----------|
| Unique DB constraint | Add unique index, use INSERT ON CONFLICT DO NOTHING. Atomic. | |
| Transaction with SELECT FOR UPDATE | Serializable transaction. Prevents races but adds lock contention. | |
| You decide | Claude picks best approach. | ✓ |

**User's choice:** You decide

### Q2: Add idempotency tracking for Cal.com events?

| Option | Description | Selected |
|--------|-------------|----------|
| No — Zod + upsert sufficient | Cal.com handler already uses ON CONFLICT DO UPDATE. | |
| Yes — add event tracking | Track events in a table like Stripe. Full audit trail. | ✓ |
| You decide | Claude decides. | |

**User's choice:** Yes — add event tracking

### Q3: Distinguish auth failures from internal errors in API routes?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — proper HTTP status codes | 401 for auth, 403 for role, 500 for internal. Log with context. | ✓ |
| Keep simple | Generic error responses for all failures. | |
| You decide | Claude decides. | |

**User's choice:** Yes — proper HTTP status codes

---

## Input Sanitization Scope

### Q1: XSS prevention strategy?

| Option | Description | Selected |
|--------|-------------|----------|
| React default + Zod | React escapes by default. Tighten Zod schemas. Audit for unsafe patterns. | |
| Server-side sanitize on write | Strip tags before storing with sanitize-html or DOMPurify. | |
| Both layers | Sanitize on write AND verify React escaping at render. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Both layers

### Q2: Which fields get sanitization?

| Option | Description | Selected |
|--------|-------------|----------|
| All free-text fields | Customer names, notes, descriptions, contact messages, product descriptions. | ✓ |
| Only user-facing inputs | Contact form, portal profile, consent forms. Trust admin inputs. | |
| You decide | Claude determines. | |

**User's choice:** All free-text fields

---

## Claude's Discretion

- requireRole() helper vs inline checks — Claude picks best pattern
- Session exists but role insufficient — 403 page vs redirect
- Rate limiting backend choice (Upstash, Vercel KV, or DB-backed)
- Sliding window vs fixed window rate limiting
- Stripe atomic idempotency approach (unique constraint vs transaction)
- Resend webhook event tracking (yes/no)
- Sanitization library choice
- Zod XSS refinement patterns

## Deferred Ideas

None — discussion stayed within phase scope
