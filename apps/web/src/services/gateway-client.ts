/**
 * The typed API client — the ONLY module that performs HTTP to the gabriel-core
 * backend. Feature code must go through services, which use this client;
 * components never fetch directly.
 *
 * Responsibilities:
 *  - Base-URL resolution (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000/api/v1`)
 *  - Bearer-token attachment from the token store
 *  - Transparent single-flight refresh on 401 (rotated refresh tokens)
 *  - Uniform error surface (`GatewayError`)
 *  - SSE streaming for the AI gateway chat endpoint
 */
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  setTokens,
} from './token-store';
import type { TokenPairDto } from '@/types/api';

/** Root of the gabriel-core REST API (includes the `/api/v1` prefix). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  `${process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8000'}/api/v1`;

/** @deprecated legacy alias kept for older call sites. */
export const GATEWAY_URL = API_URL;

/** Mock flag — only a few non-core surfaces (dashboard widgets) still use it. */
export const USE_MOCK =
  (process.env.NEXT_PUBLIC_USE_MOCK ?? 'false').toLowerCase() === 'true';

export type LiveDomain = 'auth';

/** True when the given domain should still use mock providers. */
export function isMock(_domain: LiveDomain): boolean {
  return USE_MOCK;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Multipart form data (document uploads). Overrides `body`. */
  form?: FormData;
  /** Skip Authorization header + refresh logic (auth endpoints). */
  anonymous?: boolean;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function parseJsonBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function errorDetail(data: unknown, fallback: string): { detail: string; requestId?: string } {
  if (!data || typeof data !== 'object') return { detail: fallback };
  const payload = data as Record<string, unknown>;
  const detail =
    (typeof payload.detail === 'string' ? payload.detail : undefined) ??
    (typeof payload.message === 'string' ? payload.message : undefined) ??
    (typeof payload.error === 'string' ? payload.error : undefined) ??
    fallback;
  const requestId =
    typeof payload.request_id === 'string' ? payload.request_id : undefined;
  return { detail, requestId };
}

// ── Token refresh (single-flight) ───────────────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

/** Handlers other modules can register for auth lifecycle transitions. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Register a callback fired when the session is irrecoverably invalid. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

/**
 * Rotate the refresh token and store the new pair. Single-flight: concurrent
 * 401s share one refresh call (rotated tokens are single-use server-side).
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: 'include',
      });
      if (!response.ok) return false;
      const data = (await response.json()) as TokenPairDto;
      setTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: data.expires_at ?? null,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function authHeader(anonymous: boolean): Promise<string | null> {
  if (anonymous) return null;
  // Proactively refresh when the access token is (about to be) expired.
  if (isAccessTokenExpired() && getRefreshToken()) {
    await refreshAccessToken();
  }
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

// ── Core JSON request ───────────────────────────────────────────────────────

async function performRequest(
  path: string,
  options: RequestOptions,
  bearer: string | null,
): Promise<Response> {
  const { method = 'GET', body, params, signal, form, headers } = options;
  const requestHeaders = new Headers(headers);
  if (!form && body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (bearer && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', bearer);
  }
  return fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    credentials: 'include',
    signal,
  });
}

/**
 * Perform a JSON request against the backend. Attaches the Bearer token and
 * transparently retries once after a refresh when the server answers 401.
 */
export async function gatewayRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const anonymous = options.anonymous ?? path.startsWith('/auth/');
  let bearer = await authHeader(anonymous);
  let response = await performRequest(path, options, bearer);

  if (response.status === 401 && !anonymous) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      bearer = getAccessToken() ? `Bearer ${getAccessToken()}` : null;
      response = await performRequest(path, options, bearer);
    }
    if (response.status === 401) {
      clearTokens();
      onUnauthorized?.();
    }
  }

  const text = response.status === 204 ? '' : await response.text();
  const data = text ? parseJsonBody(text) : undefined;

  if (!response.ok) {
    const { detail, requestId } = errorDetail(data, response.statusText);
    throw new GatewayError(detail, response.status, requestId);
  }

  return (response.status === 204 ? undefined : data) as T;
}

// ── SSE streaming ───────────────────────────────────────────────────────────

export interface SSEFrame {
  event?: string;
  data: unknown;
}

export interface StreamHandlers {
  onEvent: (frame: SSEFrame) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

function parseSSEChunk(buffer: string): {
  frames: { event?: string; data: string }[];
  rest: string;
} {
  const frames: { event?: string; data: string }[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length) frames.push({ event, data: dataLines.join('\n') });
  }
  return { frames, rest };
}

/**
 * POST to an SSE endpoint (e.g. `/gateway/chat/stream`) and surface parsed
 * frames. Uses fetch + ReadableStream (not EventSource) so it can send a JSON
 * body and the Bearer token. Returns a disposer that aborts the stream.
 */
export function gatewayStream(
  path: string,
  body: unknown,
  handlers: StreamHandlers,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      let bearer = await authHeader(false);
      let response = await fetch(buildUrl(path), {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...(bearer ? { Authorization: bearer } : {}),
        },
        body: JSON.stringify(body),
        credentials: 'include',
        signal: controller.signal,
      });

      if (response.status === 401 && (await refreshAccessToken())) {
        bearer = getAccessToken() ? `Bearer ${getAccessToken()}` : null;
        response = await fetch(buildUrl(path), {
          method: 'POST',
          headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            ...(bearer ? { Authorization: bearer } : {}),
          },
          body: JSON.stringify(body),
          credentials: 'include',
          signal: controller.signal,
        });
      }

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '');
        const { detail } = errorDetail(parseJsonBody(text), `Stream failed (${response.status})`);
        throw new GatewayError(detail, response.status);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { frames, rest } = parseSSEChunk(buffer);
        buffer = rest;
        for (const frame of frames) {
          let data: unknown = frame.data;
          try {
            data = JSON.parse(frame.data);
          } catch {
            /* keep raw string */
          }
          handlers.onEvent({ event: frame.event, data });
        }
      }
      handlers.onClose?.();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      handlers.onError?.(err as Error);
    }
  })();

  return () => controller.abort();
}

/** Small helper to simulate latency for the few remaining mock providers. */
export function mockDelay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
