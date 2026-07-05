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
import { gatewayRequest, isMock, mockDelay } from './gateway-client';
import { devPrincipals } from './mock/data';

const SESSION_STORAGE_KEY = 'gabriel.session';

/** List identities selectable in the Dev Identity Provider (dev only). */
export async function listDevPrincipals(): Promise<DevPrincipalOption[]> {
  if (isMock('auth')) return mockDelay(devPrincipals, 120);
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
  if (isMock('auth')) {
    const option = devPrincipals.find((p) => p.user.id === userId);
    if (!option) throw new Error(`Unknown dev principal: ${userId}`);
    const session = sessionFromPrincipal(option);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    return mockDelay(session, 200);
  }
  return gatewayRequest<Session>('/auth/dev/login', {
    method: 'POST',
    body: { userId },
  });
}

/** Read the current session, or null if unauthenticated. */
export async function getSession(): Promise<Session | null> {
  if (isMock('auth')) {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  }
  try {
    return await gatewayRequest<Session>('/auth/session');
  } catch {
    return null;
  }
}

/** End the session. Clears the cookie server-side in prod. */
export async function logout(): Promise<void> {
  if (isMock('auth')) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return;
  }
  await gatewayRequest<void>('/auth/logout', { method: 'POST' });
}
