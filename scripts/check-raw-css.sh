#!/usr/bin/env bash
# check-raw-css.sh — structural declaration gate for the three token
# axes the color/motion/icon gates do not cover (r184 → r185).
#
# r185 replaced the per-line regex engine with a declaration-level
# structural parser: comments stripped newline-preserving, then a
# string/paren/brace-aware walk that collects complete declarations
# (multiline included) with exact source line attribution. The r184
# per-line regexes missed real classes (documented in the r185
# mission): two-segment logical properties (padding-inline-start),
# literals hidden next to var() (padding: var(--sp-3) 5px), literals
# inside var() fallbacks, and multiline declarations.
#
# ══════════════════════════════════════════════════════════════════
#  AXES AND THEIR POLICIES
# ══════════════════════════════════════════════════════════════════
#
#  TYPE   (strict, r184 semantics frozen)   font-size with a raw
#         px/clamp literal outside the sanctioned zones. Allowed
#         shapes: var(--*), inherit, em/rem math on a controlled
#         base. Anything else needs a `type-gate: allow — reason`
#         comment on the declaration's lines.
#  RADIUS (strict, r184 semantics frozen)   border-*-radius with raw
#         px components. Always fine: 0, 50% (circle primitive),
#         inherit, none, var(--r-*). Else `radius-gate: allow`.
#  SPACING (strict, r185)     the padding/margin/gap family — all
#         directional, logical, and two-segment logical forms plus
#         scroll-margin/scroll-padding and custom properties whose
#         name ends in a spacing property (e.g. --card-padding).
#         Every raw px literal in the value is a finding — including
#         literals mixed with var() and literals inside var()
#         fallbacks or calc()/min()/max()/clamp() arguments.
#         Permitted without a token:
#           · unitless 0 / 0px / -0px  (zero has no rung)
#           · non-px units (%, em, rem, vw, vh, ch, env(), auto,
#             min-content …) — relative/responsive constraints are
#             outside the px-based ladder contract by policy
#         Everything else must be either a ladder token value
#         (var(--sp-*)) or carry a per-declaration exception:
#           /* spacing-gate: allow — <reason ≥ 2 words, ≥ 8 chars,
#              not a vague word like "legacy"> */
#         A bare/malformed/vague marker does NOT exempt the line —
#         strict mode fails on it so the marker gets fixed.
#
# ══════════════════════════════════════════════════════════════════
#  SCOPE (frontend/src/styles/*.css, re-derived per axis in r185)
# ══════════════════════════════════════════════════════════════════
#
#  Always wholesale (every axis):
#    tokens.css  — the token SOURCE (its raw values ARE the ladder;
#                  the spacing engine loads the --sp rungs from here)
#    fonts.css   — @font-face only, zero spacing declarations
#
#  Type/radius also exempt (r184 rationale, unchanged):
#    unified-parity.css + shared-design-system.css — the r127-F1
#                  parity pair, value-pinned by verify-parity-export.mjs
#    landing.css  — Orbit Ink display typography (DESIGN.md §1a)
#    colleges.css — gallery display numerals (spec 004)
#
#  SPACING also exempt (r185-specific decision, NOT inherited from
#  the typography exemption):
#    landing.css  — the Orbit Ink world rides its own spec'd
#                  editorial rhythm (spec §4.2.10 chapter rhythm,
#                  §4.3 edge rule; 30+ distinct rhythm values like
#                  9/26/34/44/52/84/110/140/150/170px are world
#                  design, not ladder debt). The world still adopts
#                  --sp-* opportunistically (72 var() uses, r153h
#                  pattern); its census is PRINTED every run so
#                  drift stays visible — never silently exempt.
#    (colleges.css and the parity pair ARE in strict spacing scope:
#    colleges' 2/4/8px micro rhythm is ladder-shaped and the parity
#    pair mirrors the full --sp ladder internally, so var() resolves
#    within the export.)
#
#  TSX inline styles (r186): the r184/r185 audit seam is now a
#  strict SPACING axis. React style objects turn bare numbers into
#  px at runtime, so BOTH quoted '…px…' values and whole-value bare
#  numbers are findings. Scope: frontend/src/**/*.tsx minus anything
#  with 'test' in the file name or '/tests/' in the path (same
#  exclusion the audit count used). Exemptions without a token:
#  zero (no rung for zero) — everything else needs a ladder token
#  (var(--sp-*)) or a per-declaration allow marker:
#    // spacing-gate: allow — <reason ≥ 2 words, ≥ 8 chars>
#  matched on the declaration's own line or the line above (JS //
#  comments and {/* */} both carry the marker text; the grammar is
#  the shared one — bare/vague markers FAIL so they get fixed).
#  Type/interface members (`gap: number;`) terminate at ';' so a
#  member never swallows its neighbours; prop matches inside
#  strings/templates are never findings (quote-aware walk).
#  TYPE/RADIUS stay CSS-only (TSX inline font-size/radius literals
#  remain audit-visible via the census line, not enforced).
#
# ══════════════════════════════════════════════════════════════════
#  CLASSIFICATION (spacing)
# ══════════════════════════════════════════════════════════════════
#
#  exact-token      |value| resolves to an existing --sp rung
#                   (ladder loaded live from tokens.css, e.g.
#                   24px → --sp-6, 6px → --sp-1-5; negatives map to
#                   calc(-1 * var(--sp-N)))
#  grid-no-token    |value| is a 4px multiple but no rung resolves
#                   to it (64px header constant, 124/136/176px
#                   scroll-margin offsets …) — layout constraints
#  off-grid         neither (1/2/3/5/7/10/14/18px …) — optical
#                   micro-adjustments or compact-control paddings
#
#  All three classes fail strict mode unless migrated to a token or
#  covered by a valid allow marker. Grid compliance is NOT token
#  compliance — 28px on the grid is still a finding without a rung.
#
# ══════════════════════════════════════════════════════════════════
#  MODES / EXIT CODES
# ══════════════════════════════════════════════════════════════════
#
#  --report (default)  full inventory + census, exit 0 (triage mode;
#                      scanner errors still fail closed)
#  --strict            exit 1 on any type/radius/spacing violation
#                      (CI mode — design-gates job). Since r186 the
#                      strict condition includes the TSX inline
#                      spacing axis (findings + malformed markers).
#  --styles-dir <dir>  scan that directory instead (fixtures for
#                      scripts/test-raw-css-gate.sh; it must contain
#                      a tokens.css with the ladder)
#  --src-dir <dir>     TSX root to scan (default frontend/src; the
#                      fixture harness points it at a synthetic src)
#
#  Exit: 0 clean/report · 1 strict violations · 2 bad invocation ·
#        4 scanner error (fail closed: unreadable file, unbalanced
#        braces, unparseable ladder, internal crash)
#
#  How to get the current numbers: run
#    bash scripts/check-raw-css.sh --report
#  (figures change with the source; this header deliberately pins
#  no counts.)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="--report"
STYLES_DIR=""
SRC_DIR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --report) MODE="--report"; shift ;;
    --strict) MODE="--strict"; shift ;;
    --styles-dir)
      [ $# -ge 2 ] || { echo "check-raw-css.sh: --styles-dir needs a path" >&2; exit 2; }
      STYLES_DIR="$2"; shift 2 ;;
    --src-dir)
      [ $# -ge 2 ] || { echo "check-raw-css.sh: --src-dir needs a path" >&2; exit 2; }
      SRC_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^set -euo pipefail$/p' "$0" | sed -e 's/^# \{0,1\}//' -e '/^set -euo/d'
      exit 0 ;;
    *)
      echo "check-raw-css.sh: unknown argument: $1" >&2
      echo "Usage: scripts/check-raw-css.sh [--report|--strict] [--styles-dir <dir>] [--src-dir <dir>]" >&2
      exit 2 ;;
  esac
