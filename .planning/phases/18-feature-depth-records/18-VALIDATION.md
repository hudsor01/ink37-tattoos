---
phase: 18
slug: feature-depth-records
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 18 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test --run` |
| **Full suite command** | `bun run test --run` |
| **Estimated runtime** | ~25 seconds |

## Sampling Rate

- **After every task commit:** Run `bun run test --run`
- **After every plan wave:** Run `bun run test --run`
- **Max feedback latency:** 25 seconds

## Manual-Only Verifications

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| PDF receipt downloads correctly | FEAT-06 | Requires Stirling PDF API connectivity |
| Drag-and-drop image sorting | FEAT-07 | Requires browser interaction |
| Conflict warning displays on overlap | FEAT-04 | Requires specific appointment scheduling |

## Validation Sign-Off

- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
