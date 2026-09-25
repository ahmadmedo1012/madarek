#!/usr/bin/env bash
# check-motion-tokens.sh — fail when raw motion durations / easings /
# transition-property hazards appear in frontend source outside the
# canonical token files.
#
# Checks (hardened 20-c / audit 4-A11 P1-4):
#   1. raw <number>ms / <number>s DURATIONS in transition/animation
#      values (s-units previously escaped the ms-only regex — raw
#      `2s`/`22s`/`5s` loops passed the gate)
#   2. cubic-bezier(...) literals
#   3. well-known named easings (ease-in-out, ease-in, ease-out, ease,
#      linear) in transition/animation values
#   4. `transition: all` (literal or via a custom property that
#      resolves to `all`) — the 4-A11 P1-3 smuggling route
#   5. layout-property animation: width/height/inline-size/block-size/
#      inset-*/margin/padding/gap… inside transition property lists or
#      @keyframes bodies (reflow on interaction — 4-A11 P2-10)
#
# Policy notes (deliberate, documented — not blind spots):
#   · DELAYS are exempt from tokenization. Choreography offsets
#     (`animation-delay: 60ms`, the second <time> in an animation
#     shorthand) are hand-tuned cascades the token system does not
#     model; only DURATIONS (the dimension that drifts and that
#     reduced-motion must bound) must be tokenized.
#   · Zero-ish values (0s / 0ms / 0.01ms) are exempt — they kill motion
#     (reduced-motion belts), they don't author it.
#   · `transition: var(--token)` values cannot be statically resolved;
#     the property smuggled inside a token is checked at the token
#     DEFINITION site instead (custom properties whose value starts
#     with `all`). tokens.css still ships `--t-clean: all …` at :118 —
#     neutralized app-wide by the overrides-layer redefinition in
#     polish.css (4-A11 P1-3) until tokens.css drops the `all`.
#
# Wholesale-allowlisted files (foundations + safety belts — raw values
# are their job):
#   frontend/src/styles/tokens.css   (the canonical token source)
#   frontend/src/styles/motion.css   (motion foundation: spinner loop,
#                                    reduced-motion token overrides)
#   frontend/src/styles/base.css     (global reduced-motion belt with
#                                    `0.01ms !important`)
#   frontend/tests/**                (test fixtures — outside the scan
#                                    root)
#
# polish.css NO LONGER has a wholesale exemption (20-c: its violations
# were fixed or demoted to the explicit DEBT list below). Each debt
# entry is a reviewed, reason-carrying pattern — edit the offending
# line and the entry stops matching (the gate fails), forcing
# re-review. New violations anywhere fail the gate.
#
# `linear` ruling (15-k P1-2): raw named easings are banned everywhere
# outside the allowlist, spinners included — genuinely constant-speed
# motion (infinite spins, scroll-linked progress bars) consumes the
# `--ease-linear` token from tokens.css instead.
#
# Scanner hardening (15-k P1-2; campaign-2 parity with
# check-i18n-coverage.sh): the scan runs in one python3 pass so every
# check sees comment-stripped source (comment prose quoting
# `animation-duration: 0.01ms` no longer false-positives) and so a
# scanner crash fails the gate with exit 4 instead of being swallowed
# into a vacuous pass.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 - <<'PYSCANNER'
import re
import sys
from pathlib import Path

SRC = Path('frontend/src')
EXTS = {'.css', '.ts', '.tsx'}

# ── wholesale allowlist ────────────────────────────────────────────────
WHOLESALE = {
    'frontend/src/styles/tokens.css',
    'frontend/src/styles/motion.css',
    'frontend/src/styles/base.css',
}