done

scan_status=0
python3 - "$MODE" "$STYLES_DIR" "$SRC_DIR" <<'PYSCANNER' || scan_status=$?
import re
import sys
from pathlib import Path

mode = sys.argv[1]
styles_arg = sys.argv[2]
src_arg = sys.argv[3]
STYLES = Path(styles_arg) if styles_arg else Path('frontend/src/styles')
SRC = Path(src_arg) if src_arg else Path('frontend/src')


class ScanError(Exception):
    pass


# ── scope tables (per axis, r185) ─────────────────────────────────
WHOLESALE_ALWAYS = {'tokens.css', 'fonts.css'}
TYPE_RADIUS_EXTRA = {
    'unified-parity.css',      # parity pair — value-pinned export
    'shared-design-system.css',
    'landing.css',             # Orbit Ink display typography
    'colleges.css',            # gallery display world (spec 004)
}
SPACING_EXTRA = {
    # (r198: landing.css MOVED OUT of the census into full enforcement —
    # the poster rebuild ships zero raw spacing literals. It stays
    # documented here as a tombstone, not an exclusion.)
}

# ── spacing property family ───────────────────────────────────────
SPACING_PROPS = {
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'padding-block', 'padding-block-start', 'padding-block-end',
    'padding-inline', 'padding-inline-start', 'padding-inline-end',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'margin-block', 'margin-block-start', 'margin-block-end',
    'margin-inline', 'margin-inline-start', 'margin-inline-end',
    'gap', 'row-gap', 'column-gap',
}


