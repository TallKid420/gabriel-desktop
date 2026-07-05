"""Web-facing schema and mappers.

The Gateway is the translation seam between the Identity Service's snake_case
contract and the browser's camelCase types. Response models serialize with
camelCase aliases (FastAPI emits ``by_alias=True`` by default), and request
models accept camelCase from the browser.

Only session/identity display data crosses this boundary — never tokens or
permissions.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# --- Requests -------------------------------------------------------------
class DevLoginRequest(CamelModel):
    # Accepts ``{"userId": ...}`` from the browser.
    user_id: str


# --- Responses ------------------------------------------------------------
class WebOrganization(CamelModel):
    id: str
    name: str
    plan: str | None = None


class WebUser(CamelModel):
    id: str
    principal: str
    display_name: str
    email: str | None = None
    avatar_url: str | None = None
    initials: str
    roles: list[str] = []


class WebSession(CamelModel):
    user: WebUser
    organization: WebOrganization
    tenant_id: str
    auth_method: str
    expires_at: str


class WebDevPrincipalOption(CamelModel):
    organization: WebOrganization
    # The browser's DevPrincipalOption nests a slim user and lifts roles up.
    user: dict[str, Any]
    roles: list[str] = []


class ProviderInfo(CamelModel):
    id: str
    name: str
    kind: str
    enabled: bool


# --- Mappers (Identity snake_case dict -> web model) ----------------------
def _organization(org: dict[str, Any]) -> WebOrganization:
    return WebOrganization(id=org["id"], name=org["name"], plan=org.get("plan"))


def session_from_identity(payload: dict[str, Any]) -> WebSession:
    """Map an Identity ``SessionView`` JSON body into the web session shape."""
    user = payload["user"]
    return WebSession(
        user=WebUser(
            id=user["id"],
            principal=user["principal"],
            display_name=user.get("display_name", ""),
            email=user.get("email"),
            avatar_url=user.get("avatar_url"),
            initials=user.get("initials", ""),
            roles=list(user.get("roles", [])),
        ),
        organization=_organization(payload["organization"]),
        tenant_id=payload["tenant_id"],
        auth_method=payload.get("auth_method", "unknown"),
        expires_at=payload["expires_at"],
    )


def dev_principal_from_identity(option: dict[str, Any]) -> WebDevPrincipalOption:
    """Map an Identity ``DevPrincipalOption`` into the web option shape.

    The web type keeps ``roles`` at the top level and a slim user object, so we
    lift roles out of the principal here.
    """
    user = option["user"]
    return WebDevPrincipalOption(
        organization=_organization(option["organization"]),
        user={
            "id": user["id"],
            "principal": user["principal"],
            "displayName": user.get("display_name", ""),
            "initials": user.get("initials", ""),
            "email": user.get("email"),
        },
        roles=list(user.get("roles", [])),
    )
