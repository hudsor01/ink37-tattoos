import { connection } from 'next/server';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getAppointments } from '@/lib/dal/appointments';
import { AppointmentListClient } from './appointment-list-client';

export default async function AppointmentsPage() {
  await connection();
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  await queryClient.prefetchQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppointmentListClient />
    </HydrationBoundary>
  );
}
