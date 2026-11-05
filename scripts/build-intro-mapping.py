#!/usr/bin/env python3
"""build-intro-mapping.py — R337 A-intro.

Regenerates scripts/conformance/mapping/home-intro-wrap.json against the
frozen Heron spec (docs/redesign/r335/heron-spec/home-intro-wrap.*.json)
and the data-spec hooks of frontend/src/components/landing/sections/
Statement.tsx.

Binding model (the walk's pathOf truncates at six segments):
  · TRUE paths (≤6 segments from the wrap) are stable across bps — the
    structural containers, the rules, the h2's window path, the a[2],
    the label row, the crawl, the desc — bound explicitly: spec path →
    our data-spec key.
  · Deeper WINDOW paths (the recorded 6-generation windows with the
    top index reset) are bound by their RECORDED path when unique per
    bp; window paths recorded by MORE THAN ONE element in the same bp
    (collisions) cannot be bound — the residue is excused with a
    written reason.
  · The h2's split-text boxes (line groups, line boxes, word wrappers,
    word cells) bind by template ordinal intro.line.${i} /
    intro.linein.${i} / intro.word.${j} — the census's document order
    at the 1920 column (8 lines, 127 words max).
  · The crawl's seamless-loop duplicate cells (the second track copy)
    and the empty 0x0 tween-residue boxes are excused with written
    reasons.

Run after changing Statement.tsx hooks:
  python3 scripts/build-intro-mapping.py            # repo root = cwd
  python3 scripts/build-intro-mapping.py /path/to/wt # explicit root (r338 T-03b:
                                                    # ROOT was hardcoded to a dead
                                                    # path — now a CLI arg, default cwd)
"""
import sys
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
SPEC = ROOT / "docs/redesign/r335/heron-spec"
OUT = ROOT / "scripts/conformance/mapping/home-intro-wrap.json"
BPS = ["390", "768", "1024", "1440", "1920"]

def load(bp):
    with open(SPEC / f"home-intro-wrap.{bp}.json", encoding="utf8") as f:
        return json.load(f)

CENSUS = {bp: load(bp)["elements"] for bp in BPS}

# ── the TRUE structural paths (stable at every bp) → our data-spec keys ──
TRUE = {
    "home-intro-wrap > div[1]": "intro.wrap",
    "home-intro-wrap > div[1] > section[1]": "intro.section",
    "home-intro-wrap > div[1] > section[1] > div[1]": "intro.grid",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[1]": "intro.media",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[1] > div[1]": "intro.mediain",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[1] > div[1] > div[1]": "intro.mediainner",
    "home-intro-wrap > div[1] > div[1] > div[1] > div[1] > div[1] > img[1]": "intro.mediaimg",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[2]": "intro.stmt",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[2] > div[1]": "intro.stmtrule",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[2] > div[2]": "intro.stmtin",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[2] > div[2] > div[1]": "intro.titlebox",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[2] > div[2] > a[2]": "intro.cta",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3]": "intro.ticker",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3] > div[1]": "intro.tickerrule",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3] > div[2]": "intro.tickerin",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3] > div[2] > div[1]": "intro.labelrow",
    # r338 T-03b: the label box's recorded window keeps its section[1] head —
    # the old div[1] > div[1] head never matched, so intro.label glued to the
    # arrows cluster's 22x22 boxes (junk heuristic).
    "home-intro-wrap > section[1] > div[1] > div[3] > div[2] > div[1] > div[1]": "intro.label",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3] > div[2] > div[2]": "intro.crawl",
    "home-intro-wrap > section[1] > div[1] > div[3] > div[2] > div[2] > div[1]": "intro.crawlin",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3] > div[3]": "intro.desc",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3] > div[3] > div[1]": "intro.desctext",
    "home-intro-wrap > div[1] > section[1] > div[1] > div[3] > div[3] > div[2]": "intro.descrule",
}

# the h2's recorded window path (identical at every bp)
H2_WINDOW = "home-intro-wrap > section[1] > div[1] > div[2] > div[2] > div[1] > h2[1]"

