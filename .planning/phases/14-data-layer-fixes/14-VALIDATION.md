---
phase: 14
slug: data-layer-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test --run` |
| **Full suite command** | `bun run test --run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --run`
- **After every plan wave:** Run `bun run test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | DAL-01,02 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | DAL-03 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | DAL-04 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | DAL-05,06 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 2 | DAL-07 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 2 | DAL-08 | integration | `bun run test --run` | ❌ W0 | ⬜ pending |
| 14-04-01 | 04 | 2 | DAL-09,10,11,12 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for pagination helpers (DAL-01, DAL-02)
- [ ] Test stubs for tsvector search (DAL-02)
- [ ] Test stubs for ActionResult wrapper (DAL-04)
- [ ] Test stubs for FK validation (DAL-05)
- [ ] Test stubs for webhook revalidation (DAL-08)
- [ ] Test stubs for gift card validation (DAL-12)

*Existing infrastructure covers test framework setup — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard page updates after webhook | DAL-08 | Requires browser to observe revalidation | Fire Stripe test webhook, check dashboard refreshes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
