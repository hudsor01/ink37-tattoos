---
phase: 04
slug: client-portal
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-22
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 01 | 1 | PORT-01, PORT-06 | unit | `npx vitest run src/__tests__/portal-auth.test.ts --reporter=verbose` | W0 | pending |
| 04-01-T2a | 01 | 1 | PORT-02, PORT-03, PORT-05 | unit | `npx vitest run src/__tests__/portal-dal.test.ts --reporter=verbose` | W0 | pending |
| 04-01-T2b | 01 | 1 | PORT-04 | unit | `npx vitest run src/__tests__/portal-actions.test.ts --reporter=verbose` | W0 | pending |
| 04-02-T1 | 02 | 2 | — | grep | `grep -q "PortalHeader" src/app/\(portal\)/layout.tsx && grep -q "PortalNav" src/app/\(portal\)/layout.tsx && echo PASS` | N/A | pending |
| 04-02-T2 | 02 | 2 | PORT-02 | grep | `grep -q "getPortalAppointments" src/app/\(portal\)/portal/appointments/page.tsx && echo PASS` | N/A | pending |
| 04-02-T2 | 02 | 2 | PORT-03 | grep | `grep -q "getPortalSessions" src/app/\(portal\)/portal/tattoos/page.tsx && echo PASS` | N/A | pending |
| 04-02-T2 | 02 | 2 | PORT-04 | grep | `grep -q "signConsentAction" src/components/portal/consent-form.tsx && echo PASS` | N/A | pending |
| 04-02-T2 | 02 | 2 | PORT-05 | grep | `grep -q "receiptUrl" src/app/\(portal\)/portal/payments/page.tsx && echo PASS` | N/A | pending |
| 04-final | — | — | all | build | `npx next build` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Test stubs are created inline during Plan 04-01 Task 2 execution (no separate Wave 0 plan — consistent with Phase 3 approach):

- [ ] `src/__tests__/portal-auth.test.ts` — PORT-01, PORT-06: registration auto-linking via databaseHooks, Customer creation on no-match
- [ ] `src/__tests__/portal-dal.test.ts` — PORT-02, PORT-03, PORT-05: DAL function existence, customer scoping, sensitive field exclusion, payment receipt URLs
- [ ] `src/__tests__/portal-actions.test.ts` — PORT-04: consent signing validation, re-sign prevention, timestamp recording
- [ ] Schema migration verification: consentSignedAt and consentSignedBy fields exist after migration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Registration creates and links Customer | PORT-01, PORT-06 | Requires running app + database | Register new user, verify Customer record created with matching email/userId |
| Portal shows real appointment data | PORT-02 | Requires seeded data | Log in as client with appointments, verify list renders |
| Consent form signing persists | PORT-04 | Requires running app | Sign consent on a session, reload page, verify read-only state |
| Payment receipts open Stripe page | PORT-05 | Requires completed Stripe payment | Click receipt link, verify Stripe-hosted receipt loads |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