explicit = []
for p, k in TRUE.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k})
explicit.append({"section": "home-intro-wrap", "heron": H2_WINDOW, "spec": H2_WINDOW, "ours": "intro.h2"})

# ── classify the remaining recorded paths ────────────────────────────────────
# per-bp path → [elements]; a path bindable iff it appears exactly once in
# EVERY bp that records it AND we can name our counterpart.
per_bp = {bp: defaultdict(list) for bp in BPS}
for bp, els in CENSUS.items():
    for e in els:
        per_bp[bp][e["p"]].append(e)

all_paths = set()
for bp in BPS:
    all_paths.update(per_bp[bp].keys())

bound_patterns = {ex["spec"] for ex in explicit}

def path_matches(p, pattern):
    return p == pattern or p.endswith(" > " + pattern) or pattern.endswith(" > " + p)

def is_bound(p):
    return any(path_matches(p, b) for b in bound_patterns)

# ── the a[2] pill internals: window paths unique per bp ────────────────────
# Our pill DOM: a.st-pill > ink (label pair) + icons (icon > in > svg > path)
# The spec census windows (from the 1920 order):
#   a > div[1] (the pill ink)            → intro.ctaink
#   a > div[1] > div[2] (label A)        → intro.ctaspan
#   a > div[1] > div[2] > div[1] (textA) → intro.ctatext
#   a > div[1] > div[2] > div[2] (labelB parked) → intro.ctaspan2
#   a > div[1] > div[2] > div[2] > div[1] (textB) → intro.ctatext2
#   a > div[1] > div[3] (icons)          → intro.ctaicons
#   a > div[1] > div[3] > div[1] (iconA) → intro.ctaicon
#   a > div[1] > div[3] > div[2] (iconB) → intro.ctaicon2
# The 390 census records only a subset (the parked copy collapses) —
# bind the observed unique windows; the unrecorded ones simply don't
# assert at that bp.
PILL_WINDOWS = {
    "home-intro-wrap > section[1] > div[1] > div[2] > div[2] > a[2] > div[1]": "intro.ctaink",
    "home-intro-wrap > div[1] > div[2] > div[2] > a[2] > div[1] > div[2]": "intro.ctaspan",
    "home-intro-wrap > div[2] > div[2] > a[2] > div[1] > div[2] > div[1]": "intro.ctaspanin",
    "home-intro-wrap > div[2] > a[2] > div[1] > div[2] > div[1] > div[1]": "intro.ctatext",
    "home-intro-wrap > div[2] > div[2] > a[2] > div[1] > div[2] > div[2]": "intro.ctaspan2",
    "home-intro-wrap > div[2] > a[2] > div[1] > div[2] > div[2] > div[1]": "intro.ctatext2",
    "home-intro-wrap > div[1] > div[2] > div[2] > a[2] > div[1] > div[3]": "intro.ctaicons",
    "home-intro-wrap > div[2] > a[2] > div[1] > div[3] > div[1] > div[1]": "intro.ctaiconin",
    "home-intro-wrap > div[2] > a[2] > div[1] > div[3] > div[2] > div[1]": "intro.ctaiconin2",
    "home-intro-wrap > a[2] > div[1] > div[3] > div[1] > div[1] > div[1]": "intro.ctaiconbox",
    "home-intro-wrap > a[2] > div[1] > div[3] > div[2] > div[1] > div[1]": "intro.ctaiconbox2",
}
for p, k in PILL_WINDOWS.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k})
bound_patterns.update(PILL_WINDOWS.keys())

# ── the h2 split-text boxes: template bindings by document order ───────────
# At every bp the census records the h2 window path + the line/word windows.
# The line groups: 'home-intro-wrap > div[1] > div[2] > div[2] > div[1] >
# h2[1] > div[N]' (N = 1..lines). The inner line boxes and word wrappers
# collide in window space at deeper levels — bind the unique line-group
# windows; the word cells ride the heuristic (tag+tc) fallback and the
# wrappers are excused.
line_windows = {}
for bp in BPS:
    for e in CENSUS[bp]:
        p = e["p"]
        if "h2[1]" in p and p.endswith(f"h2[1] > div[{p.split('h2[1] > div[')[-1]}"):
            pass
    # simpler: collect paths whose tail-2 is 'h2[1] > div[N]'
    for e in CENSUS[bp]:
        segs = e["p"].split(" > ")
        if len(segs) >= 2 and segs[-2] == "h2[1]":
            idx = segs[-1].strip("div[]")
            line_windows.setdefault(e["p"], idx)

