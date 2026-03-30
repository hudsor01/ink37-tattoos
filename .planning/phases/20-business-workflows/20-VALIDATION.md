---
phase: 20
slug: business-workflows
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 20 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Quick run command** | `bun run test --run` |
| **Estimated runtime** | ~25 seconds |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| Balance-due reminder email sent via n8n | BIZ-01 | Requires n8n instance + Resend delivery |
| Consent form download as PDF | BIZ-02 | Requires Stirling PDF connectivity |
| Aftercare email auto-sends on session complete | BIZ-03 | Requires Resend delivery + session state change |
| No-show follow-up via n8n | BIZ-04 | Requires n8n cron trigger |
| Invoice PDF email attachment | BIZ-05 | Requires Stirling PDF + Resend attachment |

**Approval:** pending
