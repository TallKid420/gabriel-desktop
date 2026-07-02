"""Runtime configuration and environment guards.

The Dev Identity Provider is a development convenience that issues real,
production-shaped tokens without any credential check. It is therefore
**structurally impossible to enable in production** (ADR-007): if the runtime
environment is ``production`` the dev provider is refused at startup, regardless
of any flag a deployment might set.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="GABRIEL_IDENTITY_",
        env_file=".env",
        extra="ignore",
    )

    # --- Environment -------------------------------------------------------
    environment: Environment = Field(
        default="development",
        description="Deployment environment. 'production' disables the dev provider.",
    )

    # --- Token issuance ----------------------------------------------------
    issuer: str = Field(default="https://identity.gabriel.local")
    audience: str = Field(default="gabriel-gateway")
    access_token_ttl_seconds: int = Field(default=8 * 60 * 60)  # 8 hours
    key_id: str = Field(default="dev-key-1")

    # RSA private key in PEM. When empty (dev), an ephemeral keypair is
    # generated at startup. Production MUST supply a managed key.
    private_key_pem: str = Field(default="")

    # --- Providers ---------------------------------------------------------
    # Explicit opt-in flag. Even when true, production refuses the dev provider.
    enable_dev_provider: bool = Field(default=True)

    @model_validator(mode="after")
    def _guard_dev_provider(self) -> "Settings":
        if self.environment == "production" and self.enable_dev_provider:
            # Structural guarantee: never allow credential-free login in prod.
            object.__setattr__(self, "enable_dev_provider", False)
        return self

    @property
    def dev_provider_available(self) -> bool:
        return self.environment != "production" and self.enable_dev_provider


@lru_cache
def get_settings() -> Settings:
    return Settings()
