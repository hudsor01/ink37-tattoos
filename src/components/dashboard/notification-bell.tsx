'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTransition } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { NotificationItem } from './notification-item';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/lib/actions/notification-actions';

interface NotificationData {
  id: string;
  type: 'BOOKING' | 'PAYMENT' | 'CONTACT' | 'LOW_STOCK';
  title: string;
  message: string;
  isRead: boolean;
  metadata: unknown;
  createdAt: string;
}

interface NotificationResponse {
  unreadCount: number;
  recent: NotificationData[];
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data } = useQuery<NotificationResponse>({
    queryKey: ['notifications', 'unread'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const unreadCount = data?.unreadCount ?? 0;
  const recent = data?.recent ?? [];

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleMarkAllRead}
              disabled={isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-1">
              {recent.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <Separator />
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            render={<Link href="/dashboard/notifications" />}
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
