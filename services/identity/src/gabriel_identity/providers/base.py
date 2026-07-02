"""The authentication provider contract."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from ..models import Organization, Principal


@dataclass(frozen=True)
class AuthResult:
    """The outcome of a successful authentication.

    Carries the resolved identity and org context. Notably it carries no
    permissions — authorization is Core's responsibility (ADR-019).
    """

    principal: Principal
    organization: Organization
    auth_method: str


class AuthError(Exception):
    """Raised when authentication fails (unknown/invalid credentials)."""


@runtime_checkable
class AuthProvider(Protocol):
    """A pluggable means of authenticating a principal."""

    id: str
    name: str
    kind: str

    def authenticate(self, credentials: dict[str, Any]) -> AuthResult:
        """Authenticate and return the resolved identity, or raise AuthError."""
        ...
