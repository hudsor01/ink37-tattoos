---
phase: 26
slug: assets-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | ASSET-01 | integration | `curl -sI {blob_url} \| grep "200 OK"` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | ASSET-02 | file check | `test -f public/BingSiteAuth.xml && test -f public/google*.html` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | ASSET-03 | file check | `test -f src/app/manifest.ts && test -f public/sw.js` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 1 | INFRA-01 | integration | `curl -sI n8n.thehudsonfam.com \| grep "200"` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 1 | INFRA-04 | file check | `test -f ENV-AUDIT.md && grep -c "REQUIRED\|OPTIONAL" ENV-AUDIT.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test stubs needed -- verification uses file system checks and HTTP probes.*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
