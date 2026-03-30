import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, gte, lte, and, between, sql, desc, asc, count, sum } from 'drizzle-orm';
import { startOfWeek, format, eachDayOfInterval } from 'date-fns';
import { customer, appointment, tattooSession, payment, contact, settings } from '@/lib/db/schema';

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

// ============================================================================
// ANALYTICS DEPTH: Revenue (ANLYT-01)
// ============================================================================

export const getRevenueByStyle = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const rows = await db.select({
    style: tattooSession.style,
    revenue: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)::numeric`,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(tattooSession)
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ))
    .groupBy(tattooSession.style);
  return rows.map(r => ({ style: r.style, revenue: Number(r.revenue), count: Number(r.count) }));
});

export const getRevenueBySize = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const rows = await db.select({
    size: tattooSession.size,
    revenue: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)::numeric`,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(tattooSession)
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ))
    .groupBy(tattooSession.size);
  return rows.map(r => ({ size: r.size, revenue: Number(r.revenue), count: Number(r.count) }));
});

export const getPaymentRates = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const rows = await db.select({
    total: sql<number>`cast(count(*) as integer)`,
    completed: sql<number>`cast(sum(case when ${payment.status} = 'COMPLETED' then 1 else 0 end) as integer)`,
    refunded: sql<number>`cast(sum(case when ${payment.status} = 'REFUNDED' then 1 else 0 end) as integer)`,
    failed: sql<number>`cast(sum(case when ${payment.status} = 'FAILED' then 1 else 0 end) as integer)`,
  })
    .from(payment)
    .where(and(
      gte(payment.createdAt, from),
      lte(payment.createdAt, to),
    ));

  const row = rows[0] ?? { total: 0, completed: 0, refunded: 0, failed: 0 };
  const total = Number(row.total);
  if (total === 0) {
    return { total: 0, successRate: 0, refundRate: 0, failureRate: 0 };
  }
  return {
    total,
    successRate: Math.round((Number(row.completed) / total) * 100),
    refundRate: Math.round((Number(row.refunded) / total) * 100),
    failureRate: Math.round((Number(row.failed) / total) * 100),
  };
});

export const getAverageTransactionValue = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const rows = await db.select({
    avg: sql<number>`coalesce(avg(${tattooSession.totalCost}), 0)::numeric`,
  })
    .from(tattooSession)
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ));
  return Number(rows[0]?.avg ?? 0);
});

// ============================================================================
// ANALYTICS DEPTH: Booking (ANLYT-02)
// ============================================================================

export const getBookingFunnel = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  // 3 separate COUNT queries (not JOINs) per research Pitfall 3
  const [inquiriesResult, appointmentsResult, completedResult] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(contact)
      .where(and(
        gte(contact.createdAt, from),
        lte(contact.createdAt, to),
      )),
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(appointment)
      .where(and(
        gte(appointment.scheduledDate, from),
        lte(appointment.scheduledDate, to),
      )),
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tattooSession)
      .where(and(
        eq(tattooSession.status, 'COMPLETED'),
        gte(tattooSession.appointmentDate, from),
        lte(tattooSession.appointmentDate, to),
      )),
  ]);

  return [
    { stage: 'Inquiries', value: Number(inquiriesResult[0]?.count ?? 0), fill: 'hsl(220, 70%, 50%)' },
    { stage: 'Appointments', value: Number(appointmentsResult[0]?.count ?? 0), fill: 'hsl(160, 60%, 45%)' },
    { stage: 'Completed', value: Number(completedResult[0]?.count ?? 0), fill: 'hsl(30, 80%, 55%)' },
  ];
});

export const getPeakHours = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  // Define hourExpr ONCE, reuse in select AND groupBy (Pitfall 2)
  const hourExpr = sql<number>`cast(extract(hour from ${appointment.scheduledDate}) as integer)`;
  const rows = await db.select({
    hour: hourExpr,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(appointment)
    .where(and(
      gte(appointment.scheduledDate, from),
      lte(appointment.scheduledDate, to),
    ))
    .groupBy(hourExpr)
    .orderBy(asc(hourExpr));
  return rows.map(r => ({ hour: Number(r.hour), count: Number(r.count) }));
});

/**
 * Calculate available working hours in a date range based on business_hours settings.
 * Defaults to 8h/day Mon-Sat (48h/week) if no setting found.
 */
