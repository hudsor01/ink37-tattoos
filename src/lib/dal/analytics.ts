import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, gte, and, sql, desc, asc } from 'drizzle-orm';
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

export const getDashboardStats = cache(async () => {
  await requireStaffRole();

  const [totalCustomersResult, totalAppointmentsResult, completedSessionsResult, revenueResult, recentAppointments] =
    await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(customer),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(appointment),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(tattooSession).where(eq(tattooSession.status, 'COMPLETED')),
      db.select({ total: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)` }).from(tattooSession).where(eq(tattooSession.status, 'COMPLETED')),
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
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(appointment)
    .groupBy(appointment.type);

  return breakdown.map((item) => ({
    type: item.type,
    count: item.count,
  }));
});
