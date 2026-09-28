#!/usr/bin/env bash
# check-csp-hash.sh — CSP inline-script pin drift guard (R3-W2-5).
#
# backend/src/app.ts pins the sha256 of the TWO inline <script> blocks
# in frontend/index.html inside its helmet script-src:
#   1. the theme bootstrap (attribute-less <script>) — pre-paint theme
#      resolver; a stale pin means production browsers block it and
#      dark-theme users get a light flash;
#   2. the JSON-LD structured-data block (<script type="application/
#      ld+json">) — a missing pin silently drops schema.org metadata.
#
# This guard recomputes both hashes from frontend/index.html exactly
# the way a browser does (the raw text between the opening and closing
# tag, leading/trailing whitespace included) and fails when either hash
# no longer appears in backend/src/app.ts. Run it after ANY edit to an
# inline script in index.html, then refresh the pins in app.ts (see the
# recompute recipe in the comment above THEME_BOOTSTRAP_SHA256).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_HTML="$REPO_ROOT/frontend/index.html"
APP_TS="$REPO_ROOT/backend/src/app.ts"

for f in "$INDEX_HTML" "$APP_TS"; do
  if [[ ! -f "$f" ]]; then
    echo "check-csp-hash: FAIL — expected file not found: $f" >&2
    exit 1
  fi
done

# Emit one "<label> <base64-sha256>" line per inline script block.
# Node does the extraction + hashing (base64 sha256 is awkward in pure
# bash, and the byte-exact slice between the tags must not be re-encoded).
pins_output="$(node -e '
const fs = require("fs");
const crypto = require("crypto");
const html = fs.readFileSync(process.argv[1], "utf8");
// The theme bootstrap is the only attribute-less <script> in the file.
const boot = html.match(/<script>([\s\S]*?)<\/script>/);
const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!boot || !ld) {
  console.error(
    "check-csp-hash: could not locate the theme bootstrap and/or JSON-LD " +
    "inline <script> block in frontend/index.html — if a block was removed, " +
    "update backend/src/app.ts script-src pins and this guard together."
  );
  process.exit(1);
}
const pin = (s) => crypto.createHash("sha256").update(s).digest("base64");
console.log("theme-bootstrap " + pin(boot[1]));
console.log("json-ld " + pin(ld[1]));
' "$INDEX_HTML")" || exit 1

status=0
while IFS= read -r line; do
  label="${line%% *}"
  hash="${line#* }"
  if grep -qF "$hash" "$APP_TS"; then
    echo "OK   $label: $hash is pinned in backend/src/app.ts"
  else
    echo "FAIL $label: index.html script changed — update the CSP pin in backend/src/app.ts" >&2
    echo "     expected pin: $hash" >&2
    echo "     (recompute recipe: comment above THEME_BOOTSTRAP_SHA256 in backend/src/app.ts)" >&2
    status=1
  fi
done <<< "$pins_output"

exit $status
