#!/usr/bin/env bash
# check-motion-tokens.sh — fail when raw motion durations / easings appear
# in frontend source outside the canonical token files (T018).
#
# Allowlisted files (foundations + safety-belt overrides):
#   frontend/src/styles/tokens.css
#   frontend/src/styles/motion.css
#   frontend/src/styles/polish.css   (kept during gradual migration; will tighten in Phase N)
#   frontend/src/styles/base.css     (contains the global reduced-motion safety belt with `0.01ms !important`)
#   frontend/tests/**                 (test fixtures may use raw values)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Patterns that indicate raw motion values:
#   - <number>ms in CSS values (transition/animation/animation-delay)
#   - cubic-bezier(...) literals
#   - well-known named easings (ease-in-out, ease-in, ease-out, ease, linear)
# False-positive guard: only flag occurrences that look like motion contexts:
#   transition*, animation*, animation-delay*, --t-*, --motion-*, --ease-*
# To stay simple and predictable, we grep for common offenders and let the
# allowlist filter out the canonical sources.

violations=0

# 1. raw <num>ms in transition/animation in any frontend source EXCEPT allowlist
raw_ms=$(grep -RIn -E '(transition|animation)[^;]*[0-9]+ms' \
  frontend/src \
  --include='*.css' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules \
  | grep -v -E 'frontend/src/styles/(tokens|motion|polish|base)\.css' || true)

if [[ -n "$raw_ms" ]]; then
  echo "✗ Raw <num>ms found in motion contexts (use --motion-duration-* tokens):"
  echo "$raw_ms"
  echo
  violations=$((violations + 1))
fi

# 2. raw cubic-bezier() outside allowlist
raw_bezier=$(grep -RIn -E 'cubic-bezier\(' \
  frontend/src \
  --include='*.css' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules \
  | grep -v -E 'frontend/src/styles/(tokens|motion|polish|base)\.css' || true)

if [[ -n "$raw_bezier" ]]; then
  echo "✗ Raw cubic-bezier() found (use --motion-ease-* tokens):"
  echo "$raw_bezier"
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
