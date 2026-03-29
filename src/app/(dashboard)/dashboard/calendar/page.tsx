import { connection } from 'next/server';
import { getAppointmentsByDateRange } from '@/lib/dal/appointments';
import { startOfMonth, endOfMonth, subDays, addDays } from 'date-fns';
import { CalendarClient } from './calendar-client';

export default async function CalendarPage() {
  await connection();

  // Fetch initial date range: current month with 7-day buffer for leading/trailing days
  const now = new Date();
  const startDate = subDays(startOfMonth(now), 7);
  const endDate = addDays(endOfMonth(now), 7);

  const appointments = await getAppointmentsByDateRange(startDate, endDate);

  // Serialize dates to ISO strings for client component
  const serialized = appointments.map((apt) => ({
    ...apt,
    scheduledDate: apt.scheduledDate.toISOString(),
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Calendar
        </h1>
        <p className="text-muted-foreground">
          View appointments across day, week, and month views.
        </p>
      </div>
      <CalendarClient
        initialAppointments={serialized}
        initialStart={startDate.toISOString()}
        initialEnd={endDate.toISOString()}
      />
    </div>
  );
}
