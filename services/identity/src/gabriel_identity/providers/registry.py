"""Provider registry — assembles the enabled providers for the environment."""
from __future__ import annotations

from ..config import Settings
from ..models import ProviderInfo
from .base import AuthProvider
from .dev import DevIdentityProvider


class ProviderRegistry:
    def __init__(self, settings: Settings) -> None:
        self._providers: dict[str, AuthProvider] = {}
        self._dev: DevIdentityProvider | None = None

        # The dev provider is only ever available outside production.
        if settings.dev_provider_available:
            dev = DevIdentityProvider()
            self._dev = dev
            self._providers[dev.id] = dev

        # Future: password / oidc providers registered here based on settings.

    def get(self, provider_id: str) -> AuthProvider | None:
        return self._providers.get(provider_id)

    @property
    def dev(self) -> DevIdentityProvider | None:
        return self._dev

    def describe(self) -> list[ProviderInfo]:
        return [
            ProviderInfo(id=p.id, name=p.name, kind=p.kind, enabled=True)
            for p in self._providers.values()
        ]
