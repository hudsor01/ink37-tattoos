import { connection } from 'next/server';
import type { Metadata } from 'next';
import {
  getRevenueData,
  getRevenueByDateRange,
  getPaymentMethodBreakdown,
  getBookingTrends,
  getDashboardStats,
} from '@/lib/dal/analytics';
import { ReportsClient } from './reports-client';

export const metadata: Metadata = {
  title: 'Financial Reports | Ink 37 Admin',
};

interface ReportsPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await connection();
  const params = await searchParams;
  const hasDateRange = params.from && params.to;

  const [revenueData, paymentBreakdown, bookingTrends, stats] = await Promise.all([
    hasDateRange
      ? getRevenueByDateRange(new Date(params.from!), new Date(params.to!))
      : getRevenueData(12),
    getPaymentMethodBreakdown(),
    getBookingTrends(6),
    getDashboardStats(),
  ]);

  return (
    <ReportsClient
      revenueData={revenueData}
      paymentBreakdown={paymentBreakdown}
      bookingTrends={bookingTrends}
      stats={stats}
    />
  );
}
