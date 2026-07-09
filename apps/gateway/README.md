# Gabriel Gateway (BFF)

The single edge the browser talks to. Topology:

```
Browser → Gabriel Gateway (BFF) → Identity Service   (auth, this milestone)
                               → Python SDK → Core   (resources/agents, later)
```

The Gateway does session management, auth delegation, and request shaping. It
holds **no business logic** and **never mints tokens** (ADR-007) — it delegates
to the Identity Service and manages the httpOnly session cookie.

## Responsibilities in M1

- **Auth delegation.** `/auth/dev/login` and `/auth/session` call the Identity
  Service; the Gateway never validates credentials or signs tokens itself.
- **Session cookie.** The Identity-minted JWT is stored in an httpOnly
  `gabriel_session` cookie. The browser never handles the raw token — it only
  receives a session *view*.
- **Translation seam.** Converts Identity's snake_case contract to the browser's
  camelCase types (and accepts camelCase `userId` from the browser).
- **CORS.** Allows the exact web origin with credentials (never `*`, which is
  incompatible with credentialed requests).

## Endpoints (browser-facing)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/auth/providers` | Configured providers |
| GET | `/auth/dev/principals` | Dev identities (proxied from Identity) |
| POST | `/auth/dev/login` | `{ userId }` → sets cookie, returns `Session` |
| GET | `/auth/session` | Reads cookie → introspects → `Session` or 401 |
| POST | `/auth/logout` | Clears the session cookie (204) |

## Configuration (`GABRIEL_GATEWAY_` prefix)

| Setting | Default | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | |
| `IDENTITY_SERVICE_URL` | `http://localhost:8081` | Server-to-server only |
| `WEB_ORIGIN` | `http://localhost:3000` | Exact CORS origin |
| `SESSION_COOKIE_NAME` | `gabriel_session` | |
| `SESSION_COOKIE_SECURE` | `false` | `true` behind HTTPS (prod) |
| `SESSION_COOKIE_SAMESITE` | `lax` | |
| `SESSION_TTL_SECONDS` | `28800` (8h) | Cookie lifetime |

## Agent specifications (Phase 4 — core seam)

The Gateway exposes gabriel-core's migrated **agent specification system** to
the browser. This is the wiring point between `gabriel-desktop` and
`gabriel-core`, and it is done **purely over HTTP**: the Gateway calls
gabriel-core's `/api/v1/agent-specs` API via an `httpx` client
(`gabriel_gateway.core_specs.CoreSpecClient`). The Gateway **does not import or
install `gabriel-core`** and re-implements **no** agent modelling (consistent
with the "no business logic" rule above).

```
Browser → Gateway (CoreSpecClient / httpx) → gabriel-core HTTP API
                                              /api/v1/agent-specs
```

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/agent-specs/templates` | List migrated template descriptors (chat/engineer/researcher/daemon/server) |
| POST | `/agent-specs/instantiate` | Build a spec from a template + overrides (validated) |
| GET | `/agent-specs` | List persisted spec names |
| POST | `/agent-specs` | Build **and persist** a spec |
| GET | `/agent-specs/{name}` | Load a persisted spec |
| DELETE | `/agent-specs/{name}` | Delete a persisted spec |

Responses include `resolvedTools` — the spec's wildcard tool GRNs resolved to
concrete org-scoped GRNs (`grn:<org>:tool/<name>:<version>`).

Additional configuration (`GABRIEL_GATEWAY_` prefix):

| Setting | Default | Notes |
| --- | --- | --- |
| `CORE_BASE_URL` | `http://localhost:8000` | Base URL of the gabriel-core service |

The spec store location and org (`GABRIEL_AGENT_SPECS_DIR`,
`GABRIEL_DEFAULT_ORG_ID`) are owned and configured by **gabriel-core**, not the
Gateway.

See `gabriel-core/docs/agent-specification-system.md` for the full design.

## Run

The Gateway and gabriel-core are **separate services** wired over HTTP. Start
gabriel-core first, then point the Gateway at it:

```bash
# terminal 1 — gabriel-core (separate repo/checkout)
cd ../../gabriel-core
GABRIEL_AGENT_SPECS_DIR=.gabriel/agent-specs \
  uvicorn gabriel.api.app:app --port 8000

# terminal 2 — the Gateway (this app; no gabriel-core install)
pip install -e ".[dev]"
GABRIEL_GATEWAY_CORE_BASE_URL=http://localhost:8000 \
  uvicorn gabriel_gateway.main:app --port 8080 --app-dir src
PYTHONPATH=src python -m pytest        # HTTP seam + gateway API tests
```
