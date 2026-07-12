"""Gateway configuration (env-driven, ``GABRIEL_GATEWAY_`` prefix)."""

from __future__ import annotations

import os
from dataclasses import dataclass

_PREFIX = "GABRIEL_GATEWAY_"


def _env(name: str, default: str) -> str:
    return os.environ.get(f"{_PREFIX}{name}", default)


@dataclass(frozen=True)
class Settings:
    """Runtime settings for the Gateway."""

    environment: str = "development"
    web_origin: str = "http://localhost:3000"
    # Base URL of the gabriel-core service. The Gateway calls gabriel-core's
    # agent-specification API over HTTP (it does NOT import gabriel-core). The
    # agent-spec store and org resolution are owned by gabriel-core, configured
    # there via GABRIEL_AGENT_SPECS_DIR / GABRIEL_DEFAULT_ORG_ID.
    core_base_url: str = "http://localhost:8000"


def get_settings() -> Settings:
    """Return a fresh Settings snapshot (reads env each call for testability)."""
    return Settings(
        environment=_env("ENVIRONMENT", "development"),
        web_origin=_env("WEB_ORIGIN", "http://localhost:3000"),
        core_base_url=_env("CORE_BASE_URL", "http://localhost:8000"),
    )
