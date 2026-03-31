import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { format } from 'date-fns';
import { sendNoShowFollowUp } from '@/lib/email/resend';
import { createNotificationForAdmins } from '@/lib/dal/notifications';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/no-show-followup
 *
 * n8n-callable endpoint (D-07, BIZ-04). Scans for appointments marked NO_SHOW
 * within the last 48 hours and sends follow-up emails via Resend.
 *
 * The 48-hour window is critical: without it, every historical no-show
 * gets re-emailed on each cron run.
 *
 * Per D-06: Cal.com handles 24h/48h BOOKING reminders natively.
 * This route ONLY handles no-show follow-up for missed appointments.
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 * Returns: { processed, sent, errors }
 */
export async function POST(request: Request) {
  // Verify CRON_SECRET is configured
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  // Verify Bearer auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 48-hour window: only process no-shows from the last 48 hours
  // This prevents re-emailing all historical no-shows on each cron run
  const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Query appointments with status NO_SHOW within the 48-hour window
  // Join with customer table for email
  const noShowAppointments = await db.select({
    id: schema.appointment.id,
    scheduledDate: schema.appointment.scheduledDate,
    type: schema.appointment.type,
    firstName: schema.appointment.firstName,
    lastName: schema.appointment.lastName,
    email: schema.appointment.email,
  })
    .from(schema.appointment)
    .where(
      and(
        eq(schema.appointment.status, 'NO_SHOW'),
        gte(schema.appointment.scheduledDate, cutoffDate),
      )
    );

  let processed = 0;
  let sent = 0;
  let errors = 0;

  for (const appt of noShowAppointments) {
    processed++;

    try {
      const formattedDate = format(appt.scheduledDate, 'MMMM d, yyyy');

      const result = await sendNoShowFollowUp({
        to: appt.email,
        customerName: `${appt.firstName} ${appt.lastName}`,
        appointmentDate: formattedDate,
        appointmentType: appt.type,
      });

      if (result.sent) {
        sent++;

        // Create admin notification for each no-show follow-up sent
        try {
          await createNotificationForAdmins({
            type: 'BOOKING',
            title: 'No-show follow-up sent',
            message: `Follow-up email sent to ${appt.firstName} ${appt.lastName} (${appt.email}) for missed ${appt.type} on ${formattedDate}`,
          });
        } catch (notifErr) {
          // Don't fail the cron job if notification creation fails
          logger.error({ err: notifErr, appointmentId: appt.id }, 'No-show notification creation failed');
        }
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      logger.error({ err, appointmentId: appt.id }, 'No-show follow-up failed');
    }
  }

  return NextResponse.json({ processed, sent, errors });
}
