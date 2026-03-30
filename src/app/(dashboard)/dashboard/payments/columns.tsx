'use client';

import { type ColumnDef } from '@/components/dashboard/data-table';
import { type MobileField } from '@/components/dashboard/responsive-data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { ReceiptDownloadButton } from '@/components/dashboard/receipt-download-button';
import { format } from 'date-fns';

// Type matching the shape returned by getPayments (with includes)
export type PaymentRow = {
  id: string;
  type: string;
  status: string;
  amount: number;
  receiptUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
  customer: { firstName: string; lastName: string; email: string | null };
  tattooSession: { designDescription: string; totalCost: number };
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const columns: ColumnDef<PaymentRow, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.original.createdAt), 'MMM d, yyyy'),
  },
  {
    id: 'customer',
    header: 'Customer',
    accessorFn: (row) => `${row.customer.firstName} ${row.customer.lastName}`,
  },
  {
    id: 'session',
    header: 'Session',
    accessorFn: (row) => row.tattooSession.designDescription,
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate block">
        {row.original.tattooSession.designDescription}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => currencyFormatter.format(row.original.amount),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <span className="capitalize text-sm">
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
    id: 'receipt',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <ReceiptDownloadButton
        paymentId={row.original.id}
        disabled={row.original.status !== 'COMPLETED'}
      />
    ),
  },
];

export const paymentMobileFields: MobileField<PaymentRow>[] = [
  { label: 'Customer', accessor: (p) => `${p.customer.firstName} ${p.customer.lastName}` },
  { label: 'Amount', accessor: (p) => currencyFormatter.format(p.amount) },
  { label: 'Date', accessor: (p) => format(new Date(p.createdAt), 'MMM d, yyyy') },
  { label: 'Status', accessor: (p) => <StatusBadge status={p.status} /> },
];
