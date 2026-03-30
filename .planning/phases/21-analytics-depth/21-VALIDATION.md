---
phase: 21
slug: analytics-depth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 21 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Quick run command** | `bun run test --run` |
| **Estimated runtime** | ~25 seconds |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| Charts render correctly with real data | All | Visual verification of Recharts output |
| Peak hours heatmap layout | ANLYT-02 | CSS grid visual verification |
| PDF export includes new analytics | ANLYT-01-04 | Requires Stirling PDF |

**Approval:** pending
