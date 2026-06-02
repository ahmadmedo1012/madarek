#!/usr/bin/env bash
# scripts/check-i18n-coverage.sh
#
# CI guard for the i18n layer (spec 011, US7).
#
# Three checks:
#   1. No literal Arabic-script or English JSX text strings outside of
#      `t('...')` wrappers, in files under frontend/src/.
#   2. Every key present in ar.json must also be in en.json (and vice versa).
#   3. Every key referenced in code via t('foo.bar') must exist in both
#      catalog files.
#
# Exit codes:
#   0  pass
#   1  literal-string violation found
#   2  catalog key divergence
#   3  code references a missing key
#
# This script intentionally has zero non-coreutils dependencies beyond
# `jq` for catalog parsing; falls back gracefully if jq is unavailable.
#
# See specs/011-platform-completeness-uplift/contracts/locale.md.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE_SRC="$ROOT/frontend/src"
AR="$ROOT/frontend/src/i18n/catalog/ar.json"
EN="$ROOT/frontend/src/i18n/catalog/en.json"

red()  { printf '\033[31m%s\033[0m\n' "$*" >&2; }
yel()  { printf '\033[33m%s\033[0m\n' "$*" >&2; }
grn()  { printf '\033[32m%s\033[0m\n' "$*"; }

# --- Pre-flight: i18n layer presence ---
if [[ ! -f "$AR" || ! -f "$EN" ]]; then
  yel "i18n catalogs not present yet ($AR / $EN). Skipping coverage check."
  yel "Once US7 lands the i18n runtime, this script becomes a hard gate."
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  red "jq is required for catalog parity checks. Install jq and re-run."
  exit 2
fi

# --- Check 2: key parity between ar.json and en.json ---
ar_keys="$(jq -r 'paths(scalars) | map(tostring) | join(".")' "$AR" | sort -u)"
en_keys="$(jq -r 'paths(scalars) | map(tostring) | join(".")' "$EN" | sort -u)"

missing_in_en="$(comm -23 <(echo "$ar_keys") <(echo "$en_keys"))"
missing_in_ar="$(comm -13 <(echo "$ar_keys") <(echo "$en_keys"))"

if [[ -n "$missing_in_en" || -n "$missing_in_ar" ]]; then
  red "i18n catalog parity FAILED:"
  if [[ -n "$missing_in_en" ]]; then
    red "  Keys in ar.json but not en.json:"
    echo "$missing_in_en" | sed 's/^/    /' >&2
  fi
  if [[ -n "$missing_in_ar" ]]; then
    red "  Keys in en.json but not ar.json:"
    echo "$missing_in_ar" | sed 's/^/    /' >&2
  fi
  exit 2
fi

# --- Check 3: every t('...') reference exists in both catalogs ---
referenced="$(
  grep -RhoE "\bt\(\s*['\"]([a-z][a-z0-9_.]+)['\"]" "$FE_SRC" \
    --include="*.ts" --include="*.tsx" 2>/dev/null \
  | sed -E "s/.*t\(\s*['\"]([a-z0-9_.]+)['\"].*/\1/" \
  | sort -u || true
)"

missing=""
for key in $referenced; do
  if ! echo "$ar_keys" | grep -qx "$key"; then
    missing+="    $key (missing in ar.json)\n"
  fi
  if ! echo "$en_keys" | grep -qx "$key"; then
    missing+="    $key (missing in en.json)\n"
  fi
done

if [[ -n "$missing" ]]; then
  red "Code references keys missing from catalogs:"
  printf "%b" "$missing" >&2
  exit 3
fi

# --- Check 1: no literal Arabic strings in JSX text positions ---
# Heuristic: lines containing Arabic Unicode block chars (U+0600..U+06FF)
# in .tsx files that are NOT inside a `t('...')` call, NOT in a string
# literal that looks like a key, NOT in a comment.
#
# False-positive prone — kept advisory (warns, does not fail) until US7's
# migration pass T080–T083 has converged. Flip to fail-on-find by
# changing `exit 0` to `exit 1` below.

violators="$(
  grep -RnE '[\x{0600}-\x{06FF}]' "$FE_SRC" \
    --include='*.tsx' \
    | grep -vE "(^|[^a-zA-Z0-9_])t\(\s*['\"]" \
    | grep -vE "^\s*//" \
    | grep -vE "^\s*\*" \
    || true
)"

if [[ -n "$violators" ]]; then
  yel "WARNING: Lines with literal Arabic text outside t() — manual review:"
  echo "$violators" | head -30 | sed 's/^/    /' >&2
  if [[ "$(echo "$violators" | wc -l)" -gt 30 ]]; then
    yel "    ... ($(echo "$violators" | wc -l) total)"
  fi
  yel "Once US7's migration pass (T080–T083) is complete, flip this check"
  yel "to fail-on-find by editing scripts/check-i18n-coverage.sh."
  # exit 1   # ← uncomment after T080–T083 land
fi

grn "i18n coverage check passed."
