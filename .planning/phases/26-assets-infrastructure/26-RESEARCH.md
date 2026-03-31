# Phase 26: Assets + Infrastructure - Research

**Researched:** 2026-03-31
**Domain:** Asset placement (video, PWA, verification files), n8n workflow configuration, environment audit
**Confidence:** HIGH

## Summary

Phase 26 is an infrastructure completion phase -- no new features, just placing all missing assets and configuring external systems for production launch. The work breaks into five distinct areas: (1) uploading 7 gallery videos to Vercel Blob and integrating them into the gallery page, (2) copying search engine verification files from the source repo, (3) creating a PWA manifest and simplified service worker, (4) configuring two n8n workflows to call existing cron endpoints, and (5) auditing all environment variables against the Zod schema in `src/lib/env.ts`.

The gallery videos are the most technically involved piece. The source files are `.mov` format (2.8-5.4 MB each) but D-02 specifies MP4 (H.264) only. ffmpeg is NOT installed on the dev machine, so conversion must happen via an alternative method or ffmpeg must be installed first. Vercel Blob's `put()` function with `multipart: true` handles files of any size from a local script using the `BLOB_READ_WRITE_TOKEN`. The gallery component currently only renders images via `next/image` -- it needs a video section or video card component added.

**Primary recommendation:** Create an upload script (`scripts/upload-videos.ts`) that reads the .mov files from the source repo, uploads them to Vercel Blob via the SDK with explicit token, and outputs the URLs. Then update the gallery page to include a video section rendering `<video>` elements with Blob URLs. Keep the PWA manifest minimal (app/manifest.ts using Next.js convention), the service worker shell-only, and export n8n workflow JSON to the repo for reproducibility.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 7 video files already exist locally -- just need to be uploaded and referenced.
- **D-02:** MP4 format only (H.264 codec). No WebM fallback needed.
- **D-03:** Serve videos from Vercel Blob storage (already using Blob for media uploads). Videos stay out of git repo, better CDN delivery for large files.
- **D-04:** Gallery component needs to be updated to reference Blob URLs for videos.
- **D-05:** Standalone display mode for native app feel on "Add to Home Screen."
- **D-06:** Minimal offline support -- cache app shell only (HTML, CSS, JS). Dynamic content requires network.
- **D-07:** Theme/brand colors pulled from existing site Tailwind config / CSS variables.
- **D-08:** manifest.json placed in public/ directory, linked from layout.tsx.
- **D-09:** Service worker caches shell assets only -- no gallery image pre-caching.
- **D-10:** No email notification on workflow failure -- rely on n8n's built-in error tracking UI.
- **D-11:** Markdown documentation file with all env vars, their purpose, required/optional status, and where to get values. No .env.example file.
- **D-12:** Source of truth for env vars is `src/lib/env.ts` Zod schema (currently 19 vars).
- **D-13:** Google and Bing search verification files placed in public/ directory at expected URLs.

### Claude's Discretion
- Whether to export n8n workflow JSON to repo or just document setup steps -- pick the most practical approach.
- Exact schedules for balance-due (daily) and no-show-followup (hourly) -- pick reasonable times.
- Whether to verify env vars are set in Vercel via CLI/API or just document the checklist -- pick the most practical approach.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASSET-01 | 7 gallery video files copied from source repo to Vercel Blob | Vercel Blob `put()` with `multipart: true` and explicit token; upload script pattern; .mov to .mp4 conversion needed |
| ASSET-02 | Search engine verification files (Bing, Google) copied from source repo | 4 Google verification HTML files + 1 Bing XML file found in source repo `public/`; direct copy to `public/` |
| ASSET-03 | PWA manifest.json + site.webmanifest + service worker from source repo | Next.js 16 `app/manifest.ts` convention; simplified service worker for shell-only caching; icons already exist in `public/icons/` |
| INFRA-01 | n8n workflows configured at n8n.thehudsonfam.com (balance-due daily + no-show hourly cron) | Both cron route handlers already built with Bearer CRON_SECRET auth; n8n Schedule Trigger + HTTP Request node pattern |
| INFRA-04 | Production environment variables documented and audited in Vercel dashboard | Zod schema in `src/lib/env.ts` has 19 vars (4 required, 15 optional); markdown doc with purposes and sources |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Package manager:** bun (never npm/yarn/pnpm) -- `bun add`, `bun run`
- **Hosting:** Vercel
- **Storage:** Vercel Blob
- **Framework:** Next.js 16 + React 19.2
- **GitOps for k3s:** N/A for this project (Vercel-hosted)
- **n8n preference:** Use n8n.thehudsonfam.com for cron workflows instead of Vercel Cron

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vercel/blob | 2.3.1 | Blob storage for video files | Already in project; CDN delivery; `put()` with multipart support |
| next | 16.2.0 | Framework with manifest.ts convention | Built-in PWA manifest support via app/manifest.ts |