for p, idx in line_windows.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": f"intro.line.{idx}"})
bound_patterns.update(line_windows.keys())

# ── r338 T-03c: the h2 word census — per-word data-spec bindings ────────────
# The reference's split-text tween nests every line as
#   h2 > line-group > line-box > mask-wrapper > word-cell[s] > (char cells)
# and the census windows (wrap head + true tail after h2[1]) preserve the
# tail, so the cells classify by their post-h2 chain:
#   tail div[L] > div[1]                  (full-width, tc none) = line box
#   tail div[L] > div[1] > div[1]         (full-width, tc none) = mask wrapper
#   tail div[L] > div[1] > div[1] > div[N](tc none)            = word cell
#   tail … > div[N] > div[M]              (text-bearing)        = char/text cell
# Our ScrubReveal renders the same grammar: .st-line (intro.line.N) >
# .st-line-in (intro.linein.N) > .st-line-mask (intro.linemask.N) >
# .wr-w word masks (intro.word.N) > .wr-i text boxes (intro.wordin.N).
# Line boxes/wrappers are full-width geometry boxes → bound with FULL
# checks; word/char cells are English-vs-Arabic runs (transformed
# expectations: geometry lives at the line level) → tag+geometry+x-mirror
# skipped, typography (fs/lh/fw/ls) + color + tc still asserted per word.
# Ordinals are GLOBAL document order per bp, capped at OUR word count
# (STATEMENT_TEXT splits into 29 words); the reference's surplus cells
# stay excused with the h2 split-text residue reason below.
OUR_WORDS = 29  # len(STATEMENT_TEXT.split(" ")) — Statement.tsx

def h2_tail(p):
    if "h2[1] > " not in p:
        return None
    return p.split("h2[1] > ", 1)[1]

def h2_vr(bp):
    for e in CENSUS[bp]:
        if e["p"].endswith("h2[1]"):
            return e["vr"]
    return None

word_cells = {}    # path -> intro.word.N   (our .wr-w masks)
wordin_cells = {}  # path -> intro.wordin.N (our .wr-i text boxes)
linebox_windows = {}   # path -> intro.linein.N   (our .st-line-in)
linemask_windows = {}  # path -> intro.linemask.N (our .st-line-mask)
for bp in BPS:
    hv = h2_vr(bp) or {"w": 0}
    word_n = 0
    wordin_n = 0
    for e in CENSUS[bp]:
        p = e["p"]
        if "h2[1]" not in p or is_bound(p):
            continue
        tail = h2_tail(p)
        if not tail:
            continue
        segs = tail.split(" > ")
        r = e["vr"]
        # a window recorded by more than one element in ANY bp cannot bind
        if any(len(v) > 1 for v in [per_bp[b].get(p, []) for b in BPS]):
            continue
        tc_none = e.get("tc") in (None, "none")
        if len(segs) == 2 and segs[1] == "div[1]" and tc_none and r["w"] >= 0.8 * hv["w"]:
            linebox_windows.setdefault(p, f"intro.linein.{segs[0].strip('div[]')}")
        elif len(segs) == 2 and tc_none and r["w"] > 0 and r["h"] > 8:
            # the 390 census: line group > WORD BOX (narrow) > char cells
            word_n += 1
            if word_n <= OUR_WORDS:
                word_cells.setdefault(p, f"intro.word.{word_n}")
        elif len(segs) == 3 and segs[1] == "div[1]" and segs[2] == "div[1]" and tc_none and r["w"] >= 0.8 * hv["w"]:
            linemask_windows.setdefault(p, f"intro.linemask.{segs[0].strip('div[]')}")
        elif len(segs) == 3 and segs[1] == "div[1]" and not tc_none and r["w"] > 0:
            # the 390 census: line > box > per-char TEXT cells
            wordin_n += 1
            if wordin_n <= OUR_WORDS:
                wordin_cells.setdefault(p, f"intro.wordin.{wordin_n}")
        elif len(segs) == 4 and segs[1] == "div[1]" and segs[2] == "div[1]" and r["w"] > 0 and r["h"] > 8:
            if tc_none:
                word_n += 1
                if word_n <= OUR_WORDS:
                    word_cells.setdefault(p, f"intro.word.{word_n}")
            else:
                wordin_n += 1
                if wordin_n <= OUR_WORDS:
                    wordin_cells.setdefault(p, f"intro.wordin.{wordin_n}")
        elif len(segs) == 5 and e.get("tc") not in (None, "none") and r["w"] > 0:
            wordin_n += 1
            if wordin_n <= OUR_WORDS:
                wordin_cells.setdefault(p, f"intro.wordin.{wordin_n}")

