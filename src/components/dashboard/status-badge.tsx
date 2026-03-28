import { cn } from '@/lib/utils';

const statusColorMap: Record<string, string> = {
  PENDING: 'bg-status-pending/15 text-status-pending',
  CONFIRMED: 'bg-status-confirmed/15 text-status-confirmed',
  SCHEDULED: 'bg-status-scheduled/15 text-status-scheduled',
  IN_PROGRESS: 'bg-status-in-progress/15 text-status-in-progress',
  COMPLETED: 'bg-status-completed/15 text-status-completed',
  CANCELLED: 'bg-status-cancelled/15 text-status-cancelled',
  PROCESSING: 'bg-status-processing/15 text-status-processing',
  FAILED: 'bg-status-failed/15 text-status-failed',
  REFUNDED: 'bg-status-refunded/15 text-status-refunded',
  PAID: 'bg-status-paid/15 text-status-paid',
  SHIPPED: 'bg-status-shipped/15 text-status-shipped',
  DELIVERED: 'bg-status-delivered/15 text-status-delivered',
  NO_SHOW: 'bg-status-no-show/15 text-status-no-show',
  NEW: 'bg-status-new/15 text-status-new',
  READ: 'bg-status-read/15 text-status-read',
  REPLIED: 'bg-status-replied/15 text-status-replied',
  RESOLVED: 'bg-status-resolved/15 text-status-resolved',
};

const DEFAULT_COLOR = 'bg-status-default/15 text-status-default';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColorMap[status] ?? DEFAULT_COLOR;
  const displayText = status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      {displayText}
    </span>
  );
}
