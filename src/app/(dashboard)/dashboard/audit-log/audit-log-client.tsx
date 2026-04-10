'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuditLogEntry } from '@/components/dashboard/audit-log-entry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditLogEntry_T {
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

interface AuditLogClientProps {
  initialLogs: AuditLogEntry_T[];
}

const RESOURCE_OPTIONS = [
  { value: 'all', label: 'All Resources' },
  { value: 'customer', label: 'Customer' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'session', label: 'Session' },
  { value: 'media', label: 'Media' },
  { value: 'settings', label: 'Settings' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
];

export function AuditLogClient({ initialLogs }: AuditLogClientProps) {
  const [resourceFilter, setResourceFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = initialLogs.filter((log) => {
    if (resourceFilter !== 'all' && log.resource !== resourceFilter) return false;
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center gap-3">
        <Select
          value={resourceFilter}
          onValueChange={(val) => val && setResourceFilter(val)}
        >
          <SelectTrigger className="w-select">
            <SelectValue />
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
          value={actionFilter}
          onValueChange={(val) => val && setActionFilter(val)}
        >
          <SelectTrigger className="w-select-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(resourceFilter !== 'all' || actionFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setResourceFilter('all');
              setActionFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <h3 className="text-lg font-semibold">No audit entries</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin actions will appear here as they occur.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((entry) => (
            <AuditLogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </>
  );
}
