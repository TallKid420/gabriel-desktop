# Gabriel Identity Service

The **only** component allowed to mint primary tokens (ADR-007). It authenticates
principals through pluggable providers and issues RS256 JWTs carrying
**identity/session claims only** — never fine-grained permissions (those are
evaluated at runtime by Core's Policy Engine, ADR-019).

## Guarantees

- **Sole minter.** Identity holds the RSA private key. Downstream verifiers
  (Gateway, Core) validate tokens using the published JWKS public key and can
  never mint — this is what structurally enforces "the Gateway never mints."
- **Dev provider is impossible in production.** The `DevIdentityProvider` issues
  production-shaped tokens with *no credential check*. When
  `GABRIEL_IDENTITY_ENVIRONMENT=production`, the config layer forcibly disables
  it regardless of any flag, and the `/auth/dev/*` routes return `404`.
- **Identity claims only.** Tokens contain `iss/aud/sub/iat/nbf/exp/jti` plus
  identity/session data (org, tenant, principal, display name, coarse `roles`
  as display hints). No permissions, scopes, or grants.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/.well-known/jwks.json` | Public keys for token verification |
| GET | `/auth/providers` | List configured providers |
| GET | `/auth/dev/principals` | Seeded dev identities (dev only; 404 in prod) |
| POST | `/auth/dev/login` | Dev login → `TokenResponse` (dev only; 404 in prod) |
| POST | `/auth/introspect` | Validate a token → `SessionView` (401 if invalid) |

Only the Gateway calls these (server-to-server). The browser never talks to
Identity directly.

## Configuration (`GABRIEL_IDENTITY_` prefix)

| Setting | Default | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | `production` disables the dev provider |
| `ISSUER` | `https://identity.gabriel.local` | JWT `iss` |
| `AUDIENCE` | `gabriel-gateway` | JWT `aud` |
| `ACCESS_TOKEN_TTL_SECONDS` | `28800` (8h) | Token lifetime |
| `KEY_ID` | `dev-key-1` | JWKS `kid` |
| `PRIVATE_KEY_PEM` | *(empty)* | Empty → ephemeral dev keypair. Prod MUST supply a managed key |
| `ENABLE_DEV_PROVIDER` | `true` | Forced off in production |

## Run

```bash
pip install -e ".[dev]"
uvicorn gabriel_identity.main:app --port 8081 --app-dir src
python -m pytest        # 29 tests
```
