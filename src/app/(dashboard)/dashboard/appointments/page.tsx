import { getAppointments } from '@/lib/dal/appointments';
import { AppointmentListClient } from './appointment-list-client';

export default async function AppointmentsPage() {
  const appointments = await getAppointments();

  // Serialize dates for client component
  const serialized = appointments.map((a) => ({
    ...a,
    scheduledDate: a.scheduledDate.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return <AppointmentListClient initialAppointments={serialized} />;
}