def is_spacing_prop(prop):
    if prop in SPACING_PROPS:
        return True
    return any(prop.endswith('-' + p) for p in SPACING_PROPS)


# ── patterns (r184 semantics kept verbatim for type/radius) ──────
HAS_VAR = re.compile(r'var\(')
TYPE_FINE = {'inherit'}
RADIUS_FINE = {'0', '50%', 'inherit', 'none'}
PX_IN_VALUE = re.compile(r'\d+(?:\.\d+)?px')          # r184 axis policy
ALLOW_TYPE = re.compile(r'type-gate:\s*allow\b')
ALLOW_RADIUS = re.compile(r'radius-gate:\s*allow\b')

# spacing marker grammar (r185): reason REQUIRED
ALLOW_SPACING = re.compile(
    r'spacing-gate\s*:\s*allow\b\s*(?:[—-]\s*(?P<reason>[^*]*))?')
VAGUE_REASONS = {
    'legacy', 'existing', 'historic', 'historical', 'old', 'todo', 'wip',
    'temp', 'temporary', 'as-is', 'ok', 'fine', 'n/a', 'none', 'later',
    'fixme', 'xxx', 'tbd', 'unspecified', 'keep', 'skip',
}

# ── structural helpers ────────────────────────────────────────────
def strip_comments(text):
    """Newline-preserving comment removal (line pins stay exact)."""
    return re.sub(r'/\*.*?\*/',
                  lambda m: '\n' * m.group(0).count('\n'),
                  text, flags=re.S)


