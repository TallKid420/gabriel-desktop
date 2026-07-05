"""Gateway auth route tests (Identity is faked; no network)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from gabriel_gateway.config import Settings
from gabriel_gateway.identity_client import IdentityError

from .conftest import FakeIdentity

COOKIE = Settings().session_cookie_name


def test_health(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["service"] == "gateway"


def test_providers_camelcase(client: TestClient) -> None:
    resp = client.get("/auth/providers")
    assert resp.status_code == 200
    assert resp.json()[0]["id"] == "dev"


def test_dev_principals_translated_to_web_shape(client: TestClient) -> None:
    resp = client.get("/auth/dev/principals")
    assert resp.status_code == 200
    option = resp.json()[0]
    # roles lifted to top level; user is slim + camelCase.
    assert option["roles"] == ["workspace_admin"]
    assert option["user"]["displayName"] == "Alice Nguyen"
    assert "roles" not in option["user"]


def test_dev_login_sets_cookie_and_returns_session(
    client: TestClient, fake_identity: FakeIdentity
) -> None:
    resp = client.post("/auth/dev/login", json={"userId": "u_alice"})
    assert resp.status_code == 200
    # Gateway translated camelCase userId -> snake_case for Identity.
    assert fake_identity.last_login_user_id == "u_alice"

    body = resp.json()
    assert body["user"]["displayName"] == "Alice Nguyen"
    assert body["tenantId"] == "org_harbor"
    assert body["authMethod"] == "dev"

    # httpOnly session cookie was set with the minted token.
    set_cookie = resp.headers.get("set-cookie", "")
    assert COOKIE in set_cookie
    assert "httponly" in set_cookie.lower()
    assert client.cookies.get(COOKIE) == fake_identity.token


def test_dev_login_never_exposes_token_in_body(client: TestClient) -> None:
    resp = client.post("/auth/dev/login", json={"userId": "u_alice"})
    assert "access_token" not in resp.json()
    assert "accessToken" not in resp.json()


def test_dev_login_propagates_401(client: TestClient, fake_identity: FakeIdentity) -> None:
    fake_identity.login_error = IdentityError(401, "Unknown dev principal")
    resp = client.post("/auth/dev/login", json={"userId": "u_nobody"})
    assert resp.status_code == 401


def test_session_without_cookie_401(client: TestClient) -> None:
    resp = client.get("/auth/session")
    assert resp.status_code == 401


def test_session_with_cookie_returns_view(client: TestClient) -> None:
    # Login first to obtain the cookie.
    client.post("/auth/dev/login", json={"userId": "u_alice"})
    resp = client.get("/auth/session")
    assert resp.status_code == 200
    assert resp.json()["user"]["id"] == "u_alice"


def test_session_invalid_token_401(client: TestClient, fake_identity: FakeIdentity) -> None:
    client.post("/auth/dev/login", json={"userId": "u_alice"})
    fake_identity.introspect_error = IdentityError(401, "invalid")
    resp = client.get("/auth/session")
    assert resp.status_code == 401


def test_logout_clears_cookie(client: TestClient) -> None:
    client.post("/auth/dev/login", json={"userId": "u_alice"})
    assert client.cookies.get(COOKIE)
    resp = client.post("/auth/logout")
    assert resp.status_code == 204
    # Cookie deletion emitted.
    assert COOKIE in resp.headers.get("set-cookie", "")