# ── reviewed debt (file:line:text regex → reason) ─────────────────────
# Each entry documents WHY the violation is allowed and WHO unpicks it.
DEBT = [
    (r'^frontend/src/styles/polish\.css:\d+:.*animation: [a-z0-9-]+ \d+(?:\.\d+)?s ',
     'ambient infinite-loop durations (breathe/sway/float/pulse family) — awaiting an '
     '--motion-duration-ambient token family in tokens.css (4-A11 §1.3, P1-5)'),
    (r'^frontend/src/styles/polish\.css:\d+:.*--ease-spring-(soft|bounce|snappy):',
     'spring easing vocabulary defined outside tokens.css, pending adoption there '
     '(4-A11 P3-17)'),
    # progress-fill width debt (polish mirror + canonical + term-progress
    # + training xp-fill) — CONVERTED to transform: scaleX() by 23-b
    # (A11 P2-10: components.css/.progress-fill + primitives/index.tsx,
    # student.css/.dash-term-bar + DashboardPage, training.css/.xp-fill +
    # MorePages, polish.css mirror retired); debt entries removed per the
    # gate protocol (entries stopped matching once the lines were fixed).
    (r'^frontend/src/styles/owner\.css:\d+:.*animation: pulse-live 2s',
     'ambient live-status pulse, 2s — owner.css is outside the 20-c file set; '
     'tokenize when an ambient-duration token exists (4-A11 §1.3)'),
    (r'^frontend/src/styles/components\.css:\d+:.*animation: madarek-sticker-idle 5s',
     'sticker idle wiggle delight beat (A11 verified-good) — 5s ambient loop; '
     'tokenize when an ambient-duration token exists (4-A11 §1.3)'),
    (r'^frontend/src/styles/landing\.css:\d+:.*animation: madarek-(typing|hero-drift|pulse-dot) \d+(?:\.\d+)?s',
     'landing ambient loops (typing indicator, hero drift, pulse dot) — landing.css '
     'is outside the 20-c file set; tokenize when an ambient-duration token exists'),
    # toggle-switch thumb via inset-inline-start — CONVERTED to a composited
    # translateX(calc(var(--motion-direction) * 18px)) by 21-b (A11 P2-10);
    # debt entry removed per the gate protocol (entry stopped matching).
    (r'^frontend/src/styles/student\.css:\d+:.*transition: inline-size var\(--motion-duration-stat\)',
     'lecture-progress-fill inline-size — width set inline by the page; scaleX() '
     'conversion needs TSX coordination (4-A11 P2-10)'),
    (r'^frontend/src/styles/student\.css:\d+:.*@keyframes campus-fill-in',
     'campus-fill-in keyframes animate inline-size — scaleX() follow-up (4-A11 P2-10)'),
    (r'^frontend/src/styles/components\.css:\d+:.*transition: background var\(--t-fast\) var\(--ease\), inline-size var\(--t-fast\)',
     'onboarding flow-dot inline-size (pill grows when active) — scaleX() follow-up '
     '(4-A11 P2-10)'),
    (r'^frontend/src/styles/components\.css:\d+:.*transition: inline-size var\(--t-slow\)',
     'expandable trend chip inline-size — scaleX() follow-up (4-A11 P2-10)'),
]

# ── helpers ────────────────────────────────────────────────────────────
DURATION_VAR = re.compile(
    r'var\(--(?:t-(?:micro|fast|base|slow|slower|cinema)|motion-duration-[a-z-]+)\)')
TIME_TOKEN = re.compile(r'(?<![\w.])(\d+(?:\.\d+)?)(ms|s)(?![\w])')
ZEROISH = {'0ms', '0s', '0.01ms', '0.001ms', '0.0001ms'}
NAMED_EASE = re.compile(
    r'(transition|animation)[a-zA-Z-]*\s*:\s*[^;]*'
    r'(?<![-\w])(ease-in-out|ease-in|ease-out|ease|linear)(?![\w-])')
RAW_BEZIER = re.compile(r'cubic-bezier\(')
TRANSITION_ALL = re.compile(r'(transition|transition-property)[a-zA-Z-]*\s*:\s*[^;]*\ball\b')
PROP_SMUGGLED_ALL = re.compile(r'^\s*--[a-z0-9-]+\s*:\s*all[\s,;]')
DECL = re.compile(r'(transition|animation)(-[a-z-]+)?\s*:')
LAYOUT_PROPS = {
    'width', 'height', 'inline-size', 'block-size',
    'min-width', 'max-width', 'min-height', 'max-height',
    'min-inline-size', 'max-inline-size', 'min-block-size', 'max-block-size',
    'top', 'left', 'right', 'bottom', 'inset', 'inset-inline', 'inset-block',
    'inset-inline-start', 'inset-inline-end', 'inset-block-start', 'inset-block-end',
    'margin', 'margin-inline', 'margin-block', 'margin-inline-start',
    'margin-inline-end', 'margin-block-start', 'margin-block-end',
    'padding', 'padding-inline', 'padding-block', 'padding-inline-start',
    'padding-inline-end', 'padding-block-start', 'padding-block-end',
    'gap', 'row-gap', 'column-gap', 'flex-basis',
}
KEYFRAMES = re.compile(r'@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}')


def strip_comments(text, ext):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    if ext in {'.ts', '.tsx'}:
        text = re.sub(r'^\s*//.*$', '', text, flags=re.M)
    return text


def split_top_level(value):
    """Split on commas that are not inside parentheses."""
    parts, depth, cur = [], 0, ''
    for ch in value:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur)
            cur = ''
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    return parts


def duration_violations(decl_prop, value):
    """Raw <time> in a DURATION slot. Delay slots + zero-ish exempt."""
    out = []
    if decl_prop.endswith('-delay'):
        return out  # delay policy — see header
    for item in split_top_level(value):
        slot = 0  # 0 = duration, 1+ = delay
        # step through time-like tokens in order: duration vars occupy
        # the duration slot just like literal times
        tokens = []
        for m in TIME_TOKEN.finditer(item):
            tokens.append((m.start(), m.group(0)))
        for m in DURATION_VAR.finditer(item):
            tokens.append((m.start(), None))
        tokens.sort()
        for _, raw in tokens:
            if raw is None:            # tokenized duration — legal
                slot += 1
                continue
            if slot == 0:
                if raw not in ZEROISH:
                    out.append(raw)
            slot += 1
    return out