def parse_declarations(text, fname):
    """Declaration-level structural walk of comment-stripped CSS.

    Only text inside braces counts as declarations (at-rule preludes
    like @media (min-width: 768px) are discarded at '{'). Strings and
    parens are tracked so ';' inside url()/calc()/strings never splits
    a declaration, and quoted prose like content: "padding: 5px" is
    never mistaken for one. Returns [(prop, value, line_start,
    line_end)] and raises ScanError on unbalanced braces (fail
    closed — a sheet that cannot be walked cannot be trusted).
    """
    decls = []
    depth = 0
    paren = 0
    quote = None
    buf = []
    buf_start_line = None
    line = 1

    def flush(end_line):
        nonlocal buf, buf_start_line
        if buf_start_line is not None:
            chunk = ''.join(buf).strip()
            if chunk and ':' in chunk:
                prop, _, value = chunk.partition(':')
                decls.append((prop.strip(), value.strip(),
                              buf_start_line, end_line))
        buf = []
        buf_start_line = None

    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == '\n':
            line += 1
        if quote:
            if ch == '\\':
                buf.append(ch)
                i += 1
                if i < n:
                    buf.append(text[i])
                    if text[i] == '\n':
                        line += 1
                i += 1
                continue
            if ch == quote:
                quote = None
            buf.append(ch)
            i += 1
            continue
        if ch in '"\'':
            quote = ch
            if depth >= 1 and buf_start_line is None:
                buf_start_line = line
            buf.append(ch)
            i += 1
            continue
        if paren > 0:
            if ch == '(':
                paren += 1
            elif ch == ')':
                paren -= 1
            if depth >= 1:
                if buf_start_line is None:
                    buf_start_line = line
                buf.append(ch)
            i += 1
            continue
        if ch == '(':
            paren = 1
            if depth >= 1:
                if buf_start_line is None:
                    buf_start_line = line
                buf.append(ch)
            i += 1
            continue
        if ch == '{':
            # buffered text was a selector/at-rule prelude — discard
            depth += 1
            paren = 0
            buf = []
            buf_start_line = None
            i += 1
            continue
        if ch == '}':
            depth -= 1
            if depth < 0:
                raise ScanError(f'{fname}: negative brace depth')
            paren = 0
            flush(line)          # last declaration may omit ';'
            i += 1
            continue
        if ch == ';':
            if depth >= 1:
                flush(line)
            else:
                buf = []         # @import/@charset at depth 0
                buf_start_line = None
            i += 1
            continue
        if depth >= 1:
            # buffer start = first NON-WHITESPACE char, so a stripped
            # comment's leftover indent (or a blank line) never steals
            # the declaration's line attribution
            if buf_start_line is None and not ch.isspace():
                buf_start_line = line
            buf.append(ch)
        i += 1
    if depth != 0:
        raise ScanError(f'{fname}: unbalanced braces (depth {depth} at EOF)')
    flush(line)
    return decls


def find_px_literals(value, context='value'):
    """Every raw px literal in a declaration value, var() fallbacks
    and function arguments included; quoted strings skipped.

    Yields (literal_text, signed_value, context) where context is
    'value' | 'fallback' | 'func'.
    """
    out = []
    i = 0
    n = len(value)
    while i < n:
        ch = value[i]
        if ch in '"\'':
            j = i + 1
            while j < n and value[j] != ch:
                if value[j] == '\\':
                    j += 1
                j += 1
            i = j + 1
            continue
        if ch == '(':
            # function call — find its name and balanced extent
            k = i - 1
            while k >= 0 and (value[k].isalnum() or value[k] in '-_'):
                k -= 1
            fname = value[k + 1:i]
            j = i + 1
            depth = 1
            while j < n and depth > 0:
                c = value[j]
                if c in '"\'':
                    q = c
                    j += 1
                    while j < n and value[j] != q:
                        if value[j] == '\\':
                            j += 1
                        j += 1
                elif c == '(':
                    depth += 1
                elif c == ')':
                    depth -= 1
                j += 1
            inner = value[i + 1:j - 1] if depth == 0 else value[i + 1:j]
            if fname == 'var':
                # split top-level commas: name, fallback…
                parts = []
                cur = []
                d2 = 0
                q2 = None
                for c in inner:
                    if q2:
                        cur.append(c)
                        if c == q2:
                            q2 = None
                        continue
                    if c in '"\'':
                        q2 = c
                        cur.append(c)
                        continue
                    if c == '(':
                        d2 += 1
                    elif c == ')':
                        d2 -= 1
                    if c == ',' and d2 == 0:
                        parts.append(''.join(cur))
                        cur = []
                    else:
                        cur.append(c)
                parts.append(''.join(cur))
                if len(parts) >= 2:
                    out.extend(find_px_literals(parts[1].strip(),
                                                 'fallback'))
            else:
                out.extend(find_px_literals(inner, 'func'))
            i = j
            continue
        m = re.match(r'(-?)(\d+(?:\.\d+)?)px\b', value[i:])
        if m and (i == 0 or not (value[i - 1].isalnum()
                                 or value[i - 1] in '_-.')):
            sign = -1.0 if m.group(1) == '-' else 1.0
            out.append((m.group(0), sign * float(m.group(2)), context))
            i += m.end()
            continue
        i += 1
    return out


