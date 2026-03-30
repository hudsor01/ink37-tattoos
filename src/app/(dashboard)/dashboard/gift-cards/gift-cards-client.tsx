'use client';

import { useState, useTransition } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDistance } from 'date-fns';
import { Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { DataTable } from '@/components/dashboard/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  issueGiftCardAction,
  deactivateGiftCardAction,
} from '@/lib/actions/gift-card-admin-actions';

type GiftCard = {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  isActive: boolean;
  purchaserEmail: string;
  recipientEmail: string;
  recipientName: string | null;
  createdAt: string;
};

interface GiftCardsClientProps {
  initialData: {
    data: GiftCard[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

function getGiftCardStatus(card: { isActive: boolean; balance: number; initialBalance: number }): string {
  if (!card.isActive) return 'INACTIVE';
  if (card.balance <= 0) return 'REDEEMED';
  if (card.balance < card.initialBalance) return 'PARTIAL';
  return 'ACTIVE';
}

const statusMap: Record<string, string> = {
  ACTIVE: 'CONFIRMED',
  INACTIVE: 'CANCELLED',
  REDEEMED: 'COMPLETED',
  PARTIAL: 'IN_PROGRESS',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

const issueFormSchema = z.object({
  amount: z.number().min(5, 'Minimum $5').max(500, 'Maximum $500'),
  recipientEmail: z.string().email('Valid email required'),
  recipientName: z.string().optional(),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

export function GiftCardsClient({ initialData }: GiftCardsClientProps) {
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [deactivatingCard, setDeactivatingCard] = useState<GiftCard | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      amount: 25,
      recipientEmail: '',
      recipientName: '',
    },
  });

  function handleIssue(values: IssueFormValues) {
    startTransition(async () => {
      const result = await issueGiftCardAction({
        amount: values.amount,
        recipientEmail: values.recipientEmail,
        recipientName: values.recipientName || undefined,
      });

      if (result.success) {
        if (result.data.emailFailed) {
          toast.warning(
            `Card created but email delivery failed. Share the code manually: ${result.data.code}`
          );
        } else {
          toast.success(`Gift card issued! Code: ${result.data.code}`);
        }
        setIsIssueOpen(false);
        form.reset();
      } else {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof IssueFormValues, {
              message: messages[0],
            });
          }
        } else {
          toast.error(result.error);
        }
      }
    });
  }

  function handleDeactivate() {
    if (!deactivatingCard) return;
    const cardId = deactivatingCard.id;
    startTransition(async () => {
      toast.promise(deactivateGiftCardAction(cardId), {
        loading: 'Deactivating gift card...',
        success: () => {
          setDeactivatingCard(null);
          return 'Gift card deactivated';
        },
        error: 'Failed to deactivate gift card',
      });
    });
  }

  const columns: ColumnDef<GiftCard>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.code}</span>
      ),
    },
    {
      id: 'recipient',
      header: 'Recipient',
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] block">
          {row.original.recipientName || row.original.recipientEmail}
        </span>
      ),
    },
    {
      accessorKey: 'initialBalance',
      header: 'Initial',
      cell: ({ row }) => formatCurrency(row.original.initialBalance),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => (
        <span className={row.original.balance <= 0 ? 'text-muted-foreground' : ''}>
          {formatCurrency(row.original.balance)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = getGiftCardStatus(row.original);
        return <StatusBadge status={statusMap[status] ?? status} className="capitalize" />;
      },
      filterFn: (row, _id, filterValue: string[]) => {
        const status = getGiftCardStatus(row.original);
        return filterValue.includes(status);
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <span title={date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}>
            {formatDistance(date, new Date(), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const card = row.original;
        if (!card.isActive || card.balance <= 0) return null;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeactivatingCard(card)}
          >
            Deactivate
          </Button>
        );
      },
    },
  ];

  if (initialData.data.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Gift className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold">No gift cards</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Issue your first gift card to get started.
          </p>
          <Button className="mt-4" onClick={() => setIsIssueOpen(true)}>
            <Gift className="h-4 w-4 mr-2" />
            Issue Gift Card
          </Button>
        </div>
        <IssueDialog
          open={isIssueOpen}
          onOpenChange={setIsIssueOpen}
          form={form}
          onSubmit={handleIssue}
          isPending={isPending}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => setIsIssueOpen(true)}>
          <Gift className="h-4 w-4 mr-2" />
          Issue Gift Card
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={initialData.data}
        globalSearch
        searchPlaceholder="Search gift cards..."
        pageSize={20}
        enableCsvExport
        csvFilename="gift-cards.csv"
        enableShowAll
        enablePageJump
      />

      <IssueDialog
        open={isIssueOpen}
        onOpenChange={setIsIssueOpen}
        form={form}
        onSubmit={handleIssue}
        isPending={isPending}
      />

      <AlertDialog
        open={!!deactivatingCard}
        onOpenChange={(open) => {
          if (!open) setDeactivatingCard(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Gift Card</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the card from being used. Remaining balance:{' '}
              {deactivatingCard ? formatCurrency(deactivatingCard.balance) : '$0.00'}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isPending}
              variant="destructive"
            >
              {isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function IssueDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<IssueFormValues>;
  onSubmit: (values: IssueFormValues) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Gift Card</DialogTitle>
          <DialogDescription>
            Create a new gift card and send it to the recipient via email.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={5}
                      max={500}
                      placeholder="25.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="recipient@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Issuing...' : 'Issue Gift Card'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
