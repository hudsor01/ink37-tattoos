---
phase: 28
slug: fix-pr-5-notification-retention-policy-review-issues
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `bun run test -- src/__tests__/api-cron-cleanup.test.ts src/__tests__/env.test.ts` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test -- src/__tests__/api-cron-cleanup.test.ts src/__tests__/env.test.ts`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | CRON-SEC-01 | unit | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "timing-safe"` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | CRON-SEC-02 | unit | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "lock"` | ❌ W0 | ⬜ pending |
| 28-01-03 | 01 | 1 | CRON-ROB-01 | unit | `bun run test -- src/__tests__/env.test.ts -t "notification retention"` | ❌ W0 | ⬜ pending |
| 28-01-04 | 01 | 1 | CRON-ROB-02 | unit (mock) | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "rowCount"` | ❌ W0 | ⬜ pending |
| 28-01-05 | 01 | 1 | CRON-ROB-03 | code review | manual | N/A | ⬜ pending |
| 28-01-06 | 01 | 1 | CRON-CLEAN-01 | unit (mock) | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "Redis client"` | ❌ W0 | ⬜ pending |
| 28-01-07 | 01 | 1 | CRON-CLEAN-02 | unit | `bun run test -- src/__tests__/env.test.ts -t "coerce"` | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 2 | CRON-INFRA-01 | file existence | manual (import to n8n) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/api-cron-cleanup.test.ts` — new test file for cron route (CRON-SEC-01, CRON-SEC-02, CRON-ROB-02, CRON-CLEAN-01)
- [ ] Extend `src/__tests__/env.test.ts` — tests for notification retention coerced fields (CRON-ROB-01, CRON-CLEAN-02)

*Existing test infrastructure (Vitest 3.1.1) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| purgeOldNotifications has auth bypass docs | CRON-ROB-03 | Documentation/code review | Read src/lib/dal/notifications.ts, verify JSDoc comment on purgeOldNotifications explaining intentional auth bypass |
| n8n workflow runs on schedule | CRON-INFRA-01 | External system | Import workflow JSON to n8n.thehudsonfam.com, verify schedule trigger fires at 3AM CT |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