async function getAvailableHours(from: Date, to: Date): Promise<number> {
  const settingsRows = await db.select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'business_hours'));

  let hoursPerDay = 8;
  let workingDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat

  if (settingsRows.length > 0 && settingsRows[0].value) {
    try {
      const bh = settingsRows[0].value as Record<string, { open?: string; close?: string; closed?: boolean }>;
      // Calculate average hours from business_hours JSON
      const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      workingDays = [];
      let totalHours = 0;
      let dayCount = 0;
      for (const [dayName, config] of Object.entries(bh)) {
        if (config.closed) continue;
        const dayNum = dayMap[dayName.toLowerCase()];
        if (dayNum !== undefined) {
          workingDays.push(dayNum);
          const openHour = parseInt(config.open ?? '10', 10);
          const closeHour = parseInt(config.close ?? '18', 10);
          totalHours += closeHour - openHour;
          dayCount++;
        }
      }
      if (dayCount > 0) hoursPerDay = totalHours / dayCount;
    } catch {
      // Fall back to defaults
    }
  }

  const allDays = eachDayOfInterval({ start: from, end: to });
  const working = allDays.filter(d => workingDays.includes(d.getDay()));
  return working.length * hoursPerDay;
}

export const getCapacityUtilization = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const availableHours = await getAvailableHours(from, to);
  if (availableHours === 0) return 0;

  const rows = await db.select({
    bookedHours: sql<number>`coalesce(sum(${tattooSession.estimatedHours}), 0)::numeric`,
  })
    .from(tattooSession)
    .where(and(
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ));

  const booked = Number(rows[0]?.bookedHours ?? 0);
  return Math.min(Math.round((booked / availableHours) * 100), 100);
});

// ============================================================================
// ANALYTICS DEPTH: Customer (ANLYT-03)
// ============================================================================

