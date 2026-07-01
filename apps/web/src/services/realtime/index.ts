/**
 * Realtime client factory.
 *
 * Selects the active transport for the app. During M0 (no Gateway) we use the
 * mock transport with scripted chat streaming. When the Gateway lands, switch
 * `defaultTransport` to WebSocket/SSE — no feature code changes because everyone
 * consumes the RealtimeTransport interface.
 */
import { createMockTransport } from './mock-transport';
import { chatMockScript } from './mock-scripts';
import type { RealtimeTransport } from './types';

export * from './types';
export { createMockTransport } from './mock-transport';
export { createSSETransport } from './sse-transport';
export { createWebSocketTransport } from './websocket-transport';

let _transport: RealtimeTransport | null = null;

/** The process-wide realtime transport. */
export function getRealtimeTransport(): RealtimeTransport {
  if (_transport) return _transport;
  // M0: mock. Later: createWebSocketTransport(`${WS_URL}`) / createSSETransport(...)
  _transport = createMockTransport(chatMockScript);
  return _transport;
}

/** Override the transport (used by tests and, later, environment wiring). */
export function setRealtimeTransport(transport: RealtimeTransport): void {
  _transport = transport;
}
