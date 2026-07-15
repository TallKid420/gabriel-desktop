/**
 * Notifications service (ADR-032) — backed by gabriel-core's per-user
 * notification inbox. Business services emit events; the Notification Service
 * resolves recipients. The UI renders them and toggles read state.
 */
import type { Notification, NotificationLevel } from '@/types';
import type { NotificationListDto, NotificationDto } from '@/types/api';
import { gatewayRequest } from './gateway-client';

/** Derive a display level from the backend's free-form notification type. */
function levelFromType(type: string): NotificationLevel {
  const t = type.toLowerCase();
  if (t.includes('fail') || t.includes('error')) return 'error';
  if (t.includes('warn')) return 'warning';
  if (t.includes('complete') || t.includes('success') || t.includes('ready'))
    return 'success';
  return 'info';
}

function mapNotification(dto: NotificationDto): Notification {
  return {
    id: dto.grn,
    level: levelFromType(dto.type),
    title: dto.title,
    body: dto.body ?? undefined,
    createdAt: dto.created_at,
    read: dto.read,
  };
}

export interface NotificationFeed {
  items: Notification[];
  unreadCount: number;
  total: number;
}

export async function getNotificationFeed(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationFeed> {
  const page = await gatewayRequest<NotificationListDto>('/notifications', {
    params: {
      unread_only: options?.unreadOnly || undefined,
      limit: options?.limit ?? 50,
    },
  });
  return {
    items: page.items.map(mapNotification),
    unreadCount: page.unread_count,
    total: page.total,
  };
}

/** Legacy list helper — returns items only. */
export async function listNotifications(): Promise<Notification[]> {
  const feed = await getNotificationFeed();
  return feed.items;
}

export async function markNotificationRead(grn: string): Promise<void> {
  await gatewayRequest<unknown>(
    `/notifications/${encodeURIComponent(grn)}/read`,
    { method: 'POST' },
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  await gatewayRequest<unknown>('/notifications/read-all', { method: 'POST' });
}
