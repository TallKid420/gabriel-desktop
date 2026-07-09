"""Gateway configuration (env-driven, ``GABRIEL_GATEWAY_`` prefix)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

_PREFIX = "GABRIEL_GATEWAY_"


def _env(name: str, default: str) -> str:
    return os.environ.get(f"{_PREFIX}{name}", default)


@dataclass(frozen=True)
class Settings:
    """Runtime settings for the Gateway."""

    environment: str = "development"
    web_origin: str = "http://localhost:3000"
    # Directory where authored/migrated agent specifications live. This is the
    # migration analogue of the legacy config/agents.yaml.
    agent_specs_dir: str = ".gabriel/agent-specs"
    # Default organization used when resolving template tool bindings to GRNs.
    default_org_id: str = "acme"


def get_settings() -> Settings:
    """Return a fresh Settings snapshot (reads env each call for testability)."""
    return Settings(
        environment=_env("ENVIRONMENT", "development"),
        web_origin=_env("WEB_ORIGIN", "http://localhost:3000"),
        agent_specs_dir=_env(
            "AGENT_SPECS_DIR", str(Path.cwd() / ".gabriel" / "agent-specs")
        ),
        default_org_id=_env("DEFAULT_ORG_ID", "acme"),
    )
