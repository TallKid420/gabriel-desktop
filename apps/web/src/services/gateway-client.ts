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

/**
 * Domains that have a live Gateway/backend and should bypass the mock.
 *
 * Milestones migrate one domain at a time: a single global `USE_MOCK` would
 * force every un-migrated domain (chat, agents, documents…) to hit endpoints
 * that don't exist yet. `isMock(domain)` lets M1 flip *auth* to live while the
 * rest keep serving mock data. Enable a domain by setting its env flag to true.
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

/** Perform a JSON request against the Gateway. Session travels via httpOnly cookie. */
export async function gatewayRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, params, signal, form } = options;

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: form ? undefined : body ? { 'Content-Type': 'application/json' } : undefined,
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
