/**
 * Identity & session domain types.
 *
 * These reflect the canonical Gabriel identity issued by the Identity Service
 * (ADR-007). The browser never sees a Core principal token — only this
 * session-scoped view. Fine-grained permissions are intentionally absent:
 * authorization is evaluated at runtime by Core's Policy Engine (ADR-019).
 */
import type { GRN } from './common';

export interface Organization {
  id: string;
  name: string;
  /** e.g. "Enterprise", "Pilot". Display-only. */
  plan?: string;
}

/** Coarse role hints only — never the source of truth for authorization. */
export type Role =
  | 'workspace_admin'
  | 'member'
  | 'developer'
  | 'operator'
  | 'viewer';

export interface User {
  id: string;
  /** Canonical Core principal, e.g. principal://org_acme/user/alice */
  principal: GRN;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  initials: string;
  roles: Role[];
}

/**
 * The authenticated session as the web app understands it. Backed by an
 * httpOnly cookie; this object holds only non-sensitive display context
 * hydrated from the Gateway's /auth/session endpoint.
 */
export interface Session {
  user: User;
  organization: Organization;
  tenantId: string;
  /** How the user authenticated: dev | password | google | entra | okta ... */
  authMethod: string;
  expiresAt: string;
}

/** A selectable identity in the Dev Identity Provider (development only). */
export interface DevPrincipalOption {
  organization: Organization;
  user: Pick<User, 'id' | 'displayName' | 'principal' | 'initials' | 'email'>;
  roles: Role[];
}
