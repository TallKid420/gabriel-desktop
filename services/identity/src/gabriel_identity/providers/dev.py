"""The Dev Identity Provider (development only).

Resolves a seeded principal by id with **no credential check**. This is why it
can never run in production — the config layer refuses to construct it when the
environment is production (see ``config.Settings``), and the registry only
registers it when ``settings.dev_provider_available`` is true.
"""
from __future__ import annotations

from typing import Any

from ..models import DevPrincipalOption
from ..seed import DEV_PRINCIPALS, find_dev_principal
from .base import AuthError, AuthResult


class DevIdentityProvider:
    id = "dev"
    name = "Dev Identity Provider"
    kind = "development"

    def list_principals(self) -> list[DevPrincipalOption]:
        return DEV_PRINCIPALS

    def authenticate(self, credentials: dict[str, Any]) -> AuthResult:
        user_id = credentials.get("user_id")
        if not user_id:
            raise AuthError("user_id is required")
        option = find_dev_principal(user_id)
        if option is None:
            raise AuthError(f"Unknown dev principal: {user_id}")
        return AuthResult(
            principal=option.user,
            organization=option.organization,
            auth_method="dev",
        )
