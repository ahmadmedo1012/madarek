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
#   - frontend/src/components/Illustration.tsx     (scene wrapper)
#   - frontend/src/lib/illustrations/              (bespoke scene SVGs)
#   - frontend/src/styles/                         (CSS / decorative)
#   - frontend/public/                             (static assets)
#   - frontend/tests/                              (fixtures)
#   - backend/, scripts/, design-system/           (not user-facing chrome)
#
# The svg check shares this allowlist — it matches AGENTS-BRIEF §3.2's
# documented exception set (Illustration.tsx and lib/illustrations/**
# were previously missing from both checks' exclusion lists).
#
# Per-instance overrides need an `// allow-emoji: <reason>` comment on
# the same line.
#
# Scanner hardening (17-c hand-off #1, wave 18-G; parity with
# check-motion-tokens.sh / check-i18n-coverage.sh): every scanner runs
# ALONE so its own exit status is inspectable — 0 (matches) and 1 (no
# match) are the only legitimate outcomes; any other failure (bad
# pattern, unreadable path, python3 crash) FAILS the gate with exit 4
# instead of a vacuous pass. The old svg pipeline
# (`grep … | grep -v … | grep -v … || status`) could not distinguish
# "no match" (exit 1) from an IMMEDIATE pattern-compile error — the
# first grep exited 2 before producing output, the downstream `grep -v`s
# then exited 1 on empty input, and pipefail reported the rightmost
# status: 1, read as "clean".
#
# See specs/002-visual-uplift/contracts/icon-policy.md
#
# Exit codes: 0 = clean · 1 = violations · 4 = scanner error.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

violations=0

# Files we scan: every .ts/.tsx under frontend/src EXCEPT the allowlist.
ALLOWED='frontend/src/components/(EmojiIcon|LibyaFlag|Icon|Illustration)\.tsx|frontend/src/lib/illustrations/|frontend/src/styles/|frontend/public/|frontend/tests/'

# 1. Emoji presentation in source code outside allowlist.
#    Emoji ranges (BMP + supplementary):
#       U+1F300–U+1FAFF (most modern emoji)
#       U+2600–U+27BF   (misc symbols + dingbats — narrow, but catches ✓ ✗ ⚠ ⭐ ☑)
#    We exclude the codepoints we DO allow:
#       U+200C-U+200F   (ZWJ / RTL marks)
#       U+202A-U+202E   (bidi formatting)

# The scan runs through python3 — most portable + UTF-8 correct on Linux
# (shell grep cannot express supplementary-plane emoji ranges portably).
# A python3 failure (crash, unreadable file) is a SCANNER ERROR: the
# script prints nothing to stdout, exits non-zero, and the gate fails
# with exit 4 below — never a silent skip.
emoji_status=0
emoji_hits="$(python3 - "$ALLOWED" <<'PYEOF'
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
        except Exception as err:
            # Unreadable/undecodable file — the svg grep below fails closed
            # on the same condition (exit 2); so must we.
            print(f"scanner-error: {path}: {err}", file=sys.stderr)
            sys.exit(2)

print("\n".join(hits))
PYEOF
)" || emoji_status=$?
if [[ $emoji_status -ne 0 ]]; then
  echo "✗ Emoji scanner error (python3 exit $emoji_status) — real failure, not a clean pass." >&2
  echo "See specs/002-visual-uplift/contracts/icon-policy.md" >&2
  exit 4
fi

if [[ -n "$emoji_hits" ]]; then
  echo "✗ Emoji found in chrome/components/pages (use Lucide via <Icon icon={...} />):"
  echo "$emoji_hits" | head -50
  count=$(echo "$emoji_hits" | wc -l)
  echo "  ($count line(s))"
  echo
  violations=$((violations + 1))
fi

# 2. Inline <svg> markup outside allowlist.
#    `<svg` followed by whitespace, `>`, `/`, or end-of-line. The repo's
#    JSX convention writes multiline svg (`<svg\n  viewBox=…`) — the old
#    `<svg[ >]` ERE never matched the line-end form, so every real
#    illustration file evaded the check and it passed vacuously.
#    `[[:space:]>/]` (whitespace class + `>` + `/`) cannot continue an
#    identifier, so `<svgx`-ish tags stay unflagged; `<svg$` gets its own
#    -e so the `$` anchor stays POSIX-portable (mid-alternation `$` is
#    GNU-only). Lines carrying an `// allow-emoji: <reason>` override
#    are exempt, same as in the emoji check above.
#    Separated two-stage greps (motion-gate parity): each stage's exit
#    status is inspected on its own — only 0/1 are legitimate; ≥2 (bad
#    pattern, unreadable path) fails the gate with exit 4.
svg_status=0
svg_out="$(grep -RInE -e '<svg[[:space:]>/]' -e '<svg$' frontend/src \
  --include='*.tsx' --include='*.ts')" || svg_status=$?
if [[ $svg_status -ge 2 ]]; then
  echo "✗ svg check scanner error (svg grep exit $svg_status) — real failure, not a clean pass." >&2
  echo "See specs/002-visual-uplift/contracts/icon-policy.md" >&2
  exit 4
fi
svg_hits=""
if [[ -n "$svg_out" ]]; then
  allow_status=0
  svg_hits="$(printf '%s\n' "$svg_out" | grep -vE "$ALLOWED")" || allow_status=$?
  if [[ $allow_status -ge 2 ]]; then
    echo "✗ svg check scanner error (allowlist filter exit $allow_status) — real failure, not a clean pass." >&2
    exit 4
  fi
fi
if [[ -n "$svg_hits" ]]; then
  override_status=0
  svg_hits="$(printf '%s\n' "$svg_hits" | grep -v 'allow-emoji:')" || override_status=$?
  if [[ $override_status -ge 2 ]]; then
    echo "✗ svg check scanner error (override filter exit $override_status) — real failure, not a clean pass." >&2
    exit 4
  fi
fi

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
