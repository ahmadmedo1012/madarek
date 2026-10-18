#!/usr/bin/env bash
# test-raw-css-gate.sh — mutation-tested proof that the design-token
# gates in check-raw-css.sh actually bite.
#
# Runs the scanner against the synthetic fixtures in
# scripts/fixtures/raw-css-gate/styles (no production source, no
# network, no node_modules), then mutates fresh copies of that tree
# and asserts the gate fails exactly the way it should:
#
#   · clean baseline passes --strict (tokens, zero, %/em, env(),
#     multiline, quoted prose, comment examples, world census)
#   · every blind-spot class from the r185 mission is detected:
#     two-segment logical properties, literals mixed with var(),
#     literals inside var() fallbacks, calc()/clamp() arguments,
#     multiline declarations, scroll-margin, --custom-padding
#   · allow markers only work with a real reason (bare / vague /
#     one-word markers fail; removing a necessary allow fails)
#   · type/radius negative checks keep working (r184 baseline)
#   · invalid input fails CLOSED (missing dir, missing tokens.css,
#     unparseable ladder → exit 4, never a vacuous pass)
#   · report mode stays non-blocking (exit 0) while listing findings
#
# Usage: bash scripts/test-raw-css-gate.sh   (exit 0 = all green)

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURES="$ROOT/scripts/fixtures/raw-css-gate/styles"
FIXTURES_SRC="$ROOT/scripts/fixtures/raw-css-gate/src"
WORK="$(mktemp -d)"
GATE="$ROOT/scripts/check-raw-css.sh"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

passed=0
failed=0
fail_names=()

fresh() {
  rm -rf "$WORK/styles" "$WORK/src"
  cp -r "$FIXTURES" "$WORK/styles"
  cp -r "$FIXTURES_SRC" "$WORK/src"
}

# mutate <file> <old-string> <new-string> — exact, single replacement
mutate() {
  python3 - "$@" <<'PYMUT'
import sys
from pathlib import Path
target, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
p = Path(target)
t = p.read_text()
assert old in t, f'mutation target not found in {target}: {old!r}'
p.write_text(t.replace(old, new, 1))
PYMUT
}

append() {  # append <file> <line>
  printf '%s\n' "$2" >>"$WORK/styles/$1"
}

# expect <name> <expected-exit> [output-grep-pattern] [absent-grep-pattern]
expect() {
  local name="$1" want="$2" pat="${3:-}" absent="${4:-}"
  local out code ok=1
  out="$(bash "$GATE" --strict --styles-dir "$WORK/styles" --src-dir "$WORK/src" 2>&1)"
  code=$?
  [ "$code" -eq "$want" ] || ok=0
  if [ -n "$pat" ] && ! grep -q -- "$pat" <<<"$out"; then ok=0; fi
  if [ -n "$absent" ] && grep -q -- "$absent" <<<"$out"; then ok=0; fi
  if [ "$ok" -eq 1 ]; then
    passed=$((passed + 1))
    printf '  ✓ %s\n' "$name"
  else
    failed=$((failed + 1))
    fail_names+=("$name")
    printf '  ✗ %s — want exit %s, got %s\n' "$name" "$want" "$code"
    printf '%s\n' "$out" | sed 's/^/      | /' | head -12
  fi
}

line_of() {  # first line number matching <pattern> in app.css
  grep -n -- "$1" "$WORK/styles/app.css" | head -1 | cut -d: -f1
}

echo 'raw-css-gate mutation tests (fixtures: scripts/fixtures/raw-css-gate)'

# ── baseline: the clean tree must pass strict ─────────────────────
fresh
expect 'baseline strict PASS (tokens/zero/units/env/multiline/prose)' 0 'PASS: type, radius and spacing'
expect 'baseline: 2 documented allows (inline + multiline end-line)' 0 'documented allows: 2'
expect 'baseline: TSX axis clean (0 findings, 1 reasoned allow)' 0 'TSX inline spacing (strict, r186): 0 finding(s) · 1 documented allow(s)'
expect 'baseline: prose px inside strings is never a TSX finding' 0 '' 'padding: 5px'
expect 'baseline: template prose never a TSX finding' 0 '' 'margin: 4px'
expect 'baseline: JSX-comment prose never a TSX finding' 0 '' 'gap: 9px'
expect 'baseline: world census visible (landing.css 3 literals)' 0 'world census (not enforced): landing.css — 3 literal'
expect 'baseline: comment example never a finding' 0 '' 'ghost'
expect 'baseline: quoted prose never a spacing decl' 0 '' 'content:'

