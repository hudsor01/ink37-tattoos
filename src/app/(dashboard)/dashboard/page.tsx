import { connection } from 'next/server';
import { Suspense } from 'react';
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

async function DashboardData({ from, to }: { from: Date; to: Date }) {
  await connection();

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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-skeleton animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const now = new Date();
  const from = params.from ? startOfDay(new Date(params.from)) : startOfDay(subDays(now, 30));
  const to = params.to ? endOfDay(new Date(params.to)) : endOfDay(now);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData from={from} to={to} />
    </Suspense>
  );
}
