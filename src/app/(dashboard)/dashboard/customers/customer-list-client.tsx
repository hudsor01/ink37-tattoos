'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useQueryState, parseAsString } from 'nuqs';

import { DataTable } from '@/components/dashboard/data-table';
import { SearchInput } from '@/components/dashboard/search-input';
import { CustomerForm } from '@/components/dashboard/customer-form';
import { BulkActionToolbar } from '@/components/dashboard/bulk-action-toolbar';
import { CsvImportDialog } from '@/components/dashboard/csv-import-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  deleteCustomerAction,
  bulkDeleteCustomersAction,
  importCustomersAction,
  checkDuplicateEmailsAction,
} from '@/lib/actions/customer-actions';
import { customersQueryOptions } from '@/lib/query-options';
import { exportToCsv } from '@/lib/utils/csv-export';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: string | Date;
}

export function CustomerListClient() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Customer[]>([]);
  const [search, setSearch] = useQueryState(
    'q',
    parseAsString.withDefault('')
  );

  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);

  const { data: customers = [] } = useQuery(customersQueryOptions);

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteCustomerAction(deleteId);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  async function handleBulkDelete() {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const result = await bulkDeleteCustomersAction(ids);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['customers'] });
        toast.success(`${result.data.deletedCount} customer(s) deleted`);
        setSelectedRows([]);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Bulk delete failed. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function handleExportCsv() {
    const rowsToExport = selectedRows.length > 0 ? selectedRows : customers;
    const data = rowsToExport.map((c) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? '',
      phone: c.phone ?? '',
      createdAt: format(new Date(c.createdAt), 'yyyy-MM-dd'),
    }));
    exportToCsv('customers.csv', data);
    toast.success(`Exported ${data.length} customer(s) to CSV`);
  }

  async function handleImport(
    rows: { firstName: string; lastName: string; email?: string; phone?: string }[]
  ) {
    const result = await importCustomersAction(rows);
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`${result.data.imported} customer(s) imported`);
      return result.data;
    }
    toast.error(result.error);
    return { imported: 0, skipped: 0 };
  }

  async function handleCheckDuplicates(emails: string[]) {
    const result = await checkDuplicateEmailsAction(emails);
    if (result.success) return result.data;
    return [];
  }

  const columns: ColumnDef<Customer>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'lastName',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/customers/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.firstName} {row.original.lastName}
        </Link>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email ?? '-',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone ?? '-',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) =>
        format(new Date(row.original.createdAt), 'MMM d, yyyy'),
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
              render={
                <Link href={`/dashboard/customers/${row.original.id}`} />
              }
            >
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setEditCustomer(row.original)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground">
              Manage your customer records.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No customers yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first customer to start tracking their tattoo journey.
          </p>
          <div className="mt-4 flex gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger
                render={<Button />}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Customer</DialogTitle>
                </DialogHeader>
                <CustomerForm
                  onSuccess={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <CsvImportDialog
              onImport={handleImport}
              onCheckDuplicates={handleCheckDuplicates}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog
            onImport={handleImport}
            onCheckDuplicates={handleCheckDuplicates}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Customer</DialogTitle>
              </DialogHeader>
              <CustomerForm
                onSuccess={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SearchInput
        value={search}
        onChange={(v) => setSearch(v || null)}
        placeholder="Search by name or email..."
      />

      <DataTable
        columns={columns}
        data={filteredCustomers}
        enableRowSelection
        onRowSelectionChange={setSelectedRows}
        enableCsvExport
        csvFilename="customers.csv"
        enableShowAll
        enablePageJump
      />

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedRows.length}
        onDelete={handleBulkDelete}
        onExport={handleExportCsv}
        onClearSelection={() => setSelectedRows([])}
        isDeleting={isBulkDeleting}
      />

      {/* Edit Dialog */}
      <Dialog
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editCustomer && (
            <CustomerForm
              customer={editCustomer}
              onSuccess={() => setEditCustomer(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this customer and all their records.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
