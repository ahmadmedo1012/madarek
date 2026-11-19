#!/usr/bin/env bash
# scripts/gates/pre-push-guard.sh — R369 evidence-policy guard (agent A).
#
# Runs scripts/gates/size-gate.sh against the base the push is about to
# update, so a red size gate blocks the push LOCALLY instead of in CI.
# Rules enforced (same three as CI size-gate.yml):
#   RULE 1  no tracked file >500KB outside .size-gate-allowlist
#   RULE 2  docs/ tracked total ≤30MB
#   RULE 3  the push adds ≤5MB to docs/ (vs the remote tip it updates)
#
# The guard is what keeps the R369 evidence policy honest locally:
# committed evidence = JSON + ≤1.5MB of contact sheets per push;
# per-state captures live under gitignored paths (docs/audit/evidence/
# .local/ or the gitignored in-place dirs) and never ride a push.
#
# Usage (explicit):     bash scripts/gates/pre-push-guard.sh [base]
# Installed as a hook:  git config core.hooksPath .githooks
#                       (then every `git push` runs .githooks/pre-push,
#                        which calls this script with the remote tip as
#                        the base; a new branch passes no base → RULE 3
#                        skips exactly like CI, RULES 1/2 still gate).
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT" ]; then
  echo "pre-push-guard: not inside a git work tree" >&2
  exit 1
fi
cd "$ROOT"

base="${1:-}"
if [ -z "$base" ]; then
  # Hook mode: read the pre-push stdin lines
  #   <local_ref> <local_sha> <remote_ref> <remote_sha>
  # and resolve the FIRST updatable remote tip as the RULE 3 base.
  if [ ! -t 0 ]; then
    while read -r _lref _lsha _rref rsha; do
      [ -n "${rsha:-}" ] || continue
      if [ "$rsha" != "0000000000000000000000000000000000000000" ]; then
        base="$rsha"
        break
      fi
    done
  fi
fi
if [ -n "$base" ] && ! git rev-parse --verify -q "$base" >/dev/null 2>&1; then
  echo "pre-push-guard: base $base not resolvable locally — run git fetch first; enforcing RULES 1/2 only" >&2
  base=""
fi

if SIZE_GATE_BASE="$base" bash scripts/gates/size-gate.sh; then
  echo "pre-push-guard: GREEN — push allowed."
  exit 0
else
  echo "pre-push-guard: RED — push BLOCKED." >&2
  echo "  Fix the size regressions: move per-state captures under a gitignored path" >&2
  echo "  (docs/audit/evidence/.local/ or the in-place gitignored dirs), commit only" >&2
  echo "  JSON + ≤1.5MB of contact sheets per push, or extend .size-gate-allowlist" >&2
  echo "  WITH a reason." >&2
  exit 1
fi
