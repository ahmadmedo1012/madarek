#!/usr/bin/env bash
# check-colors.sh — static color gate (AUDIT-1 H4, deferred from r148).
#
# Fails when raw color literals appear in frontend styles/components
# outside the sanctioned zones. The design system's contract: ALL
# colors flow through var(--*) custom properties defined in
# tokens.css (+ its per-theme blocks) — raw hex / rgb() / hsl()
# values anywhere else are drift the token system cannot see.
#
# Raw literals caught:
#   1. hex colors  #rgb / #rgba / #rrggbb / #rrggbbaa
#   2. rgb() / rgba() / hsl() / hsla() literals — both the legacy
#      comma form rgba(0,0,0,.5) and the modern space+slash form
#      rgb(0 0 0 / 50%)
#
# Sanctioned zones (always allowed):
#   frontend/src/styles/tokens.css   (the canonical token source —
#                                    its :root / [data-theme] blocks
#                                    ARE the raw values, by design)
#   frontend/src/styles/tokens.generated.css  (R326 M0.4 — the generated
#                                    shared half; raw values are its job
#                                    too. Source: shared/design-tokens.json)
#   frontend/src/styles/fonts.css    (@font-face only — no colors
#                                    today; sanctioned so a font file
#                                    never needs a literal)
#   frontend/src/styles/unified-parity.css      } the r127-F1 parity
#   frontend/src/styles/shared-design-system.css} export pair — NOT
#   imported by the app; every hex in them is value-pinned to
#   tokens.css by scripts/verify-parity-export.mjs, exactly the
#   wholesale exemption check-motion-tokens.sh grants the same two
#   files. Remove them from WHOLESALE below to re-include.
#   + any single line carrying an inline allowlist comment:
#       /* color-gate: allow — <reason> */   (CSS)
#       //  color-gate: allow — <reason>     (TSX)
#     same per-instance override convention as check-icons.sh's
#     `// allow-emoji: <reason>`.
#
# Always fine (not literals): var(--*) references, color-mix() whose
# color components are var() references, gradients built on vars,
# currentColor / transparent / none / inherit. A raw literal INSIDE
# a var() fallback slot — var(--x, #fff) — IS flagged (own rule:
# the token is defined, so the frozen fallback is dead weight that
# can silently lie after the next theme retune).
#
# TSX scope (secondary, deliberately cheap): raw literals in
# style-object color keys (`color: '#fff'`), SVG paint attributes
# (fill="#…"), canvas paints (fillStyle= / addColorStop(…)), and
# cssVar('--token', '#fallback') calls. Color DATA — tier/subject/
# college-accent palettes (gamification.ts, vision.ts, courseMeta.ts,
# colleges.config.ts [gated by validate-college-identity.ts], PDF
# annotation inks, owner brand-palette display) and const color MAPS
# consumed by reference — is content, not styling, and stays out of
# scope; so do template-literal gradients (interpolation makes a
# static read unreliable). CSS files remain the priority surface.
#
# Modes:
#   --report   (default) print the census, exit 0 — non-blocking.
#              Current intended mode: the tree carries ~150+ known
#              legacy literals (see the AUDIT-1 H4 report); triage
#              them into tokens / allowlist comments first.
#   --strict   exit 1 on any violation — the CI mode once the
#              legacy debt is triaged.
#
# NOT yet wired into CI (deliberate — orchestrator decision, see the
# R3-A8 report): the recommended slot is the design-gates job in
# .github/workflows/ci.yml, after `bash scripts/check-motion-tokens.sh`
# (report mode first, --strict after triage).
#
# Scanner hardening (parity with check-motion-tokens.sh /
# check-icons.sh): one python3 pass so every check sees
# comment-stripped source (prose quoting `#fff` in a rationale
# comment cannot false-positive) and a scanner crash fails the gate
# with exit 4 instead of a vacuous pass. CSS comments are stripped
# newline-preserving so file:line pins stay exact.
#
# Usage: scripts/check-colors.sh [--report|--strict]
# Exit codes: 0 = clean (or report-mode census) · 1 = violations
# (strict) · 2 = bad invocation · 4 = scanner error.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="--report"
case "${1:-}" in
  "") ;;
  --report) MODE="--report" ;;
  --strict) MODE="--strict" ;;
  -h|--help)
    # print the whole policy header (everything up to `set -euo`)
    sed -n '2,/^set -euo pipefail$/p' "$0" \
      | sed -e 's/^# \{0,1\}//' -e '/^set -euo/d'
    exit 0
    ;;
  *)
    echo "check-colors.sh: unknown argument: $1" >&2
    echo "Usage: scripts/check-colors.sh [--report|--strict]" >&2
    exit 2
    ;;
