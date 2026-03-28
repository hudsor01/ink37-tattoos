import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, desc, count, sum, sql } from 'drizzle-orm';
import { customer, appointment, tattooSession } from '@/lib/db/schema';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

// Prepared statements for hot-path dashboard count queries
const customerCountStmt = db.select({ count: count() }).from(customer).prepare('customer_count');
const appointmentCountStmt = db.select({ count: count() }).from(appointment).prepare('appointment_count');
const completedSessionCountStmt = db.select({ count: count() })
  .from(tattooSession)
  .where(eq(tattooSession.status, 'COMPLETED'))
  .prepare('completed_session_count');
const revenueStmt = db.select({ total: sum(tattooSession.totalCost) })
  .from(tattooSession)
  .where(eq(tattooSession.status, 'COMPLETED'))
  .prepare('total_revenue');

export const getDashboardStats = cache(async () => {
  await requireStaffRole();

  const [totalCustomersResult, totalAppointmentsResult, completedSessionsResult, revenueResult, recentAppointments] =
    await Promise.all([
      customerCountStmt.execute(),
      appointmentCountStmt.execute(),
      completedSessionCountStmt.execute(),
      revenueStmt.execute(),
      db.query.appointment.findMany({
        orderBy: [desc(appointment.scheduledDate)],
        limit: 5,
        with: {
          customer: { columns: { firstName: true, lastName: true } },
        },
      }),
    ]);

  return {
    totalCustomers: totalCustomersResult[0]?.count ?? 0,
    totalAppointments: totalAppointmentsResult[0]?.count ?? 0,
    completedSessions: completedSessionsResult[0]?.count ?? 0,
    totalRevenue: Number(revenueResult[0]?.total ?? 0),
    recentAppointments,
  };
});

export const getRevenueData = cache(async (months: number = 12) => {
  await requireStaffRole();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const rows = await db.execute<{
    month: string;
    revenue: number;
    count: number;
  }>(sql`
    SELECT
      to_char(date_trunc('month', "appointmentDate"), 'YYYY-MM') as month,
      coalesce(sum("totalCost"), 0)::numeric as revenue,
      cast(count(*) as integer) as count
    FROM "tattoo_session"
    WHERE "status" = 'COMPLETED'
      AND "appointmentDate" >= ${startDate}
    GROUP BY date_trunc('month', "appointmentDate")
    ORDER BY date_trunc('month', "appointmentDate")
  `);

  return rows.rows.map((row) => ({
    month: row.month,
    revenue: Number(row.revenue),
    count: Number(row.count),
  }));
});

export const getClientAcquisitionData = cache(async (months: number = 12) => {
  await requireStaffRole();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const rows = await db.execute<{
    month: string;
    count: number;
  }>(sql`
    SELECT
      to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
      cast(count(*) as integer) as count
    FROM "customer"
    WHERE "createdAt" >= ${startDate}
    GROUP BY date_trunc('month', "createdAt")
    ORDER BY date_trunc('month', "createdAt")
  `);

  return rows.rows.map((row) => ({
    month: row.month,
    count: Number(row.count),
  }));
});

export const getAppointmentTypeBreakdown = cache(async () => {
  await requireStaffRole();

  const breakdown = await db.select({
    type: appointment.type,
    count: count(),
  })
    .from(appointment)
    .groupBy(appointment.type);

  return breakdown.map((item) => ({
    type: item.type,
    count: item.count,
  }));
});

export const getBookingTrends = cache(async (months: number = 6) => {
  await requireStaffRole();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const endDate = new Date();

  const rows = await db.execute<{
    week: string;
    bookings: number;
    cancellations: number;
  }>(sql`
    SELECT
      to_char(date_trunc('week', "scheduledDate"), 'YYYY-MM-DD') as week,
      cast(count(*) filter (where "status" NOT IN ('CANCELLED', 'NO_SHOW')) as integer) as bookings,
      cast(count(*) filter (where "status" IN ('CANCELLED', 'NO_SHOW')) as integer) as cancellations
    FROM "appointment"
    WHERE "scheduledDate" BETWEEN ${startDate} AND ${endDate}
    GROUP BY date_trunc('week', "scheduledDate")
    ORDER BY date_trunc('week', "scheduledDate")
  `);

  return rows.rows.map((row) => ({
    week: row.week,
    bookings: Number(row.bookings),
    cancellations: Number(row.cancellations),
  }));
});
