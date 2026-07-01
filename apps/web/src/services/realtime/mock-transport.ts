/**
 * Mock real-time transport for M0 (no Gateway yet).
 *
 * Emits scripted messages so streaming UIs (chat, agent state) can be developed
 * and demoed end-to-end. Swapped for the SSE/WebSocket transport once the
 * Gateway exists — feature code does not change.
 */
import type {
  RealtimeHandlers,
  RealtimeSubscribeOptions,
  RealtimeSubscription,
  RealtimeTransport,
} from './types';

export type MockScript = (
  path: string,
  options: RealtimeSubscribeOptions | undefined,
  emit: (event: string | undefined, data: unknown) => void,
) => void | (() => void);

/**
 * @param script  Called on each subscribe; drives the emitted messages. Return
 *                an optional cleanup fn (e.g. clearTimeout).
 */
export function createMockTransport(script: MockScript): RealtimeTransport {
  return {
    id: 'mock',
    subscribe<T>(
      path: string,
      handlers: RealtimeHandlers<T>,
      options?: RealtimeSubscribeOptions,
    ): RealtimeSubscription {
      let status: RealtimeSubscription['status'] = 'connecting';
      handlers.onStatus?.('connecting');

      let cleanup: void | (() => void);
      const timer = setTimeout(() => {
        status = 'open';
        handlers.onStatus?.('open');
        cleanup = script(path, options, (event, data) => {
          handlers.onMessage({ event, data: data as T });
        });
      }, 30);

      return {
        get status() {
          return status;
        },
        close() {
          clearTimeout(timer);
          if (cleanup) cleanup();
          status = 'closed';
          handlers.onStatus?.('closed');
        },
      };
    },
  };
}
