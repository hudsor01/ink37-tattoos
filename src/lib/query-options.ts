import { queryOptions, keepPreviousData } from '@tanstack/react-query';

export interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: string | Date;
}

export interface AppointmentRecord {
  id: string;
  customerId: string;
  scheduledDate: string | Date;
  duration: number | null;
  status: string;
  type: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  tattooType: string | null;
  size: string | null;
  placement: string | null;
  description: string | null;
  notes: string | null;
  createdAt: string | Date;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export interface SessionRecord {
  id: string;
  customerId: string;
  artistId: string;
  appointmentId: string | null;
  appointmentDate: string | Date;
  duration: number;
  status: string;
  designDescription: string;
  placement: string;
  size: string;
  style: string;
  hourlyRate: number;
  estimatedHours: number;
  depositAmount: number;
  totalCost: number;
  paidAmount: number;
  notes: string | null;
  aftercareProvided: boolean;
  consentSigned: boolean;
  customer: { firstName: string; lastName: string; email: string | null };
  artist: { name: string };
  appointment: { id: string; type: string; status: string } | null;
}

export interface MediaRecord {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  size: string | null;
  style: string | null;
  tags: string[];
  isPublic: boolean;
  isApproved: boolean;
  artist: { name: string };
  customer: { firstName: string; lastName: string } | null;
  createdAt: string | Date;
}

export const customersQueryOptions = queryOptions({
  queryKey: ['customers'],
  queryFn: (): Promise<CustomerRecord[]> => fetch('/api/admin/customers').then((r) => r.json()),
  placeholderData: keepPreviousData,
});

export const appointmentsQueryOptions = queryOptions({
  queryKey: ['appointments'],
  queryFn: (): Promise<AppointmentRecord[]> => fetch('/api/admin/appointments').then((r) => r.json()),
  placeholderData: keepPreviousData,
});

export const sessionsQueryOptions = queryOptions({
  queryKey: ['sessions'],
  queryFn: (): Promise<SessionRecord[]> => fetch('/api/admin/sessions').then((r) => r.json()),
  placeholderData: keepPreviousData,
});

export const mediaQueryOptions = queryOptions({
  queryKey: ['media'],
  queryFn: (): Promise<MediaRecord[]> => fetch('/api/admin/media').then((r) => r.json()),
});
