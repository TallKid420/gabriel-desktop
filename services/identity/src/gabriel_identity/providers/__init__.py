"""Pluggable authentication providers (ADR-007).

Every provider implements :class:`~gabriel_identity.providers.base.AuthProvider`.
New providers (password, Google, Entra, Okta …) are added here without changing
the token-minting core or any downstream consumer.
"""
from .base import AuthProvider, AuthResult
from .dev import DevIdentityProvider
from .registry import ProviderRegistry

__all__ = ["AuthProvider", "AuthResult", "DevIdentityProvider", "ProviderRegistry"]
