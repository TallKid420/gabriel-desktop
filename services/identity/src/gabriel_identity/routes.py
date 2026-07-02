"""HTTP surface of the Identity Service.

Only the Gateway is expected to call these endpoints (server-to-server). The
browser never talks to Identity directly — it goes through the Gateway (BFF),
which manages the session cookie.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from .models import (
    DevLoginRequest,
    DevPrincipalOption,
    IntrospectRequest,
    ProviderInfo,
    SessionView,
    TokenResponse,
)
from .providers.base import AuthError
from .service import IdentityService

router = APIRouter()


def get_service(request: Request) -> IdentityService:
    return request.app.state.identity  # type: ignore[no-any-return]


@router.get("/health", tags=["ops"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "identity"}


@router.get("/.well-known/jwks.json", tags=["keys"])
def jwks(service: IdentityService = Depends(get_service)) -> dict[str, list[dict[str, str]]]:
    """Public keys for downstream token verification (Gateway, Core)."""
    return service.jwt.jwks()


@router.get("/auth/providers", response_model=list[ProviderInfo], tags=["auth"])
def list_providers(service: IdentityService = Depends(get_service)) -> list[ProviderInfo]:
    return service.registry.describe()


@router.get(
    "/auth/dev/principals",
    response_model=list[DevPrincipalOption],
    tags=["auth", "dev"],
)
def dev_principals(
    service: IdentityService = Depends(get_service),
) -> list[DevPrincipalOption]:
    dev = service.registry.dev
    if dev is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dev Identity Provider is not available in this environment.",
        )
    return dev.list_principals()


@router.post("/auth/dev/login", response_model=TokenResponse, tags=["auth", "dev"])
def dev_login(
    body: DevLoginRequest,
    service: IdentityService = Depends(get_service),
) -> TokenResponse:
    dev = service.registry.dev
    if dev is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dev Identity Provider is not available in this environment.",
        )
    try:
        result = dev.authenticate({"user_id": body.user_id})
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    return service.issue(result)


@router.post("/auth/introspect", response_model=SessionView, tags=["auth"])
def introspect(
    body: IntrospectRequest,
    service: IdentityService = Depends(get_service),
) -> SessionView:
    """Validate a token and return its session view, or 401 if invalid."""
    try:
        return service.session_from_token(body.token)
    except Exception as exc:  # jwt errors → unauthorized
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token."
        ) from exc
