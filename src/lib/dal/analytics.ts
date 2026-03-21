import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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

  const [totalCustomers, totalAppointments, completedSessions, revenueResult, recentAppointments] =
    await Promise.all([
      db.customer.count(),
      db.appointment.count(),
      db.tattooSession.count({ where: { status: 'COMPLETED' } }),
      db.tattooSession.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalCost: true },
      }),
      db.appointment.findMany({
        orderBy: { scheduledDate: 'desc' },
        take: 5,
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

  return {
    totalCustomers,
    totalAppointments,
    completedSessions,
    totalRevenue: revenueResult._sum.totalCost?.toNumber() ?? 0,
    recentAppointments,
  };
});

export const getRevenueData = cache(async (months: number = 12) => {
  await requireStaffRole();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const sessions = await db.tattooSession.findMany({
    where: {
      status: 'COMPLETED',
      appointmentDate: { gte: startDate },
    },
    select: {
      appointmentDate: true,
      totalCost: true,
    },
    orderBy: { appointmentDate: 'asc' },
  });

  const monthlyData = new Map<string, { revenue: number; count: number }>();

  for (const session of sessions) {
    const monthKey = `${session.appointmentDate.getFullYear()}-${String(session.appointmentDate.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyData.get(monthKey) ?? { revenue: 0, count: 0 };
    existing.revenue += session.totalCost.toNumber();
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

  const customers = await db.customer.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const monthlyData = new Map<string, number>();

  for (const customer of customers) {
    const monthKey = `${customer.createdAt.getFullYear()}-${String(customer.createdAt.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(monthKey, (monthlyData.get(monthKey) ?? 0) + 1);
  }

  return Array.from(monthlyData.entries()).map(([month, count]) => ({
    month,
    count,
  }));
});

export const getAppointmentTypeBreakdown = cache(async () => {
  await requireStaffRole();

  const breakdown = await db.appointment.groupBy({
    by: ['type'],
    _count: { type: true },
  });

  return breakdown.map((item) => ({
    type: item.type,
    count: item._count.type,
  }));
});
