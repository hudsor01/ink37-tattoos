'use client';

import { useState, useMemo, useOptimistic, useTransition, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryState, parseAsString } from 'nuqs';

import { DataTable } from '@/components/dashboard/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { AppointmentForm } from '@/components/dashboard/appointment-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  deleteAppointmentAction,
  updateAppointmentAction,
} from '@/lib/actions/appointment-actions';
import { Badge } from '@/components/ui/badge';
import { appointmentsQueryOptions } from '@/lib/query-options';

interface Appointment {
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

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
] as const;

function getProximityLabel(scheduledDate: Date): { label: string; variant: 'destructive' | 'secondary' } | null {
  const now = new Date();
  const daysUntil = differenceInDays(scheduledDate, now);
  if (daysUntil < 0) return null;
  if (daysUntil === 0) {
    const hoursUntil = differenceInHours(scheduledDate, now);
    if (hoursUntil <= 0) return null;
    return { label: `In ${hoursUntil}h`, variant: 'destructive' };
  }
  if (daysUntil === 1) return { label: 'Tomorrow', variant: 'destructive' };
  if (daysUntil <= 7) return { label: `In ${daysUntil} days`, variant: 'secondary' };
  return null;
}

export function AppointmentListClient() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);
  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsString.withDefault('ALL')
  );
  const [search, setSearch] = useQueryState(
    'q',
    parseAsString.withDefault('')
  );

  const [isPending, startTransition] = useTransition();

  const { data: appointments = [] } = useQuery(appointmentsQueryOptions);

  // Optimistic status updates: show new status immediately before server confirms
  const [optimisticAppointments, setOptimisticStatus] = useOptimistic(
    appointments,
    (current, { id, status }: { id: string; status: string }) =>
      current.map((a) => (a.id === id ? { ...a, status } : a))
  );

  const filteredAppointments = useMemo(() => {
    let result = optimisticAppointments;
    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.customer.firstName.toLowerCase().includes(q) ||
          a.customer.lastName.toLowerCase().includes(q) ||
          a.customer.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [optimisticAppointments, statusFilter, search]);

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteAppointmentAction(deleteId);
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.warning('Appointment cancelled');
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  function handleStatusUpdate(id: string, status: string) {
    startTransition(async () => {
      setOptimisticStatus({ id, status });
      try {
        const formData = new FormData();
        formData.append('status', status);
        await updateAppointmentAction(id, formData);
        await queryClient.invalidateQueries({ queryKey: ['appointments'] });
        if (status === 'CANCELLED' || status === 'NO_SHOW') {
          toast.warning(`Appointment marked as ${status.replace('_', ' ').toLowerCase()}`);
        } else {
          toast.success('Status updated');
        }
      } catch {
        toast.error("Changes couldn't be saved. Please try again.");
      }
    });
  }

  const columns: ColumnDef<Appointment>[] = [
    {
      accessorKey: 'firstName',
      header: 'Customer',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.customer.firstName} {row.original.customer.lastName}
        </span>
      ),
    },
    {
      accessorKey: 'scheduledDate',
      header: 'Date',
      cell: ({ row }) => {
        const date = new Date(row.original.scheduledDate);
        const proximity = getProximityLabel(date);
        return (
          <div className="flex items-center gap-2">
            <span>{format(date, 'MMM d, yyyy h:mm a')}</span>
            {proximity && (
              <Badge variant={proximity.variant} className="text-xs">
                {proximity.label}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize">
          {row.original.type.replace(/_/g, ' ').toLowerCase()}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                handleStatusUpdate(row.original.id, 'CONFIRMED')
              }
            >
              Confirm
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleStatusUpdate(row.original.id, 'COMPLETED')
              }
            >
              Mark Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleStatusUpdate(row.original.id, 'NO_SHOW')
              }
            >
              Mark No-Show
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              Cancel Appointment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (appointments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Appointments
            </h1>
            <p className="text-muted-foreground">
              Schedule and manage appointments.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No appointments scheduled</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an appointment to get started.
          </p>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button className="mt-4" />}>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New Appointment</DialogTitle>
              </DialogHeader>
              <AppointmentForm onSuccess={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Schedule and manage appointments.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Appointment</DialogTitle>
            </DialogHeader>
            <AppointmentForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val === 'ALL' ? null : val)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredAppointments}
        searchKey="firstName"
        searchPlaceholder="Search by customer name..."
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment. The customer will need to
              rebook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Cancelling...' : 'Cancel Appointment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
