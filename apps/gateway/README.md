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

## Run

```bash
pip install -e ".[dev]"
uvicorn gabriel_gateway.main:app --port 8080 --app-dir src
python -m pytest        # 10 tests
```
