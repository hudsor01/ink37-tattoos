'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';

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

interface AppointmentListClientProps {
  initialAppointments: Appointment[];
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

export function AppointmentListClient({
  initialAppointments,
}: AppointmentListClientProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => fetch('/api/admin/appointments').then((r) => r.json()),
    initialData: initialAppointments,
  });

  const filteredAppointments =
    statusFilter === 'ALL'
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteAppointmentAction(deleteId);
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled successfully');
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    try {
      const formData = new FormData();
      formData.append('status', status);
      await updateAppointmentAction(id, formData);
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Status updated successfully');
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    }
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
      cell: ({ row }) =>
        format(new Date(row.original.scheduledDate), 'MMM d, yyyy h:mm a'),
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
          onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
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
