#!/usr/bin/env bash
# dev-once.sh — single-call dev-stack pattern for R333 in a sandbox that reaps
# orphaned processes between tool calls. Start services, wait for readiness,
# run a user command, then kill everything we started. ALL inside one call.
#
# Usage:
#   bash scripts/r333/dev-once.sh --web-only -- CMD...        # vite only
#   bash scripts/r333/dev-once.sh -- CMD...                   # backend + vite
#   bash scripts/r333/dev-once.sh --web-only --port 5199 -- CMD...
#
# Env:
#   VITE_READY_RE=' locally at|Local:|ready in'   # readiness regex
#   BACK_CMD='npm run dev -w backend'              # override backend start
set -u
WEB_ONLY=0; PORT=5173
while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-only) WEB_ONLY=1; shift;;
    --port) PORT="$2"; shift 2;;
    --) shift; break;;
    *) echo "unknown arg $1" >&2; exit 2;;
  esac
done
[[ $# -gt 0 ]] || { echo "no command after --" >&2; exit 2; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
PIDS=()
cleanup() {
  for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done
  # belt-and-braces: kill by port listeners we own
  for port in "$PORT" 4000; do
    fuser -k "${port}/tcp" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [[ $WEB_ONLY -eq 0 ]]; then
  npm run dev -w backend > /tmp/r333-backend.log 2>&1 &
  PIDS+=($!)
  echo "[dev-once] backend starting (pid ${PIDS[-1]}) log=/tmp/r333-backend.log"
fi

( cd frontend && VITE_PORT="$PORT" npx vite --port "$PORT" --strictPort --force > /tmp/r333-vite.log 2>&1 & echo $! > /tmp/r333-vite.pid )
PIDS+=("$(cat /tmp/r333-vite.pid)")
echo "[dev-once] vite starting (pid ${PIDS[-1]}) log=/tmp/r333-vite.log port=$PORT"

for i in $(seq 1 90); do
  if curl -sf "http://localhost:${PORT}/" > /dev/null 2>&1; then
    echo "[dev-once] vite ready after ${i}s"; break
  fi
  sleep 1
  if [[ $i -eq 90 ]]; then echo "[dev-once] vite NOT ready (90s)" >&2; tail -20 /tmp/r333-vite.log >&2; exit 3; fi
done

if [[ $WEB_ONLY -eq 0 ]]; then
  for i in $(seq 1 60); do
    if grep -qE 'listening|ready|started' /tmp/r333-backend.log 2>/dev/null; then
      echo "[dev-once] backend ready after ${i}s"; break
    fi
    sleep 1
  done
fi

"$@"
RC=$?
echo "[dev-once] command exited rc=$RC"
exit $RC
