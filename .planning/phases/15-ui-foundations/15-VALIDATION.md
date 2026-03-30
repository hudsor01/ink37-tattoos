---
phase: 15
slug: ui-foundations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test --run` |
| **Full suite command** | `bun run test --run` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --run`
- **After every plan wave:** Run `bun run test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | UI-01 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | UI-02,03 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | UI-04 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | UI-06,07 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | UI-05 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 2 | UI-08,09 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |
| 15-04-01 | 04 | 2 | UI-10,11 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |
| 15-04-02 | 04 | 2 | UI-12,13 | structural | `bun run test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers test framework setup — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skeleton matches page layout | UI-01 | Visual verification needed | Navigate to each dashboard page, observe skeleton during load |
| Mobile card view collapse | UI-04 | Requires viewport resize | View data table pages at mobile width, verify card layout |
| Keyboard navigation works | UI-05 | Interactive testing | Tab through all controls, verify focus ring and activation |
| Screen reader chart alt text | UI-05 | Requires assistive technology | Use VoiceOver to read chart data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
