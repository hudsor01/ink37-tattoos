import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, ilike } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { verifyCalSignature } from '@/lib/cal/verify';
import type { CalBookingPayload } from '@/lib/cal/types';
import { CalWebhookPayloadSchema } from '@/lib/security/validation';

const VALID_APPOINTMENT_TYPES = ['CONSULTATION', 'DESIGN_REVIEW', 'TATTOO_SESSION', 'TOUCH_UP', 'REMOVAL'] as const;

export async function POST(request: Request) {
  // Raw body for signature verification (never use request.json())
  const body = await request.text();
  const signature = request.headers.get('x-cal-signature-256');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!verifyCalSignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const parsed = CalWebhookPayloadSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const event = parsed.data;
  const payload = event.payload as unknown as CalBookingPayload;

  try {
    switch (event.triggerEvent) {
      case 'BOOKING_CREATED':
        await handleBookingCreated(payload);
        break;
      case 'BOOKING_RESCHEDULED':
        await handleBookingRescheduled(payload);
        break;
      case 'BOOKING_CANCELLED':
        await handleBookingCancelled(payload);
        break;
    }

    console.log(`Cal.com ${event.triggerEvent}: ${payload.uid}`);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Cal.com webhook handler error for ${event.triggerEvent}:`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

function extractMeetingUrl(payload: CalBookingPayload): string | null {
  const candidates = [
    payload.metadata?.videoCallUrl,
    payload.videoCallData?.url,
  ];
  for (const url of candidates) {
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }
  return null;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const spaceIndex = fullName.indexOf(' ');
  if (spaceIndex === -1) return { firstName: fullName, lastName: '' };
  return {
    firstName: fullName.slice(0, spaceIndex),
    lastName: fullName.slice(spaceIndex + 1),
  };
}

async function handleBookingCreated(payload: CalBookingPayload) {
  const attendee = payload.attendees[0];
  const { firstName, lastName } = parseName(attendee.name);
  const phone = typeof payload.responses?.phone === 'object' ? payload.responses.phone.value : null;

  // Case-insensitive customer email matching
  let customer = await db.query.customer.findFirst({
    where: ilike(schema.customer.email, attendee.email),
  });

  if (!customer) {
    const [newCustomer] = await db.insert(schema.customer).values({
      firstName,
      lastName,
      email: attendee.email.toLowerCase(),
      phone,
      notes: 'source: cal.com',
    }).returning();
    customer = newCustomer;
  }

  // Event type mapping from settings (query directly, not via DAL which requires auth)
  const setting = await db.query.settings.findFirst({
    where: eq(schema.settings.key, 'cal_event_type_map'),
  });
  const mapping = (setting?.value as Record<string, string>) ?? {};
  let appointmentType = mapping[String(payload.eventTypeId)] ?? 'CONSULTATION';

  // Validate appointment type
  if (!VALID_APPOINTMENT_TYPES.includes(appointmentType as typeof VALID_APPOINTMENT_TYPES[number])) {
    appointmentType = 'CONSULTATION';
  }

  const meetingUrl = extractMeetingUrl(payload);

  // Idempotent upsert on calBookingUid
  await db.insert(schema.appointment).values({
    customerId: customer.id,
    scheduledDate: new Date(payload.startTime),
    duration: payload.length,
    status: 'CONFIRMED',
    type: appointmentType as typeof schema.appointmentTypeEnum.enumValues[number],
    calBookingUid: payload.uid,
    calEventTypeId: payload.eventTypeId,
    calStatus: 'CONFIRMED',
    calMeetingUrl: meetingUrl,
    firstName,
    lastName,
    email: attendee.email,
    phone,
    source: 'cal.com',
  }).onConflictDoUpdate({
    target: schema.appointment.calBookingUid,
    set: {
      scheduledDate: new Date(payload.startTime),
      calStatus: 'CONFIRMED',
      calMeetingUrl: meetingUrl,
      duration: payload.length,
    },
  });
}

async function handleBookingRescheduled(payload: CalBookingPayload) {
  // CRITICAL: Look up by rescheduleUid (the OLD UID), not payload.uid
  if (!payload.rescheduleUid) {
    console.error('Cal.com BOOKING_RESCHEDULED missing rescheduleUid');
    return;
  }

  const meetingUrl = extractMeetingUrl(payload);

  const [updated] = await db.update(schema.appointment)
    .set({
      scheduledDate: new Date(payload.startTime),
      calBookingUid: payload.uid, // Update to new UID
      calStatus: 'RESCHEDULED',
      calMeetingUrl: meetingUrl,
      duration: payload.length,
    })
    .where(eq(schema.appointment.calBookingUid, payload.rescheduleUid))
    .returning();

  if (!updated) {
    console.error(`Cal.com reschedule: no appointment found for calBookingUid=${payload.rescheduleUid}`);
  }
}

async function handleBookingCancelled(payload: CalBookingPayload) {
  const [updated] = await db.update(schema.appointment)
    .set({
      status: 'CANCELLED',
      calStatus: 'CANCELLED',
    })
    .where(eq(schema.appointment.calBookingUid, payload.uid))
    .returning();

  if (!updated) {
    console.error(`Cal.com cancellation: no appointment found for calBookingUid=${payload.uid}`);
  }
}
