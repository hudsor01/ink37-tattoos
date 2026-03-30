---
phase: 13
slug: security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` |
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
| 13-01-01 | 01 | 1 | SEC-01 | integration | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | SEC-02 | integration | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | SEC-03 | integration | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | SEC-04 | integration | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 1 | SEC-05 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-03-02 | 03 | 1 | SEC-06 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-04-01 | 04 | 2 | SEC-07 | integration | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-04-02 | 04 | 2 | SEC-08 | integration | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-05-01 | 05 | 2 | SEC-09 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 13-05-02 | 05 | 2 | SEC-10 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for auth enforcement (SEC-01, SEC-02)
- [ ] Test stubs for rate limiting (SEC-03, SEC-04)
- [ ] Test stubs for role validation (SEC-05)
- [ ] Test stubs for XSS sanitization (SEC-06)
- [ ] Test stubs for webhook idempotency (SEC-07, SEC-08)
- [ ] Test stubs for API error codes (SEC-09)
- [ ] Test stubs for env validation (SEC-10)

*Existing infrastructure covers test framework setup — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rate limit persists across cold starts | SEC-04 | Requires serverless deployment to verify cold start behavior | Deploy to Vercel preview, wait 5min, hit endpoint rapidly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