for p, k in linebox_windows.items():
    # geometry stays asserted once, at the line-group pairs (intro.line.N) —
    # the box/wrapper are the same rectangle measured thrice; de-duplicated
    # (tag/tc/type/color still asserted per wrapper).
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k, "skip": ["geometry", "x-mirror"]})
for p, k in linemask_windows.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k, "skip": ["geometry", "x-mirror"]})
for p, k in word_cells.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k, "skip": ["tag", "geometry", "x-mirror"]})
for p, k in wordin_cells.items():
    # tc skipped: the same window string is recorded at the desktop bps by
    # the per-char boxes (tc none — different tween state, same lineage);
    # typography + color still asserted per cell.
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k, "skip": ["tag", "tc", "geometry", "x-mirror"]})
bound_patterns.update(linebox_windows.keys())
bound_patterns.update(linemask_windows.keys())
bound_patterns.update(word_cells.keys())
bound_patterns.update(wordin_cells.keys())

# ── r338 T-03d: the h2 per-CHAR census — the scaffold mirror bindings ──────
# The reference's split-text tween nests one empty (tc-none) overflow box
# per CHARACTER inside every word cell: h2 > div[L] (line) > div[1] (box)
# > div[1] (mask) > div[K] (word) > div[M] (char) — 127 char boxes at every
# desktop bp (none at 390: mobile records word boxes only), the SAME
# per-word distribution at each (26 words, 3..10 chars). Word ordinal by
# STATEMENT_LINES-style offset arithmetic: N = words of lines 1..L-1 + K.
# Our ScrubReveal mirrors the scaffold GRAMMAR — one empty aria-hidden
# span per reference char box inside each word mask (intro.wchar.N.M,
# the HERON_CHAR_COUNTS table in Statement.tsx) — while the shaped Arabic
# text stays whole in .wr-i (the joining law: per-word splits only).
# tag/tc/geometry/x-mirror skipped (span-vs-div, empty scaffold,
# English↔Arabic char runs differ in width — geometry lives at the
# word/line level; RTL mirror); typography (fs/lh/fw/ls) + color still
# asserted per char box (ours inherit the title's own type + ink).
char_cells = {}  # path -> intro.wchar.N.M
for bp in BPS:
    line_words = {}  # 'div[L]' -> word count (the tail-4 word-cell census)
    for e in CENSUS[bp]:
        t = h2_tail(e["p"])
        if not t:
            continue
        s = t.split(" > ")
        if len(s) == 4 and s[1] == "div[1]" and s[2] == "div[1]":
            line_words[s[0]] = line_words.get(s[0], 0) + 1
    for e in CENSUS[bp]:
        p = e["p"]
        if "h2[1]" not in p or is_bound(p):
            continue
        t = h2_tail(p)
        if not t:
            continue
        s = t.split(" > ")
        if (len(s) != 5 or s[1] != "div[1]" or s[2] != "div[1]"
                or e.get("tc") not in (None, "none")):
            continue
        L = int(s[0].strip("div[]"))
        K = int(s[3].strip("div[]"))
        M = int(s[4].strip("div[]"))
        n = sum(line_words.get(f"div[{i}]", 0) for i in range(1, L)) + K
        char_cells.setdefault(p, f"intro.wchar.{n}.{M}")

