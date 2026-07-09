"""Tests for the gabriel-desktop <-> gabriel-core seam (CoreSpecService).

These prove the desktop layer drives gabriel-core's migrated agent
specification system rather than re-implementing it.
"""

from __future__ import annotations

import pytest

from gabriel.agent import AgentSpecification
from gabriel_gateway.core_specs import CoreSpecService, SpecificationNotFoundError


def test_lists_migrated_templates(service: CoreSpecService) -> None:
    keys = service.list_template_keys()
    assert keys == ["chat", "engineer", "researcher", "daemon", "server"]


def test_describe_templates_shape(service: CoreSpecService) -> None:
    descriptors = service.describe_templates()
    assert len(descriptors) == 5
    chat = next(d for d in descriptors if d["key"] == "chat")
    assert chat["legacyClass"] == "ChatAgent"
    assert chat["provider"]
    assert chat["runtime"]
    assert "chat" in chat["capabilities"]
    # Templates expose tool bindings and memory layers.
    assert chat["tools"]
    assert chat["memoryLayers"]


def test_instantiate_returns_validated_spec(service: CoreSpecService) -> None:
    spec = service.instantiate("chat", name="support-bot")
    assert isinstance(spec, AgentSpecification)
    assert spec.name == "support-bot"
    # Provenance metadata is carried from the template.
    assert spec.metadata.get("template") == "chat"


def test_instantiate_unknown_template_raises(service: CoreSpecService) -> None:
    with pytest.raises(KeyError):
        service.instantiate("does-not-exist")


def test_resolve_tool_grns_are_org_scoped(service: CoreSpecService) -> None:
    spec = service.instantiate("chat")
    grns = service.resolve_tool_grns(spec, version=1)
    assert grns, "expected at least one tool binding"
    for grn in grns:
        assert grn.startswith("grn:acme:tool/")
        assert grn.endswith(":1")


def test_save_load_roundtrip(service: CoreSpecService) -> None:
    spec = service.instantiate("researcher", name="scout")
    path = service.save(spec)
    assert path.endswith(".json")
    assert "scout" in service.list_saved()

    loaded = service.load("scout")
    assert loaded.name == "scout"
    assert loaded.tool_names() == spec.tool_names()
    assert loaded.capabilities == spec.capabilities


def test_load_missing_raises(service: CoreSpecService) -> None:
    with pytest.raises(SpecificationNotFoundError):
        service.load("ghost")


def test_delete_removes_spec(service: CoreSpecService) -> None:
    spec = service.instantiate("daemon", name="cron")
    service.save(spec)
    assert "cron" in service.list_saved()
    service.delete("cron")
    assert "cron" not in service.list_saved()


def test_seed_templates_persists_all(service: CoreSpecService) -> None:
    names = service.seed_templates()
    assert len(names) == 5
    saved = service.list_saved()
    for name in names:
        assert name in saved
