'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Info,
  TriangleAlert,
  CircleCheck,
  CircleX,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, LoadingRows } from '@/components/common/states';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import {
  useNotificationFeed,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/use-notifications';
import type { NotificationLevel } from '@/types';

const LEVEL_ICON: Record<NotificationLevel, typeof Info> = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  error: CircleX,
};

const LEVEL_COLOR: Record<NotificationLevel, string> = {
  info: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
  error: 'text-destructive',
};

export function NotificationsView() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data, isLoading } = useNotificationFeed({
    unreadOnly: filter === 'unread',
  });
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Alerts and updates delivered to your inbox by Gabriel's services."
        actions={
          <Button
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-1.5">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === f
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f}
            {f === 'unread' && unread > 0 ? ` (${unread})` : ''}
          </button>
        ))}
      </div>

      {isLoading && <LoadingRows count={6} />}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={<Bell className="size-5" />}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          description="You're all caught up."
        />
      )}

      {!isLoading && items.length > 0 && (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {items.map((n) => {
            const Icon = LEVEL_ICON[n.level];
            const markRead = () => {
              if (!n.read) markOne.mutate(n.id);
            };
            const row = (
              <button
                type="button"
                onClick={markRead}
                className={cn(
                  'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60',
                  !n.read && 'bg-accent/30',
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', LEVEL_COLOR[n.level])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} onClick={markRead}>
                {row}
              </Link>
            ) : (
              <div key={n.id}>{row}</div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