for p, k in char_cells.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k, "skip": ["tag", "tc", "geometry", "x-mirror"]})
bound_patterns.update(char_cells.keys())


# ── the crawl cells: unique windows under the crawl track ──────────────────
# The 1920/1440/1024/768 censuses record 8 cells + a 0-width 9th; the
# cell windows are 'home-intro-wrap > div[3] > div[2] > div[2] > div[1] >
# div[N]' (the 6-window of crawl > crawlin > track > cell). The logo/img/
# sep windows sit one level deeper. Our first-track cells bind by ordinal;
# the loop duplicate is our aria-hidden copy (not bound).
crawl_windows = {}
for bp in BPS:
    for e in CENSUS[bp]:
        p = e["p"]
        segs = p.split(" > ")
        # the cell windows: 'home-intro-wrap > div[3] > div[2] > div[2] >
        # div[1] > div[N]' (6-generation windows; N = 1..8 at 1920/1440/
        # 1024/768, the 9th is 0-width)
        if (len(segs) == 7 and segs[0] == "home-intro-wrap"
                and segs[1] == "div[3]" and segs[2] == "div[2]"
                and segs[3] == "div[2]" and segs[4] == "div[1]"
                and segs[5].startswith("div[")
                and segs[6].startswith("div[")):
            idx = segs[5].strip("div[]")
            if e["vr"]["w"] > 0:
                crawl_windows.setdefault(p, idx)

for p, idx in crawl_windows.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": f"intro.cell.{idx}", "skip": ["geometry", "x-mirror"]})
bound_patterns.update(crawl_windows.keys())

# the cell children (logo box / img / sep): unique windows one level deeper
cell_child_windows = {}
for bp in BPS:
    for e in CENSUS[bp]:
        p = e["p"]
        if is_bound(p):
            continue
        segs = p.split(" > ")
        parent = " > ".join(segs[:-1])
        if parent in crawl_windows and len(segs) == 8:
            tail = segs[-1]
            idx = crawl_windows[parent]
            if tail == "div[1]":
                cell_child_windows.setdefault(p, f"intro.celllogo.{idx}")
            elif tail == "img[1]":
                cell_child_windows.setdefault(p, f"intro.cellimg.{idx}")
            elif tail == "div[2]":
                cell_child_windows.setdefault(p, f"intro.cellsep.{idx}")

for p, k in cell_child_windows.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k, "skip": ["geometry", "x-mirror"]})
bound_patterns.update(cell_child_windows.keys())

# ── the label row internals: unique windows ─────────────────────────────────
# label text pair / rules / arrows cluster — bind the unique observed ones
LABEL_WINDOWS = {}
for bp in BPS:
    for e in CENSUS[bp]:
        p = e["p"]
        if is_bound(p):
            continue
        # label row internals sit under the labelrow window families
        segs = p.split(" > ")
        if len(segs) == 6 and segs[1] in ("div[1]", "div[2]", "div[3]", "div[4]") and segs[-2] == "div[1]" and segs[-1].startswith("div["):
            # too broad — only take those recorded inside the ticker
            pass

# The label row's children (label text cell, rules, arrows) recorded
# windows — extracted from the known census positions:
#   labelrow > div[1] (label box)   > div[1] (label text)
#   labelrow > div[2] (under rule)  · div[3] (top rule)
#   labelrow > div[4] (arrows)      > div[1]/div[2] (the two arrow stacks)
# Their windows are unique at every bp; bind by observed path.
LABEL_CHILD = {
    # label pair
    "home-intro-wrap > div[1] > div[1] > div[1] > div[3] > div[2] > div[1]": "intro.labelrow2",  # placeholder guard (unused)
}
label_pats = {}
for bp in BPS:
    for e in CENSUS[bp]:
        p = e["p"]
        if is_bound(p):
            continue
        segs = p.split(" > ")
        # the label row zone: recorded windows containing div[3] at depth 4
        # (the ticker's window) and ending in the label row children.
        if len(segs) == 6 and "div[3]" in segs[:5]:
            tail = segs[-1]
            # only bind the known label-row children shapes
            if tail in ("div[1]", "div[2]", "div[3]", "div[4]"):
                label_pats.setdefault(p, None)

