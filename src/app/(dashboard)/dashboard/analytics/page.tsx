import { connection } from 'next/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getRevenueData,
  getClientAcquisitionData,
  getAppointmentTypeBreakdown,
  getBookingTrends,
} from '@/lib/dal/analytics';
import {
  RevenueChart,
  RevenueComposedChart,
  ClientAcquisitionChart,
  AppointmentTypeChart,
  BookingTrendsChart,
} from '@/components/dashboard/analytics-chart';

export default async function AnalyticsPage() {
  await connection();
  const [revenueData, clientData, appointmentTypes, bookingTrends] = await Promise.all([
    getRevenueData(6),
    getClientAcquisitionData(6),
    getAppointmentTypeBreakdown(),
    getBookingTrends(6),
  ]);

  const hasData =
    revenueData.length > 0 ||
    clientData.length > 0 ||
    appointmentTypes.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics & Reporting</h1>
        <p className="text-muted-foreground">
          Business insights and performance metrics.
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold">Not enough data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Analytics will appear once you have appointments and sessions
              recorded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <RevenueChart data={revenueData} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Not enough data
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Acquisition</CardTitle>
            </CardHeader>
            <CardContent>
              {clientData.length > 0 ? (
                <ClientAcquisitionChart data={clientData} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Not enough data
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue & Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <RevenueComposedChart data={revenueData} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Not enough data
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appointment Types</CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentTypes.length > 0 ? (
                <AppointmentTypeChart data={appointmentTypes} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Not enough data
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {bookingTrends.length > 0 ? (
                <BookingTrendsChart data={bookingTrends} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Not enough data
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
