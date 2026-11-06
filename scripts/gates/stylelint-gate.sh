#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════
# stylelint-gate.sh — R339 T-30 · the CSS ratchet gate.
#
# Three checks, one fast pass (~15s warm):
#   1. stylelint (frontend/.stylelintrc.json — duplicate-selector /
#      duplicate-property / shorthand-override errors) must not grow
#      above the committed baseline error count (45).
#   2. css-counts.mjs axes — live !important declarations, raw z-index
#      integers, raw hex literals — must not grow above baseline.
#      T-31/T-33 demolition drives these DOWN; T-34 target: 0 !important.
#   3. (informational) warnings are printed, never enforced — the
#      no-descending-specificity backlog is tracked, not gated.
#
# Baseline: scripts/gates/stylelint-baseline.json  (axes only go DOWN).
# Re-baseline after a legitimate drop:  --update  (commit the JSON with
# the reason; NEVER --update past a red gate you do not understand).
#
# Wired into scripts/verify.sh after the tsc/vitest/bundle set (runs in
# both --fast and full modes).
# ═════════════════════════════════════════════════════════════════════
set -uo pipefail
cd "$(dirname "$0")/../.."
GATES_DIR="scripts/gates"
BASELINE="$GATES_DIR/stylelint-baseline.json"
UPDATE=0
[[ "${1:-}" == "--update" ]] && UPDATE=1

fail() { printf '\033[31m✗ stylelint-gate: %s\033[0m\n' "$1"; exit 1; }

# ── 1. stylelint run (config + version pinned by frontend/package.json) ──
# stylelint 16 emits its JSON report on STDERR (verified empirically,
# clean and errored runs alike); a non-zero exit just means problems
# were found — the report itself is what we parse.
(cd frontend && npx -y stylelint@16 "src/styles/**/*.css" --formatter json) \
  > /tmp/stylelint-gate.stdout 2> /tmp/stylelint-gate.json || true
if ! node -e 'JSON.parse(require("fs").readFileSync("/tmp/stylelint-gate.json","utf8"))' 2>/dev/null; then
  cat /tmp/stylelint-gate.stdout >&2
  fail "stylelint produced no parsable JSON report (see stdout above)"
fi

COUNTS="$(node "$GATES_DIR/css-counts.mjs")" || fail "css-counts.mjs crashed"
LINT="$(node -e '
const r = JSON.parse(require("fs").readFileSync("/tmp/stylelint-gate.json", "utf8"));
let e = 0, w = 0;
for (const f of r) for (const p of f.warnings ?? []) p.severity === "error" ? e++ : w++;
console.log(JSON.stringify({ stylelintErrors: e, stylelintWarnings: w }));')"

echo "stylelint-gate: lint=$LINT"
echo "stylelint-gate: counts=$COUNTS"

node -e '
const fs = require("fs");
const base = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const lint = JSON.parse(process.argv[2]);
const counts = JSON.parse(process.argv[3]);
const update = process.argv[4] === "1";
const axes = ["stylelintErrors", "importantDeclarations", "rawZIndex", "rawHex"];
console.log(`  (tracked, not enforced: stylelintWarnings ${lint.stylelintWarnings} vs ${base.stylelintWarnings})`);
const next = { ...base };
let bad = 0;
for (const ax of axes) {
  const now = (ax in lint ? lint : counts)[ax];
  next[ax] = now;
  if (now > base[ax]) { console.error(`  ✗ ${ax}: ${now} > baseline ${base[ax]} — NEW violation(s)`); bad++; }
  else if (now < base[ax]) console.log(`  ↓ ${ax}: ${base[ax]} → ${now} (ratchet down)`);
}
if (update) { delete next._doc; const doc = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))._doc;
  fs.writeFileSync(process.argv[1], JSON.stringify({ _doc: doc, ...next }, null, 2) + "\n");
  console.log("baseline updated (commit it with the reason)"); }
process.exit(bad ? 1 : 0);' \
  "$BASELINE" "$LINT" "$COUNTS" "$UPDATE" || fail "ratchet breached — see ✗ lines above (fix, or --update ONLY with a documented reason)"

printf '\033[32m✓ stylelint-gate: ratchet green (baseline held)\033[0m\n'
