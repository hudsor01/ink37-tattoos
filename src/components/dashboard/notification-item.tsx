'use client';

import { formatDistance, format } from 'date-fns';
import { Bell, CreditCard, MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationType = 'BOOKING' | 'PAYMENT' | 'CONTACT' | 'LOW_STOCK';

interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: unknown;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
}

const typeIcons: Record<NotificationType, typeof Bell> = {
  BOOKING: Bell,
  PAYMENT: CreditCard,
  CONTACT: MessageSquare,
  LOW_STOCK: AlertTriangle,
};

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const Icon = typeIcons[notification.type] ?? Bell;
  const createdAt = new Date(notification.createdAt);

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted',
        !notification.isRead && 'bg-muted/50',
      )}
      onClick={() => {
        if (!notification.isRead) {
          onMarkRead(notification.id);
        }
      }}
    >
      {/* Unread indicator */}
      <div className="mt-1.5 flex-shrink-0">
        {!notification.isRead ? (
          <div className="h-2 w-2 rounded-full bg-blue-500" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', !notification.isRead && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.message}
        </p>
        <span
          className="mt-1 text-xs text-muted-foreground/70"
          title={format(createdAt, 'MMM d, yyyy h:mm a')}
        >
          {formatDistance(createdAt, new Date(), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
}
