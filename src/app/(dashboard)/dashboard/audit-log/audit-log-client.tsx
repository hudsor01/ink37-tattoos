'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { AuditLogEntry } from '@/components/dashboard/audit-log-entry';

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
  { value: '', label: 'All Resources' },
  { value: 'customer', label: 'Customer' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'session', label: 'Session' },
  { value: 'media', label: 'Media' },
  { value: 'settings', label: 'Settings' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
];

export function AuditLogClient({ initialLogs }: AuditLogClientProps) {
  const [resourceFilter, setResourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const filteredLogs = initialLogs.filter((log) => {
    if (resourceFilter && log.resource !== resourceFilter) return false;
    if (actionFilter && log.action !== actionFilter) return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center gap-3">
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {RESOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(resourceFilter || actionFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setResourceFilter('');
              setActionFilter('');
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
