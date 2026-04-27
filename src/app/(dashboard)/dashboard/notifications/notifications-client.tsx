'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistance } from 'date-fns';
import { toast } from 'sonner';
import {
  Bell,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/lib/actions/notification-actions';
import { cn } from '@/lib/utils';

type NotificationType = 'BOOKING' | 'PAYMENT' | 'CONTACT' | 'LOW_STOCK';

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: unknown;
  createdAt: string;
}

interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface NotificationsClientProps {
  result: PaginatedNotifications;
}

const typeIcons: Record<NotificationType, typeof Bell> = {
  BOOKING: Bell,
  PAYMENT: CreditCard,
  CONTACT: MessageSquare,
  LOW_STOCK: AlertTriangle,
};

const typeLabels: Record<NotificationType, string> = {
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  CONTACT: 'Contact',
  LOW_STOCK: 'Low Stock',
};

export function NotificationsClient({ result }: NotificationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const hasUnread = result.data.some((n) => !n.isRead);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const res = await markNotificationReadAction(id);
      if (res.success) {
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (res.success) {
        toast.success('All notifications marked as read');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function navigateToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/notifications?${params.toString()}`);
  }

  if (result.data.length === 0 && result.page === 1) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold">No notifications</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You will be notified about bookings, payments, contacts, and stock alerts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2">
        {result.data.map((n) => {
          const Icon = typeIcons[n.type] ?? Bell;
          const createdAt = new Date(n.createdAt);

          return (
            <Card
              key={n.id}
              className={cn(
                'cursor-pointer transition-colors hover:bg-muted/50',
                !n.isRead && 'border-primary/30 bg-muted/30',
              )}
              onClick={() => {
                if (!n.isRead) handleMarkRead(n.id);
              }}
            >
              <CardContent className="flex items-start gap-4 py-3">
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0">
                  {!n.isRead ? (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  ) : (
                    <div className="h-2 w-2" />
                  )}
                </div>

                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm', !n.isRead && 'font-semibold')}>
                      {n.title}
                    </p>
                    <Badge variant="secondary" className="text-micro">
                      {typeLabels[n.type]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {n.message}
                  </p>
                </div>

                {/* Timestamp */}
                <span
                  className="shrink-0 text-xs text-muted-foreground/70"
                  title={format(createdAt, 'MMM d, yyyy h:mm a')}
                >
                  {formatDistance(createdAt, new Date(), { addSuffix: true })}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {result.page} of {result.totalPages} ({result.total} notifications)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={result.page <= 1}
              onClick={() => navigateToPage(result.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page >= result.totalPages}
              onClick={() => navigateToPage(result.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
