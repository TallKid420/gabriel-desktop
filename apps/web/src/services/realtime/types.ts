/**
 * Real-time communication abstraction (ADR-033).
 *
 * Gabriel must not be hard-coded to SSE. The frontend consumes a single,
 * transport-agnostic interface; concrete transports (WebSocket, SSE, future)
 * implement it. This lets us route, e.g., chat streaming + agent state over
 * WebSockets and event feeds over SSE without changing feature code.
 */

/** A message received on a real-time channel. `data` is already JSON-parsed. */
export interface RealtimeMessage<T = unknown> {
  /** Optional server event name (SSE `event:` field / WS envelope type). */
  event?: string;
  data: T;
}

export type RealtimeStatus =
  | 'connecting'
  | 'open'
  | 'closed'
  | 'error';

export interface RealtimeHandlers<T = unknown> {
  onMessage: (message: RealtimeMessage<T>) => void;
  onStatus?: (status: RealtimeStatus) => void;
  onError?: (error: Error) => void;
}

/** A live subscription; call `close()` to disconnect. */
export interface RealtimeSubscription {
  close: () => void;
  readonly status: RealtimeStatus;
}

/**
 * The unified transport contract. Every transport (WS/SSE/mock) implements this
 * so the RealtimeClient — and therefore all feature hooks — stay identical
 * regardless of the underlying protocol.
 */
export interface RealtimeTransport {
  readonly id: string;
  /**
   * Open a subscription to a logical channel path (e.g. "chat/{id}",
   * "events", "agents/{grn}/state"). Returns a handle to close it.
   */
  subscribe<T = unknown>(
    path: string,
    handlers: RealtimeHandlers<T>,
    options?: RealtimeSubscribeOptions,
  ): RealtimeSubscription;
}

export interface RealtimeSubscribeOptions {
  /** Query params appended to the channel URL. */
  params?: Record<string, string | number | boolean>;
  /** Body for POST-initiated streams (used by chat send + stream). */
  body?: unknown;
  /** Force a specific HTTP method for the underlying request. */
  method?: 'GET' | 'POST';
  signal?: AbortSignal;
}
