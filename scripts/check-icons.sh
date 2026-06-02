#!/usr/bin/env bash
# check-icons.sh — Lucide-only icon discipline gate.
#
# Fails when any of these appear in frontend chrome/components/pages:
#   1. Emoji presentation Unicode characters in JSX/TSX text or attributes.
#   2. Inline <svg> markup (raw SVG outside the documented allowlist).
#
# Permitted (allowlisted):
#   - frontend/src/components/EmojiIcon.tsx        (the primitive itself)
#   - frontend/src/components/LibyaFlag.tsx        (national symbol)
#   - frontend/src/components/Icon.tsx             (Lucide wrapper)
#   - frontend/src/styles/                         (CSS / decorative)
#   - frontend/public/                             (static assets)
#   - frontend/tests/                              (fixtures)
#   - backend/, scripts/, design-system/           (not user-facing chrome)
#
# Per-instance overrides need an `// allow-emoji: <reason>` comment on
# the same line.
#
# See specs/002-visual-uplift/contracts/icon-policy.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

violations=0

# Files we scan: every .ts/.tsx under frontend/src EXCEPT the allowlist.
ALLOWED='frontend/src/components/(EmojiIcon|LibyaFlag|Icon)\.tsx|frontend/src/styles/|frontend/public/|frontend/tests/'

# 1. Emoji presentation in source code outside allowlist.
#    Emoji ranges (BMP + supplementary):
#       U+1F300–U+1FAFF (most modern emoji)
#       U+2600–U+27BF   (misc symbols + dingbats — narrow, but catches ✓ ✗ ⚠ ⭐ ☑)
#    We exclude the codepoints we DO allow:
#       U+200C-U+200F   (ZWJ / RTL marks)
#       U+202A-U+202E   (bidi formatting)
# We use ripgrep/grep with PCRE if available, else perl one-liner.

# Build a python emoji scan — most portable + UTF-8 correct on Linux.
emoji_hits=$(python3 - "$ALLOWED" <<'PYEOF'
import os, re, sys

allowed_re = re.compile(sys.argv[1])
# Emoji presentation ranges (BMP + supplementary planes).
emoji_re = re.compile(
    "[\U0001F300-\U0001FAFF☀-➿\U0001F000-\U0001F2FF]"
)
# Per-line override: a line is allowed if it contains either:
#   - "// allow-emoji:" inline comment with a reason
#   - the `iconEmoji` identifier (data-driven user-supplied content
#     per icon-policy.md — admin-chosen icon stored in the data model
#     with an emoji fallback for unset values)
allow_re = re.compile(r"allow-emoji:|iconEmoji|courseIcon")

hits = []
for root, dirs, files in os.walk("frontend/src"):
    for f in files:
        if not (f.endswith(".ts") or f.endswith(".tsx")):
            continue
        path = os.path.join(root, f)
        if allowed_re.search(path):
            continue
        try:
            with open(path, encoding="utf-8") as fh:
                for i, line in enumerate(fh, 1):
                    if allow_re.search(line):
                        continue
                    if emoji_re.search(line):
                        hits.append(f"{path}:{i}: {line.rstrip()}")
        except Exception:
            pass

print("\n".join(hits))
PYEOF
)

if [[ -n "$emoji_hits" ]]; then
  echo "✗ Emoji found in chrome/components/pages (use Lucide via <Icon icon={...} />):"
  echo "$emoji_hits" | head -50
  count=$(echo "$emoji_hits" | wc -l)
  echo "  ($count line(s))"
  echo
  violations=$((violations + 1))
fi

# 2. Inline <svg> markup outside allowlist.
svg_hits=$(grep -RInE '<svg[ >]' frontend/src \
  --include='*.tsx' --include='*.ts' \
  | grep -vE 'frontend/src/components/(EmojiIcon|LibyaFlag|Icon)\.tsx' \
  || true)

if [[ -n "$svg_hits" ]]; then
  echo "✗ Raw <svg> markup found (use Lucide via <Icon icon={...} />):"
  echo "$svg_hits" | head -30
  echo
  violations=$((violations + 1))
fi

if [[ $violations -gt 0 ]]; then
  echo "FAIL: $violations icon-discipline violation(s) detected."
  echo "See specs/002-visual-uplift/contracts/icon-policy.md"
  exit 1
fi

echo "OK: Lucide-only icon discipline holds across chrome/components/pages."
