# Phase 9: Cal.com Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 09-cal-com-integration
**Areas discussed:** Customer auto-creation, Appointment type mapping, Source indicator, Idempotency strategy
**Mode:** Auto (all decisions auto-selected)

---

## Customer Auto-Creation

| Option | Description | Selected |
|--------|-------------|----------|
| Create minimal customer | Name + email + phone from Cal.com payload, notes "auto-created from Cal.com" | [auto] |
| Skip customer creation | Only sync if customer already exists in system | |
| Create full customer | Prompt admin to complete missing fields after webhook creates stub | |

**User's choice:** [auto] Create minimal customer (recommended default)
**Notes:** Mirrors Phase 4 portal auto-linking pattern. Most Cal.com bookers won't have existing customer records on first booking.

---

## Appointment Type Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Settings-based mapping | JSON in settings table mapping calEventTypeId to AppointmentType, CONSULTATION fallback | [auto] |
| Hardcoded mapping | Map known Cal.com event type slugs directly in code | |
| Always CONSULTATION | Ignore Cal.com event type, default everything to CONSULTATION | |

**User's choice:** [auto] Settings-based mapping with CONSULTATION fallback (recommended default)
**Notes:** Admin can configure mappings in /dashboard/settings under Cal.com section. Flexible without code changes.

---

## Source Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Badge + filter | Small "Cal.com" badge on appointment rows, source filter dropdown | [auto] |
| Icon only | Calendar icon next to Cal.com appointments, no filter | |
| No indicator | Treat all appointments identically in admin | |

**User's choice:** [auto] Badge + source filter (recommended default)
**Notes:** The appointment.source field already exists with default 'website'. Setting source to 'cal.com' enables both badge rendering and filtering with zero schema changes.

---

## Idempotency Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Upsert on calBookingUid | Use unique constraint for natural idempotency, no event table | [auto] |
| Event tracking table | Create calEvent table mirroring stripeEvent pattern | |
| Check-then-insert | Query for existing booking UID before insert | |

**User's choice:** [auto] Upsert on calBookingUid unique constraint (recommended default)
**Notes:** calBookingUid is already unique-indexed in the schema. Drizzle onConflictDoUpdate provides atomic idempotency without a separate tracking table. Simpler than the Stripe pattern since Cal.com booking UIDs are more stable than Stripe event IDs.

---

## Claude's Discretion

- Webhook payload TypeScript types and parsing
- Error handling and logging approach
- Audit log entries for webhook-triggered changes

## Deferred Ideas

- Cal.com API reads for event types and availability
- Custom appointment reminders (Cal.com handles its own)
- Artist assignment from Cal.com team members
- Two-way sync (push admin changes back to Cal.com)
