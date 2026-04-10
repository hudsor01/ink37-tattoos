'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDistance } from 'date-fns';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/dashboard/data-table';
import { SearchInput } from '@/components/dashboard/search-input';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { updateContactStatusAction } from '@/lib/actions/contact-status-action';
import {
  updateContactNotesAction,
  deleteContactAction,
} from '@/lib/actions/contact-actions';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

interface ContactsClientProps {
  initialData: {
    data: Contact[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  searchQuery: string;
  statusFilter: string;
}

const STATUSES = ['NEW', 'READ', 'REPLIED', 'RESOLVED'] as const;

export function ContactsClient({
  initialData,
  searchQuery,
  statusFilter,
}: ContactsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateUrlParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(currentSearchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when search/filter changes
      if (key !== 'page') {
        params.delete('page');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, currentSearchParams]
  );

  function handleSearch(value: string) {
    startTransition(() => {
      updateUrlParams('search', value);
    });
  }

  function handleStatusFilter(value: string) {
    startTransition(() => {
      updateUrlParams('status', value === 'ALL' ? '' : value);
    });
  }

  function handleStatusChange(contactId: string, status: string) {
    startTransition(async () => {
      toast.promise(
        updateContactStatusAction(contactId, status as 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED'),
        {
          loading: 'Updating status...',
          success: 'Status updated',
          error: 'Failed to update status',
        }
      );
    });
  }

  function handleDelete() {
    if (!deletingContact) return;
    const contactId = deletingContact.id;
    startTransition(async () => {
      toast.promise(deleteContactAction(contactId), {
        loading: 'Deleting contact...',
        success: () => {
          setDeletingContact(null);
          return 'Contact deleted';
        },
        error: 'Failed to delete contact',
      });
    });
  }

  function handlePageChange(newPage: number) {
    startTransition(() => {
      updateUrlParams('page', String(newPage));
    });
  }

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="truncate max-w-col-narrow block text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'message',
      header: 'Message',
      cell: ({ row }) => {
        const msg = row.original.message;
        const truncated = msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
        if (msg.length <= 80) {
          return (
            <span className="text-sm text-muted-foreground max-w-col-wide block truncate">
              {msg}
            </span>
          );
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="text-sm text-muted-foreground cursor-default max-w-col-wide block truncate" />
                }
              >
                {truncated}
              </TooltipTrigger>
              <TooltipContent className="max-w-sm whitespace-pre-wrap">
                {msg}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: 'adminNotes',
      header: 'Admin Notes',
      cell: ({ row }) => (
        <InlineNotes
          contactId={row.original.id}
          initialNotes={row.original.adminNotes || ''}
        />
      ),
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
        const contact = row.original;
        return (
          <div className="flex items-center gap-2">
            <Select
              value={contact.status}
              onValueChange={(val) => val && handleStatusChange(contact.id, val)}
            >
              <SelectTrigger className="w-select-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeletingContact(contact)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (initialData.data.length === 0 && !searchQuery && !statusFilter) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <Mail className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="text-lg font-semibold">No contact submissions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages from your contact form will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search contacts..."
        />
        <Select
          value={statusFilter || 'ALL'}
          onValueChange={(val) => val && handleStatusFilter(val)}
        >
          <SelectTrigger className="w-select">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={isPending ? 'opacity-60 transition-opacity' : ''}>
        <DataTable
          columns={columns}
          data={initialData.data}
          pageSize={20}
          enableCsvExport
          csvFilename="contacts.csv"
          enableShowAll
          enablePageJump
        />
      </div>

      {/* Server-side pagination */}
      {initialData.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            {initialData.total} contact(s) total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialData.page - 1)}
              disabled={initialData.page <= 1 || isPending}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {initialData.page} of {initialData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialData.page + 1)}
              disabled={initialData.page >= initialData.totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => {
          if (!open) setDeletingContact(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this contact submission from{' '}
              {deletingContact?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              variant="destructive"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InlineNotes({
  contactId,
  initialNotes,
}: {
  contactId: string;
  initialNotes: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  function saveNotes() {
    if (notes === initialNotes) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      toast.promise(updateContactNotesAction(contactId, notes), {
        loading: 'Saving notes...',
        success: () => {
          setIsEditing(false);
          return 'Notes saved';
        },
        error: 'Failed to save notes',
      });
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveNotes();
    }
    if (e.key === 'Escape') {
      setNotes(initialNotes);
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <Textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        onKeyDown={handleKeyDown}
        className="min-h-textarea-sm text-sm"
        disabled={isPending}
        maxLength={2000}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-left text-sm w-full max-w-col truncate cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
    >
      {notes ? (
        <span>{notes}</span>
      ) : (
        <span className="italic text-muted-foreground">Add notes...</span>
      )}
    </button>
  );
}