def transition_layout_props(value):
    out = []
    for item in split_top_level(value):
        m = re.match(r'\s*([a-z-]+)', item)
        if not m:
            continue
        prop = m.group(1)
        if prop in ('var', 'all', 'none'):
            continue  # var(): unresolvable statically; all: flagged elsewhere
        if prop in LAYOUT_PROPS:
            out.append(prop)
    return out


violations = []  # (rule, file, line, text)

for path in sorted(SRC.rglob('*')):
    if path.suffix not in EXTS or not path.is_file():
        continue
    if 'node_modules' in path.parts:
        continue
    rel = 'frontend/src/' + str(path.relative_to(SRC))
    raw = path.read_text(encoding='utf-8', errors='replace')
    text = strip_comments(raw, path.suffix)
    lines = text.split('\n')
    wholesale = rel in WHOLESALE

    for i, line in enumerate(lines, 1):
        if wholesale:
            continue
        tag = f'{rel}:{i}'

        # 1+2. raw durations (ms and s) in duration slots
        for dm in re.finditer(r'(transition|animation)(-[a-z-]+)?\s*:\s*([^;]+)', line):
            prop, value = dm.group(1) + (dm.group(2) or ''), dm.group(3)
            bad = duration_violations(prop, value)
            if bad:
                violations.append(('raw-duration', tag, line.strip()))
                break
            if prop in ('transition', 'transition-property') or \
               prop in ('transitionProperty',):
                lp = transition_layout_props(value)
                if lp:
                    violations.append(
                        ('layout-property-transition', tag,
                         f'{line.strip()}  [layout props: {", ".join(sorted(lp))}]'))
                    break

        # 3. named easings
        if NAMED_EASE.search(line):
            violations.append(('named-easing', tag, line.strip()))

        # 3b. raw cubic-bezier() literals
        if RAW_BEZIER.search(line):
            violations.append(('raw-bezier', tag, line.strip()))

        # 4a. transition: all (literal or via a var that names it)
        if TRANSITION_ALL.search(line):
            violations.append(('transition-all', tag, line.strip()))

        # 4b. custom properties smuggling `all` as a transition value
        if PROP_SMUGGLED_ALL.match(line):
            violations.append(('transition-all-smuggled', tag, line.strip()))

    if wholesale:
        continue

    # 5b. layout props animated inside @keyframes
    for m in KEYFRAMES.finditer(text):
        name, body = m.group(1), m.group(2)
        props = set(re.findall(r'([\w-]+)\s*:', body))
        layout = props & LAYOUT_PROPS
        if layout:
            line_no = text[:m.start()].count('\n') + 1
            violations.append(
                ('layout-property-keyframes', f'{rel}:{line_no}',
                 f'@keyframes {name}  [animates: {", ".join(sorted(layout))}]'))

# ── debt filter ───────────────────────────────────────────────────────
import re as _re
debt_patterns = [(_re.compile(p), reason) for p, reason in DEBT]
kept, debts_seen = [], {}
for rule, tag, textline in violations:
    key = f'{tag}:{textline}'
    matched = None
    for pat, reason in debt_patterns:
        if pat.search(key):
            matched = reason
            break
    if matched:
        debts_seen.setdefault(matched, 0)
        debts_seen[matched] += 1
    else:
        kept.append((rule, tag, textline))

if kept:
    by_rule = {}
    for rule, tag, textline in kept:
        by_rule.setdefault(rule, []).append(f'  {tag}: {textline}')
    labels = {
        'raw-duration': 'Raw <num>ms / <num>s duration in a duration slot (use --motion-duration-* / --t-* tokens)',
        'named-easing': 'Named easing in a motion context (use --ease-* / --motion-ease-* tokens; --ease-linear for constant-speed motion)',
        'raw-bezier': 'Raw cubic-bezier() literal (use --ease-* / --motion-ease-* tokens)',
        'transition-all': 'transition: all — replace with an explicit property list',
        'transition-all-smuggled': 'Custom property resolves to `all` as a transition value — replace with an explicit property list',
        'layout-property-transition': 'Layout property in a transition (reflow on interaction — use transform, or see 4-A11 P2-10)',
        'layout-property-keyframes': 'Layout property animated in @keyframes (reflow per frame — use transform)',
    }
    for rule, rows in by_rule.items():
        print(f'✗ {labels.get(rule, rule)}:')
        for r in rows:
            print(r)
        print()
    print(f'FAIL: {len(kept)} motion-token violation(s) detected.')
    print('Use --motion-duration-* and --motion-ease-* tokens.')
    print('See specs/001-premium-motion-system/contracts/motion-tokens.md')
    sys.exit(1)

if debts_seen:
    print(f'OK: no raw motion values outside the canonical token files '
          f'({len(violations)} reviewed debt line(s) allowlisted):')
    for reason, count in sorted(debts_seen.items()):
        print(f'  · {count}× {reason}')
else:
    print('OK: no raw motion values outside the canonical token files.')
PYSCANNER
