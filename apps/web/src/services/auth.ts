/**
 * Auth service — talks to the Gateway's session endpoints, which delegate to
 * the Identity Service (ADR-007). The browser never mints or inspects primary
 * tokens; it only reads a session view backed by an httpOnly cookie.
 *
 * M0: no Gateway/Identity Service yet, so the Dev Identity Provider is emulated
 * locally from mock principals. The shape of what we return here is identical
 * to what the real /auth/session endpoint will produce, so nothing downstream
 * changes when USE_MOCK flips to false.
 */
import type { DevPrincipalOption, Session } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { devPrincipals } from './mock/data';

const SESSION_STORAGE_KEY = 'gabriel.session';
const PRINCIPAL_TOKEN_STORAGE_KEY = 'gabriel.principalToken';

function persistPrincipalToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(PRINCIPAL_TOKEN_STORAGE_KEY, token);
    return;
  }
  window.localStorage.removeItem(PRINCIPAL_TOKEN_STORAGE_KEY);
}

/** List identities selectable in the Dev Identity Provider (dev only). */
export async function listDevPrincipals(): Promise<DevPrincipalOption[]> {
  if (USE_MOCK) return mockDelay(devPrincipals, 120);
  return gatewayRequest<DevPrincipalOption[]>('/auth/dev/principals');
}

/** Build a Session view from a selected dev principal. */
function sessionFromPrincipal(option: DevPrincipalOption): Session {
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  return {
    user: {
      id: option.user.id,
      principal: option.user.principal,
      displayName: option.user.displayName,
      email: option.user.email,
      initials: option.user.initials,
      avatarUrl: null,
      roles: option.roles,
    },
    organization: option.organization,
    tenantId: option.organization.id,
    authMethod: 'dev',
    expiresAt: expires,
  };
}

/**
 * Log in. In prod this posts credentials/authorization codes to the Gateway,
 * which delegates to the Identity Service and sets an httpOnly session cookie.
 * In M0 we resolve the chosen dev principal and persist a session view locally.
 */
export async function loginWithDevPrincipal(userId: string): Promise<Session> {
  if (USE_MOCK) {
    const option = devPrincipals.find((p) => p.user.id === userId);
    if (!option) throw new Error(`Unknown dev principal: ${userId}`);
    const session = sessionFromPrincipal(option);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    persistPrincipalToken(session.user.principal);
    return mockDelay(session, 200);
  }
  const session = await gatewayRequest<Session>('/auth/dev/login', {
    method: 'POST',
    body: { userId },
  });
  persistPrincipalToken(session.user.principal);
  return session;
}

/** Read the current session, or null if unauthenticated. */
export async function getSession(): Promise<Session | null> {
  if (USE_MOCK) {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    persistPrincipalToken(session?.user.principal ?? null);
    return session;
  }
  try {
    const session = await gatewayRequest<Session>('/auth/session');
    persistPrincipalToken(session.user.principal);
    return session;
  } catch {
    persistPrincipalToken(null);
    return null;
  }
}

/** End the session. Clears the cookie server-side in prod. */
export async function logout(): Promise<void> {
  if (USE_MOCK) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    persistPrincipalToken(null);
    return;
  }
  await gatewayRequest<void>('/auth/logout', { method: 'POST' });
  persistPrincipalToken(null);
}
