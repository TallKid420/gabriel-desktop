"""HTTP surface tests for the Identity Service."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "identity"}


def test_jwks_endpoint(client: TestClient) -> None:
    resp = client.get("/.well-known/jwks.json")
    assert resp.status_code == 200
    keys = resp.json()["keys"]
    assert len(keys) == 1
    assert keys[0]["kty"] == "RSA"
    assert keys[0]["kid"] == "dev-key-1"


def test_providers_lists_dev_in_development(client: TestClient) -> None:
    resp = client.get("/auth/providers")
    assert resp.status_code == 200
    providers = resp.json()
    assert any(p["id"] == "dev" and p["enabled"] for p in providers)


def test_dev_principals_available(client: TestClient) -> None:
    resp = client.get("/auth/dev/principals")
    assert resp.status_code == 200
    principals = resp.json()
    assert len(principals) == 5
    assert {p["user"]["id"] for p in principals} == {
        "u_alice",
        "u_marco",
        "u_sofia",
        "u_pastor",
        "u_hamish",
    }


def test_dev_login_happy_path(client: TestClient) -> None:
    resp = client.post("/auth/dev/login", json={"user_id": "u_alice"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "Bearer"
    assert body["access_token"]
    assert body["session"]["user"]["id"] == "u_alice"
    assert body["session"]["organization"]["id"] == "org_harbor"


def test_dev_login_unknown_principal_401(client: TestClient) -> None:
    resp = client.post("/auth/dev/login", json={"user_id": "u_nobody"})
    assert resp.status_code == 401


def test_introspect_valid_token(client: TestClient) -> None:
    login = client.post("/auth/dev/login", json={"user_id": "u_marco"})
    token = login.json()["access_token"]

    resp = client.post("/auth/introspect", json={"token": token})
    assert resp.status_code == 200
    session = resp.json()
    assert session["user"]["id"] == "u_marco"
    assert session["organization"]["id"] == "org_harbor"
    assert session["auth_method"] == "dev"


def test_introspect_invalid_token_401(client: TestClient) -> None:
    resp = client.post("/auth/introspect", json={"token": "not.a.jwt"})
    assert resp.status_code == 401


# --- Production guard at the HTTP layer -----------------------------------

def test_dev_principals_404_in_production(prod_client: TestClient) -> None:
    resp = prod_client.get("/auth/dev/principals")
    assert resp.status_code == 404


def test_dev_login_404_in_production(prod_client: TestClient) -> None:
    resp = prod_client.post("/auth/dev/login", json={"user_id": "u_alice"})
    assert resp.status_code == 404


def test_providers_excludes_dev_in_production(prod_client: TestClient) -> None:
    resp = prod_client.get("/auth/providers")
    assert resp.status_code == 200
    assert all(p["id"] != "dev" for p in resp.json())
