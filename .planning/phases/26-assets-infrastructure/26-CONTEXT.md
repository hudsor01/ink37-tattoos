# Phase 26: Assets + Infrastructure - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Place all missing public assets (gallery videos via Vercel Blob, search verification files, PWA manifest with service worker), configure n8n cron workflows to call existing endpoints, and document all production environment variables. No new features -- this is asset placement and infrastructure completion for production launch.

</domain>

<decisions>
## Implementation Decisions

### Gallery Videos
- **D-01:** 7 video files already exist locally -- just need to be uploaded and referenced.
- **D-02:** MP4 format only (H.264 codec). No WebM fallback needed.
- **D-03:** Serve videos from Vercel Blob storage (already using Blob for media uploads). Videos stay out of git repo, better CDN delivery for large files.
- **D-04:** Gallery component needs to be updated to reference Blob URLs for videos.

### PWA Manifest + Service Worker
- **D-05:** Standalone display mode for native app feel on "Add to Home Screen."
- **D-06:** Minimal offline support -- cache app shell only (HTML, CSS, JS). Dynamic content requires network.
- **D-07:** Theme/brand colors pulled from existing site Tailwind config / CSS variables.
- **D-08:** manifest.json placed in public/ directory, linked from layout.tsx.
- **D-09:** Service worker caches shell assets only -- no gallery image pre-caching.

### n8n Workflow Configuration
- **D-10:** No email notification on workflow failure -- rely on n8n's built-in error tracking UI.

### Claude's Discretion (n8n)
- Whether to export n8n workflow JSON to repo or just document setup steps -- pick the most practical approach.
- Exact schedules for balance-due (daily) and no-show-followup (hourly) -- pick reasonable times.

### Environment Variable Audit
- **D-11:** Markdown documentation file with all env vars, their purpose, required/optional status, and where to get values. No .env.example file.
- **D-12:** Source of truth for env vars is `src/lib/env.ts` Zod schema (currently 19 vars).

### Claude's Discretion (Env Audit)
- Whether to verify env vars are set in Vercel via CLI/API or just document the checklist -- pick the most practical approach.

### Search Verification Files
- **D-13:** Google and Bing search verification files placed in public/ directory at expected URLs.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Gallery & Media
- `src/app/(public)/gallery/page.tsx` -- Gallery page (needs video integration)
- `src/components/dashboard/media-uploader.tsx` -- Existing Vercel Blob upload pattern
- `src/lib/env.ts` -- VERCEL_BLOB_READ_WRITE_TOKEN env var

### Cron Routes
- `src/app/api/cron/balance-due/route.ts` -- Existing balance-due endpoint (n8n calls this)
- `src/app/api/cron/no-show-followup/route.ts` -- Existing no-show followup endpoint (n8n calls this)

### Environment
- `src/lib/env.ts` -- Zod schema with all 19 env vars (source of truth for audit)

### Site Configuration
- `src/app/layout.tsx` -- Root layout (manifest link goes here)
- `next.config.ts` -- Security headers, build config
- `public/` -- Static assets directory

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Vercel Blob upload pattern in `src/components/dashboard/media-uploader.tsx` -- can reference for Blob URL structure
- `src/lib/env.ts` Zod schema -- complete list of all env vars with types and optional/required status
- Cron route handlers already built with CRON_SECRET Bearer token auth

### Established Patterns
- Static assets in `public/` (favicon, icons, images, logo)
- Vercel Blob for dynamic media (uploads via `@vercel/blob`)
- Zod-validated environment variables via `env()` singleton

### Integration Points
- Gallery page at `src/app/(public)/gallery/page.tsx` -- needs video component/section
- Root layout at `src/app/layout.tsx` -- manifest link and PWA meta tags
- n8n at `n8n.thehudsonfam.com` -- external system, workflows call existing API endpoints

</code_context>

<specifics>
## Specific Ideas

- Videos already exist locally -- this is an upload + reference task, not a content creation task
- Cron routes already have CRON_SECRET auth -- n8n just needs HTTP Request nodes with Bearer token
- env.ts Zod schema is the single source of truth for all env vars

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 26-assets-infrastructure*
*Context gathered: 2026-03-31*
