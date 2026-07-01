/**
 * Notifications service (ADR-032). Business services emit events; the
 * Notification Service resolves recipients/channels/delivery. The UI only
 * renders delivered notifications and toggles read state.
 */
import type { Notification } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { notifications as mockNotifications } from './mock/data';

export async function listNotifications(): Promise<Notification[]> {
  if (USE_MOCK) {
    const sorted = [...mockNotifications].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return mockDelay(sorted);
  }
  return gatewayRequest<Notification[]>('/notifications');
}

export async function markNotificationRead(id: string): Promise<void> {
  if (USE_MOCK) {
    const n = mockNotifications.find((x) => x.id === id);
    if (n) n.read = true;
    await mockDelay(null, 80);
    return;
  }
  await gatewayRequest<void>(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  if (USE_MOCK) {
    mockNotifications.forEach((n) => (n.read = true));
    await mockDelay(null, 80);
    return;
  }
  await gatewayRequest<void>('/notifications/read-all', { method: 'POST' });
}
