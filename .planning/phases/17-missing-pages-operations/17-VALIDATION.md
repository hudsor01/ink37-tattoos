---
phase: 17
slug: missing-pages-operations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 17 — Validation Strategy

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
| 17-01-01 | 01 | 1 | PAGE-06 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | PAGE-03 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 2 | PAGE-07 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

*Existing infrastructure covers test framework setup — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bell icon shows unread count | PAGE-06 | Requires browser render | Check header bell icon, create notification, verify count updates |
| CSV export downloads correctly | PAGE-03 | Requires browser download | Click export, verify CSV opens in spreadsheet |
| Design thumbnails render | PAGE-07 | Visual verification | View design approval grid, verify images load |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
