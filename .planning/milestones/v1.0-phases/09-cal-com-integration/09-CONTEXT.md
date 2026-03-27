# Phase 9: Cal.com Integration - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire Cal.com webhook events into the appointment system so bookings made through the Cal.com embed automatically create and sync appointment records, match or create customers, and appear in both the admin dashboard and client portal without manual data entry.

This phase does NOT add new Cal.com features (e.g., availability management, event type CRUD, or Cal.com API reads). It focuses solely on inbound webhook processing and the data sync that makes existing UI surfaces reflect Cal.com bookings.

</domain>

<decisions>
## Implementation Decisions

### Webhook Architecture
- **D-01:** Single webhook route at `/api/webhooks/cal/route.ts` following the established Stripe webhook pattern (raw body → signature verification → event switch → handler functions)
- **D-02:** Cal.com uses HMAC-SHA256 signing with a shared secret. Verify using `crypto.timingSafeEqual` on the `X-Cal-Signature-256` header. New env var: `CAL_WEBHOOK_SECRET`
- **D-03:** Idempotency via the existing `calBookingUid` unique constraint on the appointment table. Use upsert (insert...onConflictDoUpdate) — no separate event tracking table needed since Cal.com booking UIDs are naturally unique

### Customer Matching
- **D-04:** On BOOKING_CREATED, match the booker's email to `customer.email`. If found, link the appointment to that customer. If not found, create a minimal customer record with firstName, lastName, email, and phone from the Cal.com payload
- **D-05:** Auto-created customers get `source: 'cal.com'` in notes field to distinguish them from manually-entered customers. No special flag column needed

### Appointment Creation
- **D-06:** Map Cal.com event types to AppointmentType enum via a settings key (`cal_event_type_map`) stored in the settings table. Format: JSON object `{ "calEventTypeId": "APPOINTMENT_TYPE" }`. Fallback to `CONSULTATION` when no mapping exists
- **D-07:** New appointments from Cal.com set `source: 'cal.com'` (the appointment.source field already exists with default 'website')
- **D-08:** Populate all 4 cal fields: calBookingUid, calEventTypeId, calStatus ('CONFIRMED'), calMeetingUrl
- **D-09:** Set appointment status to CONFIRMED (not PENDING) since Cal.com bookings are already confirmed by the platform

### Status Sync
- **D-10:** BOOKING_RESCHEDULED updates scheduledDate from the new startTime, sets calStatus to 'RESCHEDULED', and keeps appointment status as CONFIRMED
- **D-11:** BOOKING_CANCELLED sets calStatus to 'CANCELLED' and appointment status to CANCELLED

### Admin Dashboard
- **D-12:** Add a "Cal.com" badge (small icon or label) next to appointments where source === 'cal.com' in the appointment list
- **D-13:** Add source filter option to the appointment list (All / Manual / Cal.com)

### Client Portal
- **D-14:** No portal changes needed — `getPortalAppointments()` already queries by customerId. As long as customer matching works (D-04), Cal.com appointments will appear automatically in the portal

### Claude's Discretion
- Webhook payload parsing structure and TypeScript types — follow Cal.com v2 webhook payload format
- Error handling and logging approach within webhook handlers
- Whether to add audit log entries for Cal.com-triggered appointment changes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Webhook Pattern
- `src/app/api/webhooks/stripe/route.ts` — Established webhook pattern: raw body, signature verification, idempotency check, event switch, handler functions
- `src/lib/env.ts` — Env validation schema; CAL_API_KEY already defined, add CAL_WEBHOOK_SECRET here

### Schema & Data Layer
- `src/lib/db/schema.ts` lines 147-170 — Appointment table with cal fields (calBookingUid, calEventTypeId, calStatus, calMeetingUrl) and source field
- `src/lib/db/schema.ts` lines 103-131 — Customer table with email matching capability
- `src/lib/dal/appointments.ts` — Existing appointment CRUD with requireStaffRole pattern
- `src/lib/dal/portal.ts` — Portal queries including getPortalAppointments (queries by customerId)
- `src/lib/dal/settings.ts` — Settings KV store for event type mapping

### Admin UI
- `src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx` — Appointment list to add source badge and filter
- `src/components/dashboard/appointment-form.tsx` — Appointment form (may need to handle read-only cal fields)

### Security
- `src/lib/security/rate-limiter.ts` — Rate limiter for webhook endpoint
- `src/lib/security/validation.ts` — Zod validation schemas

### Cal.com
- Cal.com Webhook v2 API docs (external) — BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED payloads and HMAC-SHA256 signing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Stripe webhook route** (`src/app/api/webhooks/stripe/route.ts`): Identical pattern — raw body, sig verify, idempotency, switch/handler. Cal.com webhook follows same structure
- **Appointment schema cal fields**: calBookingUid (unique), calEventTypeId, calStatus, calMeetingUrl — all pre-existing and ready for population
- **Appointment source field**: Already defaults to 'website' — Cal.com bookings set to 'cal.com'
- **Customer email index**: `customer_email_idx` exists for efficient email matching
- **Settings DAL** (`getSettingByKey`, `upsertSetting`): Ready for storing event type mapping
- **Audit log** (`logAudit`): Fire-and-forget pattern for logging webhook-triggered changes

### Established Patterns
- **Webhook signature verification**: Stripe uses `constructEvent(body, sig, secret)`. Cal.com will use `crypto.createHmac('sha256', secret).update(body).digest('hex')` comparison
- **DAL auth bypass for webhooks**: Webhook handlers call db directly (not through DAL auth-guarded functions) since there's no user session — same pattern for Cal.com
- **Drizzle upsert**: `db.insert().values().onConflictDoUpdate()` on calBookingUid for idempotency
- **Server-only imports**: All DAL and db modules use 'server-only' guard

### Integration Points
- `/api/webhooks/cal/route.ts` — New route handler (mirrors Stripe webhook location)
- `src/lib/env.ts` — Add CAL_WEBHOOK_SECRET to env schema
- `src/lib/dal/appointments.ts` — May add `createAppointmentFromCal()` and `updateAppointmentFromCal()` that bypass staff role check (webhook context)
- Appointment list UI — Add source badge and filter dropdown

</code_context>

<specifics>
## Specific Ideas

- The 4 cal fields on the appointment table were designed for this integration from Phase 1 but never wired up — this phase completes the original design intent
- Customer matching mirrors the portal auto-linking pattern from Phase 4 (match by email, link records)
- Cal.com embed is already live on /booking — webhooks complete the two-way connection

</specifics>

<deferred>
## Deferred Ideas

- **Cal.com API reads** — Using CAL_API_KEY to fetch event types, availability, or existing bookings. Useful for initial data backfill but not needed for ongoing webhook sync
- **Appointment reminders** — Cal.com handles its own reminders; custom reminders from the app would be a separate feature
- **Artist assignment from Cal.com** — Mapping Cal.com team members to tattooArtist records. Requires multi-artist Cal.com setup
- **Two-way sync** — Pushing appointment changes from admin back to Cal.com via API. Requires Cal.com API integration beyond webhooks

</deferred>

---

*Phase: 09-cal-com-integration*
*Context gathered: 2026-03-25*
