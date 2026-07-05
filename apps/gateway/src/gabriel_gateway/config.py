"""Gateway runtime configuration.

The Gateway is a thin edge: it needs to know where the Identity Service lives,
which browser origin to trust for CORS (credentialed requests require an exact
origin, not ``*``), and how to shape the session cookie.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "staging", "production"]
SameSite = Literal["lax", "strict", "none"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="GABRIEL_GATEWAY_",
        env_file=".env",
        extra="ignore",
    )

    environment: Environment = Field(default="development")

    # Where the Identity Service is reachable (server-to-server, never exposed
    # to the browser).
    identity_service_url: str = Field(default="http://localhost:8081")

    # Exact browser origin allowed to send credentialed requests.
    web_origin: str = Field(default="http://localhost:3000")

    # --- Session cookie ----------------------------------------------------
    session_cookie_name: str = Field(default="gabriel_session")
    session_cookie_secure: bool = Field(default=False)  # True behind HTTPS (prod)
    session_cookie_samesite: SameSite = Field(default="lax")
    session_cookie_path: str = Field(default="/")
    # Cookie lifetime; kept aligned with the Identity token TTL (8h default).
    session_ttl_seconds: int = Field(default=8 * 60 * 60)

    # httpx timeout for Identity calls.
    identity_timeout_seconds: float = Field(default=5.0)


@lru_cache
def get_settings() -> Settings:
    return Settings()
