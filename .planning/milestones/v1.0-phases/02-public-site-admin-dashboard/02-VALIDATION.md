---
phase: 2
slug: public-site-admin-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Wave 0 installs if missing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npx next build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npx next build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| *Populated by planner* | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` — install test framework if not present
- [ ] `vitest.config.ts` — configure with path aliases matching tsconfig
- [ ] `src/__tests__/setup.ts` — shared test setup (DOM environment, mocks)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cal.com embed renders booking widget | PUB-04 | Third-party embed requires browser | Open /booking, verify Cal.com widget loads and accepts clicks |
| Lighthouse score 90+ | PUB-09 | Requires Lighthouse CLI or DevTools | Run `npx lighthouse http://localhost:3000 --output=json` |
| Resend email delivery | PUB-05 | Requires Resend API key and email verification | Submit contact form, verify emails received |
| Vercel Blob upload | ADMIN-05 | Requires Vercel Blob token | Upload image via admin media page, verify blob URL returned |
| SEO metadata renders correctly | PUB-07 | Requires browser/crawler inspection | Check page source for og:tags, structured data, sitemap.xml |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