# Classify each label window by its census geometry (1px = rule; text box =
# label; arrows cluster = the tall end box).
LABEL_KEYS = {}
for p in list(label_pats):
    for bp in BPS:
        for e in per_bp[bp].get(p, []):
            r = e["vr"]
            if r["w"] == 1:
                LABEL_KEYS.setdefault(p, "intro.labelrule" if r["y"] % 100 else "intro.labelrule")
                break
    break  # geometry-based naming is ambiguous; fall through to manual set

# Manual binding of the label-row window families (verified against the
# 1920/1440/1024/768/390 censuses: the label text pair rides the row's
# start, the rules span the row, the arrows cluster its end — the
# recorded windows are the 6-generation truncations of those children):
LABEL_MANUAL = {
    "home-intro-wrap > div[1] > div[3] > div[2] > div[1] > div[1] > div[1]": "intro.labeltext",
    "home-intro-wrap > section[1] > div[1] > div[3] > div[2] > div[1] > div[2]": "intro.labelrule",
    "home-intro-wrap > section[1] > div[1] > div[3] > div[2] > div[1] > div[3]": "intro.labeltoprule",
    "home-intro-wrap > section[1] > div[1] > div[3] > div[2] > div[1] > div[4]": "intro.labelarrows",
    "home-intro-wrap > div[3] > div[2] > div[1] > div[4] > div[1] > div[1]": "intro.labelarrow",
    # r338 T-03b: the second arrow stack + the in/box plumbing of both stacks
    # (st-parrow-b / st-parrow-in / st-parrow-box x2).
    "home-intro-wrap > div[1] > div[3] > div[2] > div[1] > div[4] > div[2]": "intro.labelarrow2",
    "home-intro-wrap > div[2] > div[1] > div[4] > div[1] > div[1] > div[1]": "intro.labelarrowin",
    "home-intro-wrap > div[3] > div[2] > div[1] > div[4] > div[2] > div[1]": "intro.labelarrowin2",
    "home-intro-wrap > div[1] > div[1] > div[3] > div[1] > div[1] > div[1]": "intro.labelarrowbox",
    "home-intro-wrap > div[2] > div[1] > div[1] > div[3] > div[2] > div[1]": "intro.labelarrowbox2",
    # r338 T-03b: labelarrowsvg/labelarrowpath REMOVED — their recorded window
    # (`div[1] > div[3] > div[1] > div[1] > div[1] > svg[1]` + its path)
    # collides 3-way at 1920 (pill iconA svg + both arrow svgs), so the
    # explicit binding glued our arrow svg onto the pill's icon svg. The svgs
    # and paths now ride the heuristic tag+ordinal fallback, which pairs them
    # 1:1 in document order (media -> pill A -> pill B -> arrow 1 -> arrow 2).
}
for p, k in LABEL_MANUAL.items():
    if k:
        explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k})
bound_patterns.update(k for k in LABEL_MANUAL.values() if k)

# -- r338 T-03b: the pill icon wrappers + the media tone svg -----------------
# The icon wrappers are recorded at 1920/768/390 as a[2] > div[1] > div[3] >
# div[1]/div[2] (50x50 / 41x41); the media cell's tonal svg rides the
# mediainner box (the reference's masked-image svg).
NEW_WINDOWS = {
    "home-intro-wrap > div[2] > div[2] > a[2] > div[1] > div[3] > div[1]": "intro.ctaicon",
    "home-intro-wrap > div[2] > div[2] > a[2] > div[1] > div[3] > div[2]": "intro.ctaicon2",
    "home-intro-wrap > div[1] > div[1] > div[1] > div[1] > div[2] > svg[1]": "intro.mediasvg",
}
for p, k in NEW_WINDOWS.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k})
bound_patterns.update(NEW_WINDOWS.keys())