# ── ladder loading (live truth, fail closed) ──────────────────────
def load_ladder():
    tokens = STYLES / 'tokens.css'
    if not tokens.is_file():
        raise ScanError(f'missing ladder source: {tokens}')
    text = strip_comments(tokens.read_text(encoding='utf-8'))
    ladder = {}
    for m in re.finditer(r'(--sp-[a-z0-9-]+)\s*:\s*(\d+(?:\.\d+)?)px\s*;',
                         text):
        val = float(m.group(2))
        if val not in ladder:
            ladder[val] = m.group(1)
    if len(ladder) < 8:
        raise ScanError(
            f'ladder unparseable: only {len(ladder)} --sp rungs in '
            f'{tokens} — the spacing engine refuses to run against a '
            f'broken scale (fail closed, not fail silent)')
    return ladder


def classify(value_signed, ladder):
    v = abs(value_signed)
    if v == 0:
        return ('zero', None)
    if v in ladder:
        return ('exact-token', ladder[v])
    if v % 4 == 0:
        return ('grid-no-token', None)
    return ('off-grid', None)


def marker_state(raw_lines, start, end):
    """(state, reason) for the spacing allow marker in the
    declaration's raw source span. state: 'none' | 'valid' |
    'invalid'."""
    span = '\n'.join(raw_lines[start - 1:end])
    m = ALLOW_SPACING.search(span)
    if not m:
        return ('none', None)
    reason = (m.group('reason') or '').strip().rstrip('*').strip()
    words = [w for w in re.split(r'\s+', reason) if w]
    if (len(reason) < 8 or len(words) < 2
            or reason.lower() in VAGUE_REASONS):
        return ('invalid', reason if reason else '<empty>')
    return ('valid', reason)


