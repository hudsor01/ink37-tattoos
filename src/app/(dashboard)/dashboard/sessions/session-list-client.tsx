'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { DataTable, type ColumnDef } from '@/components/dashboard/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SessionForm } from '@/components/dashboard/session-form';
import { deleteSessionAction } from '@/lib/actions/session-actions';
import { sessionsQueryOptions } from '@/lib/query-options';
import { formatDuration, intervalToDuration } from 'date-fns';
import { Plus, Check, X, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface SessionWithRelations {
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

const columns: ColumnDef<SessionWithRelations, unknown>[] = [
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => {
      const c = row.original.customer;
      return `${c.firstName} ${c.lastName}`;
    },
  },
  {
    accessorKey: 'designDescription',
    header: 'Design',
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sessions/${row.original.id}`}
        className="text-primary hover:underline max-w-xs truncate block"
      >
        {row.original.designDescription}
      </Link>
    ),
  },
  {
    accessorKey: 'appointmentDate',
    header: 'Date',
    cell: ({ row }) => {
      const date = new Date(row.original.appointmentDate);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    },
  },
  {
    accessorKey: 'style',
    header: 'Style',
  },
  {
    accessorKey: 'size',
    header: 'Size',
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => {
      const mins = row.original.duration;
      if (!mins) return '--';
      const dur = intervalToDuration({ start: 0, end: mins * 60 * 1000 });
      return formatDuration(dur, { format: ['hours', 'minutes'] }) || `${mins}m`;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'totalCost',
    header: 'Total Cost',
    cell: ({ row }) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(row.original.totalCost)),
  },
  {
    accessorKey: 'paidAmount',
    header: 'Paid',
    cell: ({ row }) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(row.original.paidAmount)),
  },
  {
    accessorKey: 'consentSigned',
    header: 'Consent',
    cell: ({ row }) =>
      row.original.consentSigned ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      ),
  },
];

export function SessionListClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);

  const { data: sessions = [] } = useQuery(sessionsQueryOptions);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await deleteSessionAction(id);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session deleted');
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    }
  }

  const columnsWithActions: ColumnDef<SessionWithRelations, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/dashboard/sessions/${row.original.id}`} />}
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">View Details</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <h3 className="text-lg font-semibold">No sessions recorded</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Log a tattoo session after completing an appointment.
        </p>
        <Button className="mt-4" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Session
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Session</DialogTitle>
              <DialogDescription>
                Record a new tattoo session with pricing and consent details.
              </DialogDescription>
            </DialogHeader>
            <SessionForm
              onSuccess={() => {
                setDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['sessions'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Session
        </Button>
      </div>

      <DataTable
        columns={columnsWithActions}
        data={sessions}
        searchKey="customer"
        enableCsvExport
        csvFilename="sessions.csv"
        enableShowAll
        enablePageJump
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Session</DialogTitle>
            <DialogDescription>
              Record a new tattoo session with pricing and consent details.
            </DialogDescription>
          </DialogHeader>
          <SessionForm
            onSuccess={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['sessions'] });
            }}
          />
        </DialogContent>
      </Dialog>

    </>
  );
}
