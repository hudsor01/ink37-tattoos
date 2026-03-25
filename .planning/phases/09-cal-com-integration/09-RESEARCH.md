# Phase 9: Cal.com Integration - Research

**Researched:** 2026-03-25
**Domain:** Webhook integration, event-driven data sync, Cal.com platform
**Confidence:** HIGH

## Summary

This phase wires Cal.com webhook events into the existing appointment system. The codebase is already well-prepared: the appointment schema has all four `cal` fields pre-defined (calBookingUid unique, calEventTypeId, calStatus, calMeetingUrl), the source field defaults to 'website', and a battle-tested Stripe webhook pattern exists at `src/app/api/webhooks/stripe/route.ts` to follow. The Cal.com embed is live on `/booking` using `@calcom/embed-react` v1.5.3.

The core technical work is: (1) a single webhook route handler with HMAC-SHA256 verification, (2) customer email matching with auto-create fallback, (3) idempotent appointment upsert using the existing calBookingUid unique constraint, and (4) minor admin UI additions (source badge + filter). The portal requires zero changes because `getPortalAppointments()` already queries by customerId.

**Primary recommendation:** Follow the Stripe webhook pattern exactly -- raw body via `request.text()`, signature verification, event type switch, isolated handler functions. Use Drizzle `onConflictDoUpdate` on calBookingUid for idempotency without a separate event tracking table.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single webhook route at `/api/webhooks/cal/route.ts` following the established Stripe webhook pattern (raw body -> signature verification -> event switch -> handler functions)
- **D-02:** Cal.com uses HMAC-SHA256 signing with a shared secret. Verify using `crypto.timingSafeEqual` on the `X-Cal-Signature-256` header. New env var: `CAL_WEBHOOK_SECRET`
- **D-03:** Idempotency via the existing `calBookingUid` unique constraint on the appointment table. Use upsert (insert...onConflictDoUpdate) -- no separate event tracking table needed since Cal.com booking UIDs are naturally unique
- **D-04:** On BOOKING_CREATED, match the booker's email to `customer.email`. If found, link the appointment to that customer. If not found, create a minimal customer record with firstName, lastName, email, and phone from the Cal.com payload
- **D-05:** Auto-created customers get `source: 'cal.com'` in notes field to distinguish them from manually-entered customers. No special flag column needed
- **D-06:** Map Cal.com event types to AppointmentType enum via a settings key (`cal_event_type_map`) stored in the settings table. Format: JSON object `{ "calEventTypeId": "APPOINTMENT_TYPE" }`. Fallback to `CONSULTATION` when no mapping exists
- **D-07:** New appointments from Cal.com set `source: 'cal.com'` (the appointment.source field already exists with default 'website')
- **D-08:** Populate all 4 cal fields: calBookingUid, calEventTypeId, calStatus ('CONFIRMED'), calMeetingUrl
- **D-09:** Set appointment status to CONFIRMED (not PENDING) since Cal.com bookings are already confirmed by the platform
- **D-10:** BOOKING_RESCHEDULED updates scheduledDate from the new startTime, sets calStatus to 'RESCHEDULED', and keeps appointment status as CONFIRMED
- **D-11:** BOOKING_CANCELLED sets calStatus to 'CANCELLED' and appointment status to CANCELLED
- **D-12:** Add a "Cal.com" badge (small icon or label) next to appointments where source === 'cal.com' in the appointment list
- **D-13:** Add source filter option to the appointment list (All / Manual / Cal.com)
- **D-14:** No portal changes needed -- `getPortalAppointments()` already queries by customerId. As long as customer matching works (D-04), Cal.com appointments will appear automatically in the portal

### Claude's Discretion
- Webhook payload parsing structure and TypeScript types -- follow Cal.com v2 webhook payload format
- Error handling and logging approach within webhook handlers
- Whether to add audit log entries for Cal.com-triggered appointment changes

