"""RS256 token minting, verification, and JWKS publication.

Asymmetric signing (RS256) is deliberate: the Identity Service holds the private
key and is the *only* minter, while any downstream verifier (the Gateway, Core)
validates tokens using the published public JWKS without ever holding signing
material. This is what lets ADR-007 guarantee "Gateway never mints tokens."
"""
from __future__ import annotations

import base64
import time
import uuid
from typing import Any

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.rsa import (
    RSAPrivateKey,
    RSAPublicKey,
)


def _b64url_uint(value: int) -> str:
    """Encode an unsigned int as base64url without padding (JWK format)."""
    length = (value.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(value.to_bytes(length, "big")).rstrip(b"=").decode()


def generate_private_key_pem() -> str:
    """Generate an ephemeral RSA keypair (development use)."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()


class JWTService:
    """Signs and verifies Gabriel identity tokens."""

    ALGORITHM = "RS256"

    def __init__(
        self,
        *,
        private_key_pem: str,
        issuer: str,
        audience: str,
        key_id: str,
        ttl_seconds: int,
    ) -> None:
        self._private_key: RSAPrivateKey = serialization.load_pem_private_key(
            private_key_pem.encode(), password=None
        )  # type: ignore[assignment]
        self._public_key: RSAPublicKey = self._private_key.public_key()
        self._issuer = issuer
        self._audience = audience
        self._key_id = key_id
        self._ttl = ttl_seconds

    # -- minting ------------------------------------------------------------
    def mint(self, *, subject: str, claims: dict[str, Any]) -> tuple[str, int]:
        """Mint a signed token for ``subject``. Returns (token, expires_at_epoch).

        ``claims`` must contain identity/session data only. Callers must never
        pass permission/authorization data — that lives in Core (ADR-019).
        """
        now = int(time.time())
        exp = now + self._ttl
        payload = {
            "iss": self._issuer,
            "aud": self._audience,
            "sub": subject,
            "iat": now,
            "nbf": now,
            "exp": exp,
            "jti": uuid.uuid4().hex,
            **claims,
        }
        token = jwt.encode(
            payload,
            self._private_key,  # type: ignore[arg-type]
            algorithm=self.ALGORITHM,
            headers={"kid": self._key_id},
        )
        return token, exp

    # -- verification -------------------------------------------------------
    def verify(self, token: str) -> dict[str, Any]:
        """Verify a token's signature and standard claims. Raises on failure."""
        return jwt.decode(
            token,
            self._public_key,  # type: ignore[arg-type]
            algorithms=[self.ALGORITHM],
            audience=self._audience,
            issuer=self._issuer,
        )

    # -- JWKS ---------------------------------------------------------------
    def jwks(self) -> dict[str, list[dict[str, str]]]:
        """Public key set for downstream verifiers (RFC 7517)."""
        numbers = self._public_key.public_numbers()
        return {
            "keys": [
                {
                    "kty": "RSA",
                    "use": "sig",
                    "alg": self.ALGORITHM,
                    "kid": self._key_id,
                    "n": _b64url_uint(numbers.n),
                    "e": _b64url_uint(numbers.e),
                }
            ]
        }
