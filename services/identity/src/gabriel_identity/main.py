"""Identity Service application factory."""
from __future__ import annotations

import logging

from fastapi import FastAPI

from .config import Settings, get_settings
from .routes import router
from .service import IdentityService

logger = logging.getLogger("gabriel.identity")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Gabriel Identity Service",
        version="0.1.0",
        description="The sole authentication authority for Gabriel (ADR-007).",
    )
    app.state.settings = settings
    app.state.identity = IdentityService(settings)

    if settings.dev_provider_available:
        logger.warning(
            "Dev Identity Provider is ENABLED (environment=%s). This issues "
            "credential-free tokens and must never run in production.",
            settings.environment,
        )
    else:
        logger.info(
            "Dev Identity Provider is disabled (environment=%s).", settings.environment
        )

    app.include_router(router)
    return app


app = create_app()
