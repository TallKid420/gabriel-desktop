"""Gabriel Gateway (BFF).

The single edge the browser talks to. In Phase 4 (agent migration) the Gateway
gains a **core agent-specification seam**: it imports gabriel-core's declarative
agent specification system (templates + persistence) and exposes it to the web
app. The Gateway holds no business logic — it delegates spec construction,
validation, and persistence to gabriel-core.
"""

__version__ = "0.2.0"
