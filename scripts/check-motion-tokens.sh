#!/usr/bin/env bash
# check-motion-tokens.sh — fail when raw motion durations / easings appear
# in frontend source outside the canonical token files (T018).
#
# Checks:
#   1. raw <number>ms in transition/animation values
#   2. cubic-bezier(...) literals
#   3. well-known named easings (ease-in-out, ease-in, ease-out, ease,
#      linear) in transition/animation values
#
# Allowlisted files (foundations + safety-belt overrides):
#   frontend/src/styles/tokens.css
#   frontend/src/styles/motion.css
#   frontend/src/styles/polish.css   (kept during gradual migration; will tighten in Phase N)
#   frontend/src/styles/base.css     (contains the global reduced-motion safety belt with `0.01ms !important`)
#   frontend/tests/**                (test fixtures may use raw values — outside the scan root)
#
# `linear` ruling (15-k P1-2): raw named easings are banned everywhere
# outside the allowlist, spinners included — genuinely constant-speed
# motion (infinite spins, scroll-linked progress bars) consumes the
# `--ease-linear` token from tokens.css instead.
#
# Scanner hardening (15-k P1-2; campaign-2 parity with
# check-i18n-coverage.sh): every grep runs ALONE so its own exit status
# is inspectable — 0 (matches) and 1 (no match) are the only legitimate
# outcomes; any exit >= 2 (bad pattern, unreadable path) FAILS the gate
# with exit 4 instead of being swallowed into a vacuous pass by the
# previous `|| true` suffixes. The allowlist filter grep gets the same
# treatment.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALLOWLIST='frontend/src/styles/(tokens|motion|polish|base)\.css'

violations=0

# 1. raw <num>ms in transition/animation in any frontend source EXCEPT allowlist
ms_status=0
ms_out="$(grep -RIn -E '(transition|animation)[^;]*[0-9]+ms' \
  frontend/src \
  --include='*.css' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules)" || ms_status=$?
if [[ $ms_status -ge 2 ]]; then
  echo "✗ Motion gate scanner error (raw-ms grep exit $ms_status) — real failure, not a clean pass." >&2
  exit 4
fi
raw_ms=""
if [[ -n "$ms_out" ]]; then
  ms_filter_status=0
  raw_ms="$(printf '%s\n' "$ms_out" | grep -v -E "$ALLOWLIST")" || ms_filter_status=$?
  if [[ $ms_filter_status -ge 2 ]]; then
    echo "✗ Motion gate scanner error (raw-ms allowlist filter exit $ms_filter_status) — real failure, not a clean pass." >&2
    exit 4
  fi
fi

if [[ -n "$raw_ms" ]]; then
  echo "✗ Raw <num>ms found in motion contexts (use --motion-duration-* tokens):"
  echo "$raw_ms"
  echo
  violations=$((violations + 1))
fi

# 2. raw cubic-bezier() outside allowlist
bezier_status=0
bezier_out="$(grep -RIn -E 'cubic-bezier\(' \
  frontend/src \
  --include='*.css' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules)" || bezier_status=$?
if [[ $bezier_status -ge 2 ]]; then
  echo "✗ Motion gate scanner error (cubic-bezier grep exit $bezier_status) — real failure, not a clean pass." >&2
  exit 4
fi
raw_bezier=""
if [[ -n "$bezier_out" ]]; then
  bezier_filter_status=0
  raw_bezier="$(printf '%s\n' "$bezier_out" | grep -v -E "$ALLOWLIST")" || bezier_filter_status=$?
  if [[ $bezier_filter_status -ge 2 ]]; then
    echo "✗ Motion gate scanner error (cubic-bezier allowlist filter exit $bezier_filter_status) — real failure, not a clean pass." >&2
    exit 4
  fi
fi

if [[ -n "$raw_bezier" ]]; then
  echo "✗ Raw cubic-bezier() found (use --motion-ease-* tokens):"
  echo "$raw_bezier"
  echo
  violations=$((violations + 1))
fi

# 3. named easings in transition/animation values outside allowlist.
#    PCRE because the guards need lookaround:
#      (?<![-\w])  — never match inside custom-property names
#                    (var(--ease), --motion-ease-emphasized, --ease-soft…)
#      (?![\w-])   — never match linear-gradient / easeOutQuart / easeIn…
#    The (transition|animation)[a-zA-Z-]*: prefix keeps the check in
#    motion contexts (transition, transition-timing-function, animation,
#    animation-timing-function, camelCase React style props) — the same
#    false-positive guard as check 1.
easing_status=0
easing_out="$(grep -RInP '(transition|animation)[a-zA-Z-]*:[^;]*(?<![-\w])(ease-in-out|ease-in|ease-out|ease|linear)(?![\w-])' \
  frontend/src \
  --include='*.css' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules)" || easing_status=$?
if [[ $easing_status -ge 2 ]]; then
  echo "✗ Motion gate scanner error (named-easings grep exit $easing_status) — real failure, not a clean pass." >&2
  exit 4
fi
raw_easing=""
if [[ -n "$easing_out" ]]; then
  easing_filter_status=0
  raw_easing="$(printf '%s\n' "$easing_out" | grep -v -E "$ALLOWLIST")" || easing_filter_status=$?
  if [[ $easing_filter_status -ge 2 ]]; then
    echo "✗ Motion gate scanner error (named-easings allowlist filter exit $easing_filter_status) — real failure, not a clean pass." >&2
    exit 4
  fi
fi

if [[ -n "$raw_easing" ]]; then
  echo "✗ Named easing found in motion contexts (use --ease-* / --motion-ease-* tokens; --ease-linear for constant-speed motion):"
  echo "$raw_easing"
  echo
  violations=$((violations + 1))
fi

if [[ $violations -gt 0 ]]; then
  echo "FAIL: $violations motion-token violation(s) detected."
  echo "Use --motion-duration-* and --motion-ease-* tokens."
  echo "See specs/001-premium-motion-system/contracts/motion-tokens.md"
  exit 1
fi

echo "OK: no raw motion values outside the canonical token files."