export const getCustomerCLV = cache(async (from: Date, to: Date, limit: number = 20) => {
  await requireStaffRole();
  const rows = await db.select({
    customerId: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    clv: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)::numeric`,
    sessions: sql<number>`cast(count(*) as integer)`,
  })
    .from(tattooSession)
    .innerJoin(customer, eq(tattooSession.customerId, customer.id))
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ))
    .groupBy(customer.id, customer.firstName, customer.lastName)
    .orderBy(desc(sql`sum(${tattooSession.totalCost})`))
    .limit(limit);

  return rows.map(r => ({
    customerId: r.customerId,
    name: `${r.firstName} ${r.lastName}`,
    clv: Number(r.clv),
    sessions: Number(r.sessions),
  }));
});

export const getRepeatClientRate = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const rows = await db.select({
    totalCustomers: sql<number>`cast(count(distinct ${tattooSession.customerId}) as integer)`,
    repeatCustomers: sql<number>`cast(sum(case when session_count >= 2 then 1 else 0 end) as integer)`,
  })
    .from(
      sql`(select ${tattooSession.customerId}, count(*) as session_count from ${tattooSession} where ${tattooSession.status} = 'COMPLETED' and ${tattooSession.appointmentDate} >= ${from} and ${tattooSession.appointmentDate} <= ${to} group by ${tattooSession.customerId}) as customer_sessions`
    );

  const row = rows[0] ?? { totalCustomers: 0, repeatCustomers: 0 };
  const total = Number(row.totalCustomers);
  if (total === 0) return 0;
  return Math.round((Number(row.repeatCustomers) / total) * 100);
});

export const getChurnRiskCustomers = cache(async (thresholdDays: number = 90) => {
  await requireStaffRole();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  // Use GREATEST with MAX of multiple activity dates (Pitfall 4)
  const rows = await db.select({
    customerId: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    lastActivity: sql<Date | null>`greatest(max(${tattooSession.appointmentDate}), max(${appointment.scheduledDate}), ${customer.createdAt})`,
  })
    .from(customer)
    .leftJoin(tattooSession, eq(customer.id, tattooSession.customerId))
    .leftJoin(appointment, eq(customer.id, appointment.customerId))
    .groupBy(customer.id, customer.firstName, customer.lastName, customer.email, customer.createdAt)
    .having(sql`greatest(max(${tattooSession.appointmentDate}), max(${appointment.scheduledDate}), ${customer.createdAt}) < ${cutoff}`);

  return rows.map(r => ({
    customerId: r.customerId,
    name: `${r.firstName} ${r.lastName}`,
    email: r.email,
    lastActivity: r.lastActivity,
  }));
});

// ============================================================================
// ANALYTICS DEPTH: Operational (ANLYT-04)
// ============================================================================

export const getDurationByType = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const rows = await db.select({
    type: tattooSession.style,
    avgDuration: sql<number>`coalesce(avg(${tattooSession.estimatedHours}), 0)::numeric`,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(tattooSession)
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ))
    .groupBy(tattooSession.style);
  return rows.map(r => ({ type: r.type, avgDuration: Number(r.avgDuration), count: Number(r.count) }));
});

export const getNoShowTrends = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const rows = await db.select({
    month: sql<string>`to_char(${appointment.scheduledDate}, 'YYYY-MM')`,
    total: sql<number>`cast(count(*) as integer)`,
    noShows: sql<number>`cast(sum(case when ${appointment.status} = 'NO_SHOW' then 1 else 0 end) as integer)`,
  })
    .from(appointment)
    .where(and(
      gte(appointment.scheduledDate, from),
      lte(appointment.scheduledDate, to),
    ))
    .groupBy(sql`to_char(${appointment.scheduledDate}, 'YYYY-MM')`)
    .orderBy(asc(sql`to_char(${appointment.scheduledDate}, 'YYYY-MM')`));

  return rows.map(r => {
    const total = Number(r.total);
    const noShows = Number(r.noShows);
    return {
      month: r.month,
      total,
      noShows,
      rate: total === 0 ? 0 : Math.round((noShows / total) * 100),
    };
  });
});

export const getSchedulingEfficiency = cache(async (from: Date, to: Date) => {
  await requireStaffRole();
  const availableHours = await getAvailableHours(from, to);
  if (availableHours === 0) return 0;

  const rows = await db.select({
    bookedHours: sql<number>`coalesce(sum(${tattooSession.estimatedHours}), 0)::numeric`,
  })
    .from(tattooSession)
    .where(and(
      gte(tattooSession.appointmentDate, from),
      lte(tattooSession.appointmentDate, to),
    ));

  const booked = Number(rows[0]?.bookedHours ?? 0);
  return Math.min(Math.round((booked / availableHours) * 100), 100);
});

// ============================================================================
// ANALYTICS DEPTH: Aggregator + Interface
// ============================================================================

export interface AnalyticsDepthData {
  revenueByStyle: { style: string; revenue: number; count: number }[];
  revenueBySize: { size: string; revenue: number; count: number }[];
  paymentRates: { total: number; successRate: number; refundRate: number; failureRate: number };
  avgTransactionValue: number;
  bookingFunnel: { stage: string; value: number; fill: string }[];
  peakHours: { hour: number; count: number }[];
  capacityUtilization: number;
  customerCLV: { customerId: string; name: string; clv: number; sessions: number }[];
  repeatClientRate: number;
  churnRisk: { customerId: string; name: string; email: string | null; lastActivity: Date | null }[];
  durationByType: { type: string; avgDuration: number; count: number }[];
  noShowTrends: { month: string; total: number; noShows: number; rate: number }[];
  schedulingEfficiency: number;
}

export const getAnalyticsDepthData = cache(async (from: Date, to: Date): Promise<AnalyticsDepthData> => {
  await requireStaffRole();
  const [revenueByStyle, revenueBySize, paymentRates, avgTransactionValue,
         bookingFunnel, peakHours, capacityUtilization,
         customerCLV, repeatClientRate, churnRisk,
         durationByType, noShowTrends, schedulingEfficiency] = await Promise.all([
    getRevenueByStyle(from, to),
    getRevenueBySize(from, to),
    getPaymentRates(from, to),
    getAverageTransactionValue(from, to),
    getBookingFunnel(from, to),
    getPeakHours(from, to),
    getCapacityUtilization(from, to),
    getCustomerCLV(from, to),
    getRepeatClientRate(from, to),
    getChurnRiskCustomers(),
    getDurationByType(from, to),
    getNoShowTrends(from, to),
    getSchedulingEfficiency(from, to),
  ]);
  return { revenueByStyle, revenueBySize, paymentRates, avgTransactionValue,
           bookingFunnel, peakHours, capacityUtilization,
           customerCLV, repeatClientRate, churnRisk,
           durationByType, noShowTrends, schedulingEfficiency };
});
