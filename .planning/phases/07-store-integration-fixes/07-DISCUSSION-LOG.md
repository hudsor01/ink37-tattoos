# Phase 7: Store Integration Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 07-store-integration-fixes
**Areas discussed:** None (deterministic fixes, skipped discussion)

---

## Codebase Verification

All 3 audit gaps confirmed present in codebase:

| Gap | File | Line | Issue |
|-----|------|------|-------|
| INT-01 | `src/app/api/webhooks/stripe/route.ts` | 221-222 | `downloadUrl` uses `/store/downloads/${order.id}` — no such page exists |
| INT-02 | `src/lib/actions/store-actions.ts` | 58 | `product.stripePriceId!` non-null assertion on nullable field |
| FLOW-02/03 | `src/app/api/webhooks/stripe/route.ts` | 258-265 | Only recipient gets email, purchaser gets nothing |

Additional discovery: `getOrderByCheckoutSessionId` (orders.ts L193-197) does not include `downloadTokens` in its query — needs extending for download URL fix.

## Claude's Discretion

- Exact styling of gift card purchaser confirmation email
- Whether download links in email use array or single URL pattern

## Deferred Ideas

None.
