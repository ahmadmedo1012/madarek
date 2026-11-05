#!/usr/bin/env bash
# T-22 Track B: dead-code / duplication / circular-dep ratchet gate (frontend workspace).
# Runs knip + jscpd + dependency-cruiser, compares counts vs scripts/deadcode/baseline.json.
#   exit 0 = same or better. Better is allowed but MUST be re-pinned in the same commit
#            (run `scripts/deadcode/check.sh --update` to re-pin measured values).
#   exit 1 = a count got WORSE (ratchet violated).
#   exit 2 = an analyzer failed to run.
# Pinned analyzers: knip@5.88.1, jscpd@5.4.2, dependency-cruiser@18.7.2 (typescript@5.7.2 for depcruise).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEADCODE_DIR="$ROOT/scripts/deadcode"
BASELINE="$DEADCODE_DIR/baseline.json"
UPDATE="${1:-}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- tool resolution: PATH first (CI installs pinned versions), then this box's temp prefix ---
BIN_DIR=""
if ! (command -v knip >/dev/null 2>&1 && command -v jscpd >/dev/null 2>&1 && command -v depcruise >/dev/null 2>&1); then
  if [ -x /home/z/.t22-tools/node_modules/.bin/knip ]; then
    BIN_DIR="/home/z/.t22-tools/node_modules/.bin"
  else
    echo "deadcode: analyzers missing. Install: npm i -g knip@5.88.1 jscpd@5.4.2 dependency-cruiser@18.7.2 typescript@5.7.2" >&2
    exit 2
  fi
fi
krun() { if [ -n "$BIN_DIR" ]; then "$BIN_DIR/$1" "${@:2}"; else "$1" "${@:2}"; fi; }

# --- 1. knip: unused exports / files / dependencies (frontend workspace) ---
( cd "$ROOT/frontend" && krun knip --config ../scripts/deadcode/knip.json --reporter json --no-progress ) > "$TMP/knip.json" 2> "$TMP/knip.err" \
  || true
KNIP=$(node -e '
const j = require(process.argv[1]);
const a = { unusedFiles: j.files.length, unusedExports: 0, unusedExportedTypes: 0, unusedDependencies: 0, unusedDevDependencies: 0, unlisted: 0, unresolved: 0, duplicates: 0 };
for (const f of j.issues) {
  a.unusedExports += (f.exports || []).length;
  a.unusedExportedTypes += (f.types || []).length;
  a.unusedDependencies += (f.dependencies || []).length;
  a.unusedDevDependencies += (f.devDependencies || []).length;
  a.unlisted += (f.unlisted || []).length;
  a.unresolved += (f.unresolved || []).length;
  a.duplicates += (f.duplicates || []).length;
}
console.log(JSON.stringify(a));
' "$TMP/knip.json") || { echo "deadcode: knip output parse failed"; exit 2; }

# --- 2. jscpd: copy-paste duplication (threshold pinned in jscpd.json: minTokens=70) ---
( cd "$ROOT/frontend" && krun jscpd src --config ../scripts/deadcode/jscpd.json ) > "$TMP/jscpd.out" 2>/dev/null
CLONES=$(sed -nE 's/.*Found ([0-9]+) (exact )?clones.*/\1/p' "$TMP/jscpd.out" | head -1)
[ -n "$CLONES" ] || { echo "deadcode: jscpd run failed (no clone count in output)"; exit 2; }

# --- 3. dependency-cruiser: circular dependencies ---
krun depcruise frontend/src --config scripts/deadcode/.dependency-cruiser.cjs --output-type json > "$TMP/dc.json" 2> "$TMP/dc.err" || true
CIRCULAR=$(node -e '
const j = require(process.argv[1]);
const v = (j.summary && j.summary.violations) || [];
console.log(v.filter(x => x.rule && x.rule.name === "no-circular").length);
' "$TMP/dc.json" 2>/dev/null)
[ -n "$CIRCULAR" ] || { echo "deadcode: dependency-cruiser run failed"; cat "$TMP/dc.err" >&2; exit 2; }

# --- re-pin mode: rewrite baseline.json with the measured values ---
if [ "$UPDATE" = "--update" ]; then
  node -e '
const fs = require("fs");
const knip = JSON.parse(process.argv[2]);
const baseline = {
  _comment: "T-22 Track B ratchet baseline — measured analyzer output. Counts may only improve; when a count drops, re-pin it here in the SAME commit (scripts/deadcode/check.sh --update). Pinned tools: knip@5.88.1, jscpd@5.4.2, dependency-cruiser@18.7.2 (+ typescript@5.7.2 for depcruise); jscpd minTokens=70.",
  knip,
  jscpd: { duplicateBlocks: Number(process.argv[3]) },
  depcruise: { circularDependencies: Number(process.argv[4]) },
};
fs.writeFileSync(process.argv[1], JSON.stringify(baseline, null, 2) + "\n");
' "$BASELINE" "$KNIP" "$CLONES" "$CIRCULAR" || { echo "deadcode: failed to re-pin baseline"; exit 2; }
  echo "deadcode: baseline re-pinned (knip=$KNIP jscpd.clones=$CLONES depcruise.circular=$CIRCULAR)"
  exit 0
fi

# --- ratchet comparison vs baseline ---
node -e '
const fs = require("fs");
const baseline = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const knip = JSON.parse(process.argv[2]);
const flat = {};
for (const [k, v] of Object.entries(knip)) flat["knip." + k] = v;
flat["jscpd.duplicateBlocks"] = Number(process.argv[3]);
flat["depcruise.circularDependencies"] = Number(process.argv[4]);
const bflat = {};
for (const [grp, obj] of Object.entries(baseline)) {
  if (grp.startsWith("_") || !obj || typeof obj !== "object") continue;
  for (const [k, v] of Object.entries(obj)) bflat[grp + "." + k] = v;
}
let worse = 0, better = 0, same = 0;
for (const k of Object.keys(bflat)) {
  const cur = flat[k];
  if (cur === undefined) { console.log("REGRESSED " + k + ": baseline " + bflat[k] + " -> NOT MEASURED"); worse++; continue; }
  if (cur > bflat[k]) { console.log("REGRESSED " + k + ": " + bflat[k] + " -> " + cur + " (pay down the debt or split the change)"); worse++; }
  else if (cur < bflat[k]) { console.log("IMPROVED " + k + ": " + bflat[k] + " -> " + cur + " (re-pin baseline.json in THIS commit: scripts/deadcode/check.sh --update)"); better++; }
  else same++;
}
console.log("deadcode ratchet: " + same + " at baseline, " + better + " improved, " + worse + " regressed");
process.exit(worse > 0 ? 1 : 0);
' "$BASELINE" "$KNIP" "$CLONES" "$CIRCULAR"
