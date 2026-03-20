---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Wave 0 installs) |
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
| TBD | 01 | 1 | FOUND-01 | integration | `npx vitest run src/__tests__/schema.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FOUND-02 | unit | `npx vitest run src/__tests__/dal.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FOUND-03 | integration | `npx vitest run src/__tests__/auth.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FOUND-04 | build | `npx next build` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FOUND-05 | build | `npx next build` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FOUND-06 | unit | `npx vitest run src/__tests__/state.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FOUND-07 | build | `npx next build` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FOUND-08 | unit | `npx vitest run src/__tests__/env.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@vitejs/plugin-react` — test framework installation
- [ ] `vitest.config.ts` — test configuration
- [ ] `src/__tests__/schema.test.ts` — Prisma schema validation stubs
- [ ] `src/__tests__/dal.test.ts` — DAL auth check stubs
- [ ] `src/__tests__/auth.test.ts` — Better Auth integration stubs
- [ ] `src/__tests__/state.test.ts` — State management provider stubs
- [ ] `src/__tests__/env.test.ts` — Environment validation stubs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin login with existing credentials | FOUND-03 | Requires live Better Auth session | Login at /auth/login with admin credentials, verify redirect to /dashboard |
| Route groups render placeholder pages | FOUND-04 | Visual verification | Navigate to /, /auth/login, /dashboard, /portal, /store — each shows placeholder |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
