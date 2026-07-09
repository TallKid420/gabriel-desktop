"""Core agent-specification seam for the Gateway.

This is the integration point that wires **gabriel-desktop** to **gabriel-core**.
The desktop app never re-implements agent modelling: it imports gabriel-core's
declarative agent system and drives it.

Responsibilities
----------------
* Expose the migrated template library (chat/engineer/researcher/daemon/server).
* Instantiate a template into a concrete :class:`AgentSpecification`, applying
  browser-supplied overrides (name, model, system prompt, …).
* Resolve wildcard tool GRNs to concrete, org-scoped tool GRNs.
* Validate a specification against the template vocabulary.
* Persist / load specifications through gabriel-core's
  :class:`AgentSpecificationStore` (the shared authoring format).

Everything below delegates to gabriel-core; there is deliberately no agent
business logic in the Gateway (ADR: BFF holds no business logic).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# --- gabriel-core imports (the wiring) -------------------------------------
from gabriel.agent import (
    AgentSpecification,
    AgentSpecificationStore,
    AgentValidator,
    build_specification,
    get_template,
    list_templates,
    template_vocabulary,
)
from gabriel.agent.store import SpecificationNotFoundError

__all__ = [
    "CoreSpecService",
    "SpecificationNotFoundError",
]


@dataclass
class CoreSpecService:
    """Facade the Gateway uses to talk to gabriel-core's spec system.

    Args:
        specs_dir: Directory backing the :class:`AgentSpecificationStore`.
        org_id: Organization used to resolve wildcard tool bindings to GRNs.
    """

    specs_dir: str
    org_id: str = "acme"

    def __post_init__(self) -> None:
        self._store = AgentSpecificationStore(self.specs_dir)
        vocab = template_vocabulary()
        self._validator = AgentValidator(
            runtimes=vocab["runtimes"],
            tools=vocab["tools"],
            capabilities=vocab["capabilities"],
            memory_layers=vocab["memory_layers"],
            models=vocab["models"],
        )

    # ------------------------------------------------------------------
    # Templates
    # ------------------------------------------------------------------
    def list_template_keys(self) -> list[str]:
        """Return the available template keys (legacy agent types)."""
        return list_templates()

    def describe_templates(self) -> list[dict[str, Any]]:
        """Return browser-friendly descriptors for every template."""
        descriptors: list[dict[str, Any]] = []
        for key in list_templates():
            template = get_template(key)
            spec = template.build()
            descriptors.append(
                {
                    "key": template.key,
                    "legacyClass": template.legacy_class,
                    "name": spec.name,
                    "description": spec.description,
                    "model": spec.model,
                    "provider": spec.provider,
                    "runtime": spec.runtime,
                    "capabilities": spec.capabilities,
                    "tools": spec.tools,
                    "memoryLayers": spec.memory_layers,
                    "triggers": [t.event_type for t in spec.normalized_triggers()],
                }
            )
        return descriptors

    # ------------------------------------------------------------------
    # Instantiate + validate
    # ------------------------------------------------------------------
    def instantiate(self, template_key: str, **overrides: Any) -> AgentSpecification:
        """Build a concrete specification from a template + overrides, validated."""
        spec = build_specification(template_key, **overrides)
        # Validator checks tool *names* rather than GRN bindings.
        self._validator.validate(spec.model_copy(update={"tools": spec.tool_names()}))
        return spec

    def resolve_tool_grns(self, spec: AgentSpecification, version: int = 1) -> list[str]:
        """Resolve a spec's (wildcard) tool bindings to concrete org-scoped GRNs."""
        return spec.resolved_tools(self.org_id, version)

    # ------------------------------------------------------------------
    # Persistence (delegated to gabriel-core's store)
    # ------------------------------------------------------------------
    def save(self, spec: AgentSpecification, *, name: str | None = None) -> str:
        """Persist *spec*; return the on-disk path as a string."""
        return str(self._store.save(spec, name=name))

    def load(self, name: str) -> AgentSpecification:
        """Load a persisted specification by name."""
        return self._store.load(name)

    def list_saved(self) -> list[str]:
        """List persisted specification names."""
        return self._store.list()

    def delete(self, name: str) -> None:
        """Delete a persisted specification."""
        self._store.delete(name)

    def seed_templates(self) -> list[str]:
        """Persist every template spec into the store; return names written."""
        names: list[str] = []
        for key in list_templates():
            spec = build_specification(key)
            self._store.save(spec)
            names.append(spec.name)
        return names
