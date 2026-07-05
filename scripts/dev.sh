#!/usr/bin/env bash
#
# Start the full M1 dev stack: Identity Service (8081), Gateway (8080), and the
# web app (3000) wired to the live auth chain. Ctrl-C stops all three.
#
# Prereqs (one-time):
#   python -m venv .venv && source .venv/bin/activate
#   pip install -e services/identity[dev] -e apps/gateway[dev]
#   pnpm install
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pids=()
cleanup() { echo; echo "Stopping..."; for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

echo "→ Identity Service on :8081"
( uvicorn gabriel_identity.main:app --port 8081 --app-dir services/identity/src ) &
pids+=($!)

echo "→ Gateway on :8080"
( uvicorn gabriel_gateway.main:app --port 8080 --app-dir apps/gateway/src ) &
pids+=($!)

echo "→ Web on :3000 (live auth)"
(
  cd apps/web
  NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080 \
  NEXT_PUBLIC_LIVE_AUTH=true \
  NEXT_PUBLIC_USE_MOCK=true \
  pnpm dev
) &
pids+=($!)

echo "Stack up. Web: http://localhost:3000  Gateway: http://localhost:8080  Identity: http://localhost:8081"
wait
