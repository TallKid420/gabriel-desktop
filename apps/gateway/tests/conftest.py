"""Shared fixtures for gateway tests.

The Gateway talks to gabriel-core purely over HTTP. To test that seam without
standing up a real server, we point the Gateway's ``httpx`` client at
gabriel-core's ASGI app via ``httpx.ASGITransport``. This exercises real HTTP
routing/middleware/endpoints in gabriel-core (no sockets, no package import in
the Gateway's *production* code — only the tests import gabriel-core).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from gabriel.api.app import create_app as create_core_app
from gabriel_gateway.core_specs import CoreSpecClient


@pytest.fixture()
def core_env(tmp_path, monkeypatch):
    """Point gabriel-core's spec store + logs at a throwaway directory."""
    monkeypatch.setenv("GABRIEL_AGENT_SPECS_DIR", str(tmp_path / "agent-specs"))
    monkeypatch.setenv("GABRIEL_DEFAULT_ORG_ID", "acme")
    monkeypatch.setenv("GABRIEL_REQUEST_LOG_PATH", str(tmp_path / "requests.log"))
    yield


@pytest.fixture()
def core_http_client(core_env):
    """A sync httpx.Client bound to gabriel-core's ASGI app (in-process HTTP).

    Starlette's TestClient is an ``httpx.Client`` subclass that drives the ASGI
    app through a portal, so the Gateway's CoreSpecClient can use it exactly as
    it would a real network client — real HTTP routing/middleware, no sockets.
    """
    core_app = create_core_app()
    http = TestClient(core_app)
    try:
        yield http
    finally:
        http.close()


@pytest.fixture()
def spec_client(core_http_client) -> CoreSpecClient:
    """The Gateway's HTTP client seam, wired to the core app."""
    return CoreSpecClient(client=core_http_client)
