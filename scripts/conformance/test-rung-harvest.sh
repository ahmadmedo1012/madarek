#!/usr/bin/env bash
# test-rung-harvest.sh — R342-11 — the rung-harvest regression belt.
#
# The pages.mjs (and its per-role harness twins) harvest the type
# ladder (--fs-* rung names) from the token sheets with an inline
# regex. The R342-09 honesty report proved the original name class
# [a-z-]+ silently dropped every DIGIT-bearing rung (fs-h1/h2/h3,
# fs-2xl/3xl/4xl, fs-d1/d2/d3, fs-app-h1/h2/h3 — 12 of the 36 real
# names), so every on-token 28px h1 measured off-ladder on every
# page. R342-11 repaired the shared instrument; this belt keeps it
# repaired:
#
#   ARM 1 (mutation)  — the buggy [a-z-]+ class MUST fail the
#                       digit-rung assertion (the belt catches the
#                       original defect class).
#   ARM 2 (live)      — the regex AS WRITTEN in pages.mjs, run
#                       against the REAL token sheets, must harvest
#                       the known digit rungs and nothing malformed.
#   ARM 3 (narrow)    — the class stays anchored on the --fs- prefix:
#                       sibling tokens (--sp-4, --lh-2, --radius-…)
#                       and non-declaration text can never harvest.
#
# Dependency-free (bash + node:fs only). Exits non-zero on any arm
# failure. Wired into the CI design-gates job (the
# test-raw-css-gate.sh precedent).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PAGES="$HERE/pages.mjs"
SHEETS="$ROOT/frontend/src/styles/tokens/tokens.css
$ROOT/frontend/src/styles/tokens/tokens.generated.css"

fail=0
say()  { printf '%s\n' "$*"; }
die()  { say "✗ $*"; fail=$((fail + 1)); }

# The digit-bearing rungs the real sheets declare (asserted verbatim).
KNOWN_DIGIT_RUNGS='fs-h1 fs-h2 fs-h3 fs-2xl fs-3xl fs-4xl fs-d1 fs-d2 fs-d3 fs-app-h1 fs-app-h2 fs-app-h3'

harvest() { # $1 = regex string; prints the harvested names, one per line
  node -e '
    const { readFileSync } = require("node:fs");
    const files = process.argv[1].split("\n").filter(Boolean);
    const re = new RegExp(process.argv[2], "g");
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
    const names = [];
    for (const f of files) {
      let css = "";
      try { css = strip(readFileSync(f, "utf8")); } catch { continue; }
      for (const m of css.matchAll(re)) if (!names.includes(m[1])) names.push(m[1]);
    }
    console.log(names.join("\n"));
  ' "$1" "$2"
}

say "rung-harvest belt — pages.mjs type-ladder extraction"

# ── ARM 1 (mutation): the pre-repair class must FAIL ─────────────────
buggy=$(harvest "$SHEETS" '--(fs-[a-z-]+)\s*:' | tr '\n' ' ')
for rung in $KNOWN_DIGIT_RUNGS; do
  if [[ " $buggy " == *" $rung "* ]]; then
    die "ARM 1: the buggy [a-z-]+ class harvested '$rung' — the mutation arm expects it dropped (the original defect). The KNOWN_DIGIT_RUNGS list is stale?"
  fi
done
say "  ✓ ARM 1 (mutation): the buggy [a-z-]+ class drops the digit rungs (the original defect class is detectable)"

# ── ARM 2 (live): the regex AS WRITTEN in pages.mjs ──────────────────
# Extract the exact fs-harvest regex from pages.mjs (single source)
# and run it against the real sheets.
live=$(node -e '
  const { readFileSync } = require("node:fs");
  const src = readFileSync(process.argv[1], "utf8");
  const m = src.match(/\/--\(fs-\[a-z0-9-\]\+\)\\s\*:\//);
  if (!m) { console.error("no digit-aware fs-harvest regex in pages.mjs"); process.exit(3); }
  const re = /--(fs-[a-z0-9-]+)\s*:/g;
  const files = process.argv[2].split("\n").filter(Boolean);
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  const names = [];
  for (const f of files) {
    let css = "";
    try { css = strip(readFileSync(f, "utf8")); } catch { continue; }
    for (const x of css.matchAll(re)) if (!names.includes(x[1])) names.push(x[1]);
  }
  console.log(names.join("\n"));
' "$PAGES" "$SHEETS" | tr '\n' ' ')
if [[ $? -ne 0 || -z "${live// /}" ]]; then
  die "ARM 2: pages.mjs no longer carries the fs-[a-z0-9-]+ harvest regex (was the instrument edited?)"
fi
for rung in $KNOWN_DIGIT_RUNGS; do
  if [[ " $live " != *" $rung "* ]]; then
    die "ARM 2: the live pages.mjs regex did not harvest '$rung' from the real sheets"
  fi
done
say "  ✓ ARM 2 (live): pages.mjs as-written harvests all 12 digit rungs from the real sheets"

# ── ARM 3 (narrow): non-fs declarations never harvest ────────────────
narrow=$(echo "$live" | tr ' ' '\n' | grep -vE '^fs-[a-z0-9-]+$' | grep -v '^$' || true)
if [[ -n "$narrow" ]]; then
  die "ARM 3: the live regex harvested malformed/non-fs names: $narrow"
fi
# sibling token families that MUST NOT enter the ladder
sib=$(harvest "$SHEETS" '--(sp-[a-z0-9-]+)\s*:' | head -1)
if [[ -n "$sib" && " $live " == *" $sib "* ]]; then
  die "ARM 3: a spacing token ('$sib') entered the type ladder"
fi
say "  ✓ ARM 3 (narrow): the harvest stays anchored on the --fs- declaration prefix"

if [[ "$fail" -gt 0 ]]; then
  say "rung-harvest belt: $fail arm(s) FAILED"
  exit 1
fi
say "rung-harvest belt: 3 arms passed"
