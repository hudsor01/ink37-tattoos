import { connection } from 'next/server';
import type { Metadata } from 'next';
import {
  getRevenueData,
  getPaymentMethodBreakdown,
  getBookingTrends,
  getDashboardStats,
} from '@/lib/dal/analytics';
import { ReportsClient } from './reports-client';

export const metadata: Metadata = {
  title: 'Financial Reports | Ink 37 Admin',
};

export default async function ReportsPage() {
  await connection();
  const [revenueData, paymentBreakdown, bookingTrends, stats] = await Promise.all([
    getRevenueData(12),
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
