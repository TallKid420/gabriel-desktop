"""Tests for the Dev Identity Provider and the token/session shaping it feeds."""
from __future__ import annotations

import pytest

from gabriel_identity.providers.base import AuthError
from gabriel_identity.providers.dev import DevIdentityProvider
from gabriel_identity.seed import DEV_PRINCIPALS
from gabriel_identity.service import IdentityService


@pytest.fixture
def dev_provider() -> DevIdentityProvider:
    return DevIdentityProvider()


def test_list_principals_matches_seed(dev_provider: DevIdentityProvider) -> None:
    principals = dev_provider.list_principals()
    assert len(principals) == len(DEV_PRINCIPALS) == 5
    ids = {p.user.id for p in principals}
    assert ids == {"u_alice", "u_marco", "u_sofia", "u_pastor", "u_hamish"}


def test_authenticate_valid_returns_result(dev_provider: DevIdentityProvider) -> None:
    result = dev_provider.authenticate({"user_id": "u_alice"})
    assert result.principal.id == "u_alice"
    assert result.organization.id == "org_harbor"
    assert result.auth_method == "dev"


def test_authenticate_unknown_raises(dev_provider: DevIdentityProvider) -> None:
    with pytest.raises(AuthError):
        dev_provider.authenticate({"user_id": "u_nobody"})


def test_authenticate_missing_user_id_raises(dev_provider: DevIdentityProvider) -> None:
    with pytest.raises(AuthError):
        dev_provider.authenticate({})


def test_issue_produces_identity_only_token(service: IdentityService) -> None:
    result = service.registry.dev.authenticate({"user_id": "u_hamish"})
    token_response = service.issue(result)

    assert token_response.token_type == "Bearer"
    assert token_response.access_token

    payload = service.jwt.verify(token_response.access_token)
    # Identity/session claims present.
    assert payload["org_id"] == "org_highland"
    assert payload["org_name"] == "Highland Bagpiping Co."
    assert payload["tenant_id"] == "org_highland"
    assert payload["principal"] == "principal://org_highland/user/hamish"
    assert payload["roles"] == ["workspace_admin", "operator"]
    assert payload["amr"] == "dev"
    # No permission/authorization claims may leak into the token (ADR-019).
    for forbidden in ("permissions", "scopes", "policy", "grants", "can"):
        assert forbidden not in payload


def test_session_round_trips_from_token(service: IdentityService) -> None:
    result = service.registry.dev.authenticate({"user_id": "u_sofia"})
    token_response = service.issue(result)

    session = service.session_from_token(token_response.access_token)
    assert session.user.id == "u_sofia"
    assert session.user.display_name == "Sofia Bianchi"
    assert session.user.initials == "SB"
    assert session.organization.id == "org_thread"
    assert session.organization.name == "Thread & Needle Custom Clothing"
    assert session.tenant_id == "org_thread"
    assert session.auth_method == "dev"
