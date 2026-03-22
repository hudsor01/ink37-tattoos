import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Palette, CreditCard, AlertCircle } from 'lucide-react';
import { getPortalOverview } from '@/lib/dal/portal';
import { StatusBadge } from '@/components/dashboard/status-badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';

const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default async function PortalOverviewPage() {
  const overview = await getPortalOverview();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome Back</h1>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{overview.stats.totalAppointments}</p>
            <p className="text-sm text-muted-foreground">Total Appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{overview.stats.totalSessions}</p>
            <p className="text-sm text-muted-foreground">Tattoo Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{overview.stats.unsignedConsents}</p>
              {overview.stats.unsignedConsents > 0 && (
                <AlertCircle className="size-5 text-amber-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">Unsigned Consents</p>
          </CardContent>
        </Card>
      </div>

      {/* Next appointment + Recent payment */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.nextAppointment ? (
              <div className="space-y-2">
                <p className="font-medium">
                  {format(new Date(overview.nextAppointment.scheduledDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(overview.nextAppointment.scheduledDate), 'h:mm a')}
                </p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={overview.nextAppointment.status} />
                  {overview.nextAppointment.type && (
                    <span className="text-sm text-muted-foreground">
                      {overview.nextAppointment.type}
                    </span>
                  )}
                </div>
                {overview.nextAppointment.placement && (
                  <p className="text-sm text-muted-foreground">
                    Placement: {overview.nextAppointment.placement}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                <Link
                  href="/"
                  className="inline-block text-sm font-medium text-primary hover:underline"
                >
                  Book a consultation
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payment</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentPayment ? (
              <div className="space-y-2">
                <p className="text-xl font-semibold">
                  {currencyFormat.format(Number(overview.recentPayment.amount))}
                </p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={overview.recentPayment.status} />
                  {overview.recentPayment.type && (
                    <span className="text-sm text-muted-foreground">
                      {overview.recentPayment.type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(overview.recentPayment.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">No payments yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/portal/appointments" className="block">
          <Card className="transition-shadow hover:ring-2 hover:ring-primary/20">
            <CardContent className="flex items-center gap-3 pt-0">
              <Calendar className="size-8 text-primary" />
              <div>
                <p className="font-medium">Appointments</p>
                <CardDescription>View upcoming and past visits</CardDescription>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/tattoos" className="block">
          <Card className="transition-shadow hover:ring-2 hover:ring-primary/20">
            <CardContent className="flex items-center gap-3 pt-0">
              <Palette className="size-8 text-primary" />
              <div>
                <p className="font-medium">My Tattoos</p>
                <CardDescription>Sessions, designs, and consent</CardDescription>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/payments" className="block">
          <Card className="transition-shadow hover:ring-2 hover:ring-primary/20">
            <CardContent className="flex items-center gap-3 pt-0">
              <CreditCard className="size-8 text-primary" />
              <div>
                <p className="font-medium">Payments</p>
                <CardDescription>Payment history and receipts</CardDescription>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
