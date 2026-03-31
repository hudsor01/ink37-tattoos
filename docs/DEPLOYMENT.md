# Ink37 Tattoos - Production Deployment Guide

## Overview

Ink37 Tattoos is a unified Next.js 16 tattoo studio platform deployed on Vercel with Neon PostgreSQL. This guide covers the complete production deployment lifecycle: environment setup, database migration, DNS cutover, monitoring verification, and operational procedures.

**Stack:** Next.js 16 + React 19.2 | Drizzle ORM 0.45.1 | Neon PostgreSQL | Better Auth 1.5.5 | Stripe | Vercel

---

## Pre-deployment Checklist

Before deploying to production, verify all items:

### Build & Tests

- [ ] `bun run build` succeeds locally with no errors
- [ ] `bun run test` passes all test suites
- [ ] `bun run lint` shows no errors

### Environment Variables

- [ ] All required env vars set in Vercel project settings (see [Environment Variables Reference](#environment-variables-reference))
- [ ] `BETTER_AUTH_SECRET` is a cryptographically random string (64+ characters)
- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to `https://ink37tattoos.com`
- [ ] Neon `DATABASE_URL` uses the production database connection string
- [ ] Stripe keys are production keys (not test keys prefixed with `sk_test_`)
- [ ] Sentry DSN configured for error tracking
- [ ] Upstash Redis credentials set for persistent rate limiting

### External Services

- [ ] Stripe webhook endpoint registered: `https://ink37tattoos.com/api/webhooks/stripe`
- [ ] Cal.com webhook endpoint registered: `https://ink37tattoos.com/api/webhooks/cal`
- [ ] Resend sender domain verified for `@ink37tattoos.com`
- [ ] Vercel Blob storage token configured
- [ ] Sentry project created and DSN obtained

### Database

- [ ] Neon production database created
- [ ] Drizzle migrations applied: `bun run db:migrate`
- [ ] Production seed data loaded (if applicable): artist profile, default settings, consent form

---

## Environment Variables Reference

### Required

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/ink37` |
| `BETTER_AUTH_SECRET` | Auth session encryption key (64+ chars) | `<random-64-char-string>` |
| `BETTER_AUTH_URL` | Canonical app URL for auth callbacks | `https://ink37tattoos.com` |
| `NEXT_PUBLIC_APP_URL` | Public URL for metadata, sitemap, OG tags | `https://ink37tattoos.com` |
| `STRIPE_SECRET_KEY` | Stripe API secret key (production) | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `BLOB_PRIVATE_READ_WRITE_TOKEN` | Vercel Blob storage token (private) | `vercel_blob_rw_...` |

### Recommended

| Variable | Purpose | Example |
|----------|---------|---------|
| `RESEND_API_KEY` | Resend email service API key | `re_...` |
| `ADMIN_EMAIL` | Email for contact form notifications | `admin@ink37tattoos.com` |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token (public) | `vercel_blob_rw_...` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for rate limiting | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token | `AXxx...` |
| `SENTRY_DSN` | Sentry server-side DSN | `https://xxx@sentry.io/xxx` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client-side DSN | `https://xxx@sentry.io/xxx` |
| `SENTRY_ORG` | Sentry organization slug | `ink37` |
| `SENTRY_PROJECT` | Sentry project slug | `ink37-tattoos` |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (source map uploads) | `sntrys_...` |

### Optional

| Variable | Purpose | Example |
|----------|---------|---------|
| `CAL_API_KEY` | Cal.com server-side API key | `cal_xxx` |
| `CAL_WEBHOOK_SECRET` | Cal.com webhook signing secret | `<string>` |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret | `<string>` |
| `CRON_SECRET` | Vercel Cron / n8n cron auth secret | `<string>` |
| `LOG_LEVEL` | Pino log level override (default: `info` in prod) | `debug` |
| `NEXT_PUBLIC_CAL_USERNAME` | Cal.com username for booking embed | `ink37` |
| `NEXT_PUBLIC_CAL_CONSULTATION_SLUG` | Cal.com consultation event slug | `consultation` |
| `NEXT_PUBLIC_CAL_DESIGN_REVIEW_SLUG` | Cal.com design review event slug | `design-review` |
| `NEXT_PUBLIC_CAL_TATTOO_SESSION_SLUG` | Cal.com tattoo session event slug | `tattoo-session` |
| `NEXT_PUBLIC_CAL_TOUCH_UP_SLUG` | Cal.com touch-up event slug | `touch-up` |

---

## Database Migration

Ink37 uses Drizzle ORM with Neon PostgreSQL. **Never use Prisma commands** -- the project migrated from Prisma to Drizzle in v1.0.

### Apply Migrations

```bash
# Apply all pending migrations to production
bun run db:migrate
```

This runs `drizzle-kit migrate` which applies SQL files from the `drizzle/` directory in order.

### Generate New Migrations

```bash
# After schema changes in src/lib/db/schema.ts, generate a migration
bun run db:generate

# Push schema directly (development only -- never in production)
bun run db:push
```

### Inspect Database

```bash
# Launch Drizzle Studio for visual database inspection
bun run db:studio
```

### Schema Location

- Schema definition: `src/lib/db/schema.ts` (19 tables)
- Migration files: `drizzle/`
- Drizzle config: `drizzle.config.ts`

---

## Deployment Steps

### 1. Vercel GitHub Integration

The project deploys automatically via Vercel's GitHub integration:

- **Push to main** triggers a production deployment
- **Pull requests** create preview deployments
- GitHub Actions runs `bun run test` and `bun run build` on all PRs

### 2. Deploy to Preview (Manual)

```bash
# If needed, deploy manually to preview
vercel deploy
```

### 3. Verify Preview Deployment

**Public site:**
- [ ] Homepage loads with correct SEO metadata
- [ ] Gallery page renders with masonry layout
- [ ] Contact form submission works (check admin email)
- [ ] Booking page loads Cal.com embed
- [ ] Services, About, FAQ pages render correctly
- [ ] Store page loads with product listings
- [ ] 404 page displays for invalid routes

**Admin dashboard:**
- [ ] Login works at `/login`
- [ ] Dashboard overview loads with KPI widgets
- [ ] Customer, appointment, session CRUD works
- [ ] Media upload to Vercel Blob works
- [ ] Analytics charts render correctly

**Client portal:**
- [ ] Portal login works for client users
- [ ] Appointment history displays
- [ ] Consent forms are accessible

**API endpoints:**
- [ ] `GET /api/health` returns `{ status: "ok", db: "connected" }`
- [ ] Stripe webhook test event processes correctly
- [ ] Rate limiting activates on rapid requests

**Monitoring:**
- [ ] Sentry receives test errors (trigger via `/api/health` with DB disconnected, or throw a test error)
- [ ] Structured JSON logs appear in Vercel logs (Pino format with timestamps and levels)
- [ ] Web Vitals metrics appear in Sentry performance dashboard

### 4. DNS Cutover

Update DNS records for `ink37tattoos.com` to point to Vercel:

```
Type    Name    Value
CNAME   @       cname.vercel-dns.com
CNAME   www     cname.vercel-dns.com
```

Brief downtime occurs during DNS propagation (typically 5-30 minutes).

### 5. Promote to Production

```bash
# Once DNS is configured, promote to production
vercel --prod
```

### 6. Post-deployment Verification

- [ ] `https://ink37tattoos.com` resolves to the new deployment
- [ ] HTTPS certificate is valid (auto-provisioned by Vercel)
- [ ] All preview verification checks pass on the production URL
- [ ] `/sitemap.xml` returns valid XML with all public URLs
- [ ] `/robots.txt` returns correct crawl rules
- [ ] `/api/health` returns 200 with `{ status: "ok" }`
- [ ] Security headers present: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`

### 7. Decommission Old Deployments

Once the unified app is confirmed working in production:

- [ ] Remove old `tattoo-website` Vercel deployment
- [ ] Remove old `admin-tattoo-website` Vercel deployment
- [ ] Archive (do not delete) the source repositories

---

## Rollback Procedures

### Vercel Instant Rollback

Vercel maintains all previous deployments. To rollback:

1. Go to **Vercel Dashboard > Deployments**
2. Find the last known-good deployment
3. Click **Promote to Production**

This takes effect immediately -- no DNS changes needed.

### DNS Rollback

If rolling back to the old split-repo setup:

1. Revert DNS A/CNAME records to the previous Vercel deployment
2. Old deployments remain intact until explicitly decommissioned
3. DNS propagation takes 5-30 minutes

### Database Rollback

Neon supports branching and point-in-time restore:

1. **Branch restore:** Create a branch from a point before the issue
2. **Connection string swap:** Update `DATABASE_URL` in Vercel to point to the restored branch
3. **Redeploy:** Trigger a new deployment to pick up the new connection string

---

## Monitoring & Observability

### Sentry Error Tracking

- **Dashboard:** Access via Sentry project dashboard
- **Client errors:** Captured via `@sentry/nextjs` with session replay
- **Server errors:** Captured via instrumentation hook (`src/instrumentation.ts`)
- **Edge errors:** Captured via edge config (`sentry.edge.config.ts`)
- **Web Vitals:** LCP, INP, CLS reported as Sentry performance metrics
- **Sample rates:** 10% traces in production, 100% error replays

### Health Check

```bash
# Check application and database health
curl https://ink37tattoos.com/api/health

# Expected response (healthy):
# { "status": "ok", "db": "connected", "timestamp": "...", "uptime": ... }

# Expected response (unhealthy):
# HTTP 503
# { "status": "error", "db": "disconnected", "timestamp": "...", "uptime": ..., "error": "..." }
```

### Structured Logging

All server-side logging uses Pino structured JSON format:

- **Log format:** `{ level, time, service, env, msg, ...context }`
- **View logs:** Vercel Dashboard > Deployments > Functions > Logs
- **Log level:** Controlled via `LOG_LEVEL` env var (default: `info` in production)
- **Request tracing:** Use `createRequestLogger(requestId)` for request-scoped logs
- **Logger location:** `src/lib/logger.ts`

### Rate Limiting

- **Public endpoints:** Rate limited via Upstash Redis (`@upstash/ratelimit`)
- **Fallback:** In-memory rate limiting when Redis credentials are not configured
- **Configuration:** `src/lib/security/rate-limiter.ts`

---

## Operational Procedures

### Viewing Logs

1. **Vercel Dashboard:** Deployments > select deployment > Functions tab > Logs
2. **Real-time:** Vercel CLI: `vercel logs --follow`
3. **Format:** Pino structured JSON -- filter by `level`, `service`, `requestId`

### Database Access

```bash
# Launch Drizzle Studio for visual inspection
bun run db:studio

# Direct connection via psql (use Neon connection string)
psql $DATABASE_URL
```

### Webhook Testing

```bash
# Stripe: Send a test webhook event
stripe trigger payment_intent.succeeded --webhook-endpoint https://ink37tattoos.com/api/webhooks/stripe

# Verify webhook processing in Vercel logs
```

### Cron Jobs

The application has two cron endpoints authenticated via `CRON_SECRET`:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `POST /api/cron/balance-due` | Daily | Send balance-due reminder emails |
| `POST /api/cron/no-show-followup` | Hourly | Send no-show follow-up emails |

These are intended to be triggered by n8n workflows at `n8n.thehudsonfam.com` with the `CRON_SECRET` header.

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| 500 errors on all pages | `DATABASE_URL` misconfigured | Verify Neon connection string in Vercel env vars |
| Auth redirects loop | `BETTER_AUTH_URL` mismatch | Ensure URL matches the actual domain (no trailing slash) |
| Emails not sending | `RESEND_API_KEY` missing or invalid | Verify Resend API key and sender domain verification |
| Media uploads fail | `BLOB_PRIVATE_READ_WRITE_TOKEN` missing | Add Vercel Blob token to env vars |
| Rate limiting not working | Upstash credentials missing | Falls back to in-memory; add `UPSTASH_REDIS_REST_URL` and token |
| Sentry not capturing errors | DSN not set | Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` |
| Webhook signature failures | Secret mismatch | Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard |

---

## Security

### Headers

The following security headers are applied to all routes via `next.config.ts`:

- `X-Frame-Options: DENY` -- prevents clickjacking
- `X-Content-Type-Options: nosniff` -- prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` -- restricts script/style/frame sources

### Authentication

- Better Auth 1.5.5 with 5-tier RBAC: `USER`, `STAFF`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`
- Auth enforced at layout level for dashboard and portal routes
- Server actions validate role before calling DAL functions
- Better Auth uses raw `pg.Pool` connection, decoupled from Drizzle ORM

### Input Validation

- All inputs validated with Zod schemas
- XSS sanitization on string inputs before rendering
- CSRF protection via Better Auth
- Webhook payloads validated with runtime schema checks

---

*Last updated: 2026-03-31*
*Version: v3.0 Production Launch*
