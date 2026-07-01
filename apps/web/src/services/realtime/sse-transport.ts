/**
 * SSE transport. Uses fetch + ReadableStream (not EventSource) so it can send
 * auth via cookies, use POST for chat streams, and parse `data:` frames the way
 * the Gabriel Gateway emits them. Implements the same RealtimeTransport
 * contract as the WebSocket transport.
 */
import type {
  RealtimeHandlers,
  RealtimeSubscribeOptions,
  RealtimeSubscription,
  RealtimeTransport,
} from './types';

function parseSSEChunk(buffer: string): {
  events: { event?: string; data: string }[];
  rest: string;
} {
  const events: { event?: string; data: string }[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join('\n') });
  }
  return { events, rest };
}

export function createSSETransport(baseUrl: string): RealtimeTransport {
  return {
    id: 'sse',
    subscribe<T>(
      path: string,
      handlers: RealtimeHandlers<T>,
      options?: RealtimeSubscribeOptions,
    ): RealtimeSubscription {
      const controller = new AbortController();
      const signal = options?.signal
        ? anySignal([controller.signal, options.signal])
        : controller.signal;
      let status: RealtimeSubscription['status'] = 'connecting';
      handlers.onStatus?.('connecting');

      const url = new URL(`${baseUrl}/${path}`.replace(/([^:])\/\//g, '$1/'));
      for (const [k, v] of Object.entries(options?.params ?? {})) {
        url.searchParams.set(k, String(v));
      }

      (async () => {
        try {
          const response = await fetch(url.toString(), {
            method: options?.method ?? (options?.body ? 'POST' : 'GET'),
            headers: {
              Accept: 'text/event-stream',
              ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: options?.body ? JSON.stringify(options.body) : undefined,
            credentials: 'include',
            signal,
          });
          if (!response.ok || !response.body) {
            throw new Error(`SSE request failed: ${response.status}`);
          }
          status = 'open';
          handlers.onStatus?.('open');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const { events, rest } = parseSSEChunk(buffer);
            buffer = rest;
            for (const e of events) {
              let data: unknown = e.data;
              try {
                data = JSON.parse(e.data);
              } catch {
                /* keep raw string */
              }
              handlers.onMessage({ event: e.event, data: data as T });
            }
          }
          status = 'closed';
          handlers.onStatus?.('closed');
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          status = 'error';
          handlers.onStatus?.('error');
          handlers.onError?.(err as Error);
        }
      })();

      return {
        get status() {
          return status;
        },
        close() {
          controller.abort();
        },
      };
    },
  };
}

/** Combine multiple abort signals into one. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
