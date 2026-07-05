"""Seeded identities for the Dev Identity Provider.

These mirror the four pilot organizations (insurance, custom clothing, church,
bagpiping) used across the web app's mock data, so the login experience is
consistent end-to-end during development. In production these come from real
providers (password, Google, Entra, Okta) backed by Core principals.
"""
from __future__ import annotations

from .models import DevPrincipalOption, Organization, Principal

_HARBOR = Organization(id="org_harbor", name="Harbor Mutual Insurance", plan="Pilot")
_THREAD = Organization(id="org_thread", name="Thread & Needle Custom Clothing", plan="Pilot")
_GRACE = Organization(id="org_grace", name="Grace Community Church", plan="Pilot")
_HIGHLAND = Organization(id="org_highland", name="Highland Bagpiping Co.", plan="Pilot")


DEV_PRINCIPALS: list[DevPrincipalOption] = [
    DevPrincipalOption(
        organization=_HARBOR,
        user=Principal(
            id="u_alice",
            principal="principal://org_harbor/user/alice",
            display_name="Alice Nguyen",
            initials="AN",
            email="alice@harbormutual.com",
            roles=["workspace_admin"],
        ),
    ),
    DevPrincipalOption(
        organization=_HARBOR,
        user=Principal(
            id="u_marco",
            principal="principal://org_harbor/user/marco",
            display_name="Marco Reyes",
            initials="MR",
            email="marco@harbormutual.com",
            roles=["member"],
        ),
    ),
    DevPrincipalOption(
        organization=_THREAD,
        user=Principal(
            id="u_sofia",
            principal="principal://org_thread/user/sofia",
            display_name="Sofia Bianchi",
            initials="SB",
            email="sofia@threadandneedle.com",
            roles=["workspace_admin"],
        ),
    ),
    DevPrincipalOption(
        organization=_GRACE,
        user=Principal(
            id="u_pastor",
            principal="principal://org_grace/user/david",
            display_name="Pastor David Kim",
            initials="DK",
            email="david@gracecommunity.org",
            roles=["workspace_admin"],
        ),
    ),
    DevPrincipalOption(
        organization=_HIGHLAND,
        user=Principal(
            id="u_hamish",
            principal="principal://org_highland/user/hamish",
            display_name="Hamish MacLeod",
            initials="HM",
            email="hamish@highlandpipes.co",
            roles=["workspace_admin", "operator"],
        ),
    ),
]


def find_dev_principal(user_id: str) -> DevPrincipalOption | None:
    return next((p for p in DEV_PRINCIPALS if p.user.id == user_id), None)