# ── blind-spot classes must all be detected (exit 1) ─────────────
fresh; mutate "$WORK/styles/app.css" 'padding: var(--sp-4); }' 'padding: 16px; }'
expect 'exact-token raw literal (16px → candidate --sp-4)' 1 '16px → exact-token (candidate --sp-4)'

fresh; mutate "$WORK/styles/app.css" 'padding-inline-start: var(--sp-6); }' 'padding-inline-start: 24px; }'
expect 'two-segment logical: padding-inline-start: 24px' 1 'padding-inline-start: 24px'

fresh; mutate "$WORK/styles/app.css" 'margin-block-end: var(--sp-2); }' 'margin-block-end: 8px; }'
expect 'two-segment logical: margin-block-end: 8px' 1 'margin-block-end: 8px'

fresh; mutate "$WORK/styles/app.css" 'gap: var(--sp-2);' 'gap: 8px;'
expect 'shorthand gap: 8px' 1 'gap: 8px'

fresh; append app.css '.rule-z { padding-top: 4px; margin-left: 12px; padding-inline-end: var(--sp-2); }'
expect 'directional forms: padding-top 4px + margin-left 12px' 1 'padding-top: 4px'

fresh; mutate "$WORK/styles/app.css" '    var(--sp-3);' '    12px;'
ML="$(line_of 'padding-block:')"
expect "multiline declaration detected at line $ML" 1 "app.css:${ML}: padding-block:"

fresh; mutate "$WORK/styles/app.css" 'padding: var(--sp-4); }' 'padding: var(--sp-3) 5px; }'
expect 'var() does not hide a sibling literal (var(--sp-3) 5px)' 1 '5px → off-grid'

fresh; mutate "$WORK/styles/app.css" 'padding-inline-start: var(--sp-6); }' 'padding-inline-start: var(--sp-6, 24px); }'
expect 'raw literal inside var() fallback' 1 '24px → exact-token (candidate --sp-6) \[fallback\]'

fresh; mutate "$WORK/styles/app.css" 'gap: clamp(var(--sp-2), 4vw, var(--sp-4));' 'gap: clamp(8px, 4vw, 16px);'
expect 'clamp() arguments are walked (8px/16px)' 1 'gap: clamp(8px, 4vw, 16px)'

fresh; append app.css '.rule-calc { margin-top: calc(4px + var(--sp-2)); }'
expect 'calc() argument literal detected' 1 'margin-top: calc(4px'

fresh; mutate "$WORK/styles/app.css" 'scroll-margin-block-start: var(--sp-9);' 'scroll-margin-block-start: 124px;'
expect 'scroll-margin family in scope (124px grid-no-token)' 1 'scroll-margin-block-start: 124px'

fresh; mutate "$WORK/styles/app.css" '--card-padding: var(--sp-4);' '--card-padding: 16px;'
expect 'custom prop --card-padding: 16px is spacing' 1 '--card-padding: 16px'

# ── marker grammar: only reasoned markers exempt ─────────────────
fresh; mutate "$WORK/styles/app.css" \
  '/* spacing-gate: allow — optical baseline nudge under ascenders */' \
  '/* spacing-gate: allow */'
expect 'bare marker (no reason) does NOT exempt' 1 'INVALID MARKER'

fresh; mutate "$WORK/styles/app.css" \
  '/* spacing-gate: allow — optical baseline nudge under ascenders */' \
  '/* spacing-gate: allow — legacy */'
expect 'vague reason (legacy) does NOT exempt' 1 'INVALID MARKER'

fresh; mutate "$WORK/styles/app.css" \
  '/* spacing-gate: allow — optical baseline nudge under ascenders */' \
  '/* spacing-gate: allow — chips */'
