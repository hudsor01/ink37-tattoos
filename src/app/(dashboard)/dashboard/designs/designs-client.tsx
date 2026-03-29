'use client';

import { useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Palette } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/dashboard/search-input';
import { EmptyState } from '@/components/dashboard/empty-state';
import { DesignApprovalCard } from '@/components/dashboard/design-approval-card';
import { approveDesignAction, rejectDesignAction } from '@/lib/actions/design-approval-actions';

interface Design {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  style: string | null;
  tags: string[] | null;
  isApproved: boolean;
  isPublic: boolean;
  rejectionNotes: string | null;
  createdAt: string;
}

interface DesignsData {
  data: Design[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface DesignsClientProps {
  designs: DesignsData;
  currentStatus: 'pending' | 'approved' | 'all';
  currentSearch: string;
}

export function DesignsClient({
  designs,
  currentStatus,
  currentSearch,
}: DesignsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateUrlParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
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
    [router, pathname, searchParams]
  );

  function handleTabChange(value: string | number | null) {
    if (typeof value === 'string') {
      startTransition(() => {
        updateUrlParams('status', value === 'pending' ? '' : value);
      });
    }
  }

  function handleSearch(value: string) {
    startTransition(() => {
      updateUrlParams('search', value);
    });
  }

  function handlePageChange(newPage: number) {
    startTransition(() => {
      updateUrlParams('page', String(newPage));
    });
  }

  function handleApprove(designId: string) {
    toast.promise(approveDesignAction(designId), {
      loading: 'Approving design...',
      success: 'Design approved',
      error: 'Failed to approve design',
    });
  }

  function handleReject(designId: string, notes: string) {
    toast.promise(rejectDesignAction(designId, notes), {
      loading: 'Rejecting design...',
      success: 'Design rejected',
      error: 'Failed to reject design',
    });
  }

  const statusLabel =
    currentStatus === 'pending'
      ? 'pending'
      : currentStatus === 'approved'
        ? 'approved'
        : '';

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={currentSearch}
          onChange={handleSearch}
          placeholder="Search designs..."
        />
        <Tabs
          value={currentStatus}
          onValueChange={handleTabChange}
        >
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {designs.data.length === 0 ? (
        <EmptyState
          icon={Palette}
          title={`No ${statusLabel} designs`}
          description={
            currentSearch
              ? 'No designs match your search. Try a different query.'
              : currentStatus === 'pending'
                ? 'There are no designs awaiting approval.'
                : currentStatus === 'approved'
                  ? 'No designs have been approved yet.'
                  : 'No designs found.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {designs.data.map((design) => (
            <DesignApprovalCard
              key={design.id}
              design={design}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Server-side pagination */}
      {designs.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            {designs.total} design(s) total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(designs.page - 1)}
              disabled={designs.page <= 1 || isPending}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {designs.page} of {designs.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(designs.page + 1)}
              disabled={designs.page >= designs.totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
