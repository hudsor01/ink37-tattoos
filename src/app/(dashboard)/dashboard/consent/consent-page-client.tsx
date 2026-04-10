'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { formatDistance, format } from 'date-fns';
import {
  FileText,
  Plus,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { SearchInput } from '@/components/dashboard/search-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  createConsentFormVersionAction,
  deactivateConsentFormAction,
} from '@/lib/actions/consent-actions';

// ---------- Types ----------

type ConsentStatus = 'active' | 'expired' | 'pending';

interface ConsentRecord {
  sessionId: string;
  designDescription: string;
  appointmentDate: string;
  consentSigned: boolean;
  consentSignedAt: string | null;
  consentSignedBy: string | null;
  consentFormVersion: number | null;
  consentExpiresAt: string | null;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string | null;
  status: ConsentStatus;
}

interface ConsentForm {
  id: string;
  version: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConsentPageClientProps {
  consents: {
    data: ConsentRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  consentForms: ConsentForm[];
  searchQuery: string;
  filterValue: string;
}

// ---------- Status helpers ----------

const STATUS_CONFIG: Record<
  ConsentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof ShieldCheck }
> = {
  active: { label: 'Active', variant: 'default', icon: ShieldCheck },
  expired: { label: 'Expired', variant: 'destructive', icon: ShieldAlert },
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
] as const;

// ---------- Component ----------

export function ConsentPageClient({
  consents,
  consentForms,
  searchQuery,
  filterValue,
}: ConsentPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);

  const updateUrlParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(currentSearchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
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

  function handleFilter(value: string) {
    startTransition(() => {
      updateUrlParams('filter', value);
    });
  }

  function handlePageChange(newPage: number) {
    startTransition(() => {
      updateUrlParams('page', String(newPage));
    });
  }

  function handleDeactivate(formId: string) {
    startTransition(async () => {
      toast.promise(deactivateConsentFormAction(formId), {
        loading: 'Deactivating form version...',
        success: 'Form version deactivated',
        error: 'Failed to deactivate form version',
      });
    });
  }

  // Empty state
  if (consents.data.length === 0 && !searchQuery && filterValue === 'all') {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold">No consent records</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Consent records will appear here as clients sign consent forms for their sessions.
          </p>
        </div>
        <VersionManagementButton
          consentForms={consentForms}
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          createFormOpen={createFormOpen}
          onCreateFormOpenChange={setCreateFormOpen}
          onDeactivate={handleDeactivate}
          isPending={isPending}
        />
      </>
    );
  }

  return (
    <>
      {/* Search, Filter, and Version Management Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by customer name..."
          />
          <div className="flex gap-1">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={filterValue === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter(opt.value)}
                disabled={isPending}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <VersionManagementButton
          consentForms={consentForms}
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          createFormOpen={createFormOpen}
          onCreateFormOpenChange={setCreateFormOpen}
          onDeactivate={handleDeactivate}
          isPending={isPending}
        />
      </div>

      {/* Consent Records List */}
      <div className={`space-y-3 ${isPending ? 'opacity-60 transition-opacity' : ''}`}>
        {consents.data.map((record) => {
          const config = STATUS_CONFIG[record.status];
          const StatusIcon = config.icon;
          return (
            <Card key={record.sessionId} size="sm">
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={`/dashboard/customers/${record.customerId}`}
                        className="font-medium hover:underline"
                      >
                        {record.customerFirstName} {record.customerLastName}
                      </a>
                      <Badge variant={config.variant}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {record.designDescription}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span>
                        Session: {format(new Date(record.appointmentDate), 'MMM d, yyyy')}
                      </span>
                      {record.consentSignedAt && (
                        <span
                          title={format(
                            new Date(record.consentSignedAt),
                            'MMM d, yyyy h:mm a'
                          )}
                        >
                          Signed:{' '}
                          {formatDistance(
                            new Date(record.consentSignedAt),
                            new Date(),
                            { addSuffix: true }
                          )}
                        </span>
                      )}
                      {record.consentSignedBy && (
                        <span>By: {record.consentSignedBy}</span>
                      )}
                      {record.consentFormVersion != null && (
                        <span>Form v{record.consentFormVersion}</span>
                      )}
                      {record.consentExpiresAt && (
                        <span>
                          Expires:{' '}
                          {format(new Date(record.consentExpiresAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No results for filtered search */}
      {consents.data.length === 0 && (searchQuery || filterValue !== 'all') && (
        <div className="text-center py-8 text-muted-foreground">
          No consent records match your search or filter criteria.
        </div>
      )}

      {/* Pagination */}
      {consents.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            {consents.total} record(s) total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(consents.page - 1)}
              disabled={consents.page <= 1 || isPending}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {consents.page} of {consents.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(consents.page + 1)}
              disabled={consents.page >= consents.totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Version Management Dialog ----------

function VersionManagementButton({
  consentForms,
  open,
  onOpenChange,
  createFormOpen,
  onCreateFormOpenChange,
  onDeactivate,
  isPending,
}: {
  consentForms: ConsentForm[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createFormOpen: boolean;
  onCreateFormOpenChange: (open: boolean) => void;
  onDeactivate: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage Versions
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Consent Form Versions</DialogTitle>
          <DialogDescription>
            Manage consent form versions. The active version is used for new sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-scroll overflow-y-auto space-y-2">
          {consentForms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No consent form versions yet. Create one to get started.
            </p>
          ) : (
            consentForms.map((form) => (
              <div
                key={form.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  form.isActive ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      v{form.version}
                    </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {form.title}
                    </span>
                    {form.isActive && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Created {format(new Date(form.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
                {form.isActive ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeactivate(form.id)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive text-xs"
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Dialog open={createFormOpen} onOpenChange={onCreateFormOpenChange}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Version
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <CreateConsentFormDialog
                onSuccess={() => {
                  onCreateFormOpenChange(false);
                  onOpenChange(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Create Consent Form Dialog ----------

function CreateConsentFormDialog({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [isSubmitting, startSubmitTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startSubmitTransition(async () => {
      toast.promise(
        (async () => {
          const result = await createConsentFormVersionAction(formData);
          if (result) {
            onSuccess();
          }
          return result;
        })(),
        {
          loading: 'Creating new consent form version...',
          success: 'New consent form version created',
          error: 'Failed to create consent form version',
        }
      );
    });
  }

  return (
    <form action={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Consent Form Version</DialogTitle>
        <DialogDescription>
          This will become the new active consent form. All previous active
          versions will be deactivated.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="consent-title">Title</Label>
          <Input
            id="consent-title"
            name="title"
            defaultValue="Tattoo Consent Form"
            placeholder="Consent form title"
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="consent-content">Content</Label>
          <Textarea
            id="consent-content"
            name="content"
            placeholder="Enter the consent form text..."
            required
            rows={8}
            className="min-h-textarea-lg"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Version'}
        </Button>
      </DialogFooter>
    </form>
  );
}
