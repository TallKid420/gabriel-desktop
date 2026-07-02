"""Application service tying providers + JWT + session shaping together."""
from __future__ import annotations

from datetime import datetime, timezone

from .config import Settings
from .jwt_service import JWTService, generate_private_key_pem
from .models import (
    Organization,
    SessionUser,
    SessionView,
    TokenResponse,
)
from .providers import ProviderRegistry
from .providers.base import AuthResult


def _isoformat(epoch: int) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat().replace("+00:00", "Z")


class IdentityService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.registry = ProviderRegistry(settings)
        private_key = settings.private_key_pem or generate_private_key_pem()
        self.jwt = JWTService(
            private_key_pem=private_key,
            issuer=settings.issuer,
            audience=settings.audience,
            key_id=settings.key_id,
            ttl_seconds=settings.access_token_ttl_seconds,
        )

    # -- token + session shaping -------------------------------------------
    def issue(self, result: AuthResult) -> TokenResponse:
        """Mint a token and build the session view for an authenticated result.

        Only identity/session claims are placed in the token — never
        permissions (ADR-019). Coarse ``roles`` are display hints, included so
        the UI can render role labels without a second round-trip.
        """
        claims = {
            "uid": result.principal.id,
            "org_id": result.organization.id,
            "org_name": result.organization.name,
            "org_plan": result.organization.plan,
            "tenant_id": result.organization.id,
            "principal": result.principal.principal,
            "name": result.principal.display_name,
            "email": result.principal.email,
            "initials": result.principal.initials,
            "roles": result.principal.roles,
            "amr": result.auth_method,
        }
        token, exp = self.jwt.mint(subject=result.principal.principal, claims=claims)
        expires_at = _isoformat(exp)
        return TokenResponse(
            access_token=token,
            expires_at=expires_at,
            session=self._session_from_result(result, expires_at),
        )

    def session_from_token(self, token: str) -> SessionView:
        """Verify a token and reconstruct the session view from its claims."""
        payload = self.jwt.verify(token)
        org = Organization(
            id=payload["org_id"],
            name=payload.get("org_name", payload["org_id"]),
            plan=payload.get("org_plan"),
        )
        return SessionView(
            user=SessionUser(
                id=payload.get("uid", payload["sub"].rsplit("/", 1)[-1]),
                principal=payload["principal"],
                display_name=payload.get("name", ""),
                email=payload.get("email"),
                initials=payload.get("initials", ""),
                roles=list(payload.get("roles", [])),
            ),
            organization=org,
            tenant_id=payload["tenant_id"],
            auth_method=payload.get("amr", "unknown"),
            expires_at=_isoformat(int(payload["exp"])),
        )

    @staticmethod
    def _session_from_result(result: AuthResult, expires_at: str) -> SessionView:
        return SessionView(
            user=SessionUser(
                id=result.principal.id,
                principal=result.principal.principal,
                display_name=result.principal.display_name,
                email=result.principal.email,
                initials=result.principal.initials,
                roles=result.principal.roles,
            ),
            organization=result.organization,
            tenant_id=result.organization.id,
            auth_method=result.auth_method,
            expires_at=expires_at,
        )
