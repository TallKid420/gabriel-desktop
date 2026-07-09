"""End-to-end HTTP tests for the Gateway agent-specification API.

Uses FastAPI's TestClient against an app wired to a temp-backed
CoreSpecService, proving the browser-facing seam works over HTTP.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from gabriel_gateway.core_specs import CoreSpecService
from gabriel_gateway.main import create_app


@pytest.fixture()
def client(service: CoreSpecService) -> TestClient:
    app = create_app(spec_service=service)
    return TestClient(app)


def test_health(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_list_templates(client: TestClient) -> None:
    resp = client.get("/agent-specs/templates")
    assert resp.status_code == 200
    templates = resp.json()["templates"]
    keys = {t["key"] for t in templates}
    assert keys == {"chat", "engineer", "researcher", "daemon", "server"}


def test_instantiate_endpoint(client: TestClient) -> None:
    resp = client.post(
        "/agent-specs/instantiate",
        json={"template": "chat", "name": "helpdesk", "model": "gpt-oss:120b"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "helpdesk"
    assert body["model"] == "gpt-oss:120b"
    # Resolved GRNs are surfaced to the browser.
    assert body["resolvedTools"]
    assert all(g.startswith("grn:acme:tool/") for g in body["resolvedTools"])


def test_instantiate_unknown_template_404(client: TestClient) -> None:
    resp = client.post("/agent-specs/instantiate", json={"template": "nope"})
    assert resp.status_code == 404


def test_save_list_load_delete_flow(client: TestClient) -> None:
    # Initially empty.
    assert client.get("/agent-specs").json()["specs"] == []

    # Persist.
    resp = client.post(
        "/agent-specs",
        json={"template": "engineer", "name": "builder"},
    )
    assert resp.status_code == 201
    assert resp.json()["path"].endswith(".json")

    # Listed.
    assert "builder" in client.get("/agent-specs").json()["specs"]

    # Loaded.
    loaded = client.get("/agent-specs/builder")
    assert loaded.status_code == 200
    assert loaded.json()["name"] == "builder"

    # Deleted.
    assert client.delete("/agent-specs/builder").status_code == 204
    assert "builder" not in client.get("/agent-specs").json()["specs"]


def test_load_missing_404(client: TestClient) -> None:
    assert client.get("/agent-specs/ghost").status_code == 404


def test_delete_missing_404(client: TestClient) -> None:
    assert client.delete("/agent-specs/ghost").status_code == 404
