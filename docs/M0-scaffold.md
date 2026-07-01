# M0 — Application Scaffold

**Goal:** stand up the complete Gabriel Desktop application shell and every
P0/P1 workspace against a mock data layer, so the UX and the layer boundaries
can be evaluated end-to-end before any Gateway/Core exists.

## What M0 delivers

- **Monorepo** (`apps/web`, plus reserved `apps/gateway`, `services/`, `packages/`).
- **Design system**: OKLCH dark (default) + light themes, Tailwind v4 `@theme`,
  and a hand-rolled shadcn/Radix component set under `components/ui`.
- **Workspace shell (ADR-035)**: persistent sidebar + topbar + assistant rail +
  ⌘K command palette that never unmount across route changes.
- **Every workspace wired**: Home, Chat, Agents (+ config editor), Documents,
  Memory, Resources, Settings, Login.
- **Transport-agnostic streaming (ADR-033)** via a mock realtime transport that
  emits the same frames a live WebSocket will.
- **Dev Identity Provider login (ADR-007)** backed by seeded pilot-org principals.

## Key seams (where later milestones plug in)

| Seam | File | Milestone that activates it |
| --- | --- | --- |
| `USE_MOCK` flag | `src/services/gateway-client.ts` | M2 (Gateway) |
| Mock data source | `src/services/mock/data.ts` | deleted at M2 |
| Realtime transport factory | `src/services/realtime/index.ts` | M3 (live WS) |
| Session hydration | `src/components/layout/session-guard.tsx` | M1 (Identity) |
| Provider registry (per-agent) | `src/types/agent.ts` `LLMProviderId` | M3 (LLM providers) |

## Boundaries asserted by M0

- Web app talks only to the (future) Gateway, never to Core.
- Session view carries **identity only** — no tokens, no permissions.
- No provider-specific LLM code in the app; provider is per-agent config.
- No business logic in the shell; features are self-contained modules.

## Verification

```bash
pnpm typecheck   # tsc --noEmit — clean
pnpm lint        # eslint — clean
pnpm build       # 11 routes, production build succeeds
pnpm dev         # smoke: login → dashboard → chat streaming → agent config
```
