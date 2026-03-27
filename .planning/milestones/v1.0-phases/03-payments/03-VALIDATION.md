---
phase: 03
slug: payments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already configured in project) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PAY-01 | unit | `npx vitest run src/__tests__/payments.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PAY-02 | unit | `npx vitest run src/__tests__/payments.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | SEC-05 | unit | `npx vitest run src/__tests__/webhook.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | PAY-04 | unit | `npx vitest run src/__tests__/payments.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | PAY-03 | integration | manual — requires DB + Stripe | N/A | ⬜ pending |
| 03-01-06 | 01 | 1 | PAY-05 | integration | manual — requires Stripe receipt URLs | N/A | ⬜ pending |

*Status: ⬜ pending / ✅ green / ❌ red / ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/payments.test.ts` — test stubs for Payment model, Stripe checkout session creation, currency conversion
- [ ] `src/__tests__/webhook.test.ts` — test stubs for webhook signature verification, idempotency, event processing

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout redirect works end-to-end | PAY-01 | Requires live Stripe test mode | Create session, verify redirect to Stripe Checkout, complete payment with test card |
| Webhook processes real Stripe events | PAY-04 | Requires Stripe CLI or test webhook | Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, trigger payment |
| Payment history shows receipt links | PAY-05 | Requires completed Stripe payment | Complete test payment, verify receipt URL appears in admin table |
| Admin payment request sends email | PAY-02 | Requires RESEND_API_KEY | Trigger balance request, verify client receives email with payment link |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
