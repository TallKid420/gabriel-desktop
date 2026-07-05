/**
 * The typed Gateway client — the ONLY module that performs HTTP to the Gabriel
 * Gateway (BFF). Feature code must go through services, which use this client;
 * components never fetch directly.
 *
 * During M0 there is no Gateway, so `USE_MOCK` short-circuits network calls and
 * services return mock data. Flipping `USE_MOCK` to false (once the Gateway is
 * up) activates real requests with zero changes to feature code.
 */

export const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8000';

/** M0 flag: serve from mock providers until the Gateway exists (M2). */
export const USE_MOCK =
  (process.env.NEXT_PUBLIC_USE_MOCK ?? 'true').toLowerCase() !== 'false';

/**
 * The Gateway is the BFF that fronts the Identity Service (ADR-007). The browser never mints or inspects primary tokens.
 */

export type LiveDomain = 'auth';

const LIVE_DOMAINS: Record<LiveDomain, boolean> = {
  auth: (process.env.NEXT_PUBLIC_LIVE_AUTH ?? 'false').toLowerCase() === 'true',
};

/** True when the given domain should still use mock providers. */
export function isMock(domain: LiveDomain): boolean {
  // A global mock override (USE_MOCK=false) also switches everything live.
  if (!USE_MOCK) return false;
  return !LIVE_DOMAINS[domain];
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Multipart form data (document uploads). Overrides `body`. */
  form?: FormData;
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
  const url = new URL(`${GATEWAY_URL}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function readPrincipalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('gabriel.principalToken');
}

function shouldAttachPrincipalToken(path: string): boolean {
  return !path.startsWith('/auth/');
}

function parseJsonBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function getGatewayErrorInfo(data: unknown): {
  hasError: boolean;
  detail?: string;
  requestId?: string;
} {
  if (!data || typeof data !== 'object') {
    return { hasError: false };
  }

  const payload = data as Record<string, unknown>;
  const hasError =
    payload.error !== undefined ||
    payload.errors !== undefined ||
    payload.ok === false ||
    payload.success === false ||
    payload.status === 'error';

  if (!hasError) {
    return { hasError: false };
  }

  const detail =
    (typeof payload.detail === 'string' ? payload.detail : undefined) ??
    (typeof payload.message === 'string' ? payload.message : undefined) ??
    (typeof payload.error === 'string' ? payload.error : undefined);

  const requestId =
    typeof payload.request_id === 'string' ? payload.request_id : undefined;

  return { hasError: true, detail, requestId };
}

/** Perform a JSON request against the Gateway. Session travels via httpOnly cookie. */
export async function gatewayRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, params, signal, form, headers } = options;

  const requestHeaders = new Headers(headers);
  if (!form && body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (shouldAttachPrincipalToken(path)) {
    const principalToken = readPrincipalToken();
    if (principalToken && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${principalToken}`);
    }
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    credentials: 'include',
    signal,
  });

  const text = response.status === 204 ? '' : await response.text();
  const data = text ? parseJsonBody(text) : undefined;

  if (!response.ok) {
    let detail = response.statusText;
    let requestId: string | undefined;
    const errorInfo = getGatewayErrorInfo(data);
    if (errorInfo.detail) detail = errorInfo.detail;
    requestId = errorInfo.requestId;
    throw new GatewayError(detail, response.status, requestId);
  }

  if (response.status === 204) return undefined as T;

  const errorInfo = getGatewayErrorInfo(data);
  if (errorInfo.hasError) {
    throw new GatewayError(errorInfo.detail ?? 'Gateway returned an error payload', response.status, errorInfo.requestId);
  }

  return data as T;
}

/** Small helper to simulate latency for mock providers. */
export function mockDelay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
