"""Gabriel Gateway (BFF).

The Gateway is the single edge the browser talks to. It manages the httpOnly
session cookie and delegates authentication to the Identity Service (ADR-007).
It never mints tokens and holds no business logic — Core does that (via the SDK,
wired in a later milestone).
"""

__version__ = "0.1.0"
