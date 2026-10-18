#!/usr/bin/env bash
# check-raw-css.sh — raw-literal gates for the three token axes the
# color/motion/icon gates do not cover (r184, from the r183-A3 audit
# §F5 + the proposed T1/S1/R1 contract).
#
# The design system's contract (DESIGN.md §1): typography flows through
# --fs-*/--type-*, radii through --r-*, spacing through --sp-*. The
# color gate already enforces the same discipline for colors; this
# script extends the model to the remaining axes:
#
#   TYPE   (strict)   font-size: with a raw px/clamp literal outside
#                     the sanctioned zones. Allowed shapes: var(--*),
#                     inherit, em/rem math on a controlled base…
#                     anything else needs a `type-gate: allow` comment.
#   RADIUS (strict)   border-radius / border-*-radius with raw px
#                     components. Always fine: 0, 50% (the circle
#                     primitive — a SHAPE, not a scale rung), inherit,
#                     var(--r-*). Anything else needs `radius-gate:
#                     allow`.
#   SPACING (census)  padding/margin/gap with raw px. NOT enforced yet
#                     (r184 starts it as a census, exactly how
#                     check-colors.sh started at r149 before the r150a
#                     triage): the tree carries ~86 off-scale + ~85
#                     in-scale literals — converting them in one sweep
#                     would be a risky wholesale CSS rewrite. The census
#                     keeps the drift VISIBLE in every CI run; flipping
#                     to --strict is a later triage, not a new tool.
#
# Sanctioned zones (always allowed, wholesale):
#   frontend/src/styles/tokens.css        — the token SOURCE (its raw
#                                           values ARE the ladder)
#   frontend/src/styles/fonts.css         — @font-face blocks
#   frontend/src/styles/unified-parity.css } the r127-F1 parity pair —
#   frontend/src/styles/shared-design-system.css } value-pinned by
#                                           verify-parity-export.mjs
#   frontend/src/styles/landing.css       — the Orbit Ink world
#                                           (DESIGN.md §1a: the
#                                           marketing surface has its
#                                           own display typography;
#                                           59 raw sizes there are the
#                                           documented world, not drift)
#   frontend/src/styles/colleges.css      — the colleges GALLERY world
#                                           (spec 004: hero numerals
#                                           28–56px intentionally exceed
#                                           the product 11–30 scale —
#                                           display surface, not app
#                                           chrome)
#
# Per-instance override (same convention as check-colors.sh):
#   /* type-gate:   allow — <reason> */   on the declaration's own line
#   /* radius-gate: allow — <reason> */
#   /* spacing-gate: allow — <reason> */  (future, when spacing flips
#                                          strict)
#
# Accepted allow reasons so far (each one is audited, not blanket):
#   - iOS-zoom floor: input font-size: 16px (Safari zooms <16px on
#     focus — documented fix 21-c; ~7 sites)
#   - glyph/icon scale: text glyphs (×, wordmarks, icon tiles, toast/
#     lightbox close) ride the 11–22 glyph ladder, not the text ladder
#   - micro-radius: 1–4px corners below the --r-xs (6px) rung —
#     hairline bars, timeline spines, skeleton text
#   - documented display exceptions (e.g. components.css 24px sheet)
#   - responsive display clamps with no token equivalent
#
# Modes:
#   --report   (default) TYPE+RADIUS violations print but exit 0 —
#              triage mode for introducing the gate.
#   --strict   exit 1 on any TYPE/RADIUS violation — the CI mode.
#              SPACING stays a census in both modes (see above).
#
# Scope: frontend/src/styles/*.css only. TSX inline styles are out of
# scope for v1 (the color gate scans them because color data is a
# security-adjacent surface; type/spacing literals in TSX are a
# maintainability concern and get one audit pass later).
#
# Scanner hardening (parity with check-colors.sh): one python3 pass,
# comments stripped newline-preserving (line pins stay exact), a
# scanner crash fails the gate with exit 4 instead of a vacuous pass.
#
# Usage: scripts/check-raw-css.sh [--report|--strict]
# Exit codes: 0 = clean (or report-mode census) · 1 = strict-mode
# violations · 2 = bad invocation · 4 = scanner error.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="--report"
case "${1:-}" in
  "") ;;
  --report) MODE="--report" ;;
  --strict) MODE="--strict" ;;
  -h|--help)
    sed -n '2,/^set -euo pipefail$/p' "$0" | sed -e 's/^# \{0,1\}//' -e '/^set -euo/d'
    exit 0
    ;;
  *)
    echo "check-raw-css.sh: unknown argument: $1" >&2
    echo "Usage: scripts/check-raw-css.sh [--report|--strict]" >&2
    exit 2
    ;;
esac

scan_status=0
python3 - "$MODE" <<'PYSCANNER' || scan_status=$?
import re
import sys
from pathlib import Path

mode = sys.argv[1] if len(sys.argv) > 1 else '--report'
STYLES = Path('frontend/src/styles')

WHOLESALE = {
    'tokens.css',               # the token source
    'fonts.css',                # @font-face only
    'unified-parity.css',       # parity export pair — value-pinned
    'shared-design-system.css', # by verify-parity-export.mjs
    'landing.css',              # Orbit Ink world (DESIGN.md §1a)
    'colleges.css',             # colleges gallery display world (spec 004)
}