### Deferred Ideas (OUT OF SCOPE)
- **Cal.com API reads** -- Using CAL_API_KEY to fetch event types, availability, or existing bookings
- **Appointment reminders** -- Cal.com handles its own reminders
- **Artist assignment from Cal.com** -- Mapping Cal.com team members to tattooArtist records
- **Two-way sync** -- Pushing appointment changes from admin back to Cal.com via API
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-01 | Webhook handler receives Cal.com booking events (BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED) and processes them idempotently | Stripe webhook pattern provides exact template; calBookingUid unique constraint enables upsert idempotency |
| CAL-02 | Incoming bookings auto-create appointment records with cal fields populated (calBookingUid, calEventTypeId, calStatus, calMeetingUrl) | Schema already has all 4 cal fields on appointment table (lines 155-158); Cal.com payload provides uid, eventTypeId, metadata.videoCallUrl |
| CAL-03 | Customer matching -- incoming bookings match to existing customers by email, or create a new customer record if none exists | customer_email_idx index exists; email field on customer table is unique; Drizzle query pattern for findFirst by email |
| CAL-04 | Booking status sync -- rescheduling updates scheduledDate + calStatus, cancellation sets appointment status to CANCELLED | BOOKING_RESCHEDULED payload includes new startTime and rescheduleUid for lookup; BOOKING_CANCELLED includes uid |
| CAL-05 | Admin dashboard displays Cal.com booking source and live status alongside manually-created appointments | appointment-list-client.tsx already has status filter infrastructure; source field exists on appointment; StatusBadge component pattern for new badge |
| CAL-06 | Client portal displays Cal.com-synced appointments automatically without manual admin entry | getPortalAppointments() queries by customerId with no source filtering -- already works if customer matching (CAL-03) succeeds |
| CAL-07 | Webhook signature verification using Cal.com signing secret for security | Cal.com sends HMAC-SHA256 in X-Cal-Signature-256 header; crypto.timingSafeEqual for constant-time comparison; raw body via request.text() |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.0 | Route handler for webhook endpoint | Already in use; App Router `request.text()` for raw body |
| Drizzle ORM | 0.45.1 | Database operations, upsert | Already in use; `onConflictDoUpdate` for idempotency |
| Zod | 4.x | Webhook payload validation | Already in use for all input validation |
| Node.js crypto | built-in | HMAC-SHA256 signature verification | Standard library, no additional dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | installed | Calendar icon for Cal.com source badge | Admin appointment list UI |
| date-fns | installed | Date parsing/formatting | Converting Cal.com ISO timestamps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw crypto HMAC | svix (installed in node_modules) | svix adds unnecessary abstraction; crypto.createHmac is simpler and matches the Stripe webhook pattern already in the codebase |
| Separate event tracking table | calBookingUid unique constraint | Cal.com UIDs are naturally unique per booking; adding a table like stripeEvent would be over-engineering |

**Installation:**
```bash
# No new packages needed -- all dependencies are already installed
```

**Version verification:** All packages already installed and verified from Phase 8 build.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/webhooks/cal/
│   └── route.ts              # Webhook endpoint (mirrors stripe/route.ts)
├── lib/
│   ├── cal/
│   │   ├── types.ts           # Cal.com webhook payload TypeScript types
│   │   └── verify.ts          # HMAC-SHA256 signature verification
│   ├── dal/
│   │   └── appointments.ts    # Add webhook-context functions (no auth guard)
│   ├── env.ts                 # Add CAL_WEBHOOK_SECRET
│   └── security/
│       └── validation.ts      # Add Cal.com payload Zod schema
├── app/(dashboard)/dashboard/appointments/
│   └── appointment-list-client.tsx  # Add source badge + filter
└── components/dashboard/
    └── source-badge.tsx       # Cal.com source indicator component
