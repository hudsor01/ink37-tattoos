import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { getPortalAppointments } from '@/lib/dal/portal';
import { StatusBadge } from '@/components/dashboard/status-badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

export default async function PortalAppointmentsPage() {
  const appointments = await getPortalAppointments();

  if (appointments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">No appointments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Book your first consultation on our website!
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Visit our site to book
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.scheduledDate) >= now && a.status !== 'CANCELLED'
  );
  const past = appointments.filter(
    (a) => new Date(a.scheduledDate) < now || a.status === 'COMPLETED' || a.status === 'CANCELLED'
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Appointments</h1>

      {/* Upcoming */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Past</h2>
          <div className="space-y-3">
            {past.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
}: {
  appointment: {
    id: string;
    scheduledDate: Date;
    duration: number | null;
    status: string;
    type: string | null;
    tattooType: string | null;
    size: string | null;
    placement: string | null;
    description: string | null;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              {format(new Date(appointment.scheduledDate), 'MMM d, yyyy')}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(appointment.scheduledDate), 'h:mm a')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {appointment.type && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {appointment.type}
              </span>
            )}
            <StatusBadge status={appointment.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {appointment.tattooType && (
            <span>Type: {appointment.tattooType}</span>
          )}
          {appointment.size && <span>Size: {appointment.size}</span>}
          {appointment.placement && (
            <span>Placement: {appointment.placement}</span>
          )}
          {appointment.duration && (
            <span>Duration: {appointment.duration} min</span>
          )}
        </div>
        {appointment.description && (
          <p className="mt-2 text-sm">{appointment.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