esac

# The scanner does the whole census in one pass. Exit contract:
#   0 = clean OR report-mode census (non-blocking, already printed)
#   1 = strict-mode violations (census + FAIL already printed)
#   2 = scanner error → mapped to the gate's exit 4 below.
scan_status=0
python3 - "$MODE" <<'PYSCANNER' || scan_status=$?
import os
import re
import sys

mode = sys.argv[1] if len(sys.argv) > 1 else '--report'

# ── sanctioned zones ──────────────────────────────────────────────────
WHOLESALE_CSS = {
    'frontend/src/styles/tokens.css',                # the token source
    # R326 M0.4 — the generated shared half (raw values are its job;
    # source: shared/design-tokens.json, regen npm run tokens:build)
    'frontend/src/styles/tokens.generated.css',
    'frontend/src/styles/fonts.css',                 # @font-face only
    # r127-F1 parity precedent (see header): unwired export pair,
    # value-pinned to tokens.css by verify-parity-export.mjs.
    'frontend/src/styles/unified-parity.css',
    'frontend/src/styles/shared-design-system.css',
}

# ── patterns ──────────────────────────────────────────────────────────
# Longest-first alternation so #rrggbbaa is not double-read as #rgb.
HEX_RE = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b')
FUNC_RE = re.compile(r'(?<![\w-])(rgba?|hsla?)\(')
ALLOW_RE = re.compile(r'color-gate:\s*allow\b')
CUSTOM_PROP_RE = re.compile(r'^\s*--[\w-]+\s*:')

# TSX literal (always quoted there)
LIT = (r'(?:#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}'
       r'|rgba?\([^)"\']*\)|hsla?\([^)"\']*\))')
TSX_STYLE = re.compile(
    r'(?:color|background|backgroundColor|backgroundImage|borderColor|'
    r'borderTopColor|borderBottomColor|borderInlineStartColor|'
    r'borderInlineEndColor|outlineColor|fill|stroke|boxShadow|textShadow|'
    r'caretColor|textDecorationColor|columnRuleColor|stopColor|floodColor|'
    r'lightingColor)\s*:\s*'
    r"(['\"])(" + LIT + r")\1")
TSX_PAINT_ATTR = re.compile(r'\b(fill|stroke|stopColor)\s*=\s*(["\'])(' + LIT + r')\2')
TSX_CANVAS = re.compile(r'\b(fillStyle|strokeStyle)\s*=\s*(["\'])(' + LIT + r')\2')
TSX_STOP = re.compile(r'addColorStop\(\s*[-\d.]+\s*,\s*(["\'])(' + LIT + r')\1')
TSX_CSSVAR = re.compile(r"cssVar\(\s*['\"]--[\w-]+['\"]\s*,\s*(['\"])(" + LIT + r')\1')

TSX_RULES = [
    (TSX_STYLE, 'tsx-inline-style'),
    (TSX_PAINT_ATTR, 'tsx-svg-paint'),
    (TSX_CANVAS, 'tsx-canvas-paint'),
    (TSX_STOP, 'tsx-canvas-paint'),
    (TSX_CSSVAR, 'tsx-var-fallback'),
]