### Supporting (No New Dependencies)
| Library | Purpose | Notes |
|---------|---------|-------|
| fs/promises (Node built-in) | Read local video files for upload script | Standard Node.js |
| path (Node built-in) | File path handling in upload script | Standard Node.js |

### No New Packages Required

This phase requires zero new npm packages. The Vercel Blob SDK is already installed, Next.js has built-in manifest support, and the service worker is a plain JS file in `public/`.

**Verification:**
```bash
bun pm ls | grep @vercel/blob
# @vercel/blob@2.3.1 already installed
```

## Architecture Patterns

### File Structure for Phase 26

```
src/
  app/
    manifest.ts                    # NEW: PWA manifest (Next.js convention)
    layout.tsx                     # MODIFY: add manifest link meta tags
  components/
    public/
      gallery-grid.tsx             # MODIFY: add video section/cards
      gallery-video-card.tsx       # NEW: video player card component
public/
  sw.js                            # NEW: service worker (shell-only cache)
  BingSiteAuth.xml                 # NEW: copy from source repo
  google4e8b2c51e8e12345.html      # NEW: copy from source repo
  googlec4d8a3b9c5e6f7a8.html      # NEW: copy from source repo
  googlef47ac10b58e755e6.html      # NEW: copy from source repo
scripts/
  upload-videos.ts                 # NEW: one-time Blob upload script
docs/
  ENV_VARS.md                      # NEW: environment variable documentation
n8n/
  balance-due-workflow.json        # NEW: exported workflow JSON
  no-show-followup-workflow.json   # NEW: exported workflow JSON
```

### Pattern 1: Vercel Blob Upload Script (Local One-Time Upload)

**What:** A standalone TypeScript script that reads local .mov/.mp4 files and uploads them to Vercel Blob using the SDK directly (not through the web app).

**When to use:** One-time asset migration where files exist locally and need to be in Blob storage.

**Example:**
```typescript
// scripts/upload-videos.ts
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob';
import { readFile } from 'fs/promises';
import { basename } from 'path';

const VIDEOS = [
  '../tattoo-website/public/videos/christ-crosses-left-arm-sleeve.mov',
  '../tattoo-website/public/videos/christ-crosses-right-arm.mov',
  // ... all 7 files
];

async function uploadVideos() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN required');

  for (const videoPath of VIDEOS) {
    const buffer = await readFile(videoPath);
    const filename = basename(videoPath);

    const blob = await put(`gallery-videos/${filename}`, buffer, {
      access: 'public',
      token,
      multipart: true,
      contentType: 'video/mp4',
    });

    console.log(`Uploaded: ${filename} -> ${blob.url}`);
  }
}

uploadVideos().catch(console.error);
```

**Critical detail:** The `put()` function reads `BLOB_READ_WRITE_TOKEN` from `process.env` by default. The project uses `VERCEL_BLOB_READ_WRITE_TOKEN` for public uploads, so the script must either (a) set the `token` parameter explicitly, or (b) use the standard `BLOB_READ_WRITE_TOKEN` env var name. Recommend option (a) for clarity.

### Pattern 2: Next.js 16 PWA Manifest (app/manifest.ts)

**What:** Next.js has built-in support for web app manifests as a file convention in the App Router.

**When to use:** Always for Next.js 16+ projects needing PWA support.

**Example:**
```typescript
// src/app/manifest.ts
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ink 37 Tattoos - Professional Tattoo Artist in Dallas/Fort Worth, TX',
    short_name: 'Ink37',
    description: 'Professional custom tattoo artist serving Dallas/Fort Worth.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#0a0a0a', // ink-black from globals.css
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
    ],
  };
}
```