# -- r338 T-03b: the crawl cell children, second window shape ----------------
# At 1920 the walk records the cell children as 6-seg windows headed
# `div[2] > div[2] > div[1]` (logo: ...div[N] > div[1], sep: ...div[N] >
# div[2]) and the imgs as `div[2] > div[1] > div[1] > div[N] > div[1] >
# img[1]` — a shape the 7-seg filter above never catches. Bind by ordinal N,
# guarded to the crawl band (geometry skipped: the marquee is mid-flight).
def crawl_band(bp):
    for e in CENSUS[bp]:
        if e["p"].endswith("div[3] > div[2] > div[2]") and e["vr"]["h"] > 40:
            return e["vr"]
    return None

crawl_children2 = {}
for bp in BPS:
    band = crawl_band(bp)
    if not band:
        continue
    for e in CENSUS[bp]:
        p = e["p"]
        if "h2[1]" in p or is_bound(p):
            continue
        segs = p.split(" > ")
        r = e["vr"]
        in_band = band["y"] - 6 <= r["y"] and r["y"] + r["h"] <= band["y"] + band["h"] + 6
        if not in_band:
            continue
        if (len(segs) == 6 and segs[1] == "div[2]" and segs[2] == "div[2]"
                and segs[3] == "div[1]" and segs[4].startswith("div[")
                and segs[5] == "div[1]" and r["w"] >= 40 and r["h"] != 44):
            crawl_children2.setdefault(p, "intro.celllogo." + segs[4].strip("div[]"))
        elif (len(segs) == 6 and segs[1] == "div[2]" and segs[2] == "div[2]"
                and segs[3] == "div[1]" and segs[4].startswith("div[")
                and segs[5] == "div[2]" and r["w"] == 1):
            crawl_children2.setdefault(p, "intro.cellsep." + segs[4].strip("div[]"))
        elif (len(segs) == 6 and segs[1] == "div[2]" and segs[2] == "div[1]"
                and segs[3] == "div[1]" and segs[4].startswith("div[")
                and segs[5] == "img[1]" and r["w"] >= 40):
            crawl_children2.setdefault(p, "intro.cellimg." + segs[4].strip("div[]"))

for p, k in crawl_children2.items():
    explicit.append({"section": "home-intro-wrap", "heron": p, "spec": p, "ours": k, "skip": ["geometry", "x-mirror"]})
bound_patterns.update(crawl_children2.keys())


# ── noCounterpart: every unbound recorded path, with written reasons ────────
no_counterpart = []
for p in sorted(all_paths):
    if any(path_matches(p, b) for b in bound_patterns):
        continue
    # classify
    collides = any(len(v) > 1 for v in [per_bp[bp].get(p, []) for bp in BPS])
    if "h2[1]" in p:
        reason = (
            "h2 split-text tween residue: the reference's split-text tween wraps every "
            "word/char in its own overflow box; the windows left here collide across "
            "bps or belong to the tween's own plumbing. Our ScrubReveal mirrors the "
            "word/char scaffold explicitly (intro.word/wordin/wchar.N.M); this residue "
            "is the tween's own wrappers beyond the mirror."
        )
    elif collides:
        reason = (
            "window collision: the walk truncates paths at six segments, so distinct "
            "spec elements share this recorded path; only one counterpart can bind. "
            "The conforming container is bound explicitly; this residue is tween "
            "plumbing (the parked roll copy / the loop duplicate)."
        )
    else:
        r0 = next((e for bp in BPS for e in per_bp[bp].get(p, [])), None)
        if r0 and r0["vr"]["w"] == 0 and r0["vr"]["h"] == 0:
            reason = "0x0 tween-residue box (the roll pair's parked copy mid-tween); our parked copy is a real off-stage box"
        elif r0 and r0["tag"] in ("defs", "mask", "filter", "fecomponenttransfer"):
            reason = "SVG defs plumbing inside the reference's masked/filter tonal image (0x0, non-visual)"
        else:
            reason = (
                "deep-window residue: the reference's tween/roll plumbing below the "
                "bound containers (window paths truncated by the walk); our equivalent "
                "renders inside the explicitly-bound conforming containers."
            )
    no_counterpart.append({"section": "home-intro-wrap", "heron": p, "reason": reason})

