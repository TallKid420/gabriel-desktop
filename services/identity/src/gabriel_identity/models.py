"""API and domain models.

These mirror the shapes the Gateway and web app already expect (see the web
app's ``types/identity.ts``). The ``SessionView`` deliberately excludes any
permission data — coarse ``roles`` are non-authoritative display hints only.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Organization(BaseModel):
    id: str
    name: str
    plan: str | None = None


class Principal(BaseModel):
    """A canonical Gabriel identity."""

    id: str
    # Canonical Core principal GRN, e.g. principal://org_harbor/user/alice
    principal: str
    display_name: str
    initials: str
    email: str | None = None
    # Coarse role hints only — never the source of truth for authorization.
    roles: list[str] = Field(default_factory=list)


class DevPrincipalOption(BaseModel):
    """A selectable identity in the Dev Identity Provider (development only)."""

    organization: Organization
    user: Principal


class SessionUser(BaseModel):
    id: str
    principal: str
    display_name: str
    email: str | None = None
    initials: str
    roles: list[str] = Field(default_factory=list)
    avatar_url: str | None = None


class SessionView(BaseModel):
    """Non-sensitive session context returned to the Gateway/web app.

    Backed by a signed token; carries identity + session only (ADR-007).
    """

    user: SessionUser
    organization: Organization
    tenant_id: str
    auth_method: str
    expires_at: str


class TokenResponse(BaseModel):
    """The Identity Service's response to a successful authentication."""

    access_token: str
    token_type: str = "Bearer"
    expires_at: str
    session: SessionView


class ProviderInfo(BaseModel):
    id: str
    name: str
    kind: str
    enabled: bool


class DevLoginRequest(BaseModel):
    user_id: str


class IntrospectRequest(BaseModel):
    token: str
