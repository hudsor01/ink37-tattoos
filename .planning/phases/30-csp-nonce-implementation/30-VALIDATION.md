---
phase: 30
slug: csp-nonce-implementation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-05
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `bun run test -- --run` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test -- --run`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | INFRA-02 | T-30-01 | Nonce generated per request via crypto | unit | `bun run test -- src/__tests__/csp.test.ts` | W0 (Task 1 creates) | ⬜ pending |
| 30-01-02 | 01 | 1 | INFRA-02 | T-30-02 | CSP header contains nonce in script-src | unit | `bun run test -- src/__tests__/csp.test.ts` | W0 (Task 1 creates) | ⬜ pending |
| 30-01-03 | 01 | 1 | INFRA-02 | — | layout.tsx reads x-nonce from middleware | integration | `bun run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/__tests__/csp.test.ts` — created by Task 1 (TDD: RED phase writes tests first, before implementation)
- [x] Middleware test utilities — mock NextRequest/NextResponse for nonce verification (inside csp.test.ts)
- [x] CSP header parsing test helper — `parseCSP()` function inside csp.test.ts

*Task 1 is type `tdd="true"`, meaning tests are written first (RED), then implementation (GREEN). This satisfies Wave 0 — the test file is the first artifact created during Task 1 execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser blocks inline script without nonce | INFRA-02 | Requires real browser CSP enforcement | Open DevTools console, inject `<script>alert(1)</script>`, verify blocked |
| Nonce in response header matches nonce on script tags | INFRA-02 | Requires rendered HTML inspection | View page source, compare nonce attribute with CSP header nonce value |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Task 1 TDD creates test file first)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
