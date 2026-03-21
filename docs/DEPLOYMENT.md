# Ink 37 Tattoos - Deployment Guide

## Overview

Single Vercel deployment with DNS cutover from the two source repositories (tattoo-website and admin-tattoo-website) to the unified codebase. Brief downtime is accepted during the transition -- no zero-downtime requirement.

## Pre-deployment Checklist

Before deploying to production, verify all items:

- [ ] All Phase 2 plans verified and passing (`npm run build` succeeds)
- [ ] Production database migrated (`npx prisma migrate deploy`)
- [ ] All env vars configured in Vercel project settings (see `.env.production.example`)
- [ ] Vercel Blob storage token configured (`BLOB_READ_WRITE_TOKEN`)
- [ ] Resend API key set and sender domain verified (`RESEND_API_KEY`)
- [ ] Cal.com embed configured with correct username and event slugs
- [ ] Better Auth secret generated (64+ chars, cryptographically random)
- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to `https://ink37tattoos.com`
- [ ] Admin email configured for contact form notifications (`ADMIN_EMAIL`)

## DNS Cutover Steps

### 1. Deploy to Vercel (Preview)

```bash
# Connect the repository to Vercel (if not already)
vercel link

# Deploy to preview first
vercel deploy
```

Verify the preview deployment URL works end-to-end before proceeding.

### 2. Verify Preview Deployment

- [ ] Public site loads with correct SEO metadata
- [ ] Gallery page renders (or shows empty state if no images yet)
- [ ] Contact form submission works (check admin email)
- [ ] Booking page loads Cal.com embed
- [ ] Services, About, FAQ pages render correctly
- [ ] 404 page displays for invalid routes
- [ ] Admin login works with existing credentials
- [ ] Dashboard loads with data from production DB
- [ ] Media upload to Vercel Blob works

### 3. Update DNS Records

Update the DNS A/CNAME records for `ink37tattoos.com` to point to Vercel:

```
Type    Name    Value
CNAME   @       cname.vercel-dns.com
CNAME   www     cname.vercel-dns.com
```

Brief downtime occurs during DNS propagation (typically 5-30 minutes).

### 4. Promote to Production

```bash
# Once DNS is configured, promote the latest deployment
vercel --prod
```

### 5. Verify Production

- [ ] `https://ink37tattoos.com` resolves to the new deployment
- [ ] HTTPS certificate is valid
- [ ] All preview verification checks pass on the production URL
- [ ] `/sitemap.xml` returns valid XML with all public URLs
- [ ] `/robots.txt` returns correct crawl rules

### 6. Decommission Old Deployments

Once the unified app is confirmed working in production:

- Remove old `tattoo-website` Vercel deployment
- Remove old `admin-tattoo-website` Vercel deployment
- Archive (do not delete) the source repositories

## Rollback

If critical issues are found after DNS cutover:

1. Revert DNS A/CNAME records to the previous Vercel deployment
2. Old deployments remain intact until explicitly decommissioned
3. DNS propagation for rollback takes the same 5-30 minutes
4. Investigate and fix issues on the unified app before re-attempting cutover

## Environment Variables Reference

See `.env.production.example` in the project root for a complete list of all required and optional environment variables with descriptions.

## Database Migrations

Production migrations use `prisma migrate deploy` (never `prisma migrate dev`):

```bash
# Apply pending migrations to production
npx prisma migrate deploy

# If needed, generate a new migration
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > migration.sql
```

Never run `prisma migrate dev` against the production database -- it will attempt to reset data.
