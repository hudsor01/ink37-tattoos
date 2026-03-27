# Phase 7: Store Integration Fixes - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning
**Source:** Gap closure from v1.0-MILESTONE-AUDIT.md

<domain>
## Phase Boundary

Fix three store integration wiring issues identified in the v1.0 milestone audit. All three are deterministic bug fixes with clear before/after states — no design decisions required.

</domain>

<decisions>
## Implementation Decisions

### Download URL Fix (INT-01)
- **D-01:** The webhook `handleStoreCheckoutCompleted` at line 221-222 of `route.ts` sends `downloadUrl: /store/downloads/${order.id}` in the order confirmation email. No such page exists. The actual download route is `/api/store/download?token=TOKEN`.
- **D-02:** The email template (`orderConfirmationTemplate`) currently accepts a single `downloadUrl` string and renders one "Download Files" button. This needs to change to accept an array of per-item download URLs, since each digital order item gets its own `DownloadToken`.
- **D-03:** The `getOrderByCheckoutSessionId` DAL function (line 193-197 of `orders.ts`) currently includes `{ items: { include: { product: true } } }` — it does NOT include `downloadTokens`. Must add `downloadTokens: true` to the `items.include` to make tokens available in the webhook.
- **D-04:** After the query returns download tokens, build per-item download URLs using the pattern from the checkout success page: `/api/store/download?token=${dt.token}` (see `store/checkout/success/page.tsx` line 95).
- **D-05:** Update `sendOrderConfirmationEmail` and `orderConfirmationTemplate` to accept `downloadLinks: Array<{ name: string; url: string }>` instead of a single `downloadUrl: string`. Render one link per digital item.

### stripePriceId Null Guard (INT-02)
- **D-06:** In `store-actions.ts` line 58, `product.stripePriceId!` uses a non-null assertion on a nullable field. If a product has no Stripe price ID configured, this will crash the checkout flow with an unhelpful error.
- **D-07:** Add a guard before the Stripe line items loop: if any product in the cart lacks a `stripePriceId`, return `{ error: 'One or more products are not available for purchase. Please try again later.' }` before creating the Stripe session. This is a user-friendly error, not a crash.

### Gift Card Purchaser Confirmation Email (FLOW-02)
- **D-08:** Currently `handleGiftCardCheckoutCompleted` (line 232-266 of `route.ts`) only sends `sendGiftCardEmail` to the recipient. The purchaser gets no confirmation that their purchase succeeded.
- **D-09:** Create a new `giftCardPurchaseConfirmationTemplate` in `templates.ts` that confirms the purchase with: amount, recipient name, and a note that the gift card has been sent.
- **D-10:** Create a new `sendGiftCardPurchaseConfirmationEmail` in `resend.ts` using the same pattern as existing email functions.
- **D-11:** Call the new send function in `handleGiftCardCheckoutCompleted` after the existing `sendGiftCardEmail` call, using `purchaserEmail` (already extracted at line 240).

### Claude's Discretion
- Exact HTML/styling of purchaser confirmation email template (match existing templates)
- Whether to make `downloadLinks` optional or always pass empty array

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Download token pattern (reference implementation)
- `src/app/(store)/store/checkout/success/page.tsx` L88-103 — Correct download URL pattern: `/api/store/download?token=${dt.token}` per item
- `src/app/api/store/download/route.ts` — Actual download route handler

### Files to modify
- `src/app/api/webhooks/stripe/route.ts` L221-222 — Wrong download URL; L258+ — Missing purchaser email
- `src/lib/dal/orders.ts` L193-197 — `getOrderByCheckoutSessionId` needs `downloadTokens: true` in include
- `src/lib/actions/store-actions.ts` L58 — `product.stripePriceId!` non-null assertion crash
- `src/lib/email/templates.ts` — Needs `giftCardPurchaseConfirmationTemplate` + update `orderConfirmationTemplate`
- `src/lib/email/resend.ts` — Needs `sendGiftCardPurchaseConfirmationEmail` + update `sendOrderConfirmationEmail`

### Existing patterns
- `src/lib/email/resend.ts` L82-108 — `sendOrderConfirmationEmail` pattern (reference for new email function)
- `src/lib/email/templates.ts` L134-164 — `giftCardDeliveryTemplate` (reference for new template styling)

### Audit report
- `.planning/v1.0-MILESTONE-AUDIT.md` — Full gap descriptions under INT-01, INT-02, FLOW-02, FLOW-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resend.ts` email send pattern: check `RESEND_API_KEY`, call `resend.emails.send()`, return `{ sent: boolean }`
- `templates.ts` template pattern: function returning HTML string with inline styles, 600px max-width container
- `giftCardDeliveryTemplate` styling can be reused for purchaser confirmation
- `getOrderByCheckoutSessionId` already does `include: { items: { include: { product: true } } }` — just extend

### Established Patterns
- Download URLs: `/api/store/download?token=${token}` (checkout success page L95)
- Download tokens created per-item in `createOrder` DAL with `randomBytes(32).toString('hex')`
- Email functions accept a data object and return `Promise<{ sent: boolean }>`
- Template functions accept a data object and return `string` (HTML)

### Integration Points
- Webhook `handleStoreCheckoutCompleted` sends order confirmation email at L208-224
- Webhook `handleGiftCardCheckoutCompleted` sends gift card delivery at L258-265
- `storeCheckoutAction` builds Stripe line items at L57-60
- `purchaserEmail` already extracted at webhook L240 — reusable for confirmation email

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the audit defines exactly what needs to change.

</specifics>

<deferred>
## Deferred Ideas

None — all fixes are within phase scope.

</deferred>

---

*Phase: 07-store-integration-fixes*
*Context gathered: 2026-03-22*
