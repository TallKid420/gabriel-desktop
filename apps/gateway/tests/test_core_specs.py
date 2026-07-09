"""Tests for the gabriel-desktop <-> gabriel-core HTTP seam (CoreSpecClient).

These prove the desktop layer drives gabriel-core's migrated agent
specification system **over HTTP** (via httpx against gabriel-core's ASGI app)
rather than importing or re-implementing it.
"""

from __future__ import annotations

import pytest

from gabriel_gateway.core_specs import CoreSpecClient, SpecificationNotFoundError


def test_describe_templates_shape(spec_client: CoreSpecClient) -> None:
    descriptors = spec_client.describe_templates()
    keys = {d["key"] for d in descriptors}
    assert {"chat", "engineer", "researcher", "daemon", "server"} <= keys
    chat = next(d for d in descriptors if d["key"] == "chat")
    assert chat["legacyClass"] == "ChatAgent"
    assert chat["provider"]
    assert chat["runtime"]
    assert "chat" in chat["capabilities"]
    assert chat["tools"]
    assert chat["memoryLayers"]


def test_instantiate_returns_validated_spec_with_resolved_grns(
    spec_client: CoreSpecClient,
) -> None:
    body = spec_client.instantiate({"template": "chat", "name": "support-bot"})
    assert body["name"] == "support-bot"
    # Provenance metadata is carried from the template.
    assert body["metadata"].get("template") == "chat"
    # Core resolves wildcard tool bindings to org-scoped GRNs.
    assert body["resolvedTools"]
    for grn in body["resolvedTools"]:
        assert grn.startswith("grn:acme:tool/")
        assert grn.endswith(":1")


def test_instantiate_unknown_template_raises(spec_client: CoreSpecClient) -> None:
    with pytest.raises(SpecificationNotFoundError):
        spec_client.instantiate({"template": "does-not-exist"})


def test_save_load_roundtrip(spec_client: CoreSpecClient) -> None:
    saved = spec_client.save({"template": "researcher", "name": "scout"})
    assert saved["path"].endswith(".json")
    assert "scout" in spec_client.list_saved()

    loaded = spec_client.load("scout")
    assert loaded["name"] == "scout"
    assert loaded["capabilities"] == saved["capabilities"]


def test_load_missing_raises(spec_client: CoreSpecClient) -> None:
    with pytest.raises(SpecificationNotFoundError):
        spec_client.load("ghost")


def test_delete_removes_spec(spec_client: CoreSpecClient) -> None:
    spec_client.save({"template": "daemon", "name": "cron"})
    assert "cron" in spec_client.list_saved()
    spec_client.delete("cron")
    assert "cron" not in spec_client.list_saved()
