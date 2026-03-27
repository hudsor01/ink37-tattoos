import { connection } from 'next/server';
import { getAppointments } from '@/lib/dal/appointments';
import { AppointmentListClient } from './appointment-list-client';

export default async function AppointmentsPage() {
  await connection();
  const appointments = await getAppointments();

  // Serialize dates for client component
  const serialized = appointments.map((a: (typeof appointments)[number]) => ({
    ...a,
    scheduledDate: a.scheduledDate.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return <AppointmentListClient initialAppointments={serialized} />;
}