```

### Pattern 1: Webhook Route Handler (follows Stripe pattern)
**What:** Single POST handler with raw body capture, signature verification, event switch, isolated handler functions
**When to use:** All inbound webhooks
**Example:**
```typescript
// Source: Existing pattern from src/app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();  // Raw body for signature
  const signature = request.headers.get('x-cal-signature-256');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  if (!verifyCalSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body) as CalWebhookEvent;

  switch (event.triggerEvent) {
    case 'BOOKING_CREATED':
      await handleBookingCreated(event.payload);
      break;
    case 'BOOKING_RESCHEDULED':
      await handleBookingRescheduled(event.payload);
      break;
    case 'BOOKING_CANCELLED':
      await handleBookingCancelled(event.payload);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Pattern 2: HMAC-SHA256 Signature Verification
**What:** Constant-time comparison of computed vs received signature
**When to use:** Every webhook request before processing
**Example:**
```typescript
// Source: Cal.com docs + Node.js crypto best practices
import crypto from 'crypto';

export function verifyCalSignature(body: string, signature: string): boolean {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return false;

  const computed = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;  // Different lengths = invalid
  }
}
```

### Pattern 3: Idempotent Upsert via calBookingUid
**What:** Insert appointment with onConflictDoUpdate on calBookingUid unique constraint
**When to use:** BOOKING_CREATED handler
**Example:**
```typescript
// Source: Drizzle ORM onConflictDoUpdate pattern
const [appointment] = await db.insert(schema.appointment)
  .values({
    customerId: customer.id,
    scheduledDate: new Date(payload.startTime),
    duration: payload.length,
    status: 'CONFIRMED',
    type: mappedType,
    calBookingUid: payload.uid,
    calEventTypeId: payload.eventTypeId,
    calStatus: 'CONFIRMED',
    calMeetingUrl: payload.metadata?.videoCallUrl ?? null,
    firstName: attendee.name.split(' ')[0] ?? '',
    lastName: attendee.name.split(' ').slice(1).join(' ') ?? '',
    email: attendee.email,
    phone: payload.responses?.phone?.value ?? null,
    source: 'cal.com',
  })
  .onConflictDoUpdate({
    target: schema.appointment.calBookingUid,
    set: {
      scheduledDate: new Date(payload.startTime),
      calStatus: 'CONFIRMED',
      calMeetingUrl: payload.metadata?.videoCallUrl ?? null,
    },
  })
  .returning();
```

### Pattern 4: Customer Email Matching (no auth guard)
**What:** Direct db query to find customer by email, bypassing DAL auth guards (webhook has no session)
**When to use:** Webhook handlers that need customer lookup
**Example:**
```typescript
// Source: Established pattern -- webhook handlers call db directly
const existingCustomer = await db.query.customer.findFirst({
  where: eq(schema.customer.email, attendeeEmail),
});

if (existingCustomer) {
  return existingCustomer;
}

// Auto-create minimal customer
const [newCustomer] = await db.insert(schema.customer)
  .values({
    firstName,
    lastName,
    email: attendeeEmail,
    phone: phone ?? null,
    notes: 'source: cal.com',  // D-05
  })
  .returning();
return newCustomer;
```

### Pattern 5: Settings-based Event Type Mapping
**What:** Look up cal_event_type_map from settings table to map Cal.com eventTypeId to AppointmentType enum
**When to use:** When creating appointments from Cal.com bookings
**Example:**
```typescript
// Read mapping from settings (no auth guard -- webhook context)
const setting = await db.query.settings.findFirst({
  where: eq(schema.settings.key, 'cal_event_type_map'),
});

const mapping = (setting?.value as Record<string, string>) ?? {};
const appointmentType = mapping[String(payload.eventTypeId)] ?? 'CONSULTATION';
```

### Anti-Patterns to Avoid
- **Parsing JSON before signature verification:** Always verify the raw body string first, then parse. Cal.com computes HMAC on the exact bytes sent -- any re-serialization (JSON.parse then JSON.stringify) can change whitespace/ordering and break verification.
- **Using DAL auth-guarded functions in webhooks:** Webhook handlers have no user session. Call db directly (same pattern as Stripe webhook).
- **Simple string comparison for signatures:** Never use `===` for HMAC comparison -- use `crypto.timingSafeEqual` to prevent timing attacks.
- **Trusting Cal.com event type names as strings:** Map eventTypeId (integer) to AppointmentType enum via settings, not by parsing the event type title string.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC verification | Custom hash comparison | `crypto.createHmac` + `timingSafeEqual` | Timing attacks, encoding edge cases |
| Idempotency tracking | Custom event log table | Drizzle `onConflictDoUpdate` on calBookingUid | Unique constraint already exists; atomic operation |
| Webhook retry handling | Custom retry logic | Return 200 for processed, 500 for errors | Cal.com handles retries; just return correct status codes |
| Event type mapping | Hardcoded if/else | Settings table key-value store | Already exists via `getSettingByKey`; admin can update without code deploy |

**Key insight:** The codebase already has every building block -- the Stripe webhook is the exact same architectural pattern, the schema has all cal fields, and the DAL has the settings KV store. This phase is wiring, not building.

## Common Pitfalls

### Pitfall 1: Raw Body vs Parsed Body for Signature Verification
**What goes wrong:** `request.json()` consumes the stream and parses JSON. Re-serializing with `JSON.stringify()` may produce different byte sequences (key order, whitespace) than what Cal.com signed.
**Why it happens:** Next.js App Router uses Web Request API where the body is a stream consumed once.
**How to avoid:** Always use `const body = await request.text()` first (raw string), verify signature against that string, then `JSON.parse(body)` for processing.
**Warning signs:** Signature verification passes locally (where payload is simple) but fails in production (where payload has nested objects with different serialization).

### Pitfall 2: BOOKING_RESCHEDULED Creates New UID
**What goes wrong:** Cal.com rescheduling generates a NEW `uid` and `bookingId`. The old booking UID is in `rescheduleUid`. If you look up by `payload.uid` you won't find the existing appointment.
**Why it happens:** Cal.com treats reschedules as new bookings that reference the old one.
**How to avoid:** For BOOKING_RESCHEDULED, look up the existing appointment using `payload.rescheduleUid` (the old UID), then update it. Also update the calBookingUid to the new `payload.uid`.
**Warning signs:** Rescheduled bookings create duplicate appointment rows instead of updating existing ones.

### Pitfall 3: Customer Email Can Be Null or Different Format
**What goes wrong:** Cal.com attendee emails might have different casing than what's stored in the customer table. Email matching fails, creating duplicate customers.
**Why it happens:** Email is case-insensitive by convention but stored as-is in the database.
**How to avoid:** Use case-insensitive comparison: `ilike(schema.customer.email, attendeeEmail)` or normalize to lowercase before comparison.
**Warning signs:** Same person has multiple customer records with emails like "John@example.com" and "john@example.com".

### Pitfall 4: Cal.com Sends Webhook Before Video URL is Ready
**What goes wrong:** The `metadata.videoCallUrl` field may be null or contain a placeholder like `"integrations:daily"` instead of an actual meeting URL.
**Why it happens:** Video conferencing integrations may initialize asynchronously after the booking is confirmed.
**How to avoid:** Treat calMeetingUrl as nullable. Don't fail if it's missing or contains a non-URL string. It may be populated by a subsequent webhook if Cal.com retries.
**Warning signs:** calMeetingUrl stored as `"integrations:daily"` instead of a real URL.

### Pitfall 5: Attendee Name Parsing
**What goes wrong:** Cal.com sends attendee names as a single `name` string. Splitting on space to get firstName/lastName fails for names like "Mary Jane Watson" or single-name entries.
**Why it happens:** Cal.com collects names as a single field; the appointment table requires separate firstName/lastName.
**How to avoid:** Split on first space: first token is firstName, remainder is lastName. If only one token, use it as firstName with empty lastName. If `responses.name` has `firstName` and `lastName` sub-fields, prefer those.
**Warning signs:** Customer "Mary Jane Watson" stored as firstName="Mary" lastName="Jane Watson" -- acceptable, but be consistent.

### Pitfall 6: Settings DAL Has Auth Guard
**What goes wrong:** `getSettingByKey()` calls `requireStaffRole()` -- cannot be called from webhook handler (no session).
**Why it happens:** All existing DAL functions enforce auth.
**How to avoid:** Query the settings table directly in the webhook handler: `db.query.settings.findFirst({ where: eq(schema.settings.key, 'cal_event_type_map') })`.
**Warning signs:** Webhook handler throws "Insufficient permissions" or redirects to /login.

## Code Examples

Verified patterns from the existing codebase:

### Cal.com Webhook Payload Type Definition
```typescript
// Source: Cal.com official docs + GitHub source (sendPayload.ts)
interface CalWebhookEvent {
  triggerEvent: 'BOOKING_CREATED' | 'BOOKING_RESCHEDULED' | 'BOOKING_CANCELLED';
  createdAt: string;  // ISO 8601
  payload: CalBookingPayload;
}

interface CalBookingPayload {
  uid: string;              // Booking UID (unique per booking)
  bookingId: number;        // Numeric booking ID
  title: string;            // Event type title
  type: string;             // Event type slug
  status: string;           // 'ACCEPTED' | 'CANCELLED' | etc.
  eventTypeId: number;      // Cal.com event type ID
  startTime: string;        // ISO 8601
  endTime: string;          // ISO 8601
  length: number;           // Duration in minutes
  description: string | null;
  location: string | null;
  organizer: {
    id: number;
    name: string;
    email: string;
    username: string;
    timeZone: string;
    language: { locale: string };
    timeFormat: string;
    utcOffset: number;
  };
  attendees: Array<{
    name: string;
    email: string;
    timeZone: string;
    language: { locale: string };
  }>;
  responses: {
    name?: { value: string } | string;
    email?: { value: string } | string;
    phone?: { value: string };
    notes?: { value: string };
    guests?: { value: string[] };
    rescheduleReason?: { value: string };
    location?: { value: string; optionValue: string };
  };
  metadata: Record<string, unknown> & {
    videoCallUrl?: string;
  };
  // Rescheduling fields (BOOKING_RESCHEDULED only)
  rescheduleUid?: string;     // OLD booking UID
  rescheduleId?: number;      // OLD booking ID
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  // Cancellation fields (BOOKING_CANCELLED only)
  cancellationReason?: string;
}
```

### Env Schema Extension
```typescript
// Source: src/lib/env.ts -- add CAL_WEBHOOK_SECRET
const envSchema = z.object({
  // ... existing fields ...
  CAL_WEBHOOK_SECRET: z.string().min(1),
});
```

### Source Badge Component
```typescript
// Source: Follows StatusBadge pattern from src/components/dashboard/status-badge.tsx
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SourceBadge({ source, className }: { source: string; className?: string }) {
  if (source !== 'cal.com') return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800',
      className
    )}>
      <Calendar className="h-3 w-3" />
      Cal.com
    </span>
  );
}
```

### BOOKING_RESCHEDULED Handler (critical: use rescheduleUid)
```typescript
async function handleBookingRescheduled(payload: CalBookingPayload) {
  // CRITICAL: Look up by rescheduleUid (old UID), not payload.uid (new UID)
  const [updated] = await db.update(schema.appointment)
    .set({
      scheduledDate: new Date(payload.startTime),
      calBookingUid: payload.uid,  // Update to new UID
      calStatus: 'RESCHEDULED',
      calMeetingUrl: payload.metadata?.videoCallUrl ?? null,
      duration: payload.length,
    })
    .where(eq(schema.appointment.calBookingUid, payload.rescheduleUid!))
    .returning();

  if (!updated) {
    console.error(`Reschedule: no appointment found for calBookingUid=${payload.rescheduleUid}`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cal-signature` header | `X-Cal-Signature-256` header | Cal.com v2 | Use lowercase `x-cal-signature-256` in request.headers.get() |
| Custom payload templates | Default JSON payload | Cal.com v2 | Don't set custom template; use default full payload |
| Webhook v1 (no version header) | `x-cal-webhook-version` header | Cal.com v2 | Version header is informational; process based on triggerEvent field |

**Deprecated/outdated:**
- The `cal-signature` header name appears in some older integration guides but current Cal.com documentation uses `X-Cal-Signature-256`. Use the latter.

## Open Questions

1. **Exact Cal.com payload field for meeting URL**
   - What we know: Official docs reference `metadata.videoCallUrl` and `videoCallData.url` as possible locations
   - What's unclear: Which field is populated depends on the conferencing integration (Cal Video, Google Meet, Zoom)
   - Recommendation: Check both `payload.metadata?.videoCallUrl` and `payload.videoCallData?.url`; use whichever is a valid URL. This is LOW risk since calMeetingUrl is nullable.

2. **Cal.com responses field structure variability**
   - What we know: The `responses` field can contain values as either `{ value: string }` objects or plain strings depending on Cal.com version and custom question configuration
   - What's unclear: Whether hosted Cal.com consistently uses one format
   - Recommendation: Handle both formats: `typeof responses.name === 'string' ? responses.name : responses.name?.value`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAL-01 | Webhook receives 3 event types, processes idempotently | unit | `npx vitest run src/__tests__/cal-webhook.test.ts -x` | Wave 0 |
| CAL-02 | Appointment created with all 4 cal fields | unit | `npx vitest run src/__tests__/cal-webhook.test.ts -x` | Wave 0 |
| CAL-03 | Customer matched by email or auto-created | unit | `npx vitest run src/__tests__/cal-webhook.test.ts -x` | Wave 0 |
| CAL-04 | Reschedule updates date+status, cancel sets CANCELLED | unit | `npx vitest run src/__tests__/cal-webhook.test.ts -x` | Wave 0 |
| CAL-05 | Admin UI shows source badge and filter | manual-only | Visual inspection | N/A |
| CAL-06 | Portal shows Cal.com appointments via customerId | unit | `npx vitest run src/__tests__/cal-webhook.test.ts -x` | Wave 0 |
| CAL-07 | Signature verification rejects invalid/missing signatures | unit | `npx vitest run src/__tests__/cal-webhook.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/cal-webhook.test.ts` -- covers CAL-01 through CAL-04, CAL-06, CAL-07 (signature verification, event handling, customer matching, idempotency)

*(CAL-05 is visual/UI only -- verified by manual inspection)*

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2
- **ORM:** Drizzle ORM 0.45.1 with single neon-serverless driver
- **Auth:** Better Auth with 5-tier RBAC (USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN)
- **Schema location:** `src/lib/db/schema.ts`
- **Import patterns:** `db` from `@/lib/db`, `schema` from `@/lib/db/schema`
- **Route groups:** (public), (auth), (dashboard), (portal), (store)
- **Mutations:** Server Actions for mutations, Route Handlers for webhooks only
- **Drizzle patterns:** Relational API for reads, SQL builder for aggregations, `mode:'number'` for decimals, explicit `.returning()` for mutations
- **Supabase Auth:** NOT used in this project (Better Auth instead), but global CLAUDE.md `getAll`/`setAll` cookie rule is not applicable here

## Sources

### Primary (HIGH confidence)
- `src/app/api/webhooks/stripe/route.ts` -- Verified Stripe webhook pattern used as template
- `src/lib/db/schema.ts` lines 147-179 -- Appointment table with cal fields confirmed
- `src/lib/dal/appointments.ts` -- Existing DAL pattern with requireStaffRole
- `src/lib/dal/portal.ts` -- getPortalAppointments queries by customerId only
- `src/lib/env.ts` -- Env schema with existing CAL_API_KEY, needs CAL_WEBHOOK_SECRET
- [Cal.com Official Docs - Webhooks](https://cal.com/docs/developing/guides/automation/webhooks) -- Event types, payload structure, signing

### Secondary (MEDIUM confidence)
- [Cal.com GitHub - sendPayload.ts](https://github.com/calcom/cal.com/blob/main/packages/features/webhooks/lib/sendPayload.ts) -- Exact HMAC implementation confirmed (createHmac sha256, hex digest)
- [Cal.com Help - Webhooks](https://cal.com/help/webhooks) -- X-Cal-Signature-256 header name confirmed
- [Cal.com GitHub Issue #10631](https://github.com/calcom/cal.com/issues/10631) -- BOOKING_RESCHEDULED rescheduleUid behavior confirmed
- [Cal.com GitHub Issue #11849](https://github.com/calcom/cal.com/issues/11849) -- BOOKING_CANCELLED payload field availability confirmed

### Tertiary (LOW confidence)
- Cal.com `responses` field format variability -- based on multiple GitHub issues reporting inconsistent payload shapes; handle defensively

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies already installed, no new packages
- Architecture: HIGH - exact webhook pattern already proven in codebase (Stripe)
- Pitfalls: HIGH - verified via Cal.com GitHub issues and official docs (rescheduleUid behavior, raw body requirement)
- Payload types: MEDIUM - Cal.com documentation lacks formal TypeScript types; assembled from docs + source code + issues

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (Cal.com webhook API is stable; payload format unlikely to change within 30 days)
