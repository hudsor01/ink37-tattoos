import { connection } from 'next/server';
import { subMonths } from 'date-fns';
import {
  getAnalyticsDataByDateRange,
  getComparisonPeriodData,
  getAnalyticsDepthData,
} from '@/lib/dal/analytics';
import { AnalyticsClient } from './analytics-client';

interface AnalyticsPageProps {
  searchParams: Promise<{ from?: string; to?: string; compare?: string; tab?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await connection();
  const params = await searchParams;

  const to = params.to ? new Date(params.to) : new Date();
  const from = params.from ? new Date(params.from) : subMonths(new Date(), 6);
  const showComparison = params.compare === 'true';
  const initialTab = params.tab || 'overview';

  const [analyticsData, comparisonData, depthData] = await Promise.all([
    getAnalyticsDataByDateRange(from, to),
    showComparison ? getComparisonPeriodData(from, to) : Promise.resolve(null),
    getAnalyticsDepthData(from, to),
  ]);

  return (
    <AnalyticsClient
      analyticsData={analyticsData}
      comparisonData={comparisonData}
      depthData={depthData}
      from={from.toISOString()}
      to={to.toISOString()}
      initialTab={initialTab}
    />
  );
}
