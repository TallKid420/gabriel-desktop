"""HTTP client seam wiring **gabriel-desktop** to **gabriel-core**.

Phase 4 wiring rule: the desktop gateway is a Backend-For-Frontend and must
**not** import or install ``gabriel-core``. All agent-specification logic lives
in gabriel-core and is consumed here purely over HTTP (gabriel-core exposes it
under ``/api/v1/agent-specs``).

This module provides :class:`CoreSpecClient`, a thin ``httpx`` client that the
Gateway's FastAPI layer delegates to. It performs no agent modelling itself —
it forwards requests to gabriel-core and relays the JSON responses (which
already include validated specs and resolved GRN tool bindings).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

__all__ = [
    "CoreSpecClient",
    "CoreSpecService",
    "CoreServiceError",
    "SpecificationNotFoundError",
]


class CoreServiceError(RuntimeError):
    """Raised when gabriel-core returns an error we should surface upstream.

    Carries the HTTP ``status_code`` and ``detail`` so the Gateway API can map
    it back onto an equivalent HTTP response for the browser.
    """

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class SpecificationNotFoundError(CoreServiceError):
    """A named specification does not exist in gabriel-core's store."""

    def __init__(self, detail: str = "Specification not found") -> None:
        super().__init__(404, detail)


@dataclass
class CoreSpecClient:
    """HTTP client the Gateway uses to talk to gabriel-core's spec API.

    Args:
        base_url: Base URL of the gabriel-core service (e.g.
            ``http://localhost:8000``). The client targets ``/api/v1/agent-specs``.
        timeout: Per-request timeout in seconds.
        client: Optional pre-built ``httpx.Client`` (mainly for testing, e.g.
            wrapping an ASGI transport so no real socket is used).
    """

    base_url: str = "http://localhost:8000"
    timeout: float = 10.0
    client: httpx.Client | None = None

    def __post_init__(self) -> None:
        self._prefix = "/api/v1/agent-specs"
        self._owns_client = self.client is None
        self._client = self.client or httpx.Client(
            base_url=self.base_url.rstrip("/"), timeout=self.timeout
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "CoreSpecClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internal request helper
    # ------------------------------------------------------------------
    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        try:
            resp = self._client.request(method, f"{self._prefix}{path}", **kwargs)
        except httpx.HTTPError as exc:  # network/connection failures
            raise CoreServiceError(502, f"gabriel-core unreachable: {exc}") from exc

        if resp.status_code >= 400:
            detail = _extract_detail(resp)
            if resp.status_code == 404:
                raise SpecificationNotFoundError(detail)
            raise CoreServiceError(resp.status_code, detail)
        return resp

    # ------------------------------------------------------------------
    # Templates
    # ------------------------------------------------------------------
    def describe_templates(self) -> list[dict[str, Any]]:
        """Return template descriptors from gabriel-core."""
        resp = self._request("GET", "/templates")
        return resp.json()["templates"]

    # ------------------------------------------------------------------
    # Instantiate
    # ------------------------------------------------------------------
    def instantiate(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Build a spec (with resolved GRNs) from a template + overrides."""
        resp = self._request("POST", "/instantiate", json=payload)
        return resp.json()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def save(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Build + persist a spec in gabriel-core; return the spec payload."""
        resp = self._request("POST", "", json=payload)
        return resp.json()

    def list_saved(self) -> list[str]:
        """List persisted specification names."""
        resp = self._request("GET", "")
        return resp.json()["specs"]

    def load(self, name: str) -> dict[str, Any]:
        """Load a persisted specification by name."""
        resp = self._request("GET", f"/{name}")
        return resp.json()

    def delete(self, name: str) -> None:
        """Delete a persisted specification."""
        self._request("DELETE", f"/{name}")


def _extract_detail(resp: httpx.Response) -> str:
    try:
        body = resp.json()
        if isinstance(body, dict) and "detail" in body:
            return str(body["detail"])
    except Exception:  # noqa: BLE001 - non-JSON error body
        pass
    return resp.text or f"gabriel-core error {resp.status_code}"


# Backwards-compatible alias. The prior implementation exposed ``CoreSpecService``
# (an in-process facade that imported gabriel-core). It is now an HTTP client.
CoreSpecService = CoreSpecClient
