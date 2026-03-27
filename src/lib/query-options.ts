import { queryOptions, keepPreviousData } from '@tanstack/react-query';

/**
 * Shared query option factories for TanStack Query.
 * Use these in useQuery() calls for consistent caching and refetching behavior.
 */

export const customersQueryOptions = queryOptions({
  queryKey: ['customers'],
  queryFn: () => fetch('/api/admin/customers').then((r) => r.json()),
  placeholderData: keepPreviousData,
});

export const appointmentsQueryOptions = queryOptions({
  queryKey: ['appointments'],
  queryFn: () => fetch('/api/admin/appointments').then((r) => r.json()),
  placeholderData: keepPreviousData,
});

export const sessionsQueryOptions = queryOptions({
  queryKey: ['sessions'],
  queryFn: () => fetch('/api/admin/sessions').then((r) => r.json()),
  placeholderData: keepPreviousData,
});
