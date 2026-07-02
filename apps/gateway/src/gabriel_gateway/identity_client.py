"""Async HTTP client for the Identity Service.

This is the only module that talks to Identity. It is server-to-server; the
browser never reaches Identity directly. Errors are normalized into
``IdentityError`` with the upstream status code so routes can translate them.
"""
from __future__ import annotations

from typing import Any

import httpx


class IdentityError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class IdentityClient:
    def __init__(self, base_url: str, *, timeout: float = 5.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self._base_url, timeout=timeout)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            resp = await self._client.request(method, path, **kwargs)
        except httpx.HTTPError as exc:  # network/timeout → 502-ish upstream
            raise IdentityError(502, f"Identity Service unreachable: {exc}") from exc
        if resp.status_code >= 400:
            detail = resp.text
            try:
                detail = resp.json().get("detail", detail)
            except Exception:  # noqa: BLE001 - non-JSON error body
                pass
            raise IdentityError(resp.status_code, detail)
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    async def get_providers(self) -> list[dict[str, Any]]:
        return await self._request("GET", "/auth/providers")

    async def get_dev_principals(self) -> list[dict[str, Any]]:
        return await self._request("GET", "/auth/dev/principals")

    async def dev_login(self, user_id: str) -> dict[str, Any]:
        """Delegate a dev login. Returns Identity's ``TokenResponse`` body."""
        return await self._request(
            "POST", "/auth/dev/login", json={"user_id": user_id}
        )

    async def introspect(self, token: str) -> dict[str, Any]:
        """Validate a token and return its ``SessionView`` body."""
        return await self._request(
            "POST", "/auth/introspect", json={"token": token}
        )