LABELS = {
    'raw-color': (
        'Raw hex/rgb()/hsl() literal in a declaration value — route it '
        'through var(--*) or color-mix(in srgb, var(--x) N%, transparent)'),
    'raw-token-definition': (
        'Custom property DEFINED with a raw color outside tokens.css — move '
        'it into the tokens.css theme blocks, or mark the line '
        '/* color-gate: allow — reason */'),
    'var-fallback-raw': (
        'Raw color in a var() fallback slot — the token is defined; the '
        'frozen fallback is drift that can silently lie after a retune'),
    'tsx-inline-style': (
        "Raw color in a TSX inline style / style-object key — use var(--*)"),
    'tsx-svg-paint': (
        'Raw fill=/stroke= color on TSX SVG — brand-fixed art gets '
        '// color-gate: allow — reason'),
    'tsx-canvas-paint': (
        'Raw color passed to canvas painting (fillStyle / strokeStyle / '
        'addColorStop)'),
    'tsx-var-fallback': (
        "Raw color in a cssVar('--token', fallback) call"),
}


# ── helpers ───────────────────────────────────────────────────────────
def strip_comments_css(text):
    """Remove /* … */ spans, newlines preserved (line pins stay exact)."""
    return re.sub(r'/\*.*?\*/',
                  lambda m: '\n' * m.group(0).count('\n'),
                  text, flags=re.S)


def strip_comments_tsx(text):
    text = strip_comments_css(text)
    # full-line // comments only — never inside a string on the same
    # line as code (conservative: a trailing "// …#fff…" AFTER a quoted
    # literal cannot match any TSX rule anyway).
    return re.sub(r'(?m)^\s*//.*$', '', text)


def color_literals(line):
    """(start, end, literal) for every raw literal, in order."""
    out = []
    for m in HEX_RE.finditer(line):
        out.append((m.start(), m.end(), m.group(0)))
    for m in FUNC_RE.finditer(line):
        start = m.start()
        depth = 0
        end = start
        while end < len(line):
            if line[end] == '(':
                depth += 1
            elif line[end] == ')':
                depth -= 1
                if depth == 0:
                    end += 1
                    break
            end += 1
        out.append((start, end, line[start:end]))
    out.sort()
    return out


def var_fallback_spans(line):
    """Spans of var() fallback slots: after the first top-level comma."""
    spans = []
    i = 0
    while True:
        v = line.find('var(', i)
        if v == -1:
            break
        depth = 0
        comma = -1
        j = v + 3
        while j < len(line):
            ch = line[j]
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    break
            elif ch == ',' and depth == 1 and comma == -1:
                comma = j
            j += 1
        if comma != -1:
            spans.append((comma + 1, j))
        i = v + 4
    return spans


violations = []          # (rule, file, line, literals, context)
suppressed = 0           # lines muted by a color-gate: allow comment
files_hit = set()