expect 'one-word short reason does NOT exempt' 1 'INVALID MARKER'

fresh; mutate "$WORK/styles/app.css" \
  '    2px;  /* spacing-gate: allow — multiline decl, marker on its end line */' \
  '    2px;'
expect 'removing a necessary allow fails (multiline marker gone)' 1 '2px → exact-token'

fresh; mutate "$WORK/styles/app.css" \
  '/* spacing-gate: allow — optical baseline nudge under ascenders */' \
  '/* spacing-gate: allow — nudge بصر الدقة البصرية */'
expect 'reasoned non-English marker still valid (grammar is structural)' 0 'PASS: type, radius and spacing'

# ── TSX inline-spacing axis (r186): the audit seam went strict ───
# React turns bare numbers into px at runtime — the old audit regex
# only saw 'Npx' strings, so 31 real sites hid behind the "2 sites"
# report. Every blind class is mutated here.
fresh; mutate "$WORK/src/Fixture.tsx" "gap: 'var(--sp-2)'," "gap: 8,"
expect 'TSX: bare number is px at runtime (gap: 8)' 1 'gap: 8'
expect 'TSX: bare number classified against the live ladder' 1 '8 → exact-token (candidate --sp-2)'

fresh; mutate "$WORK/src/Fixture.tsx" \
  'rowGap: 0, // zero — no rung needed, bare number included' \
  'rowGap: -4, // negative bare number'
expect 'TSX: negative bare number (rowGap: -4)' 1 'rowGap: -4'

fresh; mutate "$WORK/src/Fixture.tsx" \
  "columnGap: '0px', // zero with unit — still zero" \
  "columnGap: 'var(--sp-2, 8px)', // literal hides in the fallback"
expect 'TSX: literal inside a var() fallback' 1 '8px → exact-token (candidate --sp-2)'

fresh; mutate "$WORK/src/Fixture.tsx" \
  "marginTop: '50%', // relative unit — outside the px ladder contract" \
  "marginTop: 3, // off-grid bare number"
expect 'TSX: off-grid bare number (marginTop: 3)' 1 '3 → off-grid'

fresh; mutate "$WORK/src/Fixture.tsx" \
  "marginBottom: 'calc(-1 * var(--sp-1))'," \
  "marginBottom: '4px 0 6px',"
expect 'TSX: every px literal in a multi-value string' 1 '4px 0 6px'
expect 'TSX: both literals of the multi-value string listed' 1 '6px → exact-token (candidate --sp-1-5)'

fresh; mutate "$WORK/src/Fixture.tsx" \
  '{/* spacing-gate: allow — optical baseline nudge under descenders */}' \
  '{/* spacing-gate: allow */}'
expect 'TSX: bare marker (no reason) does NOT exempt' 1 'INVALID MARKER'

fresh; mutate "$WORK/src/Fixture.tsx" \
  '{/* spacing-gate: allow — optical baseline nudge under descenders */}' \
  '{/* unrelated note */}'
expect 'TSX: removing the necessary allow surfaces the literal' 1 "3px → off-grid"

fresh; mutate "$WORK/src/Fixture.tsx" \
  '{/* spacing-gate: allow — optical baseline nudge under descenders */}' \
  '// spacing-gate: allow — optical baseline nudge under descenders'
expect 'TSX: JS line-comment markers count too' 0 '1 documented allow(s)'

fresh; mutate "$WORK/src/Fixture.tsx" \
  '{/* spacing-gate: allow — optical baseline nudge under descenders */}' \
  '{/* spacing-gate: allow — محاذاة بصرية تحت الحروف النازلة */}'
expect 'TSX: non-English reason valid (grammar is structural)' 0 '1 documented allow(s)'

fresh; mutate "$WORK/src/Fixture.tsx" \
  '  gap: number;' \
  '  gap: 12; padding: 0;'
expect 'TSX: type member terminates at «;» (gap: 12 seen)' 1 'gap: 12'

fresh; mutate "$WORK/src/Fixture.tsx" \
  "const pick = true ? obj.margin : 'fallback';" \
  'const pick = true ? obj.margin : 6;'
expect 'TSX: property access (.margin) is never a style prop' 0 'PASS: type, radius and spacing'

