import { connection } from 'next/server';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import {
  getTodayAppointments,
  getThisWeekAppointments,
  getDashboardStatsWithTrend,
  getRevenueByDateRange,
} from '@/lib/dal/analytics';
import { DashboardClient } from './dashboard-client';

interface DashboardPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await connection();
  const params = await searchParams;

  const now = new Date();
  const from = params.from ? startOfDay(new Date(params.from)) : startOfDay(subDays(now, 30));
  const to = params.to ? endOfDay(new Date(params.to)) : endOfDay(now);

  const [todayAppointments, weekAppointments, stats, revenueData] = await Promise.all([
    getTodayAppointments(),
    getThisWeekAppointments(),
    getDashboardStatsWithTrend(from, to),
    getRevenueByDateRange(from, to),
  ]);

  return (
    <DashboardClient
      todayAppointments={todayAppointments}
      weekAppointments={weekAppointments}
      stats={stats}
      revenueData={revenueData}
      dateRange={{ from, to }}
    />
  );
}
