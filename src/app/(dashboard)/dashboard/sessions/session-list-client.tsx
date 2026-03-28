'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [detailSession, setDetailSession] = useState<SessionWithRelations | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);

  const { data: sessions = [] } = useQuery(sessionsQueryOptions);

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteSessionAction(deleteId);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session deleted');
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
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
            onClick={() => setDetailSession(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteId(row.original.id)}
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

      <DataTable columns={columnsWithActions} data={sessions} searchKey="customer" />

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

      <Dialog open={!!detailSession} onOpenChange={() => setDetailSession(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Customer:</span>{' '}
                  {detailSession.customer.firstName} {detailSession.customer.lastName}
                </div>
                <div>
                  <span className="text-muted-foreground">Artist:</span>{' '}
                  {detailSession.artist.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  {new Date(detailSession.appointmentDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  {detailSession.duration} min
                </div>
                <div>
                  <span className="text-muted-foreground">Style:</span>{' '}
                  {detailSession.style}
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>{' '}
                  {detailSession.size}
                </div>
                <div>
                  <span className="text-muted-foreground">Placement:</span>{' '}
                  {detailSession.placement}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <StatusBadge status={detailSession.status} />
                </div>
                <div>
                  <span className="text-muted-foreground">Total Cost:</span>{' '}
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                    Number(detailSession.totalCost)
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span>{' '}
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                    Number(detailSession.paidAmount)
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Consent:</span>{' '}
                  {detailSession.consentSigned ? 'Signed' : 'Not signed'}
                </div>
                <div>
                  <span className="text-muted-foreground">Aftercare:</span>{' '}
                  {detailSession.aftercareProvided ? 'Provided' : 'Not provided'}
                </div>
              </div>
              {detailSession.designDescription && (
                <div>
                  <span className="text-muted-foreground">Design:</span>{' '}
                  {detailSession.designDescription}
                </div>
              )}
              {detailSession.notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>{' '}
                  {detailSession.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session and its associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
