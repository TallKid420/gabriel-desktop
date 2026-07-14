/**
 * Auth service — talks to gabriel-core's `/auth` endpoints.
 *
 * Flow: register/login return an access token (JWT, short-lived) plus a
 * single-use rotated refresh token. Both are kept in the token store; every
 * request attaches the access token, and the client transparently refreshes
 * on expiry/401 (see gateway-client). Logout revokes the refresh token
 * server-side and clears local state.
 */
import type { DevPrincipalOption, Session } from '@/types';
import type {
  LoginResponseDto,
  RegisterResponseDto,
  SessionDto,
  TokenPairDto,
  UserDto,
} from '@/types/api';
import { gatewayRequest } from './gateway-client';
import { clearTokens, getRefreshToken, setTokens } from './token-store';

function mapSession(dto: SessionDto): Session {
  return {
    user: {
      id: dto.user.id ?? dto.user.principal,
      principal: dto.user.principal,
      displayName: dto.user.displayName,
      email: dto.user.email ?? undefined,
      avatarUrl: dto.user.avatarUrl,
      initials:
        dto.user.initials ||
        dto.user.displayName
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
      roles: (dto.user.roles ?? []) as Session['user']['roles'],
    },
    organization: { id: dto.organization.id, name: dto.organization.name },
    tenantId: dto.tenantId,
    authMethod: dto.authMethod,
    expiresAt: dto.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

function persistTokens(pair: TokenPairDto): void {
  setTokens({
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token ?? null,
    expiresAt: pair.expires_at ?? null,
  });
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  organizationName?: string;
}

/** Self-service signup: creates an organization + owner user, then signs in. */
export async function register(input: RegisterInput): Promise<Session> {
  const response = await gatewayRequest<RegisterResponseDto>('/auth/register', {
    method: 'POST',
    body: {
      email: input.email,
      password: input.password,
      display_name: input.displayName,
      organization_name: input.organizationName || undefined,
    },
  });
  persistTokens(response);
  const session = mapSession(response.session);
  // Registration returns the authoritative org display name — prefer it.
  if (response.organization?.name) {
    session.organization = {
      id: response.organization.id,
      name: response.organization.name,
    };
  }
  return session;
}

export interface LoginInput {
  email: string;
  password: string;
  /** Optional org disambiguation when the email exists in several orgs. */
  orgId?: string;
}

/** Email/password login via the backend's password identity provider. */
export async function loginWithPassword(input: LoginInput): Promise<Session> {
  const response = await gatewayRequest<LoginResponseDto>('/auth/login', {
    method: 'POST',
    body: {
      method: 'password',
      credentials: {
        email: input.email,
        password: input.password,
        ...(input.orgId ? { org_id: input.orgId } : {}),
      },
    },
  });
  persistTokens(response);
  return mapSession(response.session);
}

/** List identities selectable in the Dev Identity Provider (dev only). */
export async function listDevPrincipals(): Promise<DevPrincipalOption[]> {
  try {
    return await gatewayRequest<DevPrincipalOption[]>('/auth/dev/principals');
  } catch {
    return [];
  }
}

/** Sign in as a dev principal (development environments only). */
export async function loginWithDevPrincipal(userId: string): Promise<Session> {
  const response = await gatewayRequest<LoginResponseDto>('/auth/login', {
    method: 'POST',
    body: { method: 'dev', credentials: { userId } },
  });
  persistTokens(response);
  return mapSession(response.session);
}

/** Read the current session, or null if unauthenticated. */
export async function getSession(): Promise<Session | null> {
  try {
    const dto = await gatewayRequest<SessionDto>('/auth/session', {
      anonymous: false,
    });
    return mapSession(dto);
  } catch {
    return null;
  }
}

/** The full user record behind the session (email, timestamps, GRN). */
export async function getOwnUser(): Promise<UserDto | null> {
  try {
    return await gatewayRequest<UserDto>('/users/me');
  } catch {
    return null;
  }
}

/** Change the calling user's password. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await gatewayRequest<void>('/users/me/password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

/** End the session: revoke the refresh token server-side, clear local state. */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    await gatewayRequest<void>('/auth/logout', {
      method: 'POST',
      body: refreshToken ? { refresh_token: refreshToken } : {},
    });
  } catch {
    // Best-effort: local sign-out must succeed even if the API is down.
  } finally {
    clearTokens();
  }
}
