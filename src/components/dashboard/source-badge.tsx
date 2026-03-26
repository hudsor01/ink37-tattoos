import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  source: string;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  if (source !== 'cal.com') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800',
        className
      )}
    >
      <Calendar className="h-3 w-3" />
      Cal.com
    </span>
  );
}