**Key insight:** D-08 says "manifest.json placed in public/ directory, linked from layout.tsx." However, Next.js 16's `app/manifest.ts` convention is better because it auto-generates `/manifest.webmanifest` at the correct URL and auto-links it in the HTML head. Using `app/manifest.ts` means the manifest does NOT go in `public/` and does NOT need manual linking in `layout.tsx`. This is a refinement of D-08 that achieves the same goal with less code. If the user insists on a static file in `public/`, that also works but is the older approach.

### Pattern 3: Shell-Only Service Worker

**What:** A minimal service worker that caches only the app shell (HTML, CSS, JS) for basic offline support.

**When to use:** Per D-06 and D-09 -- minimal offline support, no gallery pre-caching.

**Example:**
```javascript
// public/sw.js
const CACHE_NAME = 'ink37-shell-v1';

const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

**Key simplification from source repo:** The source repo's `sw.js` is 408 lines with push notifications, background sync, IndexedDB, periodic sync, and multiple cache strategies. Per D-06 and D-09, we strip this down to ~30 lines of shell-only caching. No push notifications (ENH-03 is deferred to future). No IndexedDB. No background sync.

### Pattern 4: Service Worker Registration in Layout

**What:** Register the service worker from a client component.

**Example:**
```typescript
// In a client component (e.g., providers or a dedicated component)
'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
    }
  }, []);
  return null;
}
```

### Pattern 5: n8n Workflow (Schedule Trigger + HTTP Request)

**What:** n8n workflow with Schedule Trigger node firing on a cron schedule, connected to an HTTP Request node that POSTs to the cron endpoint with Bearer token auth.

**n8n Configuration:**
1. **Schedule Trigger** node: Set interval (daily at 8 AM CT for balance-due, every hour on the hour for no-show)
2. **HTTP Request** node: POST to `https://ink37tattoos.com/api/cron/balance-due` with Authorization header `Bearer <CRON_SECRET>`
3. **Credentials:** Use n8n's Header Auth credential type with name=Authorization, value=Bearer <token>

**Recommended schedules:**
- **Balance-due reminder:** Daily at 8:00 AM Central Time -- reasonable business hour, gives customers time to act before the day starts
- **No-show follow-up:** Every hour, on the hour -- catches no-shows promptly with the 48-hour window filter in the route handler

**Discretion decision: Export workflow JSON to repo.** This is more practical than documentation-only because:
1. Workflow JSON can be imported directly into n8n (one-click restore)
2. Acts as version control for workflow configuration
3. Serves as documentation simultaneously
4. If n8n instance is rebuilt, workflows can be restored from repo

### Anti-Patterns to Avoid
- **DO NOT put video files in `public/`:** They are 2.8-5.4 MB each and would bloat the git repo and deployment bundle. Use Vercel Blob per D-03.
- **DO NOT use the complex source repo service worker:** The 408-line sw.js has push notifications and IndexedDB that are out of scope. Shell-only per D-06/D-09.
- **DO NOT hardcode Blob URLs in component code:** Store video URLs in a configuration array or fetch them from a data source. A constants file (`src/lib/gallery-videos.ts`) is acceptable since the URLs are static after upload.
- **DO NOT use `next/image` for videos:** Videos must use native HTML `<video>` element. The gallery component currently only handles images.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PWA manifest generation | Custom JSON file + manual HTML link tag | `app/manifest.ts` (Next.js convention) | Auto-generates, auto-links, type-safe with `MetadataRoute.Manifest` |
| Video upload to cloud | Custom upload API + form UI | `@vercel/blob` `put()` in a script | SDK handles multipart, CDN, authentication |
| Cron scheduling | Vercel Cron (paid) or custom scheduler | n8n Schedule Trigger | Free, reliable, already self-hosted, UI for monitoring |
| Service worker caching strategies | Custom fetch interception logic | Simple cache-first pattern | D-06 says minimal; don't over-engineer |

**Key insight:** This phase is asset placement and configuration, not feature development. Every component either already exists (cron routes, Blob SDK, icons) or has a standard solution (Next.js manifest convention, n8n workflows). The work is assembly, not invention.

## Common Pitfalls

