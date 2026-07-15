'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CheckCheck, Info, TriangleAlert, CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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

export function NotificationsMenu({ children }: { children: ReactNode }) {
  const { data, isLoading } = useNotificationFeed();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold">
            Notifications{unread > 0 ? ` (${unread})` : ''}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin p-1">
          {isLoading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}
          {!isLoading && items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          )}
          {items.slice(0, 8).map((n) => {
            const Icon = LEVEL_ICON[n.level];
            const markRead = () => {
              if (!n.read) markOne.mutate(n.id);
            };
            const body = (
              <button
                type="button"
                onClick={markRead}
                className={cn(
                  'flex w-full gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent',
                  !n.read && 'bg-accent/40',
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', LEVEL_COLOR[n.level])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                </div>
                {!n.read && (
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} onClick={markRead}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
        <div className="border-t border-border p-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link href="/notifications">View all</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
