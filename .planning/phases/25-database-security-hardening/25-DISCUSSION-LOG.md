# Phase 25: Database + Security Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 25-database-security-hardening
**Areas discussed:** Migration consolidation, Production seed data, CSP nonce strategy, Admin rate limiting

---

## Migration Consolidation

| Option | Description | Selected |
|--------|-------------|----------|
| Squash to single file | Delete both migrations, generate one fresh migration from current schema.ts. Clean slate for production. Requires wiping local dev DBs. | ✓ |
| Baseline marker approach | Keep existing migrations but add a 'baseline' marker so Drizzle treats them as already-applied on production. | |
| You decide | Claude picks the best approach | |

**User's choice:** Squash to single file
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh deployment | No production database exists yet | |
| Existing prod DB | Production has data -- must handle migration state carefully | ✓ |
| Not sure yet | Haven't set up production DB | |

**User's choice:** Existing prod DB
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes -- db:reset drops and recreates | Convenient for local dev | |
| No -- just db:migrate is enough | Keep it simple | ✓ |

**User's choice:** No db:reset script
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Separate commands | db:migrate for schema only, db:seed for data | ✓ |
| Combined: migrate + seed | db:setup runs both in sequence | |

**User's choice:** Separate commands
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Manual baseline | Squash locally, mark as applied in prod journal. Document in DEPLOYMENT.md. | ✓ |
| Conditional migration | Use IF NOT EXISTS in SQL. Zero manual prod steps. | |
| You decide | Claude picks safest approach | |

**User's choice:** Manual baseline
**Notes:** Production database exists with data, so squash needs careful handling.

---

## Production Seed Data

| Option | Description | Selected |
|--------|-------------|----------|
| Yes -- upsert pattern | INSERT ... ON CONFLICT DO UPDATE. Safe to re-run. | ✓ |
| No -- insert-only with guard | Check if exists, skip if seeded. Simpler. | |
| You decide | Claude picks best pattern | |

**User's choice:** Upsert pattern (idempotent)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Real data -- Richard's profile | Seed with actual artist data | |
| Placeholder -- fill in later | Generic 'Studio Artist' data | ✓ |
| Both -- env-based | Environment variable switches between real and placeholder | |

**User's choice:** Placeholder data
**Notes:** Owner fills in real data through admin dashboard after first launch.

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal starter template | Basic structure with placeholder text | |
| Full legal template | Complete tattoo consent form with standard legal language | ✓ |
| You decide | Claude picks | |

**User's choice:** Full legal template
**Notes:** Ready to use immediately out of the box.

---

## CSP Nonce Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js middleware | Generate nonce in middleware.ts, set as header | |
| Custom server header | Generate at edge/CDN level | |
| You decide | Claude picks best approach | |

**User's choice:** proxy.ts (user corrected: Next.js 16 uses proxy.ts not middleware.ts)
**Notes:** User explicitly noted that Next.js 16 has proxy.ts as the replacement for middleware.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Cal.com domain allowlisted | CSP allows scripts from https://app.cal.com | ✓ |
| Nonce the Cal.com loader script | Apply nonce to Cal.com embed script tag | |
| You decide | Claude figures out Cal.com CSP needs | |

**User's choice:** Keep Cal.com domain allowlisted
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely | Strongest security posture | ✓ |
| Keep for now, audit later | Remove unsafe-inline only | |
| You decide | Claude audits eval usage | |

**User's choice:** Remove unsafe-eval entirely
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Self-host fonts | Download Google Fonts, serve from /public/fonts | |
| Keep Google Fonts CDN | Allow fonts.googleapis.com in CSP | |
| You decide | Claude picks best approach | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

## Admin Rate Limiting

| Option | Description | Selected |
|--------|-------------|----------|
| Per-IP | Same as public routes, consistent pattern | |
| Per-user + per-IP fallback | Auth requests by user ID, unauth by IP | |
| You decide | Claude picks based on threat model | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Generous -- 60/min | Admin users are trusted. Protects against automation. | ✓ |
| Moderate -- 30/min | More restrictive | |
| Tight -- 10/min | Very restrictive | |

**User's choice:** Generous -- 60/min
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Separate limiters | Admin data at 60/min, upload at 20/min | ✓ |
| Single shared limiter | One 'admin' limiter for all | |
| You decide | Claude picks granularity | |

**User's choice:** Separate limiters
**Notes:** Upload is more expensive and abuse-prone, so separate thresholds make sense.

---

## Claude's Discretion

- Font loading strategy (self-host vs CDN) for CSP nonce compatibility
- Rate limit key strategy (per-IP vs per-user) for admin routes
- Exact nonce propagation approach in layout.tsx
- Whether admin routes need synchronous rateLimit() fallback

## Deferred Ideas

None -- discussion stayed within phase scope