try:
    # ── CSS surface: frontend/src/styles/*.css (rglob keeps it honest
    #    if a sheet ever lands outside styles/) ──────────────────────
    for root, _dirs, files in os.walk('frontend/src'):
        for name in sorted(files):
            if not name.endswith('.css'):
                continue
            path = os.path.join(root, name).replace(os.sep, '/')
            with open(path, encoding='utf-8') as fh:
                raw_lines = fh.read().split('\n')
            if path in WHOLESALE_CSS:
                continue
            text = strip_comments_css('\n'.join(raw_lines))
            # url(…) contents are resource refs, not colors; […]
            # attribute-selector strings can quote #anchor ids. Both
            # are neutralized for DETECTION only — the report context
            # keeps the comment-stripped line intact.
            ctx_lines = text.split('\n')
            for i, ctx_line in enumerate(ctx_lines, 1):
                line = re.sub(r'url\([^)]*\)', 'url()', ctx_line)
                line = re.sub(r'\[[^\]\n]*\]', '[]', line)
                lits = color_literals(line)
                if not lits:
                    continue
                if ALLOW_RE.search(raw_lines[i - 1]):
                    suppressed += 1
                    continue
                if CUSTOM_PROP_RE.match(line):
                    rule = 'raw-token-definition'
                else:
                    spans = var_fallback_spans(line)
                    if any(s <= start < e
                           for s, e in spans
                           for start, _end, _lit in lits):
                        rule = 'var-fallback-raw'
                    else:
                        rule = 'raw-color'
                violations.append((rule, path, i,
                                   [lit for _s, _e, lit in lits],
                                   ctx_line.strip()))
                files_hit.add(path)

    # ── TSX surface (secondary): style-applied literals only ────────
    for root, _dirs, files in os.walk('frontend/src'):
        for name in sorted(files):
            if not (name.endswith('.ts') or name.endswith('.tsx')):
                continue
            path = os.path.join(root, name).replace(os.sep, '/')
            with open(path, encoding='utf-8') as fh:
                raw_lines = fh.read().split('\n')
            lines = strip_comments_tsx('\n'.join(raw_lines)).split('\n')
            for i, line in enumerate(lines, 1):
                hits = []  # (rule, literal)
                for rx, rule in TSX_RULES:
                    for m in rx.finditer(line):
                        lit = m.group(m.lastindex)
                        if (rule, lit) not in hits:
                            hits.append((rule, lit))
                if not hits:
                    continue
                if ALLOW_RE.search(raw_lines[i - 1]):
                    suppressed += 1
                    continue
                for rule, lit in hits:
                    violations.append((rule, path, i, [lit], line.strip()))
                files_hit.add(path)
except Exception as err:                                  # scanner error
    print(f'color-gate scanner error: {err}', file=sys.stderr)
    sys.exit(2)

# ── report ────────────────────────────────────────────────────────────
by_rule = {}
n_literals = 0
for rule, path, line_no, lits, context in violations:
    by_rule.setdefault(rule, []).append((path, line_no, lits, context))
    n_literals += len(lits)

if violations:
    for rule in sorted(by_rule):
        rows = by_rule[rule]
        print(f'✗ {LABELS[rule]}:')
        for path, line_no, lits, context in rows:
            print(f'  {path}:{line_no}: {" · ".join(lits)}')
            print(f'      {context}')
        print()
    print(f'SUMMARY: {n_literals} raw color literal(s) across '
          f'{len(violations)} line(s) in {len(files_hit)} file(s)')
    for rule in sorted(by_rule):
        lits = sum(len(r[2]) for r in by_rule[rule])
        print(f'  {rule:<22} {lits} literal(s) in {len(by_rule[rule])} line(s)')
    if suppressed:
        print(f'  ({suppressed} line(s) suppressed by inline '
              f'color-gate: allow comments)')
    if mode == '--strict':
        print()
        print('FAIL: color-token violations detected — all colors must '
              'flow through var(--*) tokens.')
        print('Sanctioned zones: tokens.css · fonts.css · the parity pair '
              '· /* color-gate: allow — reason */ lines.')
        print('See scripts/check-colors.sh header (AUDIT-1 H4) and DESIGN.md.')
        sys.exit(1)
    print()
    print('REPORT: non-blocking (--report mode). Re-run with --strict to '
          'gate these.')
    sys.exit(0)

print('OK: no raw color literals outside the sanctioned zones '
      '(tokens.css, fonts.css, parity pair, inline allow comments).')
if suppressed:
    print(f'  ({suppressed} line(s) suppressed by inline '
          f'color-gate: allow comments)')
sys.exit(0)
PYSCANNER

if [[ $scan_status -eq 1 ]]; then
  # strict-mode violations — census + FAIL line already printed above
  exit 1
elif [[ $scan_status -ne 0 ]]; then
  echo "✗ color gate scanner error (python3 exit $scan_status) — real failure, not a clean pass." >&2
  echo "See scripts/check-colors.sh header (AUDIT-1 H4)." >&2
  exit 4
fi
