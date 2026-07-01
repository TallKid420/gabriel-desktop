/**
 * WebSocket transport. Recommended for chat streaming, agent state, and
 * notifications (ADR-033). Multiplexes logical channels over a single socket
 * using a small envelope: { channel, event, data }. Implements the same
 * RealtimeTransport contract as the SSE transport.
 */
import type {
  RealtimeHandlers,
  RealtimeSubscribeOptions,
  RealtimeSubscription,
  RealtimeTransport,
} from './types';

interface Envelope {
  channel: string;
  event?: string;
  data: unknown;
}

export function createWebSocketTransport(wsUrl: string): RealtimeTransport {
  let socket: WebSocket | null = null;
  let connecting: Promise<WebSocket> | null = null;
  const channels = new Map<string, Set<(env: Envelope) => void>>();

  function ensureSocket(): Promise<WebSocket> {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return Promise.resolve(socket);
    }
    if (connecting) return connecting;
    connecting = new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        socket = ws;
        connecting = null;
        resolve(ws);
      };
      ws.onerror = () => reject(new Error('WebSocket connection failed'));
      ws.onmessage = (ev) => {
        try {
          const env = JSON.parse(ev.data) as Envelope;
          channels.get(env.channel)?.forEach((cb) => cb(env));
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        socket = null;
      };
    });
    return connecting;
  }

  return {
    id: 'websocket',
    subscribe<T>(
      path: string,
      handlers: RealtimeHandlers<T>,
      options?: RealtimeSubscribeOptions,
    ): RealtimeSubscription {
      let status: RealtimeSubscription['status'] = 'connecting';
      handlers.onStatus?.('connecting');

      const listener = (env: Envelope) => {
        handlers.onMessage({ event: env.event, data: env.data as T });
      };
      if (!channels.has(path)) channels.set(path, new Set());
      channels.get(path)!.add(listener);

      ensureSocket()
        .then((ws) => {
          status = 'open';
          handlers.onStatus?.('open');
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channel: path,
              params: options?.params,
              body: options?.body,
            }),
          );
        })
        .catch((err) => {
          status = 'error';
          handlers.onStatus?.('error');
          handlers.onError?.(err as Error);
        });

      return {
        get status() {
          return status;
        },
        close() {
          channels.get(path)?.delete(listener);
          socket?.send(JSON.stringify({ type: 'unsubscribe', channel: path }));
          status = 'closed';
          handlers.onStatus?.('closed');
        },
      };
    },
  };
}
