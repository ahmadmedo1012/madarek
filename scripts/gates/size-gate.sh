#!/usr/bin/env bash
# scripts/gates/size-gate.sh — R331 repo hygiene pass 1: THE SIZE GATE.
#
# Fails (exit 1) when ANY of these breaks:
#   RULE 1  any tracked file larger than 500KB that is not listed in
#           .size-gate-allowlist (exact repo-relative path, or a
#           "dir/" prefix covering everything under it);
#   RULE 2  the tracked content of docs/ totals more than 30MB;
#   RULE 3  the change under test adds more than 5MB to docs/.
#           The comparison base is $SIZE_GATE_BASE when set (the CI
#           workflow resolves it: push → github.event.before, PR → the
#           base branch tip); otherwise HEAD~1 if it exists; otherwise
#           the rule is SKIPPED with an explicit notice (first commit of
#           a branch — rules 1 and 2 still enforce the absolutes).
#
# "Tracked" = the git index (the next commit), so the gate can be run
# locally AFTER `git add` and before committing. Untracked-but-present
# files under docs/ are counted by RULE 3 (a fresh 6MB PNG that was never
# added still fails the push rule); RULE 1/2 look at the index only.
#
# Dependency-free (git + du + awk + stat) and fast: one du pass over the
# tracked set (~2k files post-R331) — well under the 1-minute CI budget.
# No continue-on-error anywhere: a red gate blocks merges.
#
# Usage: bash scripts/gates/size-gate.sh   (or: npm run gate:size)
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT" ]; then
  echo "size-gate: not inside a git work tree" >&2
  exit 1
fi
cd "$ROOT"

MAX_FILE_KB=500          # RULE 1 threshold
MAX_DOCS_KB=$((30*1024)) # RULE 2 threshold
MAX_PUSH_KB=$((5*1024))  # RULE 3 threshold
ALLOWLIST=".size-gate-allowlist"

fail=0

# ── helpers ──────────────────────────────────────────────────────────────
# du -k per tracked file: "<KB>\t<path>" (tab-separated → spaces in names
# are safe; filenames containing raw newlines would break this — none
# exist in this repo and .gitignore now blocks the evidence trees that
# produced the one historic unicode-name case).
tracked_sizes_kb() { # $1..: git pathspecs (optional)
  git ls-files -z -- "$@" | xargs -0 -r du -k --apparent-size 2>/dev/null
}

allowlisted() { # $1: repo-relative path
  [ -f "$ALLOWLIST" ] || return 1
  local p="$1" entry
  while IFS= read -r entry; do
    case "$entry" in ''|'#'*) continue ;; esac
    if [ "$entry" = "$p" ]; then return 0; fi
    case "$entry" in */) [ "${p#${entry}}" != "$p" ] && return 0 ;; esac
  done < "$ALLOWLIST"
  return 1
}

# ── RULE 1 — no tracked file >500KB outside the allowlist ───────────────
big=$(tracked_sizes_kb | awk -F'\t' -v max="$MAX_FILE_KB" '$1 > max {print $2}')
offenders=""
allow_count=0
if [ -n "$big" ]; then
  while IFS= read -r p; do
    if allowlisted "$p"; then
      allow_count=$((allow_count+1))
      echo "size-gate: allowlisted >${MAX_FILE_KB}KB: $p"
    else
      offenders="$offenders$p"$'\n'
    fi
  done <<< "$big"
fi
if [ -n "$offenders" ]; then
  echo "size-gate: FAIL rule 1 — tracked files >${MAX_FILE_KB}KB not in $ALLOWLIST:" >&2
  printf '%s' "$offenders" >&2
  fail=1
else
  echo "size-gate: rule 1 ok — no tracked file >${MAX_FILE_KB}KB outside allowlist (${allow_count} allowlisted)"
fi

# ── RULE 2 — docs/ tracked total ≤30MB ──────────────────────────────────
docs_kb=$(tracked_sizes_kb docs | awk -F'\t' '{s+=$1} END {print s+0}')
if [ "$docs_kb" -gt "$MAX_DOCS_KB" ]; then
  echo "size-gate: FAIL rule 2 — docs/ tracked total ${docs_kb}KB > ${MAX_DOCS_KB}KB (30MB)" >&2
  fail=1
else
  echo "size-gate: rule 2 ok — docs/ tracked total ${docs_kb}KB ≤ ${MAX_DOCS_KB}KB (30MB)"
fi

# ── RULE 3 — this change adds ≤5MB to docs/ ─────────────────────────────
base="${SIZE_GATE_BASE:-}"
if [ -z "$base" ] && git rev-parse --verify -q 'HEAD~1' >/dev/null 2>&1; then
  base='HEAD~1'
fi
if [ -z "$base" ] || ! git rev-parse --verify -q "$base" >/dev/null 2>&1; then
  echo "size-gate: rule 3 SKIPPED — no resolvable base (set SIZE_GATE_BASE; first commit of a branch is exempt)"
else
  # files Added/Modified under docs/ between base and the working tree …
  changed=$(git diff --name-only --diff-filter=AM "$base" -- docs/ 2>/dev/null)
  # … plus untracked files under docs/ (counted even before `git add`)
  untracked=$(git ls-files -o --exclude-standard -- docs/)
  push_kb=0
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    [ -f "$p" ] || continue
    kb=$(du -k --apparent-size -- "$p" 2>/dev/null | awk -F'\t' '{print $1}')
    push_kb=$((push_kb + ${kb:-0}))
  done <<< "$changed"$'\n'"$untracked"
  if [ "$push_kb" -gt "$MAX_PUSH_KB" ]; then
    echo "size-gate: FAIL rule 3 — change adds ${push_kb}KB to docs/ (>${MAX_PUSH_KB}KB / 5MB) vs base $base" >&2
    fail=1
  else
    echo "size-gate: rule 3 ok — change adds ${push_kb}KB to docs/ ≤ ${MAX_PUSH_KB}KB (5MB) vs base $base"
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "size-gate: RED — fix the size regressions above (or extend .size-gate-allowlist with a reason)." >&2
  exit 1
fi
echo "size-gate: GREEN — tree stays lean (files ≤${MAX_FILE_KB}KB, docs/ ≤30MB, push adds ≤5MB to docs/)."
