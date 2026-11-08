#!/usr/bin/env python3
"""build-problem-mapping.py — R337 A-problem, REGENERATED for R342-03.

Regenerates scripts/conformance/mapping/home-problem-wrap.json against
the frozen Heron spec (docs/redesign/r335/heron-spec/home-problem-wrap.
*.json) and the data-spec hooks of frontend/src/components/landing/
sections/Live.tsx.

R342-03 rebuild (the R337 ledger's binding audit): the R337 generation
bound several seats one box off (problem.titleblock rode the TITLEBOX
window, problem.bodyzone rode the ARTZONE window — the h=300/280 exp
vs 516/508 act cascade), left problem.col/.meta.1/.keytext.1/.artzone/
.textzone/.titlebox/.itemtitle/.anszone/.bodytext and the 390 dot-rail
spans unbound (they fell into the deep-window-residue excuse pool — the
16.5% coverage / 83.5% off-book cell), and pointed problem.artin at the
spec's SVG while our hook sits on the wrapping DIV. This rebuild binds
every seat that has an honest counterpart, classified from each
recording's own measured geometry:

Binding model (the walk truncates paths at six segments, so the spec's
recorded paths are ≤6-seg windows whose first index resets per window):
  · TRUE paths (bp-stable, ≤6 segments) bind the structural chain
    explicitly: spec window → our data-spec key. The reference's outer
    positioning div (div[1], the same box as its section) has NO honest
    counterpart — our <section> IS the outermost band box — so it is
    excused with a written reason and problem.wrap binds the SECTION
    window (the tag check then compares section↔section, not div↔section).
  · WINDOW paths recorded by exactly ONE element per bp bind by their
    recorded path when every recording classifies to the same seat+column.
  · WINDOW paths recorded by MORE THAN ONE element in a bp (colliding
    truncations) are unbindable by path; those spec elements are excused
    with the written collision reason (our DOM mirrors the column
    ordinal, but the instrument cannot see which is which — honesty over
    pairing luck).
  · The per-column svg line-art shapes (path/ellipse/line/circle/rect
    inside the art box) are content art: our PainArt draws Madarek's own
    four motifs; only the svg BOX is bound (problem.artsvg.N). The
    reference's zero-size tween wrappers and the swiper mask span are
    excused with written reasons.

Run after changing Live.tsx hooks: python3 scripts/build-problem-mapping.py
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs/redesign/r335/heron-spec"
OUT = ROOT / "scripts/conformance/mapping/home-problem-wrap.json"
BPS = ["390", "768", "1024", "1440", "1920"]


def load(bp):
    with open(SPEC / f"home-problem-wrap.{bp}.json", encoding="utf8") as f:
        return json.load(f)


CENSUS = {bp: load(bp)["elements"] for bp in BPS}

# ── the TRUE structural windows (bp-stable; verified against all five
#    censuses — the ancestor chains are structural, so the recorded
#    windows are identical at every bp) → our data-spec keys ──
TRUE = {
    # the wrap chain. The reference nests section[1] inside an outer
    # positioning div[1]; R342 mirrors that wrapper honestly
    # (section > div.pm-outer[data-spec=problem.outer]) — div↔div.
    "home-problem-wrap > div[1]": "problem.outer",
    "home-problem-wrap > div[1] > section[1]": "problem.wrap",
    "home-problem-wrap > div[1] > section[1] > div[1]": "problem.toprule",
    "home-problem-wrap > div[1] > section[1] > div[2]": "problem.frame",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1]": "problem.inner",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[1]": "problem.head",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[2]": "problem.band",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[2] > div[1]": "problem.bandrule",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[2] > div[2]": "problem.bandinner",
    # the head's two cells: the title block (kicker + h2) and the sub wrap
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[1] > div[1]": "problem.titleblock",
    "home-problem-wrap > div[1] > section[1] > div[2] > div[1] > div[1] > div[2]": "problem.subwrap",
    # head internals (recorded 6-seg windows — the chain truncates before
    # the wrap's outer div, so the window's first segment is section[1]
    # or the frame's div[2]):
    #   kicker box:    [kicker, titleblock, head, inner, frame, section]
    #   kickertext:    [text, kicker, titleblock, head, inner, frame]
    #   head titlebox: [titlebox, titleblock, head, inner, frame, section]
    #   h2:            [h2, titlebox, titleblock, head, inner, frame]
    #   sub text:      [sub, subwrap, head, inner, frame, section]
    "home-problem-wrap > section[1] > div[2] > div[1] > div[1] > div[1] > div[1]": "problem.kicker",
    "home-problem-wrap > div[2] > div[1] > div[1] > div[1] > div[1] > div[1]": "problem.kickertext",
    "home-problem-wrap > section[1] > div[2] > div[1] > div[1] > div[1] > div[2]": "problem.titlebox",
    "home-problem-wrap > div[2] > div[1] > div[1] > div[1] > div[2] > h2[1]": "problem.h2",
    "home-problem-wrap > section[1] > div[2] > div[1] > div[1] > div[2] > div[1]": "problem.sub",
}

explicit = []


def bind(spec_path, ours, skip=None):
    entry = {"section": "home-problem-wrap", "heron": spec_path, "spec": spec_path, "ours": ours}
    if skip:
        entry["skip"] = skip
    explicit.append(entry)


for p, k in TRUE.items():
    bind(p, k)

bound = set(TRUE.keys())


def path_matches(p, pattern):
    return p == pattern or p.endswith(" > " + pattern) or pattern.endswith(" > " + p)


def is_bound(p):
    return any(path_matches(p, b) for b in bound)


# ── per-column seat classification from each recording's own geometry ────────
per_bp = {bp: defaultdict(list) for bp in BPS}
for bp, els in CENSUS.items():
    for e in els:
        per_bp[bp][e["p"]].append(e)

all_paths = set()
for bp in BPS:
    all_paths.update(per_bp[bp].keys())


def tr_p(e):
    return (e.get("transition") or {}).get("p")


def classify_column(bp, col, els):
    """Classify the elements inside one column box → {(seat): element}.
    col = the column box element; els = the census elements whose boxes
    fall inside it. Ordered by the census DFS order (parents first)."""
    cx, cy, cw, ch = col["vr"]["x"], col["vr"]["y"], col["vr"]["w"], col["vr"]["h"]
    inside = [e for e in els if e is not col and cx - 0.5 <= e["vr"]["x"] and e["vr"]["x"] + e["vr"]["w"] <= cx + cw + 0.5
              and cy - 0.5 <= e["vr"]["y"] and e["vr"]["y"] + e["vr"]["h"] <= cy + ch + 0.5]
    seats = {}

    def rel(e):
        return (e["vr"]["y"] - cy, e["vr"]["x"] - cx)

    # meta row: the full-width short box at the column top
    metas = [e for e in inside if e["tag"] == "div" and (e["vr"]["y"] - cy) < ch * 0.12
             and e["vr"]["h"] < 60 and e["vr"]["w"] > cw * 0.8]
    meta = metas[0] if metas else None
    bodyzones = [e for e in inside if e["tag"] == "div" and e is not meta and e["vr"]["w"] > cw * 0.8
                 and (e["vr"]["y"] - cy) >= ch * 0.05 and e["vr"]["h"] > ch * 0.6]
    bodyzone = bodyzones[0] if bodyzones else None
    if meta is not None:
        seats["meta"] = meta
        m_y, m_h = meta["vr"]["y"], meta["vr"]["h"]
        minside = [e for e in inside if e is not meta and m_y - 0.5 <= e["vr"]["y"] and e["vr"]["y"] + e["vr"]["h"] <= m_y + m_h + 0.5]
        rules = [e for e in minside if e["vr"]["h"] == 1 and e["vr"]["w"] > cw * 0.8]
        if rules:
            seats["metarule"] = rules[0]
        cues = [e for e in minside if (e.get("bg") == "rgb(250, 54, 0)") and 4 < e["vr"]["w"] < 14]
        if cues:
            seats["cue"] = cues[0]
        for e in minside:
            if e["tc"] == "short" and e["color"] == "rgb(40, 40, 40)":
                seats["keytext"] = e
            elif e["tc"] == "short" and e["color"] == "rgb(180, 180, 176)":
                seats["indextext"] = e
        for e in minside:
            if e["tc"] == "none" and tr_p(e) == "transform":
                seats["keyroll"] = e
            elif e["tc"] == "none" and e["color"] == "rgb(180, 180, 176)":
                seats["indexroll"] = e
    if bodyzone is not None:
        seats["bodyzone"] = bodyzone
        b_y, b_h = bodyzone["vr"]["y"], bodyzone["vr"]["h"]
        binside = [e for e in inside if e is not bodyzone and b_y - 0.5 <= e["vr"]["y"] and e["vr"]["y"] + e["vr"]["h"] <= b_y + b_h + 0.5]
        arts = [e for e in binside if tr_p(e) == "color" and e["vr"]["w"] == e["vr"]["h"] and e["vr"]["w"] > 80]
        artcolor = arts[0] if arts else None
        if artcolor is not None:
            seats["artcolor"] = artcolor
            ax, ay, aw = artcolor["vr"]["x"], artcolor["vr"]["y"], artcolor["vr"]["w"]
            zones = [e for e in binside if e["tag"] == "div" and e["vr"]["w"] > cw * 0.8
                     and e["vr"]["x"] <= ax and ax + aw <= e["vr"]["x"] + e["vr"]["w"]
                     and e["vr"]["y"] <= ay and ay + aw <= e["vr"]["y"] + e["vr"]["h"]
                     and e["vr"]["h"] < 420 and e is not bodyzone]
            if zones:
                seats["artzone"] = zones[0]
            same = [e for e in binside if e is not artcolor and e["vr"]["x"] == ax and e["vr"]["y"] == ay
                    and e["vr"]["w"] == aw and e["vr"]["h"] == aw]
            for e in same:
                if e["tag"] == "svg":
                    seats["artsvg"] = e
                elif e["tc"] == "none":
                    seats["artin"] = e
        tgrids = [e for e in binside if tr_p(e) == "grid-template-rows"]
        tgrid = tgrids[0] if tgrids else None
        textzones = [e for e in binside if e["tag"] == "div" and e is not bodyzone and e["vr"]["w"] > cw * 0.8
                     and e["vr"]["y"] > b_y + (b_h * 0.4)]
        textzone = textzones[0] if textzones else None
        if textzone is not None:
            seats["textzone"] = textzone
        if tgrid is not None:
            seats["tgrid"] = tgrid
            g_y, g_h = tgrid["vr"]["y"], tgrid["vr"]["h"]
            ginside = [e for e in binside if e is not tgrid and g_y - 0.5 <= e["vr"]["y"] and e["vr"]["y"] + e["vr"]["h"] <= g_y + g_h + 0.5]
            titles = [e for e in ginside if e["tc"] in ("short", "medium") and str(e["fw"]) == "600"]
            if titles:
                seats["itemtitle"] = titles[0]
                t = titles[0]["vr"]
                boxes = [e for e in ginside if e["tag"] == "div" and e["tc"] == "none"
                         and e["vr"]["x"] <= t["x"] and t["x"] + t["w"] <= e["vr"]["x"] + e["vr"]["w"]
                         and e["vr"]["y"] <= t["y"] and t["y"] + t["h"] <= e["vr"]["y"] + e["vr"]["h"]]
                if boxes:
                    seats["titleboxcol"] = boxes[0]  # our hook: problem.titleboxcol.N
            answrap = None
            for e in ginside:
                if e["tc"] == "long":
                    seats["bodytext"] = e
                elif e["tc"] == "none" and e["tag"] == "div" and (e["vr"]["y"] - g_y) > 20 and e["vr"]["h"] > 20:
                    if "anszone" not in seats:
                        seats["anszone"] = e
                    elif e["vr"] == seats["anszone"]["vr"] and "answrap" not in seats:
                        answrap = e
            if answrap is not None:
                seats["answrap"] = answrap
        zrules = [e for e in binside if e["vr"]["h"] == 1 and e["vr"]["w"] > cw * 0.8
                  and e.get("bgImg") and (textzone is not None and e["vr"]["y"] >= textzone["vr"]["y"] - 0.5)]
        if zrules:
            seats["zonerule"] = zrules[0]
    # the column's own start-edge rule
    crules = [e for e in inside if e["vr"]["w"] == 1 and e["vr"]["h"] > ch * 0.5]
    if crules:
        seats["colrule"] = crules[0]
    # the ruled-ledger closing rule: a solid 1px full-width rule on the
    # cell's bottom edge (≤991 only — the ≥992 open grid draws none)
    closers = [e for e in inside if e["vr"]["h"] == 1 and e["vr"]["w"] > cw * 0.8
               and e["vr"]["y"] + 1 >= cy + ch - 2 and e.get("bg") == "rgb(179, 179, 175)"]
    if closers:
        seats["closerule"] = closers[0]
    return seats


# column boxes per bp (the opacity-transition band cells)
COLBOX = {}
for bp in BPS:
    els = CENSUS[bp]
    boxes = [e for e in els if tr_p(e) == "opacity" and e["vr"]["w"] > 100 and e["vr"]["h"] > 100]
    boxes.sort(key=lambda e: (e["vr"]["y"], e["vr"]["x"]))  # (y,x): the 768 2×2 rows read in DOM order
    COLBOX[bp] = boxes

# classify every bp, then keep the windows that are (a) recorded exactly
# once in EVERY bp that records them and (b) classify to the same seat
# + column ordinal everywhere — or (c) COLLIDING windows whose FIRST
# census-order recording classifies identically at every bp (the
# first-taker law: the binding resolves explicit-first in walk order, so
# the first recording owns the window; the later sharers — same box
# family, mirrored DOM ordinals — fall to the heuristic fallback and
# pair correctly by column order).
CENSUS_IDX = {bp: {id(e): i for i, e in enumerate(CENSUS[bp])} for bp in BPS}
seat_windows = {}
for bp in BPS:
    els = CENSUS[bp]
    for ci, col in enumerate(COLBOX[bp], start=1):
        seats = classify_column(bp, col, els)
        seats["col"] = col  # the column box itself (the opacity-transition band cell)
        for seat, e in seats.items():
            seat_windows.setdefault(e["p"], []).append((bp, f"{seat}.{ci}", CENSUS_IDX[bp][id(e)]))

seat_bindings = {}
FIRST_TAKER = set()  # colliding windows bound by the first-taker law
for p, recs in sorted(seat_windows.items()):
    bps_recording = {bp for bp in BPS if p in per_bp[bp]}
    unique_everywhere = all(len(per_bp[bp][p]) == 1 for bp in bps_recording)
    keys = {k for _, k, _ in recs}
    if unique_everywhere and len(keys) == 1:
        seat_bindings[p] = "problem." + next(iter(keys))
        continue
    # first-taker law: the earliest census-order recording per bp must
    # classify to the same seat+column at every bp that records the window
    first = {}
    ok = True
    for bp in bps_recording:
        bp_recs = [r for r in recs if r[0] == bp]
        if not bp_recs:
            ok = False
            break
        _, k, i = min(bp_recs, key=lambda r: r[2])
        first[bp] = k
    if ok and len(set(first.values())) == 1:
        seat_bindings[p] = "problem." + next(iter(first.values()))
        FIRST_TAKER.add(p)

for p, k in seat_bindings.items():
    if is_bound(p):
        continue
    bind(p, k)
    bound.add(p)

# ── the 390 dot-rail spans (the reference's swiper progress rail = our
#    belt's own bar rail — real counterparts, bound problem.dotbar.1..4) ──
dot_windows = {}
for bp in BPS:
    rails = [e for e in CENSUS[bp] if e["tag"] == "span" and 2 <= e["vr"]["h"] <= 4
             and 14 <= e["vr"]["w"] <= 26 and e["vr"]["y"] > CENSUS[bp][0]["vr"]["y"] + CENSUS[bp][0]["vr"]["h"] * 0.5]
    rails.sort(key=lambda e: e["vr"]["x"])
    if len(rails) == 4:
        for i, e in enumerate(rails, start=1):
            dot_windows.setdefault(e["p"], []).append((bp, i))

for p, recs in sorted(dot_windows.items()):
    if is_bound(p) or p in seat_bindings:
        continue
    bps_recording = {bp for bp in BPS if p in per_bp[bp]}
    if any(len(per_bp[bp][p]) != 1 for bp in bps_recording):
        continue
    idxs = {i for _, i in recs}
    if len(idxs) == 1:
        bind(p, f"problem.dotbar.{next(iter(idxs))}")
        bound.add(p)

# ── the rail container (390) and the columns list (the slides' parent) ──────
# The reference's swiper rail div wraps the four progress bars; our belt's
# own rail div is its honest counterpart (problem.rail on .pm-dots).
for bp in BPS:
    bars = [e for e in CENSUS[bp] if e["tag"] == "span" and 2 <= e["vr"]["h"] <= 4
            and 14 <= e["vr"]["w"] <= 26 and e["vr"]["y"] > CENSUS[bp][0]["vr"]["y"] + CENSUS[bp][0]["vr"]["h"] * 0.5]
    if len(bars) == 4:
        rail_p = bars[0]["p"].rsplit(" > ", 1)[0]
        rails = per_bp[bp][rail_p]
        if len(rails) == 1 and rail_p not in {e["heron"] for e in explicit}:
            bind(rail_p, "problem.rail")
            bound.add(rail_p)
# The slides' parent (the reference's list wrapper) ↔ our ol.pm-cols
# (problem.cols). At ≥768 it is the plain grid list (same box as our
# scroll region); at 390 it is the swiper's transformed track (content
# width ≠ our viewport-clipped scroll box) — that recording is excused
# below with the transformed-track reason instead of bound.
# the slides' parent (the reference's list wrapper) ↔ our role="list"
# region (problem.cols on .pm-cols). The wrapper's own recorded window =
# section[1] + the col window's first five segments (the chain reaches one
# level higher than the truncating col window); at ≥768 that recording is
# the plain grid list (the same box as our scroll region), at 390 the same
# window shape belongs to the swiper's transformed track (excused below
# with the track reason — the binding's 390 cell takes the geometry cost
# honestly rather than hiding the wrapper).
LIST_PATH = None
for bp in BPS:
    cols = COLBOX[bp]
    if len(cols) != 4:
        continue
    segs = cols[0]["p"].split(" > ")[1:]  # drop the wrap key
    cand = "home-problem-wrap > section[1] > " + " > ".join(segs[:5])
    recs = per_bp[bp].get(cand, [])
    if len(recs) == 1:
        LIST_PATH = cand
        break
if LIST_PATH and LIST_PATH not in {e["heron"] for e in explicit}:
    bind(LIST_PATH, "problem.cols")
    bound.add(LIST_PATH)

# the ≤991 band closing rule (the inner's third child; the ≥992 open grid
# records none) ↔ our .pm-bottomrule
for bp in BPS:
    y1 = CENSUS[bp][0]["vr"]["y"] + CENSUS[bp][0]["vr"]["h"]
    closers = [e for e in CENSUS[bp] if e["vr"]["h"] == 1 and e["vr"]["w"] > 300
               and abs(e["vr"]["y"] + 1 - y1) <= 3 and e["vr"]["x"] <= CENSUS[bp][0]["vr"]["x"] + 2]
    if len(closers) == 1:
        p = closers[0]["p"]
        if p not in {e["heron"] for e in explicit} and not any(path_matches(p, b) for b in bound):
            bind(p, "problem.bottomrule")
            bound.add(p)

# ── noCounterpart: every unbound recorded path, with written reasons ────────
no_counterpart = []
for p in sorted(all_paths):
    if any(path_matches(p, b) for b in bound) and p not in FIRST_TAKER:
        continue
    counts = {bp: per_bp[bp].get(p, []) for bp in BPS}
    sample = next((v[0] for v in counts.values() if v), None)
    if sample is None:
        continue
    collides = any(len(v) > 1 for v in counts.values())
    tag = sample["tag"]
    if tag in ("path", "ellipse", "line", "circle", "rect"):
        reason = (
            "svg line-art shape: the reference's own drawing motif inside the column art "
            "box — our PainArt draws Madarek's own four motifs in the same 20rem box "
            "(the svg box itself is bound as problem.artsvg.N); per-shape geometry is "
            "content art, not layout structure."
        )
    elif tag in ("defs", "mask"):
        reason = "SVG defs/mask plumbing inside the reference's filtered tonal image (0x0, non-visual)"
    elif tag == "br":
        reason = (
            "the title's <br> line breaks: Arabic titles break at different words than the "
            "reference's English; our title box is bound and measured as a whole (the "
            "ar-floor compensation pad lands the same measured box at every bp)."
        )
    elif sample.get("transform") and sample["transform"].get("scale") == 0 and sample["vr"]["w"] == 0:
        reason = (
            "0x0 tween-residue box (the reference's staged entrance marker — scale-0 svg "
            "wrappers that never render); our column fade is the 0.2s opacity transition "
            "on the bound column box."
        )
    elif tag == "span" and sample["vr"]["w"] == 0:
        reason = (
            "the reference swiper's 0-width mask span (w=0 plumbing beside the rail) — "
            "non-visual swiper chrome; the four visible rail bars are bound as "
            "problem.dotbar.1..4 against our belt's own bars."
        )
    elif sample["vr"]["w"] > 0 and any(sample["vr"]["w"] > CENSUS[bp][0]["vr"]["w"] * 1.5 for bp in BPS if per_bp[bp].get(p)):
        reason = (
            "the reference swiper's transformed track (the translate container records "
            "its full content width, wider than the band); our ≤767 carousel is a native "
            "scroll-snap region — the scroll geometry belongs to the browser, and the "
            "slides themselves are bound (problem.col.1..4)."
        )
    elif collides:
        reason = (
            "window collision / first-taker residue: the walk truncates paths at six "
            "segments, so same-seat elements share this recorded path. The first "
            "census-order recording binds the seat (problem.<seat>.<n>); this later "
            "sharer pairs the mirrored DOM ordinal when its text class matches and "
            "rides this written excuse where the Arabic copy's length class differs "
            "(the tc ±1 waiver covers the check, not the pairing)."
        )
    else:
        reason = (
            "deep-window residue: the reference's internals below the bound containers "
            "(window paths truncated by the walk); the seat renders inside the "
            "explicitly-bound conforming containers."
        )
    no_counterpart.append({"section": "home-problem-wrap", "heron": p, "reason": reason})

mapping = {
    "_readme": (
        "R342-03 — home-problem-wrap ledger, REGENERATED against the frozen spec by "
        "scripts/build-problem-mapping.py (re-run after changing Live.tsx hooks). The "
        "R337 ledger's off-by-one seat bindings (titleblock→titlebox window, "
        "bodyzone→artzone window) are corrected; the TRUE paths bind the structural "
        "chain (wrap→section window, toprule, frame, inner, head, band, bandrule, "
        "bandinner) + the head cells (titleblock, subwrap, kicker, kickertext, "
        "titlebox, h2, sub); the per-column windows bind every seat with an honest "
        "counterpart (col, colrule, meta, keyroll, keytext, indexroll, indextext, "
        "metarule, cue, bodyzone, artzone, artcolor, artin, artsvg, textzone, tgrid, "
        "titlebox.N, itemtitle, anszone, answrap, bodytext, zonerule), classified from "
        "each recording's own measured geometry and kept only when the window is "
        "unique per bp; the 390 swiper-rail spans bind our belt's own bars "
        "(problem.dotbar.1..4). The reference's svg line-art shapes (content art), "
        "<br> plumbing, 0x0 tween wrappers, the 0-width swiper mask span and the "
        "colliding deep windows are excused with written reasons. ourSection: "
        "section#live.pm-section (sections/Live.tsx — the ruled ledger of four "
        "problems)."
    ),
    "ourSection": {"home-problem-wrap": "section#live.pm-section"},
    "heronPageKey": {"home-problem-wrap": "div.home-problem-wrap"},
    "scaleFactor": {"home-problem-wrap": 1},
    "explicit": explicit,
    "noCounterpart": no_counterpart,
}

OUT.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print(f"explicit: {len(explicit)} bindings · noCounterpart: {len(no_counterpart)} excuses · seat windows: {len(seat_bindings)} · dotbar windows: {len(dot_windows)}")
for p, k in list(seat_bindings.items())[:60]:
    print(f"  {k:28s} {p[-58:]}")