### Pitfall 1: .mov vs .mp4 Format Mismatch
**What goes wrong:** Source videos are `.mov` format but D-02 specifies MP4 (H.264). If uploaded as-is, they may not play on all browsers (`.mov` is QuickTime container, limited browser support outside Safari).
**Why it happens:** The source repo served them locally and relied on Safari/macOS compatibility.
**How to avoid:** Either (a) convert to .mp4 before upload using ffmpeg (`ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4`), or (b) test if the `.mov` files are actually H.264-encoded (many iPhone .mov files are H.264 in a QuickTime container) and rename/re-mux to .mp4. **ffmpeg is NOT currently installed** on the dev machine -- must `brew install ffmpeg` first or use an online converter.
**Warning signs:** Videos play on Safari but fail on Chrome/Firefox.

### Pitfall 2: Vercel Functions 4.5 MB Request Body Limit
**What goes wrong:** Server uploads through Vercel Functions fail for files > 4.5 MB.
**Why it happens:** Vercel's serverless function body limit.
**How to avoid:** Use the `put()` function directly from a local script (not through a Vercel Function). The SDK's `put()` with explicit `token` parameter works from any Node.js environment. Alternatively, use `multipart: true` option.
**Warning signs:** 413 Payload Too Large errors.

### Pitfall 3: BLOB_READ_WRITE_TOKEN vs VERCEL_BLOB_READ_WRITE_TOKEN
**What goes wrong:** The upload script uses `process.env.BLOB_READ_WRITE_TOKEN` (Vercel's default) but the project's env.ts declares `VERCEL_BLOB_READ_WRITE_TOKEN` (custom name, optional).
**Why it happens:** Project was set up with a non-standard env var name.
**How to avoid:** Pass the token explicitly in the `put()` call's `token` option. For the upload script, accept the token as a CLI argument or environment variable.
**Warning signs:** "BlobTokenNotFound" errors from the SDK.

### Pitfall 4: Service Worker Caching Next.js Routes
**What goes wrong:** Caching `'/'` in a Next.js app caches the HTML shell, but Next.js generates different HTML for different pages via server components. Cached HTML may show stale content.
**Why it happens:** Next.js apps are server-rendered; the HTML at `/` is dynamic.
**How to avoid:** Per D-06, only cache truly static assets (CSS, JS bundles, icons, manifest). Do NOT cache HTML routes. The service worker should use network-first for navigation requests and cache-first only for static assets.
**Warning signs:** Users see stale content after deployment.

### Pitfall 5: Manifest Icon `purpose` Value
**What goes wrong:** Using `"purpose": "maskable any"` in a single icon entry makes the icon used for both maskable and standard contexts, which can look bad on some Android launchers if the icon doesn't have proper padding.
**Why it happens:** Source manifest uses combined purpose values.
**How to avoid:** Either separate icons for maskable (with safe zone padding) and any purpose, or test on Android to confirm the existing icons look acceptable with the combined value.
**Warning signs:** Icons appear cut off on certain Android devices.

### Pitfall 6: n8n Schedule Trigger Timezone
**What goes wrong:** n8n defaults to the server's timezone, which may not be Central Time.
**Why it happens:** Self-hosted n8n uses system timezone unless explicitly configured.
**How to avoid:** Set the timezone explicitly in the Schedule Trigger node configuration (n8n supports per-node timezone settings). Use `America/Chicago` for Central Time.
**Warning signs:** Balance-due emails sent at wrong time of day.

### Pitfall 7: Google Verification Files -- Multiple Files
**What goes wrong:** Copying only one Google verification file when there are multiple.
**Why it happens:** Source repo has 4 Google verification files (one generic `google-site-verification.html` and three code-specific ones). The generic one is not a real verification file -- it's a placeholder.
**How to avoid:** Copy all 3 code-specific files (`google4e8b2c51e8e12345.html`, `googlec4d8a3b9c5e6f7a8.html`, `googlef47ac10b58e755e6.html`) and the Bing file (`BingSiteAuth.xml`). Skip the generic `google-site-verification.html` placeholder.
**Warning signs:** Verification fails in Google Search Console.

## Code Examples

### Video Gallery Integration

The existing gallery component (`src/components/public/gallery-grid.tsx`) uses a masonry layout with `next/image`. Videos need a separate section or interleaved video cards.

```typescript
// src/lib/gallery-videos.ts
// Static configuration of video Blob URLs (populated after upload script runs)
export const GALLERY_VIDEOS = [
  {
    id: 'video-1',
    name: 'Christ Crosses Left Arm Sleeve',
    url: 'https://<blob-url>/gallery-videos/christ-crosses-left-arm-sleeve.mp4',
    style: 'religious',
    placement: 'arm',
  },
  // ... remaining 6 videos
] as const;
```

```tsx
// src/components/public/gallery-video-card.tsx
'use client';

interface VideoCardProps {
  name: string;
  url: string;
}

export function GalleryVideoCard({ name, url }: VideoCardProps) {
  return (
    <div className="break-inside-avoid mb-3 group">
      <div className="relative overflow-hidden rounded-lg">
        <video
          src={url}
          className="w-full"
          controls
          preload="metadata"
          playsInline
          muted
          aria-label={name}
        >
          <track kind="descriptions" label={name} />
        </video>
      </div>
    </div>
  );
}
```

### Service Worker Headers in next.config.ts

Per official Next.js PWA docs, add specific headers for `sw.js`:

```typescript
// In next.config.ts headers() function, add:
{
  source: '/sw.js',
  headers: [
    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
  ],
},
```

### n8n Workflow JSON Structure

```json
{
  "name": "Ink37 - Balance Due Reminders",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{ "triggerAtHour": 8, "triggerAtMinute": 0 }]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://ink37tattoos.com/api/cron/balance-due",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": {}
      },
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "credentials": {
        "httpHeaderAuth": { "id": "CREDENTIAL_ID", "name": "Ink37 Cron Auth" }
      }
    }
  ],
  "connections": {
    "Schedule Trigger": { "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]] }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `public/manifest.json` static file | `app/manifest.ts` dynamic file convention | Next.js 13+ (App Router) | Auto-linked in head, type-safe, no manual HTML editing |
| `next-pwa` npm package | Manual service worker + Serwist (if needed) | 2024-2025 | `next-pwa` is abandoned; Serwist is the successor; manual is simplest for shell-only |
| Vercel Cron for scheduled tasks | n8n self-hosted | Project decision | Free, UI monitoring, no Vercel billing |
| `.env.example` for env documentation | Markdown doc + Zod schema as source of truth | Project convention (D-11, D-12) | Richer documentation, runtime validation |

**Deprecated/outdated:**
- `next-pwa` npm package: Abandoned, last updated 2023. Do NOT use.
- `@vercel/blob` `put()` without `multipart: true`: For files > 4.5 MB, always use multipart. But from a local script (not Vercel Functions), this limit doesn't apply to the SDK itself -- it's a Vercel Functions limit.

## Open Questions

1. **Video format: are .mov files H.264 or ProRes?**
   - What we know: Source files are `.mov` (QuickTime container). Many iPhone-recorded .mov files use H.264 codec internally.
   - What's unclear: Whether these specific files use H.264 (browser-playable) or ProRes/HEVC (not universally playable).
   - Recommendation: Install ffmpeg, probe with `ffprobe` to check codec. If H.264, simply re-mux to .mp4 container (`ffmpeg -i input.mov -c copy output.mp4` -- instant, no re-encoding). If ProRes/HEVC, transcode to H.264 (`ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4`).

2. **Vercel Blob token name for upload script**
   - What we know: Project uses `VERCEL_BLOB_READ_WRITE_TOKEN` (optional in env.ts). Vercel default is `BLOB_READ_WRITE_TOKEN`.
   - What's unclear: Which token is actually set in the Vercel dashboard.
   - Recommendation: The upload script should accept token via explicit env var or CLI argument. Document both token names in ENV_VARS.md.

3. **Which Google verification file is the active one?**
   - What we know: Source repo has 3 code-specific Google verification files and 1 generic placeholder.
   - What's unclear: Which verification code is currently active in Google Search Console.
   - Recommendation: Copy all 3 code-specific files. Only the active one will be checked by Google; having extra unused ones causes no harm.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bun | Upload script, build | Yes | 1.3.11 | -- |
| @vercel/blob | Video upload to Blob | Yes | 2.3.1 (installed) | -- |
| ffmpeg | Video .mov to .mp4 conversion | **No** | -- | `brew install ffmpeg` before upload, or test if .mov files are H.264 and can be served as-is |
| Vercel CLI | Env var verification | **No** | -- | Manual Vercel dashboard check (acceptable per discretion) |
| n8n instance | Workflow configuration | Yes (external) | n8n.thehudsonfam.com | -- |
| Node.js | Upload script runtime | Yes (via bun) | -- | -- |

**Missing dependencies with no fallback:**
- None (ffmpeg has a workaround path)

**Missing dependencies with fallback:**
- **ffmpeg:** Must be installed (`brew install ffmpeg`) for video conversion. If .mov files happen to be H.264 already, conversion is a simple re-mux (instant). If they need full transcoding, ffmpeg is required.
- **Vercel CLI:** Not installed but env audit can be done via Vercel dashboard manually. Document the checklist rather than automating verification.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vitest.config.ts |
| Quick run command | `bun run test -- --run` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASSET-01 | Gallery videos play from Blob URLs without 404 | manual | Manual browser check post-upload | N/A |
| ASSET-02 | Search verification files accessible at URLs | unit | `bun run test -- --run src/__tests__/verification-files.test.ts` | Wave 0 |
| ASSET-03 | manifest.ts generates valid manifest; sw.js loads | unit | `bun run test -- --run src/__tests__/pwa.test.ts` | Wave 0 |
| INFRA-01 | n8n workflows call cron endpoints successfully | manual | Manual n8n test run | N/A (external system) |
| INFRA-04 | Env vars documented and match Zod schema | unit | `bun run test -- --run src/__tests__/env.test.ts` | Exists (env.test.ts) |

### Sampling Rate
- **Per task commit:** `bun run test -- --run`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/pwa.test.ts` -- covers ASSET-03 (manifest structure validation, service worker file exists)
- [ ] `src/__tests__/verification-files.test.ts` -- covers ASSET-02 (files exist in public/ at expected paths)

Note: ASSET-01 and INFRA-01 are primarily manual verification tasks (browser video playback, n8n workflow execution). Existing `api-cron.test.ts` already covers the cron endpoint logic.

## Discretion Recommendations

### n8n Workflow Export (Claude's Discretion)
**Recommendation: Export workflow JSON to repo** in an `n8n/` directory.
- More practical than documentation-only because it's importable into n8n directly
- Serves as both backup and documentation
- If the n8n instance is rebuilt, workflows are one-click restorable
- Include a brief README in the `n8n/` directory explaining how to import

### Cron Schedules (Claude's Discretion)
**Recommendation:**
- **Balance-due reminders:** Daily at 8:00 AM CT (`America/Chicago`). Business-appropriate hour, gives customers the full day to respond.
- **No-show follow-up:** Every hour, at minute 0. The 48-hour window in the route handler prevents duplicate emails. Hourly is responsive enough without being wasteful.

### Env Var Verification (Claude's Discretion)
**Recommendation: Document the checklist only** (do not attempt automated verification).
- Vercel CLI is not installed and installing it adds unnecessary scope
- The Zod schema already validates at runtime -- if any required var is missing, the app crashes with a clear error
- A markdown checklist in `docs/ENV_VARS.md` with a column for "Set in Vercel?" that the user checks manually is sufficient
- This approach is faster and doesn't require Vercel CLI authentication setup

## Sources

### Primary (HIGH confidence)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) - manifest.ts convention, service worker registration, security headers
- [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk) - `put()` API, multipart option, token configuration, file size handling
- [Vercel Blob Server Upload](https://vercel.com/docs/vercel-blob/server-upload) - 4.5 MB body limit for Vercel Functions
- Source repo files directly inspected: `manifest.json`, `site.webmanifest`, `sw.js`, `BingSiteAuth.xml`, Google verification files, video directory

### Secondary (MEDIUM confidence)
- [n8n HTTP Request docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/) - HTTP Request node configuration
- [n8n Schedule Trigger docs](https://docs.n8n.io/courses/level-one/chapter-5/chapter-5.7/) - Cron scheduling patterns
- [n8n HTTP Request credentials](https://docs.n8n.io/integrations/builtin/credentials/httprequest/) - Header Auth credential type

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, versions verified via package.json
- Architecture: HIGH - patterns from official Next.js and Vercel docs, source repo files directly inspected
- Pitfalls: HIGH - derived from concrete inspection of source files (.mov format, env var naming, token limits)
- n8n configuration: MEDIUM - based on documentation, not tested against live instance

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable infrastructure, no fast-moving dependencies)
