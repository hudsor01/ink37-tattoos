import { cn } from '@/lib/utils';

interface AuditLogEntryProps {
  entry: {
    id: string;
    userId: string | null;
    action: string;
    resource: string;
    resourceId: string | null;
    ip: string;
    userAgent: string;
    timestamp: Date | string;
    metadata: unknown;
    user: { name: string; email: string } | null;
  };
}

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

function formatTimestamp(ts: Date | string): string {
  const date = typeof ts === 'string' ? new Date(ts) : ts;
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

export function AuditLogEntry({ entry }: AuditLogEntryProps) {
  const borderColor = actionColors[entry.action] ?? 'border-l-gray-300';
  const verb = actionVerbs[entry.action] ?? entry.action;
  const userName = entry.user?.name ?? 'System';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-l-4 bg-card p-4',
        borderColor
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {getInitials(userName)}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium">{userName}</span>
          <span className="text-sm text-muted-foreground">
            {verb} {entry.resource}
            {entry.resourceId && (
              <span className="font-mono text-xs ml-1">
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
  );
}
