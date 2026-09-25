#!/usr/bin/env bash
# scripts/check-i18n-coverage.sh
#
# CI guard for the i18n layer (spec 011, US7).
#
# Three checks:
#   1. No literal Arabic-script JSX text strings outside of `t('...')`
#      wrappers, in .tsx files under frontend/src/.
#   2. Every key present in ar.json must also be in en.json (and vice versa).
#   3. Every key referenced in code via t('foo.bar') must exist in both
#      catalog files.
#
# Exit codes:
#   0  pass (or the documented pre-flight skip when catalogs are absent)
#   1  literal-string violation found
#   2  catalog key divergence
#   3  code references a missing key
#   4  scanner error (grep/python3/jq failure — never silently skipped)
#
# Dependencies: `jq` for catalog parsing, `python3` for the UTF-8-correct
# Arabic-literal scan (same approach as check-icons.sh — POSIX grep cannot
# express the Arabic block portably; see the Check 1 notes below).
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
# grep exit 1 ("no matches") is a legitimate empty result here — only
# exit >= 2 (bad option, unreadable path, …) is a real error and must
# surface instead of being swallowed by an `|| true`.
t_scan_status=0
t_scan_out="$(grep -RhoE "\bt\(\s*['\"]([a-z][a-z0-9_.]+)['\"]" "$FE_SRC" \
  --include="*.ts" --include="*.tsx")" || t_scan_status=$?
if [[ $t_scan_status -ge 2 ]]; then
  red "grep failed (exit $t_scan_status) while scanning $FE_SRC for t() references."
  exit 4
fi
referenced="$(printf '%s\n' "$t_scan_out" \
  | sed -E "s/.*t\(\s*['\"]([a-z0-9_.]+)['\"].*/\1/" \
  | sort -u)"

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
# in .tsx files that are NOT inside a `t('...')` call, NOT in a comment.
#
# Detection runs through python3, NOT grep: the previous
# `grep -RnE '[\x{0600}-\x{06FF}]'` is invalid POSIX ERE ("Invalid range
# end") and even `grep -P` mis-handles \x{0600} under LC_ALL=C — either
# way a `|| true` silently turned the broken detector into a no-op that
# could never flag anything. python3 decodes UTF-8 explicitly, so the
# Arabic range is exact, and a scanner failure aborts the script
# (exit 4) instead of being swallowed.
#
# False-positive prone — kept advisory (warns, does not fail) until US7's
# migration pass T080–T083 has converged. Flip to fail-on-find by
# changing `exit 0` to `exit 1` below.

if ! violators="$(python3 - "$FE_SRC" <<'PYEOF'
import os, re, sys

src = sys.argv[1]
# Arabic block: U+0600..U+06FF (Arabic + Arabic Supplement's BMP span).
arabic_re = re.compile(r'[\u0600-\u06FF]')
# A translation call on the same line: t('...') / t("..."). The word
# boundary keeps import('…') / getattr('…') from counting as t() calls.
t_call_re = re.compile(r"\bt\(\s*['\"]")

hits = []
for root, _dirs, files in os.walk(src):
    for name in sorted(files):
        if not name.endswith('.tsx'):
            continue
        path = os.path.join(root, name)
        with open(path, encoding='utf-8') as fh:
            for lineno, line in enumerate(fh, 1):
                if not arabic_re.search(line):
                    continue
                stripped = line.lstrip()
                if stripped.startswith(('//', '*', '/*')):
                    continue
                if t_call_re.search(line):
                    continue
                hits.append(f'{path}:{lineno}: {line.rstrip()}')
print('\n'.join(hits))
PYEOF
)"; then
  red "Arabic-literal scanner failed (python3 exited nonzero) — a real error, not a skip."
  exit 4
fi

if [[ -n "$violators" ]]; then
  yel "WARNING: Lines with literal Arabic text outside t() — manual review:"
  # sed -n (not `| head`) — head exits after 30 lines and SIGPIPEs the
  # producer under `set -o pipefail`, aborting the script (exit 141);
  # sed consumes the whole stream and prints only the first 30.
  printf '%s\n' "$violators" | sed -n '1,30{s/^/    /p}' >&2
  if [[ "$(printf '%s\n' "$violators" | wc -l)" -gt 30 ]]; then
    yel "    ... ($(printf '%s\n' "$violators" | wc -l) total)"
  fi
  yel "Once US7's migration pass (T080–T083) is complete, flip this check"
  yel "to fail-on-find by editing scripts/check-i18n-coverage.sh."
  # exit 1   # ← uncomment after T080–T083 land
fi

grn "i18n coverage check passed."
