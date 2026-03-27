---
phase: 5
slug: online-store
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | STORE-01 | unit | `npx vitest run src/__tests__/gift-card.test.ts -t "generates valid code" --reporter=verbose` | W0 | pending |
| 05-01-02 | 01 | 1 | STORE-01 | unit | `npx vitest run src/__tests__/gift-card.test.ts -t "purchase" --reporter=verbose` | W0 | pending |
| 05-02-01 | 02 | 1 | STORE-02 | unit | `npx vitest run src/__tests__/store-validation.test.ts -t "product" --reporter=verbose` | W0 | pending |
| 05-03-01 | 03 | 1 | STORE-03 | unit | `npx vitest run src/__tests__/cart-store.test.ts --reporter=verbose` | W0 | pending |
| 05-03-02 | 03 | 1 | STORE-03 | unit | `npx vitest run src/__tests__/store-checkout.test.ts --reporter=verbose` | W0 | pending |
| 05-04-01 | 04 | 1 | STORE-04 | unit | `npx vitest run src/__tests__/order-status.test.ts --reporter=verbose` | W0 | pending |
| 05-05-01 | 05 | 1 | STORE-05 | unit | `npx vitest run src/__tests__/download-token.test.ts --reporter=verbose` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/gift-card.test.ts` — covers STORE-01 (code generation, balance ops)
- [ ] `src/__tests__/store-validation.test.ts` — covers STORE-02 (Zod schemas for product, order, gift card)
- [ ] `src/__tests__/cart-store.test.ts` — covers STORE-03 (Zustand cart operations)
- [ ] `src/__tests__/store-checkout.test.ts` — covers STORE-03 (checkout action validation)
- [ ] `src/__tests__/order-status.test.ts` — covers STORE-04 (status transition logic)
- [ ] `src/__tests__/download-token.test.ts` — covers STORE-05 (token validation, expiry)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout hosted page renders correctly | STORE-03 | External Stripe UI | Create test checkout session, verify line items display on hosted page |
| Gift card email received with correct content | STORE-01 | External email delivery | Purchase gift card, verify Resend delivers email with code, names, message |
| Digital download streams file correctly | STORE-05 | Requires Vercel Blob private store | Upload test file, create token, verify download returns correct file |
| Product images display in catalog | STORE-02 | Visual rendering | Browse /store, verify images load from Vercel Blob public URLs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
