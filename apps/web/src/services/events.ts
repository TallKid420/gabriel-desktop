/**
 * Events service — read immutable Core events (ADR-017/018) and subscribe to a
 * live feed. Per ADR-033, event feeds are a natural fit for SSE; in M0 the mock
 * transport replays scripted events. Feature code consumes the same interface
 * regardless of transport.
 */
import type { GabrielEvent } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { getRealtimeTransport } from './realtime';
import { events as mockEvents } from './mock/data';

export async function listEvents(): Promise<GabrielEvent[]> {
  if (USE_MOCK) {
    const sorted = [...mockEvents].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    );
    return mockDelay(sorted);
  }
  return gatewayRequest<GabrielEvent[]>('/events');
}

/** Subscribe to the live event feed. Returns a disposer. */
export function subscribeToEvents(
  onEvent: (event: GabrielEvent) => void,
): () => void {
  const transport = getRealtimeTransport();
  const sub = transport.subscribe<GabrielEvent>('events', {
    onMessage: ({ data }) => onEvent(data),
  });
  return () => sub.close();
}
