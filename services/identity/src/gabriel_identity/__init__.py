"""Gabriel Identity Service.

The single source of authentication truth for the Gabriel platform (ADR-007).
It authenticates principals through pluggable providers and mints primary
identity tokens (JWTs). No other component — including the Gateway — is
permitted to mint primary tokens.

Tokens carry *identity and session* claims only. Fine-grained authorization is
never encoded here; it is evaluated at runtime by Core's Policy Engine
(ADR-019).
"""

__version__ = "0.1.0"