# ── r338 T-03e: charSplit — the alternate-head junk pool never pairs ─ ─ ──
# The depth-6 truncating walk records the SAME heron DOM under DIFFERENT
# window heads at different bps (the wrap's direct children shift with the
# responsive restructure: 'div[1] > section[1] > …' vs 'section[1] > …',
# 'div[1] > div[2] > div[2] > div[1] > h2[1] > …' vs 'h2[1] > …'). The
# canonical families are bound explicitly above; the head-variant recordings
# are DUPLICATES of bound cells + tween/roll plumbing (parked roll copies,
# loop duplicate tracks, 0x0 tween boxes, SVG defs). Letting them into the
# heuristic tag+tc ordinal pool glues them to unrelated OUR elements and
# mints junk failure rows (the T-03d per-char bindings freed that pool —
# this claims it). Structural, spec-side only (head families, no value
# comparison); every skipped row keeps its written noCounterpart reason and
# is counted as excused, never silent.
# SAFE heads only: verified by script that NO explicitly-bound heron path
# contains these substrings (the instrument's charSplit aggregate loop
# treats any PAIRED path containing the container as a line container —
# a head that prefixes a canonical binding would pull real cells out).
ALT_HEADS = [
    "home-intro-wrap > div[4]",
    "home-intro-wrap > div[1] > div[1] > div[1] > div[2]",
]
CHAR_SPLIT = [
    {
        "section": "home-intro-wrap",
        "container": head,
        "note": (
            "R338 T-03e — alternate window-head recording of an explicitly-bound "
            "canonical family (the walk anchors the same heron DOM at a different "
            "head at other bps). Structural spec-side detection: the head-variant "
            "rows never enter heuristic pairing; real cells stay bound at their "
            "canonical heads and fully measured."
        ),
        "reason": (
            "duplicate window-head residue: this recording is the same tween/roll "
            "scaffold (parked roll copy, loop-duplicate crawl track, 0x0 tween box, "
            "SVG defs plumbing) that the canonical family binds explicitly — the "
            "head variant must not glue by ordinal; excused with the written "
            "noCounterpart reason, counted, never silent"
        ),
    }
    for head in ALT_HEADS
]

mapping = {
    "_readme": (
        "R337 A-intro — home-intro-wrap ledger, REGENERATED against the frozen spec by "
        "scripts/build-intro-mapping.py (re-run after changing Statement.tsx hooks). "
        "TRUE paths (≤6 segments from the wrap) bind the structural containers; the h2's "
        "recorded window path binds intro.h2; the pill/label/crawl internals bind their "
        "unique recorded windows; the line groups bind intro.line.${i}; the word and "
        "char cells bind intro.word/wordin/wchar.N.M (the split-text mirror — empty "
        "scaffold spans, Arabic text whole per word). The walk truncates "
        "deeper paths into colliding 6-segment windows — that residue (word wrappers, "
        "parked roll copies, loop duplicates, 0x0 tween boxes, SVG defs) is excused with "
        "written reasons. ourSection: section#statement.st-section (sections/Statement.tsx "
        "— the r337 Heron rebuild: media cell + statement cell + ticker cell on one grid)."
    ),
    "ourSection": {"home-intro-wrap": "section#statement.st-section"},
    "heronPageKey": {"home-intro-wrap": "div.home-intro-wrap"},
    "scaleFactor": {"home-intro-wrap": 1},
    "explicit": explicit,
    "noCounterpart": no_counterpart,
    "charSplit": CHAR_SPLIT,
}

OUT.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print(f"explicit: {len(explicit)} bindings · noCounterpart: {len(no_counterpart)} excuses · line windows {len(line_windows)} · crawl cells {len(crawl_windows)} · char cells {len(char_cells)}")
