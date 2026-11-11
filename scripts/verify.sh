#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════
# verify.sh — R337 the ONE local gate set every agent runs before push.
#
# The R335/R336 lesson, twice: agents merged section work without running
# the whole gate set locally and main went red (bundle 776.2 > 776, stale
# .sl-scan pin, E2E mount flake, ubuntu-26.04 chromium). This script is
# the contract: it must be green before anything reaches main.
#
# Usage:
#   bash scripts/verify.sh              # full set (what CI runs, ~8 min)
#   bash scripts/verify.sh --fast       # tsc + vitest + bundle gate only (~4 min)
#   bash scripts/verify.sh --sections home-why-wrap   # conformance scope
#   bash scripts/verify.sh --specs r305-shell-heron   # e2e scope (file stem)
#
# Exit 0 = all green. Any failure prints the failing gate's tail.
# ═════════════════════════════════════════════════════════════════════
set -uo pipefail
cd "$(dirname "$0")/.."

FAST=0
SECTIONS=""
SPECS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fast) FAST=1 ;;
    --sections) SECTIONS="$2"; shift ;;
    --specs) SPECS="$2"; shift ;;
    *) echo "unknown flag: $1"; exit 2 ;;
  esac
  shift
done

FAIL=0
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
fail() { printf '\033[31m✗ FAIL: %s\033[0m\n' "$1"; FAIL=1; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$1"; }

# 1. typecheck (frontend tests tree included — CI runs the same)
step "tsc (frontend)"
if (cd frontend && npx tsc --noEmit -p tsconfig.json); then ok "tsc"; else fail "tsc"; fi

# 2. unit tests
step "vitest (frontend unit)"
if (cd frontend && npx vitest run > /tmp/verify-vitest.log 2>&1); then
  ok "vitest $(grep -oE '[0-9]+ passed' /tmp/verify-vitest.log | tail -1)"
else
  fail "vitest"; grep -E "FAIL|Tests " /tmp/verify-vitest.log | tail -10
fi

# 3. build + bundle gate (the ceiling that broke main once)
step "vite build + bundle-size gate"
if (cd frontend && npx vite build > /tmp/verify-build.log 2>&1 && node ../scripts/check-bundle-size.mjs); then
  ok "bundle gate"
else
  fail "build/bundle"; tail -5 /tmp/verify-build.log
fi

# 3.5 CSS ratchet gate (R339 T-30 — stylelint errors + !important /
#     raw-z-index / raw-hex counts vs the committed baseline; runs in
#     BOTH modes, ~15s warm: npx-cached stylelint + a node counter)
step "stylelint + CSS ratchet gate"
if bash scripts/gates/stylelint-gate.sh > /tmp/verify-cssgate.log 2>&1; then
  ok "css ratchet $(grep -oE 'importantDeclarations[^,}]*' /tmp/verify-cssgate.log | head -1 | tr -d '"')"
else
  fail "css ratchet"; tail -8 /tmp/verify-cssgate.log
fi

# 3.5 identity ratchet (R349 Q4 — dependency-free; runs in BOTH modes)
step "identity guard (university residue + single-mark)"
if node scripts/qa/identity-guard.mjs > /tmp/verify-identity.log 2>&1; then
  ok "identity $(grep -oE 'CLEAN.*' /tmp/verify-identity.log | head -1)"
else
  fail "identity guard"; head -30 /tmp/verify-identity.log
fi

# 3.6 brand asset manifest (R349 B2 — dependency-free; runs in BOTH modes)
step "brand assets (the ONE logo, hash-pinned)"
if node scripts/brand/build-assets.mjs --check > /tmp/verify-brand.log 2>&1; then
  ok "brand $(grep -oE 'OK.*' /tmp/verify-brand.log | head -1)"
else
  fail "brand asset manifest"; head -20 /tmp/verify-brand.log
fi

if [[ $FAST -eq 1 ]]; then
  step "--fast mode: stopping here"
  [[ $FAIL -eq 0 ]] && echo "verify.sh: FAST PASS" || echo "verify.sh: FAIL"
  exit $FAIL
fi

# 4. design gates (all dependency-free, same as CI's design-gates job)
step "design gates (tokens, icons, motion, colors, raw-css, csp, parity)"
for g in "node scripts/tokens/build.mjs --check" "bash scripts/check-icons.sh" \
         "bash scripts/check-motion-tokens.sh" "bash scripts/check-csp-hash.sh" \
         "node scripts/verify-parity-export.mjs" "bash scripts/check-colors.sh --strict" \
         "bash scripts/check-raw-css.sh --strict"; do
  if $g > /tmp/verify-gate.log 2>&1; then ok "$g"; else fail "$g"; tail -6 /tmp/verify-gate.log; fi
done

# 4.5 worklet audit (R349 M1.3c — the UI-runtime law, AST-enforced; needs
#     root node_modules/typescript; full mode only — mobile's own jest
#     covers behaviour, this covers the crash class statically)
step "worklet audit (UI-runtime closures)"
if node scripts/qa/worklet-audit.mjs > /tmp/verify-worklet.log 2>&1; then
  ok "worklet $(grep -oE 'LAWFUL.*' /tmp/verify-worklet.log | head -1)"
else
  fail "worklet audit"; head -30 /tmp/verify-worklet.log
fi

# 5. lint
step "eslint (src trees)"
if npm run lint > /tmp/verify-lint.log 2>&1; then ok "lint"; else fail "lint"; tail -8 /tmp/verify-lint.log; fi

# 6. conformance (ratchet-gated; scoped with --sections for section agents)
step "conformance vs frozen Heron spec (ratchet)"
CONF_ARGS=(--gate)
[[ -n "$SECTIONS" ]] && CONF_ARGS+=(--sections "$SECTIONS")
if node scripts/conformance/run.mjs "${CONF_ARGS[@]}" > /tmp/verify-conform.log 2>&1; then
  ok "conformance $(grep -oE 'TOTAL [0-9/]+ = [0-9.]+%' /tmp/verify-conform.log | tail -1)"
else
  fail "conformance"; tail -12 /tmp/verify-conform.log
fi

# 6.5 visual overlap detector (R347 Lane A — full mode only, REQUIRED).
#     The appendix detector (scripts/qa/overlap.mjs — committed with the ONE
#     sanctioned adjustment: the allowlist ledger filters provably-intentional
#     fixed layers, scripts/qa/overlap-allow.json) + the written-reason ledger.
#     Hermetic: boots vite preview on 4173 against step 3's build, waits,
#     runs the sweep (1440/768/390 × light/dark on /), tears it down.
#     Exit != 0 on any finding — fixed-over-text, text-on-text,
#     text-on-media, big-fixed, clipped, horizontal overflow.
step "visual overlap detector (qa:overlap)"
if (cd frontend && npx vite preview --port 4173 --strictPort > /tmp/verify-preview.log 2>&1 &) && \
   npx --yes wait-on http://localhost:4173/ --timeout 60000 && \
   node scripts/qa/overlap.mjs --url http://localhost:4173 --routes / --bps 1440x900,768x1024,390x844 --themes light,dark --out /tmp/r347/overlap.json > /tmp/verify-overlap.log 2>&1; then
  ok "overlap $(grep -oE 'stops-with-defects=[0-9]+' /tmp/verify-overlap.log | head -1)"
else
  fail "overlap"; tail -8 /tmp/verify-overlap.log
fi
pkill -f "vite preview" 2>/dev/null || true

# 7. e2e (scoped with --specs for the touched files; default = the two
#    landing-relevant suites CI runs on every push)
step "playwright e2e (hermetic)"
E2E_TARGETS=""
if [[ -n "$SPECS" ]]; then
  E2E_ARGS=()
  for s in ${SPECS//,/ }; do E2E_ARGS+=("tests/e2e/${s}.e2e.ts"); done
else
  E2E_ARGS=("tests/e2e/r309-recovery.e2e.ts" "tests/e2e/r308-landing-instruments.e2e.ts")
fi
if (cd frontend && npx playwright test "${E2E_ARGS[@]}" --project=e2e > /tmp/verify-e2e.log 2>&1); then
  ok "e2e"
else
  fail "e2e"; grep -E "✘|failed|passed" /tmp/verify-e2e.log | tail -8
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "verify.sh: ALL GREEN — safe to push"
else
  echo "verify.sh: FAILURES ABOVE — fix before pushing (rule 3)"
fi
exit $FAIL
