"""Tests for RS256 minting, verification, and JWKS publication."""
from __future__ import annotations

import time

import jwt
import pytest

from gabriel_identity.jwt_service import JWTService, generate_private_key_pem


@pytest.fixture
def jwt_service() -> JWTService:
    return JWTService(
        private_key_pem=generate_private_key_pem(),
        issuer="https://identity.test.local",
        audience="gabriel-gateway",
        key_id="test-key-1",
        ttl_seconds=3600,
    )


def test_mint_verify_round_trip(jwt_service: JWTService) -> None:
    token, exp = jwt_service.mint(
        subject="principal://org_x/user/a", claims={"name": "A", "roles": ["member"]}
    )
    payload = jwt_service.verify(token)

    assert payload["sub"] == "principal://org_x/user/a"
    assert payload["iss"] == "https://identity.test.local"
    assert payload["aud"] == "gabriel-gateway"
    assert payload["name"] == "A"
    assert payload["roles"] == ["member"]
    assert payload["exp"] == exp
    # Standard registered claims must be present.
    for claim in ("iat", "nbf", "exp", "jti"):
        assert claim in payload


def test_mint_uses_algorithm_and_kid_header(jwt_service: JWTService) -> None:
    token, _ = jwt_service.mint(subject="s", claims={})
    header = jwt.get_unverified_header(token)
    assert header["alg"] == "RS256"
    assert header["kid"] == "test-key-1"


def test_jwks_structure(jwt_service: JWTService) -> None:
    jwks = jwt_service.jwks()
    assert "keys" in jwks and len(jwks["keys"]) == 1
    key = jwks["keys"][0]
    assert key["kty"] == "RSA"
    assert key["use"] == "sig"
    assert key["alg"] == "RS256"
    assert key["kid"] == "test-key-1"
    assert key["n"] and key["e"]  # base64url modulus + exponent


def test_tampered_token_rejected(jwt_service: JWTService) -> None:
    token, _ = jwt_service.mint(subject="s", claims={"name": "A"})
    tampered = token[:-4] + ("aaaa" if not token.endswith("aaaa") else "bbbb")
    with pytest.raises(jwt.PyJWTError):
        jwt_service.verify(tampered)


def test_wrong_audience_rejected(jwt_service: JWTService) -> None:
    token, _ = jwt_service.mint(subject="s", claims={})
    other = JWTService(
        private_key_pem=generate_private_key_pem(),  # different key too
        issuer="https://identity.test.local",
        audience="someone-else",
        key_id="k",
        ttl_seconds=60,
    )
    with pytest.raises(jwt.PyJWTError):
        other.verify(token)


def test_expired_token_rejected() -> None:
    svc = JWTService(
        private_key_pem=generate_private_key_pem(),
        issuer="https://identity.test.local",
        audience="gabriel-gateway",
        key_id="k",
        ttl_seconds=-1,  # already expired
    )
    token, exp = svc.mint(subject="s", claims={})
    assert exp <= int(time.time())
    with pytest.raises(jwt.ExpiredSignatureError):
        svc.verify(token)


def test_key_from_other_service_rejected(jwt_service: JWTService) -> None:
    """A token signed by a different private key must fail verification."""
    attacker = JWTService(
        private_key_pem=generate_private_key_pem(),
        issuer="https://identity.test.local",
        audience="gabriel-gateway",
        key_id="test-key-1",
        ttl_seconds=60,
    )
    forged, _ = attacker.mint(subject="s", claims={})
    with pytest.raises(jwt.PyJWTError):
        jwt_service.verify(forged)
