# Gabriel Desktop

The **Application layer** of Project Gabriel — the Enterprise AI Operating System.
This is the surface end users interact with: chat, agents, documents, memory,
resources, and the workspace shell that ties them together.

Gabriel is built as three strictly separated layers:

| Layer | Repo | Responsibility |
| --- | --- | --- |
| **Core (Platform)** | `gabriel-core` | Identity/principals, Policy Engine (PEEL), Universal Resource Model (GRNs), multi-tenancy, event store. **No UI, no LLM, no chat.** |
| **SDK** | `gabriel-sdk` | Thin, typed Python transport client for Core. |
| **Application (this repo)** | `gabriel-desktop` | Chat UI, agent runtime + LLM providers, workspaces. Consumes Core via the SDK through a Gateway (BFF). |

> This repository is **M0 — the application scaffold**: the full workspace shell,
> design system, routing, and every P0/P1 workspace wired to a mock data layer.
> No Gateway or Core connection yet — the app runs entirely against in-memory
> mock data so the UX and architecture can be evaluated end-to-end.

---

## Topology

```
Browser / Desktop
      │
      ▼
Gabriel Gateway (BFF)      ← session mgmt, auth delegation, WebSocket brokering,
      │                       request aggregation, streaming. NO business logic.
      ▼
Python Gabriel SDK
      │
      ▼
Gabriel Core               ← identity, policy, resources, events (source of truth)
```

The web app **never** talks to Core directly. It talks to the Gateway, which
delegates authentication to the Identity Service (ADR-007) and brokers realtime
traffic. In M0 the Gateway does not exist yet, so the service layer transparently
returns mock data (see [Mock data & `USE_MOCK`](#mock-data--use_mock)).

---

## Monorepo layout

```
gabriel-desktop/
├── apps/
│   └── web/                # Next.js 15 (App Router) + React 19 + Tailwind v4
│       └── src/
│           ├── app/        # Routes. (app) = authenticated shell, (auth) = login
│           ├── components/ # ui/ (design system), layout/ (shell), providers/, common/
│           ├── config/     # navigation (single source of truth for workspaces)
│           ├── features/   # feature modules: chat, agents, documents, memory, …
│           ├── hooks/      # cross-cutting hooks
│           ├── lib/        # utils, formatting
│           ├── services/   # the ONLY I/O layer (gateway-client, realtime, mock)
│           ├── stores/     # Zustand — ephemeral UI/session state only
│           └── types/      # domain types (identity, agent, chat, resource, …)
├── apps/gateway/           # (future) the BFF
├── services/               # (future) identity service, etc.
├── packages/               # (future) shared TS packages
└── docs/                   # architecture notes / ADR index
```

## Architecture rules (enforced by structure)

- **Components → feature hooks → services → gateway-client/realtime.**
  Components never fetch directly. The service layer is the only place that
  performs I/O; swapping mock for live is a single flag.
- **TanStack Query owns server state. Zustand owns ephemeral UI state.** They
  never overlap. Sessions hold identity only — **no tokens, no permissions**
  (authorization is always evaluated by Core's Policy Engine at runtime, ADR-019).
- **Realtime is an abstraction (ADR-033), not hard-coded SSE.** `useChatStream`
  is transport-agnostic; the M0 mock transport emits the same token/lifecycle/done
  frames a live WebSocket will, so no feature code changes when the Gateway lands.
- **LLM config is per-agent (ADR-007 §7).** There is no global model. The provider
  is part of each agent's config behind a provider-agnostic interface.
- **Workspaces, not pages (ADR-035).** The shell (sidebar + topbar + assistant
  rail + command palette) never unmounts; routes render into it, preserving
  context across navigation.

---

## Getting started

Requires **Node 20+** and **pnpm 11+**.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other scripts (run from the repo root; they delegate to `apps/web`):

```bash
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
```

### Signing in (M0)

There is no real identity provider yet. The login screen renders the **Dev
Identity Provider** (ADR-007): pick one of the seeded pilot-org identities
(insurance, custom clothing, church, bagpiping) to enter the app. The dev
provider issues the same session shape a production provider will and is
compiled out of production builds.

---

## Mock data & `USE_MOCK`

M0 has no Gateway/Core. Every service module in `src/services` checks a single
`USE_MOCK` flag (`src/services/gateway-client.ts`):

- **`USE_MOCK = true` (default):** services resolve from `src/services/mock/data.ts`
  with a small artificial latency. The realtime layer uses a scripted mock
  transport.
- **`USE_MOCK = false`:** the exact same functions call `gatewayRequest(...)`
  against `NEXT_PUBLIC_GATEWAY_URL` (default `http://localhost:8080`).

Because feature code only ever imports the service barrel (`@/services`),
flipping the flag — and eventually deleting `mock/` — requires **zero component
changes**. This is the seam where the Gateway integration (M2) plugs in.

---

## Workspaces in this build

| Workspace | Priority | State |
| --- | --- | --- |
| Home (dashboard) | Core | ✅ stats, quick-asks, active agents, recent activity |
| Chat | P0 | ✅ two-pane, streaming replies, lifecycle indicator |
| Agents | P0 | ✅ grid + per-agent model config editor & lifecycle |
| Documents | P0 | ✅ library, upload, async processing, delete |
| Memory | P1 | ✅ multi-layer browser (read-only lens) |
| Resources | P1 | ✅ integration/resource cards |
| Settings | Core | ✅ profile, org, theme, session |
| Global command palette (⌘K) | Core | ✅ nav + cross-entity search + "Ask Gabriel" |
| Assistant rail | Core | ✅ always-available, context-scoped assistant |
| Workflows / Administration | P2 | ⏳ reserved in nav, not yet implemented |

---

## Roadmap

M0 (this) → **M1** Identity service + real dev login → **M2** Gateway + session +
Core connection → **M3** streaming chat + Agent Runtime (mock providers) →
**M4** documents → **M5** agent management → **M6** dashboard + search →
**M7** memory + resources → **M8** admin + event viewer. Each milestone is
PR-sized and demoable. The eventual desktop target is Tauri; platform concerns
are kept behind a future `platform/` adapter so the web build stays first-class.

See `../GABRIEL_DESKTOP_ARCHITECTURE_AND_PLAN.md` for the frozen v1 architecture.
