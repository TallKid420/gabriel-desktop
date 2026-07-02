from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from gabriel_gateway.config import Settings
from gabriel_gateway.identity_client import IdentityError
from gabriel_gateway.main import create_app
from gabriel_gateway.routes.auth import get_identity


# A valid Identity SessionView body (snake_case), as Identity would return.
SESSION_VIEW: dict[str, Any] = {
    "user": {
        "id": "u_alice",
        "principal": "principal://org_harbor/user/alice",
        "display_name": "Alice Nguyen",
        "email": "alice@harbormutual.com",
        "initials": "AN",
        "roles": ["workspace_admin"],
        "avatar_url": None,
    },
    "organization": {"id": "org_harbor", "name": "Harbor Mutual Insurance", "plan": "Pilot"},
    "tenant_id": "org_harbor",
    "auth_method": "dev",
    "expires_at": "2026-07-02T20:00:00Z",
}

DEV_PRINCIPALS: list[dict[str, Any]] = [
    {
        "organization": {"id": "org_harbor", "name": "Harbor Mutual Insurance", "plan": "Pilot"},
        "user": {
            "id": "u_alice",
            "principal": "principal://org_harbor/user/alice",
            "display_name": "Alice Nguyen",
            "initials": "AN",
            "email": "alice@harbormutual.com",
            "roles": ["workspace_admin"],
        },
    }
]


class FakeIdentity:
    """Stand-in for the Identity Service HTTP client."""

    def __init__(self) -> None:
        self.token = "signed.jwt.token"
        self.introspect_error: IdentityError | None = None
        self.login_error: IdentityError | None = None
        self.last_login_user_id: str | None = None

    async def get_providers(self) -> list[dict[str, Any]]:
        return [{"id": "dev", "name": "Dev Identity Provider", "kind": "development", "enabled": True}]

    async def get_dev_principals(self) -> list[dict[str, Any]]:
        return DEV_PRINCIPALS

    async def dev_login(self, user_id: str) -> dict[str, Any]:
        self.last_login_user_id = user_id
        if self.login_error:
            raise self.login_error
        return {"access_token": self.token, "token_type": "Bearer",
                "expires_at": SESSION_VIEW["expires_at"], "session": SESSION_VIEW}

    async def introspect(self, token: str) -> dict[str, Any]:
        if self.introspect_error:
            raise self.introspect_error
        return SESSION_VIEW


@pytest.fixture
def fake_identity() -> FakeIdentity:
    return FakeIdentity()


@pytest.fixture
def client(fake_identity: FakeIdentity) -> TestClient:
    app = create_app(Settings(environment="development"))
    app.dependency_overrides[get_identity] = lambda: fake_identity
    return TestClient(app)
