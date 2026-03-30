'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { type DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { SearchInput } from '@/components/dashboard/search-input';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { exportToCsv } from '@/lib/utils/csv-export';
import { ChevronDown, ChevronRight, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntryT {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ip: string;
  userAgent: string;
  timestamp: string;
  metadata: unknown;
  user: { name: string; email: string } | null;
}

interface AuditUser {
  userId: string | null;
  name: string;
  email: string;
}

interface Filters {
  action: string;
  resource: string;
  userId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

interface AuditLogClientProps {
  logs: AuditLogEntryT[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  auditUsers: AuditUser[];
  filters: Filters;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const RESOURCE_OPTIONS = [
  { value: 'all', label: 'All Resources' },
  { value: 'customer', label: 'Customer' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'session', label: 'Session' },
  { value: 'media', label: 'Media' },
  { value: 'settings', label: 'Settings' },
  { value: 'payment', label: 'Payment' },
  { value: 'product', label: 'Product' },
  { value: 'order', label: 'Order' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'UPSERT', label: 'Upsert' },
  { value: 'DELETE', label: 'Delete' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const actionColors: Record<string, string> = {
  CREATE: 'border-l-green-500',
  UPDATE: 'border-l-blue-500',
  UPSERT: 'border-l-blue-500',
  DELETE: 'border-l-red-500',
};

const actionVerbs: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  UPSERT: 'Updated',
  DELETE: 'Deleted',
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60));
    return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
  }
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Convert camelCase to Title Case for metadata display
 */
function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatMetadataValue(value: unknown): string {
  if (value == null) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
    try {
      const d = new Date(value as string);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogClient({
  logs,
  total,
  page,
  pageSize,
  totalPages,
  auditUsers,
  filters,
}: AuditLogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const hasActiveFilters =
    filters.action !== '' ||
    filters.resource !== '' ||
    filters.userId !== '' ||
    filters.search !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  // -----------------------------------------------------------------------
  // URL-based filter management
  // -----------------------------------------------------------------------

  const updateFilters = useCallback(
    (updates: Partial<Filters & { page?: string }>) => {
      const params = new URLSearchParams();

      const merged = { ...filters, ...updates };

      if (merged.action && merged.action !== 'all') params.set('action', merged.action);
      if (merged.resource && merged.resource !== 'all') params.set('resource', merged.resource);
      if (merged.userId && merged.userId !== 'all') params.set('userId', merged.userId);
      if (merged.search) params.set('search', merged.search);
      if (merged.dateFrom) params.set('dateFrom', merged.dateFrom);
      if (merged.dateTo) params.set('dateTo', merged.dateTo);

      // Reset to page 1 when filters change, unless explicitly setting page
      const pg = updates.page ?? '1';
      if (pg !== '1') params.set('page', pg);

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [filters, pathname, router],
  );

  function clearFilters() {
    router.push(pathname);
  }

  function handleDateRangeChange(range: DateRange | undefined) {
    updateFilters({
      dateFrom: range?.from ? range.from.toISOString() : '',
      dateTo: range?.to ? range.to.toISOString() : '',
    });
  }

  function handleSearch(value: string) {
    updateFilters({ search: value });
  }

  // -----------------------------------------------------------------------
  // Expand / collapse
  // -----------------------------------------------------------------------

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // -----------------------------------------------------------------------
  // CSV export
  // -----------------------------------------------------------------------

  function handleExport() {
    const rows = logs.map((entry) => ({
      timestamp: entry.timestamp,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId ?? '',
      user: entry.user?.name ?? 'System',
      email: entry.user?.email ?? '',
      ip: entry.ip,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : '',
    }));
    exportToCsv('audit-log.csv', rows);
  }

  // -----------------------------------------------------------------------
  // Parse date range from filters
  // -----------------------------------------------------------------------

  const dateRange: DateRange | undefined =
    filters.dateFrom || filters.dateTo
      ? {
          from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          to: filters.dateTo ? new Date(filters.dateTo) : undefined,
        }
      : undefined;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          placeholder="Filter by date"
        />

        <Select
          value={filters.resource || 'all'}
          onValueChange={(val) => val && updateFilters({ resource: val === 'all' ? '' : val })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Resources" />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.action || 'all'}
          onValueChange={(val) => val && updateFilters({ action: val === 'all' ? '' : val })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.userId || 'all'}
          onValueChange={(val) => val && updateFilters({ userId: val === 'all' ? '' : val })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {auditUsers.map((u) => (
              <SelectItem key={u.userId ?? 'system'} value={u.userId ?? 'system'}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SearchInput
          value={filters.search}
          onChange={handleSearch}
          placeholder="Search audit logs..."
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear Filters
          </Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Results */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <h3 className="text-lg font-semibold">No audit entries</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'No entries match your filters. Try adjusting or clearing them.'
              : 'Admin actions will appear here as they occur.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => {
            const isExpanded = expandedIds.has(entry.id);
            const borderColor = actionColors[entry.action] ?? 'border-l-gray-300';
            const verb = actionVerbs[entry.action] ?? entry.action;
            const userName = entry.user?.name ?? 'System';

            return (
              <Collapsible
                key={entry.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(entry.id)}
              >
                <CollapsibleTrigger
                  render={(props) => (
                    <div
                      {...props}
                      className={cn(
                        'flex w-full cursor-pointer items-start gap-3 rounded-lg border border-l-4 bg-card p-4 transition-colors hover:bg-muted/50',
                        borderColor,
                      )}
                    >
                      <div className="mt-0.5 shrink-0 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {getInitials(userName)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-medium">{userName}</span>
                          <span className="text-sm text-muted-foreground">
                            {verb} {entry.resource}
                            {entry.resourceId && (
                              <span className="ml-1 font-mono text-xs">
                                {entry.resourceId.slice(0, 8)}...
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatTimestamp(entry.timestamp)}</span>
                          <span>{entry.ip}</span>
                        </div>
                      </div>
                    </div>
                  )}
                />
                <CollapsibleContent>
                  <MetadataPanel metadata={entry.metadata} />
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilters({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilters({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metadata expandable panel
// ---------------------------------------------------------------------------

function MetadataPanel({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== 'object') {
    return (
      <div className="ml-11 rounded-b-lg border border-t-0 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        No change details recorded
      </div>
    );
  }

  const meta = metadata as Record<string, unknown>;
  const changes = (meta.changes ?? meta) as Record<string, unknown>;

  if (typeof changes !== 'object' || changes === null) {
    return (
      <div className="ml-11 rounded-b-lg border border-t-0 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        No change details recorded
      </div>
    );
  }

  const entries = Object.entries(changes);

  if (entries.length === 0) {
    return (
      <div className="ml-11 rounded-b-lg border border-t-0 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        No change details recorded
      </div>
    );
  }

  return (
    <div className="ml-11 rounded-b-lg border border-t-0 bg-muted/50 px-4 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="pb-1 pr-4 text-left font-medium text-muted-foreground">
              Field
            </th>
            <th className="pb-1 text-left font-medium text-muted-foreground">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b last:border-0">
              <td className="py-1.5 pr-4 font-medium">{camelToTitle(key)}</td>
              <td className="py-1.5 font-mono text-muted-foreground">
                {formatMetadataValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
