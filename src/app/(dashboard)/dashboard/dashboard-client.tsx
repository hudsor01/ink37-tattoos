'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  CalendarPlus,
  CalendarX,
  CheckCircle,
  Clock,
  DollarSign,
  Upload,
  UserPlus,
  Users,
  Calendar,
} from 'lucide-react';

import { KPICard } from '@/components/dashboard/kpi-card';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { RevenueChart } from '@/components/dashboard/analytics-chart';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AppointmentWithCustomer {
  id: string;
  scheduledDate: Date;
  type: string;
  status: string;
  customer: {
    firstName: string;
    lastName: string;
  };
}

interface TrendStat {
  value: number;
  trend: number;
}

interface DashboardClientProps {
  todayAppointments: AppointmentWithCustomer[];
  weekAppointments: AppointmentWithCustomer[];
  stats: {
    revenue: TrendStat;
    customers: TrendStat;
    appointments: TrendStat;
    sessions: TrendStat;
  };
  revenueData: { month: string; revenue: number; count: number }[];
  dateRange: { from: Date; to: Date };
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function DashboardClient({
  todayAppointments,
  weekAppointments,
  stats,
  revenueData,
  dateRange: initialDateRange,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) return { from: new Date(from), to: new Date(to) };
    return { from: initialDateRange.from, to: initialDateRange.to };
  });

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', format(range.from, 'yyyy-MM-dd'));
      params.set('to', format(range.to, 'yyyy-MM-dd'));
      router.push(`/dashboard?${params.toString()}`);
    } else {
      router.push('/dashboard');
    }
  }, [router, searchParams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Business overview and daily activity.
          </p>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Today&apos;s Appointments</CardTitle>
          {weekAppointments.length > 0 && (
            <Badge variant="secondary">
              {weekAppointments.length} this week
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <Table aria-label="Today's appointments">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAppointments.map((apt) => (
                  <TableRow key={apt.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/dashboard/appointments/${apt.id}`}
                        className="font-medium hover:underline"
                      >
                        {format(new Date(apt.scheduledDate), 'h:mm a')}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/appointments/${apt.id}`}
                        className="hover:underline"
                      >
                        {apt.customer.firstName} {apt.customer.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">
                      {apt.type.replace(/_/g, ' ').toLowerCase()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={apt.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarX className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No appointments today
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/dashboard/reports" className="block">
          <KPICard
            title="Total Revenue"
            value={currencyFormatter.format(stats.revenue.value)}
            icon={DollarSign}
            trend={{ value: stats.revenue.trend, label: 'vs prev period' }}
          />
        </Link>
        <Link href="/dashboard/customers" className="block">
          <KPICard
            title="New Customers"
            value={stats.customers.value}
            icon={Users}
            trend={{ value: stats.customers.trend, label: 'vs prev period' }}
          />
        </Link>
        <Link href="/dashboard/appointments" className="block">
          <KPICard
            title="Appointments"
            value={stats.appointments.value}
            icon={Calendar}
            trend={{ value: stats.appointments.trend, label: 'vs prev period' }}
          />
        </Link>
        <Link href="/dashboard/sessions" className="block">
          <KPICard
            title="Sessions Completed"
            value={stats.sessions.value}
            icon={CheckCircle}
            trend={{ value: stats.sessions.trend, label: 'vs prev period' }}
          />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" render={<Link href="/dashboard/appointments?action=new" />}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
        <Button variant="outline" render={<Link href="/dashboard/customers?action=new" />}>
          <UserPlus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
        <Button variant="outline" render={<Link href="/dashboard/media" />}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Media
        </Button>
        <Button variant="outline" render={<Link href="/dashboard/sessions?action=new" />}>
          <Clock className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.length > 0 ? (
            <RevenueChart data={revenueData} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No revenue data for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