# ── injected violations / type+radius negatives (r184 contract) ───
fresh; append app.css '.rule-new { margin-top: 14px; }'
expect 'injected new raw violation fails' 1 '14px → off-grid'

fresh; mutate "$WORK/styles/app.css" 'font-size: var(--fs-sm);' 'font-size: 15px;'
expect 'type axis still bites (font-size: 15px)' 1 'font-size: 15px'

fresh; mutate "$WORK/styles/app.css" 'border-radius: var(--r-md);' 'border-radius: 9px;'
expect 'radius axis still bites (border-radius: 9px)' 1 'border-radius: 9px'

fresh; append fonts.css '@font-face { font-family: Z; src: url(z.woff2); padding: 4px; }'
expect 'wholesale zone (fonts.css) untouched by gate' 0 'PASS: type, radius and spacing'

# ── fail closed: broken input is a scanner error, never a pass ────
out="$(bash "$GATE" --strict --styles-dir "$WORK/nonexistent" 2>&1)"; code=$?
if [ "$code" -eq 4 ]; then passed=$((passed+1)); printf '  ✓ missing styles dir → exit 4 (fail closed)\n';
else failed=$((failed+1)); fail_names+=('missing dir'); printf '  ✗ missing styles dir → exit 4, got %s\n' "$code"; fi

out="$(bash "$GATE" --strict --styles-dir "$WORK/styles" --src-dir "$WORK/nonexistent" 2>&1)"; code=$?
if [ "$code" -eq 4 ]; then passed=$((passed+1)); printf '  ✓ missing src dir → exit 4 (fail closed)\n';
else failed=$((failed+1)); fail_names+=('missing src dir'); printf '  ✗ missing src dir → exit 4, got %s\n' "$code"; fi

fresh; rm "$WORK/styles/tokens.css"
out="$(bash "$GATE" --strict --styles-dir "$WORK/styles" --src-dir "$WORK/src" 2>&1)"; code=$?
if [ "$code" -eq 4 ]; then passed=$((passed+1)); printf '  ✓ missing tokens.css → exit 4 (fail closed)\n';
else failed=$((failed+1)); fail_names+=('missing tokens'); printf '  ✗ missing tokens.css → exit 4, got %s\n' "$code"; fi

fresh; cat >"$WORK/styles/tokens.css" <<'TOK'
:root { --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; }
TOK
out="$(bash "$GATE" --strict --styles-dir "$WORK/styles" --src-dir "$WORK/src" 2>&1)"; code=$?
if [ "$code" -eq 4 ]; then passed=$((passed+1)); printf '  ✓ unparseable ladder (<8 rungs) → exit 4\n';
else failed=$((failed+1)); fail_names+=('broken ladder'); printf '  ✗ broken ladder → exit 4, got %s\n' "$code"; fi

# ── report mode: non-blocking while listing everything ───────────
fresh; append app.css '.rule-new { margin-top: 14px; }'
out="$(bash "$GATE" --report --styles-dir "$WORK/styles" --src-dir "$WORK/src" 2>&1)"; code=$?
if [ "$code" -eq 0 ] && grep -q 'margin-top: 14px' <<<"$out" && grep -q 'world census' <<<"$out"; then
  passed=$((passed+1)); printf '  ✓ report mode: exit 0 + findings + census listed\n'
else
  failed=$((failed+1)); fail_names+=('report mode'); printf '  ✗ report mode: exit 0 with findings listed, got %s\n' "$code"
fi

# ── usage errors ──────────────────────────────────────────────────
out="$(bash "$GATE" --bogus 2>&1)"; code=$?
if [ "$code" -eq 2 ]; then passed=$((passed+1)); printf '  ✓ unknown flag → exit 2\n';
else failed=$((failed+1)); fail_names+=('usage'); printf '  ✗ unknown flag → exit 2, got %s\n' "$code"; fi

# ── summary ──────────────────────────────────────────────────────
echo
echo "raw-css-gate: $passed passed · $failed failed"
if [ "$failed" -gt 0 ]; then
  printf 'failed: %s\n' "${fail_names[*]}"
  exit 1
fi
exit 0
