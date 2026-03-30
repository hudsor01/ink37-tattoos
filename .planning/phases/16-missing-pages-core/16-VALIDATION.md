---
phase: 16
slug: missing-pages-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 16 — Validation Strategy

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
| 16-01-01 | 01 | 1 | PAGE-01 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | PAGE-02 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | PAGE-05 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | PAGE-04 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/artist-profile-action.test.ts` — stubs for PAGE-01
- [ ] `src/__tests__/calendar-event-mapping.test.ts` — stubs for PAGE-02
- [ ] `src/__tests__/gift-card-admin-actions.test.ts` — stubs for PAGE-05
- [ ] `src/__tests__/contact-actions.test.ts` — stubs for PAGE-04

*Existing infrastructure covers test framework setup — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar renders appointments visually | PAGE-02 | Requires browser to verify FullCalendar rendering | Open /dashboard/calendar, verify day/week/month views show appointments |
| Profile photo upload works | PAGE-01 | Requires Vercel Blob token | Upload image on /dashboard/profile, verify it appears |
| Sheet panel opens on calendar click | PAGE-02 | Interactive UI behavior | Click any appointment in calendar, verify Sheet opens with details |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