# ── scan ──────────────────────────────────────────────────────────
def main():
    if not STYLES.is_dir():
        raise ScanError(f'missing styles directory: {STYLES}')
    ladder = load_ladder()

    type_violations = []
    radius_violations = []
    spacing_findings = []        # non-exempt, strict-blocking
    spacing_allowed = []         # valid documented allows
    invalid_markers = []         # marker present but malformed
    world_census = {}            # landing.css — visible, not enforced
    type_radius_files = 0
    spacing_files = 0

    sheets = sorted(STYLES.glob('*.css'))
    for f in sheets:
        raw_lines = f.read_text(encoding='utf-8').split('\n')
        text = strip_comments('\n'.join(raw_lines))
        try:
            decls = parse_declarations(text, f.name)
        except ScanError:
            raise
        in_tr = f.name not in WHOLESALE_ALWAYS and f.name not in TYPE_RADIUS_EXTRA
        in_sp = f.name not in WHOLESALE_ALWAYS and f.name not in SPACING_EXTRA
        if in_tr:
            type_radius_files += 1
        if in_sp:
            spacing_files += 1
        for prop, value, ls, le in decls:
            raw_span = '\n'.join(raw_lines[ls - 1:le])
            # TYPE axis (r184 semantics, frozen)
            if in_tr and prop == 'font-size':
                v = value.strip()
                if HAS_VAR.search(v) or v in TYPE_FINE:
                    pass
                elif ALLOW_TYPE.search(raw_span):
                    pass
                else:
                    type_violations.append((f.name, ls, v))
            # RADIUS axis (r184 semantics, frozen)
            if in_tr and re.fullmatch(r'border(?:-[a-z]+(?:-[a-z]+)?)?-radius',
                                      prop):
                v = value.strip()
                if v in RADIUS_FINE or HAS_VAR.search(v):
                    pass
                elif not PX_IN_VALUE.search(v):
                    pass
                elif ALLOW_RADIUS.search(raw_span):
                    pass
                else:
                    radius_violations.append((f.name, ls, v))
            # SPACING axis (r185)
            if is_spacing_prop(prop):
                lits = find_px_literals(value)
                if not lits:
                    continue
                if in_sp:
                    state, reason = marker_state(raw_lines, ls, le)
                    if state == 'invalid':
                        invalid_markers.append(
                            (f.name, ls, prop, value, reason))
                    for lit_text, signed, ctx in lits:
                        cls, cand = classify(signed, ladder)
                        if cls == 'zero':
                            continue
                        entry = (f.name, ls, prop, value, lit_text,
                                 cls, cand, ctx)
                        if state == 'valid':
                            spacing_allowed.append(entry + (reason,))
                        else:
                            spacing_findings.append(entry)
                else:
                    # world census (landing.css) — counted, visible
                    if f.name not in world_census:
                        world_census[f.name] = {
                            'literals': 0, 'decls': 0,
                            'exact-token': 0, 'grid-no-token': 0,
                            'off-grid': 0}
                    world_census[f.name]['decls'] += 1
                    for lit_text, signed, ctx in lits:
                        cls, _ = classify(signed, ladder)
                        if cls == 'zero':
                            continue
                        world_census[f.name]['literals'] += 1
                        world_census[f.name][cls] += 1

    # ── TSX inline spacing (r186): audit seam → strict axis ──────
    # React style objects turn bare numbers into px at runtime, so
    # both quoted '…Npx…' values and whole-value bare numbers are
    # findings. Walk is quote-aware (prop matches inside strings/
    # templates are never findings) and property accesses (.margin)
    # are skipped. Type members terminate at ';'. Zero is exempt.
    if not SRC.is_dir():
        raise ScanError(f'missing TSX source directory: {SRC}')
    tsx_files = 0
    tsx_findings = []      # (rel, line, prop, value, lit, cls, cand)
    tsx_allowed = []       # documented allows (valid markers)
    tsx_invalid = []       # malformed markers
    TSX_PROP = re.compile(
        r'(?<![.\w])(padding|margin|gap|rowGap|columnGap)'
        r'(?:Top|Right|Bottom|Left|Block|Inline|BlockStart|BlockEnd|'
        r'InlineStart|InlineEnd)?\s*:')

    def tsx_marker_state(raw_lines, line):
        """(state, reason) for the TSX allow marker: the prop's own
        line or the line above (JS // and {/* */} comments both carry
        the marker text; the grammar is the shared one)."""
        span = '\n'.join(raw_lines[max(0, line - 2):line])
        m = ALLOW_SPACING.search(span)
        if not m:
            return ('none', None)
        reason = (m.group('reason') or '').strip().rstrip('*').strip()
        words = [w for w in re.split(r'\s+', reason) if w]
        if (len(reason) < 8 or len(words) < 2
                or reason.lower() in VAGUE_REASONS):
            return ('invalid', reason if reason else '<empty>')
        return ('valid', reason)

    for t in sorted(SRC.rglob('*.tsx')):
        if 'test' in t.name or '/tests/' in str(t):
            continue
        rel = str(t.relative_to(SRC))
        try:
            raw = t.read_text(encoding='utf-8')
        except (OSError, UnicodeDecodeError) as e:
            raise ScanError(f'{rel}: unreadable ({e})') from e
        raw_lines = raw.split('\n')
        tsx_files += 1
        n = len(raw)
        i = 0
        quote = None
        while i < n:
            ch = raw[i]
            if quote:
                if ch == '\\':
                    i += 2
                    continue
                if ch == quote:
                    quote = None
                i += 1
                continue
            if ch in '"\'`':
                quote = ch
                i += 1
                continue
            # comments are prose, never declarations — the walk skips
            # them entirely (JSX {/* */} notes and // line comments
            # can quote «margin: 4px» as documentation)
            if ch == '/' and i + 1 < n:
                if raw[i + 1] == '/':
                    nl = raw.find('\n', i)
                    i = nl if nl != -1 else n
                    continue
                if raw[i + 1] == '*':
                    end = raw.find('*/', i + 2)
                    i = (end + 2) if end != -1 else n
                    continue
            m = TSX_PROP.match(raw, i)
            if not m:
                i += 1
                continue
            # value span: after ':' to the first ',' ';' or '}' at
            # paren/bracket depth 0 (quotes inside the value tracked,
            # so 'a, b' strings never split a span).
            j = m.end()
            depth = 0
            vq = None
            while j < n:
                c = raw[j]
                if vq:
                    if c == '\\':
                        j += 2
                        continue
                    if c == vq:
                        vq = None
                    j += 1
                    continue
                if c in '"\'`':
                    vq = c
                    j += 1
                    continue
                if c in '([{':
                    depth += 1
                elif c in ')]':
                    depth -= 1
                elif c == '}' and depth == 0:
                    break
                elif c in ',;' and depth == 0:
                    break
                j += 1
            value = raw[m.end():j]
            vstrip = value.strip()
            prop = m.group(0).split(':')[0].strip()
            line = raw[:m.start()].count('\n') + 1
            # JS comments inside the span are prose, not values (the
            # r157 migration notes «6px → token» live there) — strip
            # them before literal scanning, mirroring the CSS walk.
            vscan = re.sub(r'/\*.*?\*/', ' ', vstrip, flags=re.S)
            vscan = re.sub(r'//[^\n]*', ' ', vscan)
            lits = []
            for lm in re.finditer(r'(-?)(\d+(?:\.\d+)?)px\b', vscan):
                sign = -1.0 if lm.group(1) == '-' else 1.0
                lits.append((lm.group(0), sign * float(lm.group(2))))
            if not lits:
                unq = vscan.strip('\'" \t')
                if re.fullmatch(r'-?\d+(?:\.\d+)?', unq):
                    sign = -1.0 if unq.startswith('-') else 1.0
                    lits.append((unq, sign * abs(float(unq))))
            if not lits:
                i = j
                continue
            state, reason = tsx_marker_state(raw_lines, line)
            if state == 'invalid':
                tsx_invalid.append((rel, line, prop, vstrip[:60], reason))
                i = j
                continue
            for lit_text, signed in lits:
                cls, cand = classify(signed, ladder)
                if cls == 'zero':
                    continue
                entry = (rel, line, prop, vstrip[:60], lit_text, cls, cand)
                if state == 'valid':
                    tsx_allowed.append(entry + (reason,))
                else:
                    tsx_findings.append(entry)
            i = j

    # ── report ────────────────────────────────────────────────────
    tr_total = len(type_violations) + len(radius_violations)
    print(f'check-raw-css: structural scan — {spacing_files} spacing '
          f'sheets · {type_radius_files} type/radius sheets '
          f'({len(WHOLESALE_ALWAYS)} wholesale always: '
          f'{", ".join(sorted(WHOLESALE_ALWAYS))})')
    print(f'  TYPE   (strict): {len(type_violations)} violation(s)')
    for name, ls, v in type_violations:
        print(f'    {name}:{ls}: font-size: {v}')
    print(f'  RADIUS (strict): {len(radius_violations)} violation(s)')
    for name, ls, v in radius_violations:
        print(f'    {name}:{ls}: border-radius: {v}')

    by_cls = {'exact-token': 0, 'grid-no-token': 0, 'off-grid': 0}
    for e in spacing_findings:
        by_cls[e[5]] += 1
    decl_set = {(e[0], e[1]) for e in spacing_findings}
    print(f'  SPACING (strict): {len(spacing_findings)} finding(s) in '
          f'{len(decl_set)} declaration(s) — '
          f'{by_cls["exact-token"]} exact-token · '
          f'{by_cls["grid-no-token"]} grid-no-token · '
          f'{by_cls["off-grid"]} off-grid')
    for name, ls, prop, value, lit, cls, cand, ctx in spacing_findings:
        cand_s = f' (candidate {cand})' if cand else ''
        ctx_s = f' [{ctx}]' if ctx != 'value' else ''
        print(f'    {name}:{ls}: {prop}: {value}')
        print(f'        {lit} → {cls}{cand_s}{ctx_s}')
    if spacing_allowed:
        print(f'  SPACING documented allows: {len(spacing_allowed)} '
              f'(valid, reviewed)')
    for name, ls, prop, value, reason in invalid_markers:
        print(f'    INVALID MARKER {name}:{ls}: {prop}: {value} — '
              f'reason "{reason}" fails the grammar (≥2 words, ≥8 '
              f'chars, not vague); fix or remove the marker')
    if world_census:
        for name, c in world_census.items():
            print(f'  SPACING world census (not enforced): {name} — '
                  f'{c["literals"]} literal(s) in {c["decls"]} '
                  f'declaration(s) '
                  f'(exact {c["exact-token"]} · grid {c["grid-no-token"]} '
                  f'· off {c["off-grid"]})')
    # deterministic summaries for comparing successive runs
    if spacing_findings:
        from collections import Counter
        byprop = Counter(e[2] for e in spacing_findings)
        byfile = Counter(e[0] for e in spacing_findings)
        print('  SPACING by property: '
              + ' · '.join(f'{p} ×{c}' for p, c in
                           sorted(byprop.items(), key=lambda x: (-x[1], x[0]))))
        print('  SPACING by sheet: '
              + ' · '.join(f'{p} ×{c}' for p, c in
                           sorted(byfile.items(), key=lambda x: (-x[1], x[0]))))
    # r186: the TSX seam is a strict axis now — same listing shape.
    print(f'  TSX inline spacing (strict, r186): {len(tsx_findings)} '
          f'finding(s) · {len(tsx_allowed)} documented allow(s) across '
          f'{tsx_files} tsx file(s)')
    for rel, line, prop, value, lit, cls, cand in tsx_findings:
        cand_s = f' (candidate {cand})' if cand else ''
        print(f'    {rel}:{line}: {prop}: {value}')
        print(f'        {lit} → {cls}{cand_s} [tsx inline]')
    for rel, line, prop, value, reason in tsx_invalid:
        print(f'    INVALID MARKER {rel}:{line}: {prop}: {value} — '
              f'reason "{reason}" fails the grammar (≥2 words, ≥8 '
              f'chars, not vague); fix or remove the marker')

    if (tr_total or spacing_findings or invalid_markers
            or tsx_findings or tsx_invalid):
        if mode == '--strict':
            print('FAIL (strict): raw literals outside the token system — '
                  'convert to var(--sp-*/--fs-*/--r-*) or document the '
                  'declaration with a valid *-gate: allow — reason comment.')
            sys.exit(1)
        print('REPORT (non-blocking): triage the findings above, then run '
              'with --strict.')
    else:
        print('PASS: type, radius and spacing discipline hold — every raw '
              'literal is a token, a permitted zero/relative value, or a '
              'documented allow.')
    sys.exit(0)


try:
    main()
except ScanError as e:
    print(f'check-raw-css: SCANNER ERROR — {e}', file=sys.stderr)
    sys.exit(3)
except Exception as e:  # fail closed on any internal crash
    print(f'check-raw-css: SCANNER ERROR — internal: {e!r}',
          file=sys.stderr)
    sys.exit(3)
PYSCANNER

case "$scan_status" in
  0|1) exit "$scan_status" ;;
  *)   echo "check-raw-css.sh: scanner error — failing closed" >&2; exit 4 ;;
esac
