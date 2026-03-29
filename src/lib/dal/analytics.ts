import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, gte, lte, and, between, sql, desc, asc, count, sum } from 'drizzle-orm';
import { startOfWeek, format } from 'date-fns';
import { customer, appointment, tattooSession, payment } from '@/lib/db/schema';

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

  const sessions = await db.select({
    appointmentDate: tattooSession.appointmentDate,
    totalCost: tattooSession.totalCost,
  })
    .from(tattooSession)
    .where(
      and(
        eq(tattooSession.status, 'COMPLETED'),
        gte(tattooSession.appointmentDate, startDate),
      )
    )
    .orderBy(asc(tattooSession.appointmentDate));

  const monthlyData = new Map<string, { revenue: number; count: number }>();

  for (const session of sessions) {
    const monthKey = `${session.appointmentDate.getFullYear()}-${String(session.appointmentDate.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyData.get(monthKey) ?? { revenue: 0, count: 0 };
    existing.revenue += Number(session.totalCost);
    existing.count += 1;
    monthlyData.set(monthKey, existing);
  }

  return Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    count: data.count,
  }));
});

export const getClientAcquisitionData = cache(async (months: number = 12) => {
  await requireStaffRole();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const customers = await db.select({
    createdAt: customer.createdAt,
  })
    .from(customer)
    .where(gte(customer.createdAt, startDate))
    .orderBy(asc(customer.createdAt));

  const monthlyData = new Map<string, number>();

  for (const c of customers) {
    const monthKey = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(monthKey, (monthlyData.get(monthKey) ?? 0) + 1);
  }

  return Array.from(monthlyData.entries()).map(([month, count]) => ({
    month,
    count,
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

  const appointments = await db.select({
    scheduledDate: appointment.scheduledDate,
    status: appointment.status,
  })
    .from(appointment)
    .where(between(appointment.scheduledDate, startDate, endDate))
    .orderBy(asc(appointment.scheduledDate));

  const weeklyData = new Map<string, { bookings: number; cancellations: number }>();

  for (const apt of appointments) {
    const weekKey = format(startOfWeek(apt.scheduledDate, { weekStartsOn: 1 }), 'MMM d');
    const existing = weeklyData.get(weekKey) ?? { bookings: 0, cancellations: 0 };
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      existing.cancellations += 1;
    } else {
      existing.bookings += 1;
    }
    weeklyData.set(weekKey, existing);
  }

  return Array.from(weeklyData.entries()).map(([week, data]) => ({
    week,
    bookings: data.bookings,
    cancellations: data.cancellations,
  }));
});

export const getPaymentMethodBreakdown = cache(async (startDate?: Date, endDate?: Date) => {
  await requireStaffRole();

  const conditions = [eq(payment.status, 'COMPLETED')];
  if (startDate) conditions.push(gte(payment.createdAt, startDate));
  if (endDate) conditions.push(lte(payment.createdAt, endDate));

  const rows = await db.select({
    type: payment.type,
    total: sql<number>`coalesce(sum(${payment.amount}), 0)::numeric`,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(payment)
    .where(and(...conditions))
    .groupBy(payment.type);

  return rows.map(row => ({
    type: row.type,
    total: Number(row.total),
    count: row.count,
  }));
});

export const getRevenueByDateRange = cache(async (startDate: Date, endDate: Date) => {
  await requireStaffRole();

  const sessions = await db.select({
    appointmentDate: tattooSession.appointmentDate,
    totalCost: tattooSession.totalCost,
  })
    .from(tattooSession)
    .where(
      and(
        eq(tattooSession.status, 'COMPLETED'),
        gte(tattooSession.appointmentDate, startDate),
        lte(tattooSession.appointmentDate, endDate),
      )
    )
    .orderBy(asc(tattooSession.appointmentDate));

  const monthlyData = new Map<string, { revenue: number; count: number }>();

  for (const session of sessions) {
    const monthKey = `${session.appointmentDate.getFullYear()}-${String(session.appointmentDate.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyData.get(monthKey) ?? { revenue: 0, count: 0 };
    existing.revenue += Number(session.totalCost);
    existing.count += 1;
    monthlyData.set(monthKey, existing);
  }

  return Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    count: data.count,
  }));
});
