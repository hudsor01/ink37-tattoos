import { getDashboardStats, getRevenueData } from '@/lib/dal/analytics';
import { KPICard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/analytics-chart';
import { StatusBadge } from '@/components/dashboard/status-badge';
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
import {
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const [stats, revenueData] = await Promise.all([
    getDashboardStats(),
    getRevenueData(6),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Business overview and recent activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={currencyFormatter.format(stats.totalRevenue)}
          icon={DollarSign}
          description="Lifetime earnings"
        />
        <KPICard
          title="Total Clients"
          value={stats.totalCustomers}
          icon={Users}
          description="All customers"
        />
        <KPICard
          title="Appointments"
          value={stats.totalAppointments}
          icon={Calendar}
          description="All time"
        />
        <KPICard
          title="Sessions Completed"
          value={stats.completedSessions}
          icon={CheckCircle}
          description="Finished sessions"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentAppointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">
                        {appointment.customer.firstName}{' '}
                        {appointment.customer.lastName}
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(appointment.scheduledDate),
                          'MMM d, yyyy'
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {appointment.type.replace(/_/g, ' ').toLowerCase()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={appointment.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No appointments scheduled
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <RevenueChart data={revenueData} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Charts will appear once you have session data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
