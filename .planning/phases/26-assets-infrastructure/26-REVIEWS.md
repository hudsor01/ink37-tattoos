---
phase: 26
reviewers: [gemini, claude]
reviewed_at: 2026-03-31T11:30:00Z
plans_reviewed: [26-01-PLAN.md, 26-02-PLAN.md, 26-03-PLAN.md]
---

# Cross-AI Plan Review -- Phase 26

## Gemini Review

Plans are well-structured, aligning with modern Next.js conventions. Strategy correctly prioritizes performance by avoiding git-based video storage and ensures security through env var audit.

### Strengths
- Modern metadata management via `src/app/manifest.ts` (idiomatic Next.js)
- Optimized asset delivery via Vercel Blob
- Single source of truth for env vars via `env.ts` Zod schema
- Operational decoupling of cron workflows to n8n

### Concerns
- **MEDIUM: Service Worker staleness** -- Manual `public/sw.js` with shell-only caching can lead to "zombie" versions if cache-busting isn't aligned with Next.js build IDs. Static SW needs robust update/skip-waiting logic.
- **MEDIUM: Video autoplay/UX** -- Gallery videos need `muted`, `playsInline`, `loop` attributes for mobile autoplay. No poster images mentioned -- LCP may suffer while video buffers.
- **LOW: FFmpeg dependency** -- If environment lacks ffmpeg binaries, task fails. Should be explicitly checked as prerequisite.
- **LOW/MEDIUM: n8n observability** -- No failure notifications (D-10). If balance-due workflow fails, business loses revenue without visibility.

### Suggestions
- Consider Serwist (formerly next-pwa) or implement stale-while-revalidate strategy for SW
- Extract video poster thumbnails via ffmpeg during upload script
- Add "last run" timestamp logging for n8n workflows
- Verify Content-Type of search verification files

### Risk: LOW

---

## Claude Review

### Plan 26-01 (Search Verification + PWA)

Well-structured, low-risk. Correctly leverages Next.js 16 `app/manifest.ts` convention.

#### Concerns
- **MEDIUM: `purpose: "maskable any"` on all icons** -- Same icon for maskable and standard contexts. If icons lack safe-zone padding, they'll appear cropped on some Android launchers.
- **LOW: No cache versioning strategy documented** -- Uses `ink37-shell-v1` but doesn't document how future busting works.

#### Suggestions
- Split icons into separate `"any"` and `"maskable"` entries, or verify safe-zone padding
- Add `<link rel="apple-touch-icon">` in layout.tsx for iOS Safari compatibility

#### Risk: LOW

### Plan 26-02 (Gallery Videos)

Most complex plan, appropriately structured with human checkpoints.

#### Concerns
- **HIGH: `brew install ffmpeg` in auto task** -- Installing system-level dependency during automated execution is inappropriate. Should be prerequisite check, not embedded step.
- **MEDIUM: No poster attribute on video elements** -- `preload="metadata"` behavior is inconsistent. Some browsers show black rectangle until play. Explicit poster thumbnails needed.
- **MEDIUM: No loading states or error handling for video elements** -- Broken Blob URLs show broken player. Need `onError` handler or fallback UI.
- **MEDIUM: Video file sizes not validated after conversion** -- No quality/bitrate constraints on ffmpeg transcode path. Should add `-crf 23 -preset medium`.
- **LOW: Relative path for source videos** -- `../tattoo-website/public/videos` is CWD-dependent.
- **LOW: Seven concurrent video metadata requests** -- Consider lazy-loading videos below fold.

#### Suggestions
- Move ffmpeg to prerequisite section or check-and-fail pattern
- Add `-movflags +faststart` to remux path (not just transcode)
- Generate poster thumbnails during upload script
- Add `onError` handler to video elements
- Use standard grid instead of masonry for video section

#### Risk: MEDIUM

### Plan 26-03 (n8n + Env Audit)

Clean documentation-focused plan, no application code changes.

#### Concerns
- **MEDIUM: n8n workflow JSON version compatibility** -- `typeVersion: 1.2` and `4.2` are version-specific. Different n8n version may fail on import.
- **MEDIUM: n8n cron expression format conflict** -- Plan uses `cronExpression` but research uses `triggerAtHour/triggerAtMinute`. Needs reconciliation against live instance.
- **LOW: CRON_SECRET optional in Zod but production-critical** -- Endpoints return 500 if unset. Should be called out as production-required.

#### Suggestions
- Add n8n instance version to README prerequisites
- Reconcile cron format against live instance
- Add "Production-Critical" callout for optional vars that break features
- Add `retryOnFail` to HTTP Request nodes

#### Risk: LOW

---

## Consensus Summary

### Agreed Strengths
- **Next.js 16 manifest convention** -- both praised `app/manifest.ts` over static JSON
- **Vercel Blob for videos** -- correct choice for CDN delivery and repo size
- **env.ts Zod schema as source of truth** -- ensures documentation doesn't drift
- **Human checkpoints in video plan** -- appropriate for non-automatable steps

### Agreed Concerns
1. **Video poster images / UX (MEDIUM)** -- Both reviewers flagged missing poster thumbnails causing black rectangles or poor LCP. Generate poster frames via ffmpeg during upload.
2. **FFmpeg as system dependency (HIGH from Claude, LOW from Gemini)** -- Should be a prerequisite check, not embedded in auto task. Move to pre-flight or check-and-fail.
3. **Service Worker staleness/versioning (MEDIUM)** -- Both noted the manual SW needs clear cache-busting strategy aligned with Next.js build cycles.
4. **n8n version compatibility (MEDIUM)** -- Claude flagged conflicting cron expression formats between plan and research. Needs reconciliation against live n8n instance.

### Divergent Views
- **n8n failure observability** -- Gemini suggested adding "last run" logging; Claude focused on `retryOnFail` config. User already decided D-10 (no email alerts), so both suggestions are optional enhancements.
- **Icon maskable/any split** -- Claude flagged as MEDIUM concern; Gemini didn't mention. Cosmetic issue, not functional.
- **Video error handling** -- Claude flagged missing `onError` handler; Gemini didn't mention. Good UX practice but not blocking.
