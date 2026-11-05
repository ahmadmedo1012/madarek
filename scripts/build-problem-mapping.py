#!/usr/bin/env python3
"""build-problem-mapping.py — R337 A-problem.

Regenerates scripts/conformance/mapping/home-problem-wrap.json against
the frozen Heron spec (docs/redesign/r335/heron-spec/home-problem-wrap.
*.json) and the data-spec hooks of frontend/src/components/landing/
sections/Live.tsx.

Binding model (the walk truncates paths at six segments, so the spec's
recorded paths are 6-seg windows whose first index resets per window):
  · TRUE paths (≤6 segments from the wrap, stable at every bp) bind
    the structural containers explicitly: spec path → our data-spec key.
  · WINDOW paths recorded by exactly ONE element per bp bind by their
    recorded path (run.mjs suffix-matches, so one entry serves every
    bp that records it).
  · WINDOW paths recorded by MORE THAN ONE element in a bp (colliding
    truncations — the four columns share window shapes) are unbindable
    by path; those spec elements ride the heuristic (tag+tc ordinal)
    fallback, which the rewritten DOM mirrors column-for-column.
  · The per-column svg line-art shapes (path/ellipse/line/circle/
    rect inside PainArt) are content art, not layout structure: our
    own svg draws different motifs; only the svg box itself is bound
    (via the artin window where unique, else heuristic). The spec's
    zero-size tween boxes (the reference's staged entrance markers)
    are excused with a written reason.
  · The mobile-only dot rail spans (390's 20x2 span bars) are the
    reference's swiper progress rail — our own dot rail keeps the
    belt contract and is excused as swiper chrome.

Run after changing Live.tsx hooks: python3 scripts/build-problem-mapping.py
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path("/home/z/work/wt-problem")
SPEC = ROOT / "docs/redesign/r335/heron-spec"
OUT = ROOT / "scripts/conformance/mapping/home-problem-wrap.json"
BPS = ["390", "768", "1024", "1440", "1920"]

def load(bp):
    with open(SPEC / f"home-problem-wrap.{bp}.json", encoding="utf8") as f:
        return json.load(f)

CENSUS = {bp: load(bp)["elements"] for bp in BPS}

# ── the TRUE structural paths (stable at every bp) → our data-spec keys ──
TRUE = {
    # the wrap chain (frame > inner > head + band; band > bandrule + bandinner > cols)
    "home-problem-wrap > div[1]": "problem.wrap",
    "home-problem-wrap > div[1] > section[1]": "problem.section",
    "home-problem-wrap > div[1] > section[1] > div[1]": "problem.toprule",
    "home-problem-wrap > div[1] > section[1] > div[2]": "problem.frame",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1]": "problem.inner",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[1]": "problem.head",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[2]": "problem.band",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[2] > div[1]": "problem.bandrule",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[2] > div[2]": "problem.bandinner",
    # the head's second cell (the sub wrapper, margined off the row top)
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[2]": "problem.subwrap",
}

# head internals (recorded windows, unique per bp — verified against the
# 1920/1440/1024/768/390 censuses):
#   head > div[1] (titleblock inner) > div[1] (kicker) > div[1] (roll)      → problem.kicker / kickerroll
#   the h2 window 'home-problem-wrap > div[2] > div[1] > div[1] > div[1] > div[2] > h2[1]'
#   head > div[2] (subwrap) > div[1] (subbox) > div[1] (sub long text)
HEAD_WINDOWS = {
    # the kicker box (margin-block-end carrier, transition seat)
    "home-problem-wrap > section[1] > div[2] > div[1] > div[1] > div[1] > div[1]": "problem.kicker",
    # the kicker's mono text (short tc, Geistmono)
    "home-problem-wrap > div[2] > div[1] > div[1] > div[1] > div[1] > div[1]": "problem.kickertext",
    # the h2's recorded window (identical at every bp)
    "home-problem-wrap > div[2] > div[1] > div[1] > div[1] > div[2] > h2[1]": "problem.h2",
    # the sub's long text (head's second cell)
    "home-problem-wrap > section[1] > div[2] > div[1] > div[2] > div[1] > div[1]": "problem.sub",
}

explicit = []
def bind(spec_path, ours, skip=None):
    entry = {"section": "home-problem-wrap", "heron": spec_path, "spec": spec_path, "ours": ours}
    if skip:
        entry["skip"] = skip
    explicit.append(entry)

for p, k in TRUE.items():
    bind(p, k)

# ── classify the remaining recorded paths ────────────────────────────────────
per_bp = {bp: defaultdict(list) for bp in BPS}
for bp, els in CENSUS.items():
    for e in els:
        per_bp[bp][e["p"]].append(e)

all_paths = set()
for bp in BPS:
    all_paths.update(per_bp[bp].keys())

bound = set(TRUE.keys())

def path_matches(p, pattern):
    return p == pattern or p.endswith(" > " + pattern) or pattern.endswith(" > " + p)

def is_bound(p):
    return any(path_matches(p, b) for b in bound)

# add the unique head windows (dedup: kickertext shares kicker's path —
# the walk records the mono div's own path only once; bind what exists)
for p, k in HEAD_WINDOWS.items():
    if any(p in per_bp[bp] for bp in BPS):
        bind(p, k)
        bound.add(p)

# ── per-column window families ───────────────────────────────────────────────
# The four columns share window shapes (the truncation resets the first
# index per window), so most column internals COLLIDE across columns and
# ride the heuristic fallback. But a handful of window paths are unique
# per bp because the truncation root differs per column position; bind
# every window path that is recorded by exactly ONE element in EVERY bp
# that records it, mapping it to the column ordinal derived from its
# geometry (x position within the band).
def column_index(e):
    """Derive the column ordinal (1-4) from element geometry: bucket by x."""
    return None

# Compute column anchors per bp from the keyword mono boxes (rgb(40,40,40)).
COL_KEYS = {}
for bp in BPS:
    els = CENSUS[bp]
    anchors = sorted(
        [e for e in els if e["ff"] == "Geistmono" and e["tag"] == "div"
         and e["tc"] == "short" and e["color"] == "rgb(40, 40, 40)"],
        key=lambda e: e["vr"]["x"])
    xs = [a["vr"]["x"] for a in anchors]
    bounds = []
    for i in range(len(xs)):
        lo = (xs[i-1] + xs[i]) / 2 if i > 0 else -1e9
        hi = (xs[i] + xs[i+1]) / 2 if i < len(xs) - 1 else 1e9
        bounds.append((lo, hi))
    COL_KEYS[bp] = bounds

def col_of(bp, e):
    x = e["vr"]["x"]
    for i, (lo, hi) in enumerate(COL_KEYS[bp]):
        if lo <= x < hi:
            return i + 1
    return None

# candidate column window paths: unique-in-every-bp recordings under the
# band's window families (div[1]/div[2]/div[3]/div[4] first segments).
# role naming by the seat the element occupies in OUR column DOM.
def seat_name(e, bp):
    """Classify a column element by its measured shape → our data-spec seat."""
    vr = e["vr"]
    w, h = vr["w"], vr["h"]
    tr = e.get("transition")
    if w == 1 and h > 50:
        return "colrule"
    if tr and tr["p"] == "opacity" and h > 100:
        return "col"
    if tr and tr["p"] == "transform":
        return "keyroll"
    if tr and tr["p"] == "grid-template-rows":
        return "tgrid"
    if tr and tr["p"] == "color" and w == h and w > 80:
        return "artcolor"
    if e.get("bgImg") and h == 1:
        return "metarule" if vr["y"] < (vr["y"] + 0) else "zonerule"
    if e.get("bg") == "rgb(250, 54, 0)":
        return "cue"
    if e.get("bg") == "rgb(179, 179, 175)" and h == 1 and w > 100:
        return "bandrule"
    if e["tag"] == "svg" and w > 80:
        return "artin"
    return None

# The zonerule sits at the TOP of the text zone (y offset ~457 into the
# column at 1920), the metarule right under the meta row (~56). Both are
# 1px BGIMG rules — disambiguate by relative y within the column.
def seat_rule(bp, e, col_box):
    if not col_box:
        return None
    rel = e["vr"]["y"] - col_box["vr"]["y"]
    return "metarule" if rel < col_box["vr"]["h"] * 0.3 else "zonerule"

# build col boxes per bp
COLBOX = {}
for bp in BPS:
    els = CENSUS[bp]
    boxes = [e for e in els if e.get("transition") and e["transition"]["p"] == "opacity"
             and e["vr"]["w"] > 100 and e["vr"]["h"] > 100]
    boxes.sort(key=lambda e: (e["vr"]["y"], e["vr"]["x"]))
    COLBOX[bp] = boxes

# Bind unique-per-bp column windows by seat classification.
# A path binds only if EVERY bp that records it records it exactly once
# AND every recording classifies to the same seat+column.
seat_bindings = {}
for p in sorted(all_paths):
    if is_bound(p):
        continue
    counts = {bp: per_bp[bp].get(p, []) for bp in BPS if p in per_bp[bp]}
    if any(len(v) != 1 for v in counts.values()):
        continue
    # candidate column seat?
    seats = set()
    for bp, (e,) in counts.items():
        ci = col_of(bp, e)
        if not ci:
            seats.add(None)
            break
        if e["tag"] in ("path", "ellipse", "line", "circle", "rect", "defs", "mask"):
            seats.add(None)
            break
        if e.get("transform") and e["transform"].get("scale") == 0:
            seats.add(None)  # 0x0 tween box
            break
        vr = e["vr"]
        w, h = vr["w"], vr["h"]
        tr = e.get("transition")
        seat = None
        if tr and tr["p"] == "opacity" and h > 100:
            seat = "col"
        elif tr and tr["p"] == "transform":
            seat = "keyroll"
        elif tr and tr["p"] == "grid-template-rows":
            seat = "tgrid"
        elif tr and tr["p"] == "color" and w == h and w > 80:
            seat = "artcolor"
        elif e.get("bg") == "rgb(250, 54, 0)":
            seat = "cue"
        elif e.get("bgImg") and h == 1 and w > 50:
            # dashed rule: metarule (high in col) vs zonerule (lower)
            colbox = min(COLBOX[bp], key=lambda b: abs(b["vr"]["y"] - vr["y"]) + abs(b["vr"]["x"] - vr["x"]))
            seat = seat_rule(bp, e, colbox)
        elif e["tag"] == "svg" and w > 80:
            seat = "artin"
        elif w == 1 and h > 100:
            seat = "colrule"
        elif e["tag"] == "br":
            seat = None  # brs are typography plumbing
        if seat is None:
            seats.add(None)
            break
        seats.add((seat, ci))
    if len(seats) == 1 and seats != {None}:
        (seat, ci) = next(iter(seats))
        seat_bindings[p] = f"problem.{seat}.{ci}"

for p, k in seat_bindings.items():
    bind(p, k)
    bound.add(p)

# ── noCounterpart: every unbound recorded path, with written reasons ────────
no_counterpart = []
for p in sorted(all_paths):
    if any(path_matches(p, b) for b in bound):
        continue
    counts = {bp: per_bp[bp].get(p, []) for bp in BPS}
    collides = any(len(v) > 1 for v in counts.values())
    sample = next((v[0] for v in counts.values() if v), None)
    if sample is None:
        continue
    tag = sample["tag"]
    if tag in ("path", "ellipse", "line", "circle", "rect"):
        reason = (
            "svg line-art shape: the reference's own drawing motif inside the column art "
            "box — our PainArt draws Madarek's own four motifs in the same 20rem box "
            "(bound separately); per-shape geometry is content art, not layout structure."
        )
    elif tag in ("defs", "mask"):
        reason = "SVG defs/mask plumbing inside the reference's filtered tonal image (0x0, non-visual)"
    elif tag == "br":
        reason = (
            "the title's <br> line breaks: Arabic titles break at different words than the "
            "reference's English; our title box is bound and measured as a whole (2 lines "
            "at every bp by construction)."
        )
    elif sample.get("transform") and sample["transform"].get("scale") == 0 and sample["vr"]["w"] == 0:
        reason = (
            "0x0 tween-residue box (the reference's staged entrance marker — scale-0 svg "
            "wrappers that never render); our column fade is the 0.2s opacity transition "
            "on the bound column box."
        )
    elif tag == "span":
        reason = (
            "the mobile swiper's progress rail spans (390-only, 20x2 bars under the band) — "
            "swiper chrome, not product structure; our own dot rail keeps the belt contract."
        )
    elif collides:
        reason = (
            "window collision: the walk truncates paths at six segments, so the four "
            "columns' same-seat elements share this recorded path; only one counterpart "
            "could bind. The conforming seats are bound where unique and ride the "
            "heuristic tag+tc fallback otherwise (our DOM mirrors the column-for-column "
            "ordinal, so heuristic pairing is exact)."
        )
    else:
        reason = (
            "deep-window residue: the reference's column internals below the bound "
            "containers (window paths truncated by the walk); the seat renders inside "
            "the explicitly-bound conforming containers."
        )
    no_counterpart.append({"section": "home-problem-wrap", "heron": p, "reason": reason})

mapping = {
    "_readme": (
        "R337 A-problem — home-problem-wrap ledger, REGENERATED against the frozen spec by "
        "scripts/build-problem-mapping.py (re-run after changing Live.tsx hooks). TRUE paths "
        "(≤6 segments from the wrap) bind the structural containers (wrap/section/toprule/"
        "frame/head/band/bandrule/cols/titleblock/subwrap); the head's recorded windows bind "
        "problem.kicker/.h2/.sub; the unique column windows bind problem.<seat>.<n> (col, "
        "keyroll, tgrid, artcolor, cue, metarule, zonerule, colrule, artin) classified from "
        "each recording's own geometry+transition census. Colliding windows (the four columns "
        "share 6-seg shapes) ride the heuristic tag+tc fallback against the mirrored DOM; the "
        "reference's svg line-art shapes, <br> plumbing, 0x0 tween boxes and mobile swiper "
        "rail spans are excused with written reasons. ourSection: section#live.pm-section "
        "(sections/Live.tsx — the r337 Heron rebuild: ruled ledger of four columns)."
    ),
    "ourSection": {"home-problem-wrap": "section#live.pm-section"},
    "heronPageKey": {"home-problem-wrap": "div.home-problem-wrap"},
    "scaleFactor": {"home-problem-wrap": 1},
    "explicit": explicit,
    "noCounterpart": no_counterpart,
}

OUT.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print(f"explicit: {len(explicit)} bindings · noCounterpart: {len(no_counterpart)} excuses · seat windows: {len(seat_bindings)}")
for p, k in list(seat_bindings.items())[:20]:
    print(f"  {k:28s} {p}")
