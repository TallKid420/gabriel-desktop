"""Gabriel Gateway FastAPI application (agent-specification seam).

Exposes gabriel-core's migrated agent specification system to the browser by
**calling gabriel-core over HTTP** — the Gateway does not import or install
gabriel-core (Phase 4 wiring rule). Every operation is forwarded to
gabriel-core via :class:`gabriel_gateway.core_specs.CoreSpecClient`.

    GET    /health                       liveness
    GET    /agent-specs/templates        list migrated template descriptors
    POST   /agent-specs/instantiate      build a spec from a template + overrides
    GET    /agent-specs                  list persisted spec names
    POST   /agent-specs                  persist a spec (from a template)
    GET    /agent-specs/{name}           load a persisted spec
    DELETE /agent-specs/{name}           delete a persisted spec
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from gabriel_gateway.core_specs import CoreSpecClient, CoreServiceError
from gabriel_gateway.settings import get_settings


class InstantiateRequest(BaseModel):
    """Browser request to build a spec from a template."""

    template: str
    name: str | None = None
    model: str | None = None
    system_prompt: str | None = Field(default=None, alias="systemPrompt")
    provider: str | None = None
    extra_tools: list[str] | None = Field(default=None, alias="extraTools")
    metadata: dict[str, str] | None = None

    model_config = {"populate_by_name": True}

    def to_payload(self) -> dict[str, Any]:
        """Build the JSON body forwarded to gabriel-core (camelCase aliases)."""
        payload: dict[str, Any] = {"template": self.template}
        for attr, key in (
            ("name", "name"),
            ("model", "model"),
            ("provider", "provider"),
            ("metadata", "metadata"),
            ("system_prompt", "systemPrompt"),
            ("extra_tools", "extraTools"),
        ):
            value = getattr(self, attr)
            if value is not None:
                payload[key] = value
        return payload


class SaveRequest(InstantiateRequest):
    """Build-and-persist request (same shape as instantiate)."""


def create_app(spec_client: CoreSpecClient | None = None) -> FastAPI:
    """Application factory. Pass *spec_client* to inject a custom client."""
    settings = get_settings()
    client = spec_client or CoreSpecClient(base_url=settings.core_base_url)

    app = FastAPI(title="Gabriel Gateway", version="0.2.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.spec_client = client

    def _relay(fn):
        """Run a client call, mapping CoreServiceError to HTTPException."""
        try:
            return fn()
        except CoreServiceError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "gabriel-gateway"}

    @app.get("/agent-specs/templates")
    async def templates() -> dict[str, Any]:
        return {"templates": _relay(client.describe_templates)}

    @app.post("/agent-specs/instantiate")
    async def instantiate(req: InstantiateRequest) -> dict[str, Any]:
        return _relay(lambda: client.instantiate(req.to_payload()))

    @app.get("/agent-specs")
    async def list_specs() -> dict[str, list[str]]:
        return {"specs": _relay(client.list_saved)}

    @app.post("/agent-specs", status_code=201)
    async def save_spec(req: SaveRequest) -> dict[str, Any]:
        return _relay(lambda: client.save(req.to_payload()))

    @app.get("/agent-specs/{name}")
    async def load_spec(name: str) -> dict[str, Any]:
        return _relay(lambda: client.load(name))

    @app.delete("/agent-specs/{name}", status_code=204)
    async def delete_spec(name: str) -> None:
        _relay(lambda: client.delete(name))

    return app


# Module-level app for ``uvicorn gabriel_gateway.main:app``.
app = create_app()
