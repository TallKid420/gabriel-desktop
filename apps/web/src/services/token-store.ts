/**
 * Token store — the single place JWTs live on the client.
 *
 * The backend also sets an httpOnly session cookie, but because the web app
 * and the API run on different origins in development we primarily attach the
 * access token as a Bearer header. The refresh token is single-use and rotated
 * on every refresh (family-based reuse detection server-side), so we always
 * persist the latest pair atomically.
 */

const ACCESS_KEY = 'gabriel.accessToken';
const REFRESH_KEY = 'gabriel.refreshToken';
const EXPIRES_KEY = 'gabriel.accessExpiresAt';

export interface TokenPair {
  accessToken: string;
  refreshToken?: string | null;
  /** ISO timestamp when the access token expires. */
  expiresAt?: string | null;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function setTokens(pair: TokenPair): void {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS_KEY, pair.accessToken);
  if (pair.refreshToken) s.setItem(REFRESH_KEY, pair.refreshToken);
  if (pair.expiresAt) s.setItem(EXPIRES_KEY, pair.expiresAt);
}

export function getAccessToken(): string | null {
  return storage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return storage()?.getItem(REFRESH_KEY) ?? null;
}

/** True when the access token is missing or within `skewMs` of expiry. */
export function isAccessTokenExpired(skewMs = 30_000): boolean {
  const s = storage();
  if (!s) return false;
  if (!s.getItem(ACCESS_KEY)) return true;
  const expiresAt = s.getItem(EXPIRES_KEY);
  if (!expiresAt) return false; // unknown expiry — let the server decide
  return Date.now() + skewMs >= new Date(expiresAt).getTime();
}

export function clearTokens(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS_KEY);
  s.removeItem(REFRESH_KEY);
  s.removeItem(EXPIRES_KEY);
  // Legacy key from the M0 dev-identity era.
  s.removeItem('gabriel.principalToken');
}
