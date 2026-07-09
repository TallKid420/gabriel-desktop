"""Gabriel Gateway FastAPI application (agent-specification seam).

Exposes gabriel-core's migrated agent specification system to the browser:

    GET    /health                       liveness
    GET    /agent-specs/templates        list migrated template descriptors
    POST   /agent-specs/instantiate      build a spec from a template + overrides
    GET    /agent-specs                  list persisted spec names
    POST   /agent-specs                  persist a spec (from a template)
    GET    /agent-specs/{name}           load a persisted spec
    DELETE /agent-specs/{name}           delete a persisted spec

The Gateway holds no agent business logic — every operation delegates to
gabriel-core via :class:`gabriel_gateway.core_specs.CoreSpecService`.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from gabriel_gateway.core_specs import CoreSpecService, SpecificationNotFoundError
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

    def to_overrides(self) -> dict[str, Any]:
        overrides: dict[str, Any] = {}
        for key in ("name", "model", "provider", "metadata"):
            value = getattr(self, key)
            if value is not None:
                overrides[key] = value
        if self.system_prompt is not None:
            overrides["system_prompt"] = self.system_prompt
        if self.extra_tools is not None:
            overrides["extra_tools"] = self.extra_tools
        return overrides


class SaveRequest(InstantiateRequest):
    """Build-and-persist request (same shape as instantiate)."""


def create_app(spec_service: CoreSpecService | None = None) -> FastAPI:
    """Application factory. Pass *spec_service* to inject a custom instance."""
    settings = get_settings()
    service = spec_service or CoreSpecService(
        specs_dir=settings.agent_specs_dir,
        org_id=settings.default_org_id,
    )

    app = FastAPI(title="Gabriel Gateway", version="0.2.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.spec_service = service

    def _spec_payload(spec) -> dict[str, Any]:
        """Serialize a spec for the browser, adding resolved tool GRNs."""
        data = spec.model_dump(mode="json")
        data["resolvedTools"] = service.resolve_tool_grns(spec)
        return data

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "gabriel-gateway"}

    @app.get("/agent-specs/templates")
    async def templates() -> dict[str, Any]:
        return {"templates": service.describe_templates()}

    @app.post("/agent-specs/instantiate")
    async def instantiate(req: InstantiateRequest) -> dict[str, Any]:
        try:
            spec = service.instantiate(req.template, **req.to_overrides())
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except Exception as exc:  # validation errors etc.
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return _spec_payload(spec)

    @app.get("/agent-specs")
    async def list_specs() -> dict[str, list[str]]:
        return {"specs": service.list_saved()}

    @app.post("/agent-specs", status_code=201)
    async def save_spec(req: SaveRequest) -> dict[str, Any]:
        try:
            spec = service.instantiate(req.template, **req.to_overrides())
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        path = service.save(spec)
        payload = _spec_payload(spec)
        payload["path"] = path
        return payload

    @app.get("/agent-specs/{name}")
    async def load_spec(name: str) -> dict[str, Any]:
        try:
            spec = service.load(name)
        except SpecificationNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return _spec_payload(spec)

    @app.delete("/agent-specs/{name}", status_code=204)
    async def delete_spec(name: str) -> None:
        try:
            service.delete(name)
        except SpecificationNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    return app


# Module-level app for ``uvicorn gabriel_gateway.main:app``.
app = create_app()
