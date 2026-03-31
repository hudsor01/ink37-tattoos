import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { sendBalanceDueReminder } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/balance-due
 *
 * n8n-callable endpoint (D-02, BIZ-01). Scans for tattoo sessions with
 * outstanding balances and sends reminder emails via Resend.
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

  // Per research pitfall 4: Calculate true balance from payment table SUM,
  // NOT from session.paidAmount. Use Drizzle SQL builder for aggregation
  // (relational API does not support aggregations per CLAUDE.md).
  const sessionsWithBalance = await db.execute<{
    id: string;
    totalCost: number;
    designDescription: string;
    customerId: string;
    customerEmail: string | null;
    customerFirstName: string;
    customerLastName: string;
    total_paid: number;
  }>(sql`
    SELECT
      ts.id,
      ts."totalCost"::numeric as "totalCost",
      ts."designDescription" as "designDescription",
      ts."customerId" as "customerId",
      c.email as "customerEmail",
      c."firstName" as "customerFirstName",
      c."lastName" as "customerLastName",
      COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0)::numeric as total_paid
    FROM ${schema.tattooSession} ts
    LEFT JOIN ${schema.payment} p ON p."tattooSessionId" = ts.id
    JOIN ${schema.customer} c ON c.id = ts."customerId"
    WHERE ts.status = 'SCHEDULED'
    GROUP BY ts.id, c.email, c."firstName", c."lastName"
    HAVING ts."totalCost" > COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0)
  `);

  let processed = 0;
  let sent = 0;
  let errors = 0;

  for (const row of sessionsWithBalance.rows) {
    processed++;

    // Skip sessions where customer has no email
    if (!row.customerEmail) {
      errors++;
      logger.warn({ sessionId: row.id }, 'Balance-due: customer has no email');
      continue;
    }

    try {
      const totalCost = Number(row.totalCost);
      const totalPaid = Number(row.total_paid);
      const remainingBalance = totalCost - totalPaid;

      const result = await sendBalanceDueReminder({
        to: row.customerEmail,
        customerName: `${row.customerFirstName} ${row.customerLastName}`,
        designDescription: row.designDescription,
        totalCost,
        paidAmount: totalPaid,
        remainingBalance,
      });

      if (result.sent) {
        sent++;
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      logger.error({ err, sessionId: row.id }, 'Balance-due reminder failed');
    }
  }

  return NextResponse.json({ processed, sent, errors });
}
