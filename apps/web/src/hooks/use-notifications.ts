'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications as notificationsService } from '@/services';
import type { Notification } from '@/types';

const KEY = ['notifications'];
const FEED_KEY = ['notifications', 'feed'];

/** Full feed with unread count; polled so the bell badge stays fresh. */
export function useNotificationFeed(options?: { unreadOnly?: boolean }) {
  const unreadOnly = options?.unreadOnly ?? false;
  return useQuery({
    queryKey: [...FEED_KEY, unreadOnly ? 'unread' : 'all'],
    queryFn: () => notificationsService.getNotificationFeed({ unreadOnly }),
    refetchInterval: 30_000,
  });
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: KEY,
    queryFn: () => notificationsService.listNotifications(),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
