---
phase: 26
slug: assets-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-31
---

# Phase 26 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Nyquist justification:** Phase 26 is file-placement and configuration -- shell file-existence checks in `<automated>` tags are sufficient verification. No Wave 0 test stubs needed. All tasks produce static files (JSON, HTML, XML, TypeScript config, Markdown docs) verified by file-existence and grep content checks that run in under 1 second.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `bun run test --run` |
| **Full suite command** | `bun run test --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --run`
- **After every plan wave:** Run `bun run test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 26-01-01 | 01 | 1 | ASSET-02, ASSET-03 | file check | `test -f public/BingSiteAuth.xml && test -f src/app/manifest.ts && test -f public/sw.js` | pending |
| 26-01-02 | 01 | 1 | ASSET-03 | grep check | `grep -q "ServiceWorkerRegistration" src/components/providers.tsx && grep -q "sw.js" next.config.ts` | pending |
| 26-02-01 | 02 | 1 | ASSET-01 | file check | `test -f scripts/upload-videos.ts && test -f src/lib/gallery-videos.ts && test -f src/components/public/gallery-video-card.tsx` | pending |
| 26-02-02 | 02 | 1 | ASSET-01 | content check | `grep -c "PLACEHOLDER_URL" src/lib/gallery-videos.ts \| grep -q "^0$" && grep -q "blob.vercel-storage.com" src/lib/gallery-videos.ts` | pending |
| 26-02-03 | 02 | 1 | ASSET-01 | grep check | `grep -q "GALLERY_VIDEOS" src/components/public/gallery-grid.tsx && grep -q "GalleryVideoCard" src/components/public/gallery-grid.tsx` | pending |
| 26-02-04 | 02 | 1 | ASSET-01 | manual | Human verifies video playback on gallery page | pending |
| 26-03-01 | 03 | 1 | INFRA-01 | file + JSON check | `test -f n8n/balance-due-workflow.json && test -f n8n/no-show-followup-workflow.json && python3 -m json.tool n8n/balance-due-workflow.json > /dev/null` | pending |
| 26-03-02 | 03 | 1 | INFRA-04 | file + content check | `test -f docs/ENV_VARS.md && grep -c "DATABASE_URL\|BETTER_AUTH_SECRET\|STRIPE_SECRET_KEY\|CRON_SECRET\|SENTRY_DSN\|RESEND_API_KEY" docs/ENV_VARS.md` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*No Wave 0 test stubs needed. Phase 26 is file-placement and configuration -- all verification uses file-existence checks, grep content checks, and JSON validation that run in under 1 second.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gallery videos play on public page | ASSET-01 | Requires browser to verify video playback | Open gallery page, verify all 7 videos load and play without errors |
| Search verification passes in webmaster tools | ASSET-02 | Requires Google/Bing webmaster tool login | Submit verification URLs in Google Search Console and Bing Webmaster Tools |
| PWA "Add to Home Screen" works on mobile | ASSET-03 | Requires mobile device or Chrome DevTools Application panel | Open site on mobile, verify "Add to Home Screen" prompt appears |
| n8n workflows run on schedule | INFRA-01 | Requires waiting for scheduled triggers at n8n.thehudsonfam.com | Check n8n execution history after scheduled time |
| Vercel env vars are set | INFRA-04 | Requires Vercel dashboard access | Cross-reference ENV-AUDIT.md against Vercel project settings |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not needed (file-placement phase)
- [x] No watch-mode flags
- [x] Feedback latency < 1s (file/grep checks)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
