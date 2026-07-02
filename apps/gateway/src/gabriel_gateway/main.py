"""Gateway application factory."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .identity_client import IdentityClient
from .routes import auth, health


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):  # noqa: ANN202
        client = IdentityClient(
            settings.identity_service_url,
            timeout=settings.identity_timeout_seconds,
        )
        app.state.identity_client = client
        try:
            yield
        finally:
            await client.aclose()

    app = FastAPI(
        title="Gabriel Gateway",
        version="0.1.0",
        description="Edge BFF: session management and auth delegation (ADR-007).",
        lifespan=lifespan,
    )
    app.state.settings = settings

    # Credentialed requests require an exact origin (never "*").
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    return app


app = create_app()
