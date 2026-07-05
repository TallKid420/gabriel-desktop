"""Tests for the structural guarantee: no dev provider in production.

ADR-007 requires the Dev Identity Provider to be *structurally impossible* to
enable in production, regardless of any flag a deployment might set.
"""
from __future__ import annotations

from gabriel_identity.config import Settings
from gabriel_identity.service import IdentityService


def test_settings_force_disable_in_production() -> None:
    settings = Settings(environment="production", enable_dev_provider=True)
    # Flag is forcibly flipped off, and the derived availability is false.
    assert settings.enable_dev_provider is False
    assert settings.dev_provider_available is False


def test_development_allows_dev_provider() -> None:
    settings = Settings(environment="development", enable_dev_provider=True)
    assert settings.dev_provider_available is True


def test_staging_allows_dev_provider() -> None:
    settings = Settings(environment="staging", enable_dev_provider=True)
    assert settings.dev_provider_available is True


def test_registry_has_no_dev_provider_in_production() -> None:
    service = IdentityService(Settings(environment="production", enable_dev_provider=True))
    assert service.registry.dev is None
    # And it is not described as an available provider.
    provider_ids = {p.id for p in service.registry.describe()}
    assert "dev" not in provider_ids


def test_registry_has_dev_provider_in_development(service: IdentityService) -> None:
    assert service.registry.dev is not None
    provider_ids = {p.id for p in service.registry.describe()}
    assert "dev" in provider_ids
