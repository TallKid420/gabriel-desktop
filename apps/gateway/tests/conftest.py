"""Shared fixtures for gateway tests."""

from __future__ import annotations

import pytest

from gabriel_gateway.core_specs import CoreSpecService


@pytest.fixture()
def specs_dir(tmp_path):
    """A throwaway directory backing the spec store."""
    return tmp_path / "agent-specs"


@pytest.fixture()
def service(specs_dir) -> CoreSpecService:
    """A CoreSpecService pointed at a temp store."""
    return CoreSpecService(specs_dir=str(specs_dir), org_id="acme")
