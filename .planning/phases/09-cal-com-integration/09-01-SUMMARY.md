---
phase: 09-cal-com-integration
plan: 01
subsystem: cal-webhook
tags: [cal.com, webhook, appointments, customer-matching, hmac]
dependency_graph:
  requires: [schema-appointment-cal-fields, drizzle-orm]
  provides: [cal-webhook-route, cal-signature-verification, cal-type-definitions]
  affects: [portal-appointments, admin-appointments]
tech_stack:
  added: []
  patterns: [hmac-sha256-verification, idempotent-upsert, case-insensitive-email-matching]
key_files:
  created:
    - src/lib/cal/types.ts
    - src/lib/cal/verify.ts
    - src/app/api/webhooks/cal/route.ts
    - src/__tests__/cal-webhook.test.ts
  modified:
    - src/lib/env.ts
    - src/lib/security/validation.ts
decisions:
  - Webhook uses raw process.env for CAL_WEBHOOK_SECRET (same as Stripe pattern)
  - Customer matching uses ilike for case-insensitive email lookup
  - Event type mapping uses settings table queried directly (not via DAL which requires auth session)
  - Appointment upsert uses onConflictDoUpdate on calBookingUid for idempotency
  - Rescheduling uses rescheduleUid (old UID) for lookup, updates to new UID
metrics:
  duration: 21min
  completed: 2026-03-26
---

# Phase 09 Plan 01: Cal.com Webhook Handler Summary

HMAC-SHA256 verified webhook handler that receives Cal.com booking events, matches/creates customers by email, and upserts appointments with all cal fields populated using idempotent onConflictDoUpdate.

## What Was Built

### Cal.com Type Definitions (src/lib/cal/types.ts)
- `CalWebhookEvent` interface with triggerEvent union of 3 event strings
- `CalBookingPayload` interface with all Cal.com v2 payload fields including organizer, attendees, responses, metadata, reschedule fields

### Signature Verification (src/lib/cal/verify.ts)
- `verifyCalSignature(body, signature, secret)` using crypto.createHmac SHA-256
- Uses crypto.timingSafeEqual for constant-time comparison
- Secret passed as parameter (not read from env) for testability

### Webhook Route Handler (src/app/api/webhooks/cal/route.ts)
- POST handler following Stripe webhook pattern: raw body, signature verify, Zod validate, event switch
- BOOKING_CREATED: customer email matching (ilike), new customer creation with 'source: cal.com' note, event type mapping from settings table, idempotent appointment upsert
- BOOKING_RESCHEDULED: looks up by rescheduleUid (old UID), updates calBookingUid to new UID, sets calStatus RESCHEDULED
- BOOKING_CANCELLED: sets both status and calStatus to CANCELLED
- Meeting URL extraction from metadata.videoCallUrl or videoCallData.url

### Environment and Validation
- CAL_WEBHOOK_SECRET added to env schema as optional (app starts without it)
- CalWebhookPayloadSchema Zod schema with .passthrough() for unknown Cal.com fields

### Unit Tests (src/__tests__/cal-webhook.test.ts)
- 12 tests across 3 describe blocks, all passing
- Signature verification: missing header (401), invalid sig (401), missing secret (500)
- Event handling: create with cal fields, new customer creation, existing customer matching, idempotent upsert, reschedule via rescheduleUid, cancellation
- HMAC crypto: valid signature match, invalid signature mismatch, different length handling

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c6ae2de | Cal.com types, signature verification, env config, Zod schema |
| 2 | a63e97f | Cal.com webhook route with customer matching and appointment upsert |
| 3 | 7dae564 | Cal.com webhook unit tests (12 tests, all passing) |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functionality is fully wired.

## Verification Results

- `npx vitest run src/__tests__/cal-webhook.test.ts` -- 12/12 tests pass
- Webhook route uses request.text() for raw body
- ilike used for case-insensitive email matching
- onConflictDoUpdate on calBookingUid for idempotent upsert
- rescheduleUid used for rescheduling lookup
