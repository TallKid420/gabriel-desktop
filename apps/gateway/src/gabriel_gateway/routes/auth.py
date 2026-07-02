"""Auth surface of the Gateway (BFF).

These endpoints are what the browser calls. The Gateway delegates all token
work to the Identity Service (ADR-007) and translates between Identity's
snake_case contract and the browser's camelCase types. It manages the httpOnly
session cookie so the browser never handles the raw JWT.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..config import Settings
from ..identity_client import IdentityClient, IdentityError
from ..schema import (
    DevLoginRequest,
    ProviderInfo,
    WebDevPrincipalOption,
    WebSession,
    dev_principal_from_identity,
    session_from_identity,
)
from ..session import clear_session_cookie, set_session_cookie

router = APIRouter(prefix="/auth", tags=["auth"])


def get_identity(request: Request) -> IdentityClient:
    return request.app.state.identity_client  # type: ignore[no-any-return]


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


@router.get("/providers", response_model=list[ProviderInfo])
async def providers(identity: IdentityClient = Depends(get_identity)) -> list[ProviderInfo]:
    try:
        data = await identity.get_providers()
    except IdentityError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return [ProviderInfo(**p) for p in data]


@router.get("/dev/principals", response_model=list[WebDevPrincipalOption])
async def dev_principals(
    identity: IdentityClient = Depends(get_identity),
) -> list[WebDevPrincipalOption]:
    try:
        data = await identity.get_dev_principals()
    except IdentityError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return [dev_principal_from_identity(o) for o in data]


@router.post("/dev/login", response_model=WebSession)
async def dev_login(
    body: DevLoginRequest,
    response: Response,
    identity: IdentityClient = Depends(get_identity),
    settings: Settings = Depends(get_settings_dep),
) -> WebSession:
    try:
        token_response = await identity.dev_login(body.user_id)
    except IdentityError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    # Store the minted token in the httpOnly cookie; the browser only gets the
    # session view.
    set_session_cookie(response, token_response["access_token"], settings)
    return session_from_identity(token_response["session"])


@router.get("/session", response_model=WebSession)
async def session(
    request: Request,
    identity: IdentityClient = Depends(get_identity),
    settings: Settings = Depends(get_settings_dep),
) -> WebSession:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No active session."
        )
    try:
        view = await identity.introspect(token)
    except IdentityError as exc:
        # Invalid/expired token → unauthorized (surface 401 to the browser).
        code = exc.status_code if exc.status_code == 401 else 401
        raise HTTPException(status_code=code, detail="Session is invalid or expired.") from exc
    return session_from_identity(view)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    settings: Settings = Depends(get_settings_dep),
) -> Response:
    clear_session_cookie(response, settings)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