# ── patterns ──────────────────────────────────────────────────────
TYPE_RE = re.compile(r'\bfont-size\s*:\s*([^;]+);')
RADIUS_RE = re.compile(r'\bborder(?:-[a-z]+(?:-[a-z]+)?)?-radius\s*:\s*([^;]+);')
SPACING_RE = re.compile(
    r'\b(?:padding|margin|gap|row-gap|column-gap)'
    r'(?:-(?:block|inline|top|bottom|left|right|start|end|x|y))?'
    r'\s*:\s*([^;]+);'
)
PX_IN_VALUE = re.compile(r'\d+(?:\.\d+)?px')
ALLOW_TYPE = re.compile(r'type-gate:\s*allow\b')
ALLOW_RADIUS = re.compile(r'radius-gate:\s*allow\b')
ALLOW_SPACING = re.compile(r'spacing-gate:\s*allow\b')

# Type values that are fine without a token: var(), inherit, calc()
# built on var()/em — anything with a var( reference is fine.
HAS_VAR = re.compile(r'var\(')
TYPE_FINE = {'inherit'}

# Radius values always fine: 0, 50%, inherit, none, var().
RADIUS_FINE = {'0', '50%', 'inherit', 'none'}

def strip_comments(text):
    return re.sub(r'/\*.*?\*/',
                  lambda m: '\n' * m.group(0).count('\n'),
                  text, flags=re.S)

def is_spacing_on_scale(v):
    """Every px literal in the value sits on the 4px ladder (6 = sp-1-5)."""
    for m in PX_IN_VALUE.finditer(v):
        n = float(m.group(0)[:-2])
        if n != 0 and n % 4 != 0 and n != 6:
            return False
    return True

type_violations = []
radius_violations = []
spacing_in = spacing_off = spacing_allowed = 0
files_scanned = 0

for f in sorted(STYLES.glob('*.css')):
    if f.name in WHOLESALE:
        continue
    files_scanned += 1
    raw_lines = f.read_text(encoding='utf-8').split('\n')
    text = strip_comments('\n'.join(raw_lines))
    ctx_lines = text.split('\n')
    for lineno in range(1, len(ctx_lines) + 1):
        # Literals are matched on the comment-stripped line (a prose
        # quote of "12px" in a rationale comment cannot false-positive);
        # the allow MARKER is matched on the RAW line (same convention
        # as check-colors.sh — the marker IS a comment, so stripping
        # first would erase it).
        line = ctx_lines[lineno - 1]
        raw_line = raw_lines[lineno - 1] if lineno <= len(raw_lines) else ''
        # TYPE axis (strict)
        for m in TYPE_RE.finditer(line):
            v = m.group(1).strip()
            if HAS_VAR.search(v) or v in TYPE_FINE:
                continue
            if ALLOW_TYPE.search(raw_line):
                continue
            type_violations.append((f.name, lineno, v))
        # RADIUS axis (strict)
        for m in RADIUS_RE.finditer(line):
            v = m.group(1).strip()
            if v in RADIUS_FINE or HAS_VAR.search(v):
                continue
            if not PX_IN_VALUE.search(v):
                continue  # e.g. 10% on an oval — shape, not scale
            if ALLOW_RADIUS.search(raw_line):
                continue
            radius_violations.append((f.name, lineno, v))
        # SPACING axis (census)
        for m in SPACING_RE.finditer(line):
            v = m.group(1).strip()
            if not PX_IN_VALUE.search(v) or HAS_VAR.search(v):
                continue
            if ALLOW_SPACING.search(raw_line):
                spacing_allowed += 1
            elif is_spacing_on_scale(v):
                spacing_in += 1
            else:
                spacing_off += 1

# ── report ────────────────────────────────────────────────────────
print(f'check-raw-css: scanned {files_scanned} app sheets '
      f'({len(WHOLESALE)} wholesale zones excluded)')
print(f'  TYPE   (strict): {len(type_violations)} violation(s)')
for name, lineno, v in type_violations:
    print(f'    {name}:{lineno}: font-size: {v}')
print(f'  RADIUS (strict): {len(radius_violations)} violation(s)')
for name, lineno, v in radius_violations:
    print(f'    {name}:{lineno}: border-radius: {v}')
print(f'  SPACING (census, not enforced): '
      f'{spacing_off} off-scale · {spacing_in} on-scale-literal · '
      f'{spacing_allowed} documented-allow')

if type_violations or radius_violations:
    if mode == '--strict':
        print('FAIL (strict): raw type/radius literals outside the token '
              'system — convert to var(--fs-*/--r-*) or document the line '
              'with a type-gate/radius-gate allow comment.')
        sys.exit(1)
    print('REPORT (non-blocking): triage the violations above, then run '
          'with --strict.')
else:
    print('PASS: type and radius discipline hold — every raw literal is '
          'either a sanctioned zone or a documented allow.')
sys.exit(0)
PYSCANNER

if [ "$scan_status" -eq 2 ]; then
  echo "check-raw-css.sh: scanner error — failing closed" >&2
  exit 4
fi
exit "$scan_status"
