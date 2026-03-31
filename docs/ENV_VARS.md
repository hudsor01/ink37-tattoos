# Environment Variables

Source of truth: `src/lib/env.ts` (Zod-validated at runtime)

Last audited: 2026-03-31

## Required Variables

These variables MUST be set. The app will crash on startup if any are missing.

| Variable | Type | Purpose | Source |
|----------|------|---------|--------|
| `DATABASE_URL` | URL | Neon PostgreSQL connection string | Neon Dashboard > Project > Connection Details > Connection String |
| `BETTER_AUTH_SECRET` | String (32+ chars) | JWT signing secret for Better Auth sessions | Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL | Base URL for Better Auth callbacks | Set to production URL: `https://ink37tattoos.com` |
| `NEXT_PUBLIC_APP_URL` | URL | Public-facing app URL (used in emails, OG tags) | Set to: `https://ink37tattoos.com` |
| `BLOB_PRIVATE_READ_WRITE_TOKEN` | String | Vercel Blob token for private uploads (tattoo designs, consent forms) | Vercel Dashboard > Project > Storage > Blob > Tokens |
| `STRIPE_SECRET_KEY` | String | Stripe API secret key for payments processing | Stripe Dashboard > Developers > API keys > Secret key |
| `STRIPE_WEBHOOK_SECRET` | String | Stripe webhook signing secret for verifying webhook payloads | Stripe Dashboard > Developers > Webhooks > Signing secret |

## Production-Critical Optional Variables

These are marked `.optional()` in the Zod schema (app starts without them), but missing values **break specific production features**. Treat as required for production deployment.

| Variable | Type | Purpose | Source | Impact if Missing |
|----------|------|---------|--------|-------------------|
| `CRON_SECRET` | String | Bearer token for n8n cron endpoints | Generate: `openssl rand -base64 32` | Cron endpoints return 500; balance-due and no-show emails never send |
| `RESEND_API_KEY` | String | Resend email sending API key | Resend Dashboard > API Keys | ALL transactional emails disabled (booking confirmations, reminders, aftercare) |
| `UPSTASH_REDIS_REST_URL` | URL | Upstash Redis for rate limiting | Upstash Console > Database > REST API > URL | Rate limiting falls back to in-memory (resets on cold start, no cross-instance sharing) |
| `UPSTASH_REDIS_REST_TOKEN` | String | Upstash Redis auth token | Upstash Console > Database > REST API > Token | Same as above -- both must be set together |

## Optional Variables

Missing values disable specific features but do not affect core functionality.

| Variable | Type | Purpose | Source | Feature if Missing |
|----------|------|---------|--------|--------------------|
| `CAL_API_KEY` | String | Cal.com API access for booking sync | Cal.com Dashboard > Settings > Developer > API Keys | Booking sync disabled |
| `NEXT_PUBLIC_CAL_USERNAME` | String | Cal.com embed username for booking widget | Cal.com Dashboard > Profile | Booking widget hidden |
| `ADMIN_EMAIL` | Email | Admin notification recipient address | Your admin email address | Admin email notifications disabled |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | String | Vercel Blob token for public uploads (gallery images) | Vercel Dashboard > Project > Storage > Blob > Tokens | Public media uploads disabled |
| `CAL_WEBHOOK_SECRET` | String | Cal.com webhook verification secret | Cal.com Dashboard > Settings > Developer > Webhooks | Cal.com webhook auth skipped |
| `RESEND_WEBHOOK_SECRET` | String | Resend webhook verification secret | Resend Dashboard > Webhooks > Signing Secret | Resend webhook auth skipped |
| `SENTRY_DSN` | URL | Sentry error tracking (server-side) | Sentry Dashboard > Project > Settings > Client Keys > DSN | Server error tracking disabled |
| `NEXT_PUBLIC_SENTRY_DSN` | URL | Sentry error tracking (client-side) | Same as SENTRY_DSN | Client error tracking disabled |

## Vercel Dashboard Checklist

Use this checklist to verify all variables are set in Vercel:

- [ ] `DATABASE_URL` -- Production, Preview, Development
- [ ] `BETTER_AUTH_SECRET` -- Production, Preview
- [ ] `BETTER_AUTH_URL` -- Production (https://ink37tattoos.com), Preview (auto from Vercel)
- [ ] `NEXT_PUBLIC_APP_URL` -- Production, Preview
- [ ] `BLOB_PRIVATE_READ_WRITE_TOKEN` -- Production, Preview
- [ ] `STRIPE_SECRET_KEY` -- Production (live key), Preview (test key)
- [ ] `STRIPE_WEBHOOK_SECRET` -- Production, Preview
- [ ] `CRON_SECRET` -- Production (same value configured in n8n)
- [ ] `RESEND_API_KEY` -- Production
- [ ] `UPSTASH_REDIS_REST_URL` -- Production, Preview
- [ ] `UPSTASH_REDIS_REST_TOKEN` -- Production, Preview
- [ ] `CAL_API_KEY` -- Production
- [ ] `NEXT_PUBLIC_CAL_USERNAME` -- Production, Preview
- [ ] `ADMIN_EMAIL` -- Production
- [ ] `VERCEL_BLOB_READ_WRITE_TOKEN` -- Production, Preview
- [ ] `CAL_WEBHOOK_SECRET` -- Production
- [ ] `RESEND_WEBHOOK_SECRET` -- Production
- [ ] `SENTRY_DSN` -- Production
- [ ] `NEXT_PUBLIC_SENTRY_DSN` -- Production

## Additional Vercel/Build Variables (not in Zod schema)

These are used by build tools or Vercel integrations, not validated by `src/lib/env.ts`:

| Variable | Purpose | Source |
|----------|---------|--------|
| `SENTRY_ORG` | Sentry org slug for source map upload during build | Sentry Dashboard > Organization Settings |
| `SENTRY_PROJECT` | Sentry project slug for source map upload during build | Sentry Dashboard > Project Settings |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map upload during build | Sentry Dashboard > Settings > Auth Tokens |
