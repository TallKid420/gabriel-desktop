"""End-to-end HTTP tests for the Gateway agent-specification API.

Two HTTP hops are exercised here:
  browser -> Gateway (TestClient)  ->  gabriel-core (httpx ASGI transport)

The Gateway holds no agent logic; it forwards to gabriel-core over HTTP and
relays the JSON responses (which already include resolved GRNs).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from gabriel_gateway.core_specs import CoreSpecClient
from gabriel_gateway.main import create_app


@pytest.fixture()
def client(spec_client: CoreSpecClient) -> TestClient:
    app = create_app(spec_client=spec_client)
    return TestClient(app)


def test_health(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_list_templates(client: TestClient) -> None:
    resp = client.get("/agent-specs/templates")
    assert resp.status_code == 200
    keys = {t["key"] for t in resp.json()["templates"]}
    assert {"chat", "engineer", "researcher", "daemon", "server"} <= keys


def test_instantiate_endpoint(client: TestClient) -> None:
    resp = client.post(
        "/agent-specs/instantiate",
        json={"template": "chat", "name": "helpdesk", "model": "gpt-oss:120b"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "helpdesk"
    assert body["model"] == "gpt-oss:120b"
    # Resolved GRNs (produced by gabriel-core) are surfaced to the browser.
    assert body["resolvedTools"]
    assert all(g.startswith("grn:acme:tool/") for g in body["resolvedTools"])


def test_instantiate_unknown_template_404(client: TestClient) -> None:
    resp = client.post("/agent-specs/instantiate", json={"template": "nope"})
    assert resp.status_code == 404


def test_save_list_load_delete_flow(client: TestClient) -> None:
    # Initially empty.
    assert client.get("/agent-specs").json()["specs"] == []

    # Persist.
    resp = client.post("/agent-specs", json={"template": "engineer", "name": "builder"})
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
