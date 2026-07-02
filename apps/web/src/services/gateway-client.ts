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
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8080';

/** M0 flag: serve from mock providers until the Gateway exists (M2). */
export const USE_MOCK =
  (process.env.NEXT_PUBLIC_USE_MOCK ?? 'true').toLowerCase() !== 'false';

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

  if (!response.ok) {
    let detail = response.statusText;
    let requestId: string | undefined;
    try {
      const data = await response.json();
      detail = data.detail ?? data.message ?? detail;
      requestId = data.request_id;
    } catch {
      /* non-JSON error body */
    }
    throw new GatewayError(detail, response.status, requestId);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Small helper to simulate latency for mock providers. */
export function mockDelay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
