---
phase: 25
slug: database-security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 25 — Validation Strategy

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
| 25-01-01 | 01 | 1 | DB-01 | integration | `bun run db:migrate` on fresh DB | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | DB-01 | unit | `grep -c "CREATE TABLE" drizzle/0000_*.sql` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 1 | DB-02 | integration | `bun run db:seed` | ❌ W0 | ⬜ pending |
| 25-02-02 | 02 | 1 | DB-02 | unit | `bun run test --run src/__tests__/seed*` | ❌ W0 | ⬜ pending |
| 25-03-01 | 03 | 2 | INFRA-02 | unit | `bun run test --run src/__tests__/csp*` | ❌ W0 | ⬜ pending |
| 25-03-02 | 03 | 2 | INFRA-02 | integration | CSP header check via curl/test | ❌ W0 | ⬜ pending |
| 25-04-01 | 04 | 2 | INFRA-03 | unit | `bun run test --run src/__tests__/rate-limiter*` | ✅ | ⬜ pending |
| 25-04-02 | 04 | 2 | INFRA-03 | integration | 429 response on rapid admin requests | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/seed.test.ts` — stubs for DB-02 seed verification
- [ ] `src/__tests__/csp-nonce.test.ts` — stubs for INFRA-02 CSP nonce verification
- [ ] `src/__tests__/admin-rate-limit.test.ts` — stubs for INFRA-03 admin rate limiting

*Existing rate-limiter tests cover base pattern; new tests needed for admin-specific limiters and CSP nonces.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production baseline marking | DB-01 | Requires access to production Drizzle journal | Document steps in DEPLOYMENT.md; verify journal entry exists after manual prod step |
| CSP blocks inline scripts without nonce | INFRA-02 | Requires browser DevTools to verify CSP enforcement | Open site in Chrome, check Console for CSP violations on scripts without nonce attribute |
| Cal.com embed loads with CSP nonces | INFRA-02 | Requires Cal.com embed rendering in browser | Navigate to booking page, verify Cal.com widget renders without CSP errors |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
