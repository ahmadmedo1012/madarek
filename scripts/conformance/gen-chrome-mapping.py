#!/usr/bin/env python3
"""T-10 (r339) — generate scripts/conformance/mapping/chrome.json from the
frozen chrome.<bp>.json specs (docs/redesign/r335/heron-spec/).

Grammar = mapping/footer.json: ourSection / heronPageKey / scaleFactor /
explicit[] / noCounterpart[] / plumbing[]. Replaces r335's mapping/_chrome.json
(its ourSection + heronPageKey keys are folded in verbatim).

Binding law:
  · the BAR seats (header/inner/bar-row/rule/logo cluster/menu zone/items/CTA)
    are bound explicitly — data-spec hooks where SheetNav stamps them
    (nav.bar, nav.rule, nav.zone.*, nav.brand*, nav.link.N, nav.cta*,
    nav.menu.*), CSS selectors for the unhooked wrappers (.fo-header-inner,
    .fo-header-bar, the roll labels).
  · every OTHER recorded spec path carries a written noCounterpart reason
    (deduped across bps; suffix-matching makes one entry cover the depth-6
    truncation collisions — the footer file's own pattern), so nothing lands
    in heuristic tag+tc glue and every excusal is reported, never silent.
  · plumbing[] skips the geometry group on the flex-REMAINDER zones (logo
    zone / menu wrap: their width is whatever the seat register leaves —
    our 5 Arabic cells vs her 4) and the cluster-vs-cell pairs, with the
    written reason; type/color stay asserted.

IP RULE: the generator reads measured parameters (vr geometry, tag, tc class,
color strings) from the frozen specs only — no Heron text, images or fonts.
"""
import json
import os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.join(HERE, "..", "..", "docs", "redesign", "r335", "heron-spec")
OUT = os.path.join(HERE, "mapping", "chrome.json")
BPS = ["1920", "1440", "1024", "768", "390"]

explicit = []      # {section, heron, spec?, ours, skip?, bps?, note?}
noCounterpart = [] # {section, heron, reason, bps?}
plumbing = []      # {section, heron, skip, reason}

def add_nc(paths, reason):
    for p in paths:
        noCounterpart.append({"section": "chrome", "heron": p, "reason": reason})

for bp in BPS:
    d = json.load(open(os.path.join(SPEC, f"chrome.{bp}.json")))
    els = d["elements"]
    hdr = d["headerSeat"]["rect"]
    hx, hy, hw, barH = hdr["left"], hdr["top"], hdr["width"], hdr["height"]
    byp = lambda e: abs(e["vr"]["h"] - barH) <= 3 and abs(e["vr"]["y"] - hy) <= 3

    bound = set()  # her paths explicitly bound at THIS bp

    def bind(her, ours, spec=None, skip=None, note=None):
        rec = {"section": "chrome", "heron": her, "bps": [bp], "note": note}
        if spec: rec["spec"] = spec
        rec["ours"] = ours
        if skip: rec["skip"] = skip
        explicit.append(rec)
        bound.add(her)

    # ── the fixed top-of-tree seats (paths are full — depth ≤ 6) ──────────
    bind("chrome > header[1]", "nav.bar", spec="chrome > header[1]",
         note="the fixed masthead seat")
    bind("chrome > header[1] > div[1]", ".fo-header-inner",
         note="the transform seat (on-hide -101% lift)")
    bind("chrome > header[1] > div[1] > div[1]", "nav.rule", spec="chrome > header[1] > div[1] > div[1]",
         note="the measured 1px bottom rule (her real div, not a border)")
    bind("chrome > header[1] > div[1] > div[2]", ".fo-header-bar",
         note="the bar row container")
    bind("chrome > header[1] > div[1] > div[2] > div[1]", "nav.zone.brand", spec="chrome > header[1] > div[1] > div[2] > div[1]",
         note="the flex-grow logo zone")
    plumbing.append({"section": "chrome", "heron": "chrome > header[1] > div[1] > div[2] > div[1]",
                     "skip": ["geometry"],
                     "reason": "T-10 flex-remainder zone: her logo cell absorbs the width her 4-seat register leaves (705 @1440); our 5 Arabic seats leave a different remainder — the zone flexes, the logo CLUSTER inside is fully asserted"})
    bind("chrome > header[1] > div[1] > div[2] > div[1] > div[1]", "nav.brand", spec="chrome > header[1] > div[1] > div[2] > div[1] > div[1]",
         note="the logo cluster (her header-logo-inner, overflow-hidden roll mask)")
    # her logo mark svg ≈ our Logo mark svg (kills the svg heuristic glue)
    mark_svg = [e for e in els if e["tag"] == "svg" and 20 <= e["vr"]["h"] <= 55 and e["vr"]["y"] < hy + barH and e["vr"]["x"] < hx + 200]
    if mark_svg:
        bind(mark_svg[0]["p"], ".fo-brand-mark svg", note="the logo mark svg (OUR logo stays — mission law)")

    # ── desktop vs mobile mode ─────────────────────────────────────────────
    hits = [e for e in els if e["tag"] in ("a", "button") and byp(e) and e["vr"]["w"] >= 50]
    widths = Counter(round(e["vr"]["w"]) for e in hits)
    itemW = widths.most_common(1)[0][0] if widths else 0
    desktop = sum(1 for e in hits if abs(e["vr"]["w"] - itemW) <= 2) >= 3

    if desktop:
        menu_wrap_p = "chrome > header[1] > div[1] > div[2] > div[2]"
        bind(menu_wrap_p, "nav.zone.menu", spec=menu_wrap_p, note="the menu+CTA cluster zone")
        plumbing.append({"section": "chrome", "heron": menu_wrap_p, "skip": ["geometry"],
                         "reason": "T-10 flex-remainder zone: her menu wrap spans menu+CTA (713 @1440); ours wraps the 5-seat register with the actions cluster as a sibling — cluster width is register-dependent"})
        menu_inner_p = "chrome > header[1] > div[1] > div[2] > div[2] > div[1]"
        bind(menu_inner_p, "nav.row", spec=menu_inner_p, note="the nav row (her header-menu-inner)")
        plumbing.append({"section": "chrome", "heron": menu_inner_p, "skip": ["geometry"],
                         "reason": "T-10 seat-register width: her 4 cells (547 @1440) vs our 5 Arabic cells — the row's own cells are each asserted; the row width is the register's sum"})

        seats = [e for e in hits if abs(e["vr"]["w"] - itemW) <= 2]
        seats.sort(key=lambda e: e["vr"]["x"])
        cta = None
        for e in hits:
            if e not in seats and e["vr"]["x"] > seats[-1]["vr"]["x"]:
                cta = e
        for i, e in enumerate(seats[:4]):
            bind(e["p"], f"nav.link.{i}", spec=e["p"],
                 skip=["tag"] if e["tag"] == "button" else None,
                 note=f"nav seat {i} (her {e['tag']} cell)")
            plumbing.append({"section": "chrome", "heron": e["p"], "skip": ["geometry"],
                             "reason": "T-10 seat-register X-law: her 4-cell register + CTA-only far end vs our 5 Arabic cells + theme/login/CTA actions cluster — the seat's mirror-distance is register-dependent (cell w/h, type and color stay asserted)"})
        if len(seats) >= 5:
            bind(seats[4]["p"], ".fo-header-actions",
                 note="her 5th ruled cell — our actions cluster (theme+login+CTA) rides the seat")
            plumbing.append({"section": "chrome", "heron": seats[4]["p"], "skip": ["geometry"],
                             "reason": "T-10 cluster-vs-cell: our actions cluster (theme+login+CTA) sits where her 5th ruled cell stands — cluster width is our own register"})
        else:
            # bind the actions cluster to the LAST item's ruled wrap instead
            wraps = [e for e in els if e["tag"] == "div" and byp(e) and abs(e["vr"]["w"] - itemW) <= 2]
            wraps.sort(key=lambda e: e["vr"]["x"])
            if wraps:
                bind(wraps[-1]["p"], ".fo-header-actions",
                     note="her last menu-item-wrap ruled cell — our actions cluster rides the far end")
                plumbing.append({"section": "chrome", "heron": wraps[-1]["p"], "skip": ["geometry"],
                                 "reason": "T-10 cluster-vs-cell: our actions cluster (theme+login+CTA) has no single her counterpart cell — her wrap is 1 cell wide"})

        # the 5th Arabic seat: bind to her hidden 0×0 menu-btn trigger (geometry skipped)
        hidden_a = [e for e in els if e["tag"] == "a" and e["vr"]["w"] == 0 and e["p"].endswith("div[1] > a[1]")]
        if hidden_a:
            bind(hidden_a[0]["p"], "nav.link.4", spec=hidden_a[0]["p"], skip=["geometry"],
                 note="our 5th Arabic seat has no her bar cell (her register is 4) — bound to her hidden 0×0 trigger, geometry unassertable")

        # the CTA cell + internals
        if cta is not None:
            bind(cta["p"], "nav.cta", spec=cta["p"], note="the CTA cell (her header-cta-new)")
            rule = [e for e in els if e["tag"] == "div" and e["vr"]["w"] == 1 and abs(e["vr"]["h"] - barH) <= 3 and abs(e["vr"]["x"] - cta["vr"]["x"]) <= 2]
            if rule: bind(rule[0]["p"], "nav.cta.rule", spec=rule[0]["p"], note="the CTA's 1px boundary rule")
            main = [e for e in els if e["tag"] == "div" and abs(e["vr"]["w"] - cta["vr"]["w"]) <= 2 and abs(e["vr"]["h"] - barH) <= 3 and abs(e["vr"]["x"] - cta["vr"]["x"]) <= 2 and e["tc"] == "none" and e["p"] != cta["p"]]
            if main: bind(main[0]["p"], "nav.cta.main", spec=main[0]["p"], note="the CTA fill seat (her btn-fill)")
            labels = [e for e in els if e["tag"] == "div" and e["tc"] == "short" and abs(e["vr"]["x"] - cta["vr"]["x"]) <= 14 and cta["vr"]["x"] <= e["vr"]["x"]]
            labels.sort(key=lambda e: e["vr"]["y"])
            if len(labels) >= 2:
                bind(labels[0]["p"], ".fo-actions-cta .fo-roll-txt:not(.fo-roll-dup)", note="CTA label top row")
                bind(labels[1]["p"], ".fo-actions-cta .fo-roll-dup", note="CTA label roll row")
        # the nav label rows (per seat: top + roll)
        for i, e in enumerate(seats[:4]):
            labs = [l for l in els if l["tag"] == "div" and l["tc"] == "short"
                    and abs(l["vr"]["x"] - (e["vr"]["x"] + 10)) <= 8
                    and l["vr"]["y"] - hy < barH]
            labs.sort(key=lambda l: l["vr"]["y"])
            if len(labs) >= 2:
                bind(labs[0]["p"], f".fo-nav > a:nth-of-type({i+1}) .fo-roll-txt:not(.fo-roll-dup)", note=f"seat {i} label top row")
                bind(labs[1]["p"], f".fo-nav > a:nth-of-type({i+1}) .fo-roll-dup", note=f"seat {i} label roll row")
                for L in labs[:2]:
                    plumbing.append({"section": "chrome", "heron": L["p"], "skip": ["geometry"],
                                     "reason": "T-10 seat-register X-law: label rows ride the register-dependent seat positions (typography + color stay asserted)"})
    else:
        # ── mobile bar: logo zone + menu cell + (768) CTA ──────────────────
        zone = [e for e in els if e["tag"] == "div" and byp(e) and abs(e["vr"]["x"] - hx) <= 2 and e["vr"]["w"] > 100]
        menu_p = "chrome > header[1] > div[1] > div[2] > div[2]"
        if zone:
            bind(menu_p, "nav.zone.menu", spec=menu_p, note="the menu cell zone")
            plumbing.append({"section": "chrome", "heron": menu_p, "skip": ["geometry"],
                             "reason": "T-10 mobile zones: her menu cell (187 @390 / 192 @768) vs our burger cluster — the burger + label seats inside are asserted"})
        trigger = [e for e in hits if "255, 255, 255" not in e["color"]]
        cta_m = [e for e in hits if "255, 255, 255" in e["color"] and e["vr"]["w"] > 100]
        if trigger:
            t = max(trigger, key=lambda e: e["vr"]["w"])
            bind(t["p"], "nav.menu.btn", spec=t["p"], skip=["tag"],
                 note="the menu trigger (her anchor seat — ours is the burger button)")
            plumbing.append({"section": "chrome", "heron": t["p"], "skip": ["geometry"],
                             "reason": "T-10 mobile trigger width: her 187px label+icon cell vs our burger (label + 3-line instrument) — the label seat inside is asserted"})
            labs = [l for l in els if l["tag"] == "div" and l["tc"] == "short"
                    and t["vr"]["x"] <= l["vr"]["x"] <= t["vr"]["x"] + t["vr"]["w"]
                    and hy <= l["vr"]["y"] <= hy + barH]
            if labs:
                bind(labs[0]["p"], ".fo-burger-txt", note="the menu trigger label")
        if cta_m:
            bind(cta_m[0]["p"], "nav.cta", spec=cta_m[0]["p"], skip=["geometry"],
                 note="the 768 CTA cell (ours is folded away by the ≤991 belt)")

    # ── every unbound path gets a written reason (dedup across bps below) ──
    unbound = {}
    for e in els:
        if e["p"] in bound:
            continue
        v = e["vr"]
        if v["w"] == 0 and v["h"] == 0:
            r = "T-10 hidden seat: her 0×0 trigger/CTA residue (display:none cluster) — recorded for the seat law, no visible counterpart to assert"
        elif v["y"] > hy + barH + 4:
            r = "T-10 mounted-below-bar subtree: her hover mega-dropdown / open-state mobile panel rows carry real geometry under the closed bar (her panels stay mounted; op 0, h 2) — our R331 flat seat register mounts no submenus at rest and our mobile panel mounts on open (the r309 unmount contract); conformed as CSS-law debt, see docs/redesign/r339/T-10-CHROME.md"
        elif e["tag"] == "svg" or e["tag"] == "path" or (v["w"] <= 8 and v["h"] <= 8 and e["tag"] == "div"):
            r = "T-10 corner instrument: her 5×5 svg corner marks on the ruled cells — our cell grammar carries no corner instruments (the rules are borders/real divs)"
        elif e["tag"] == "div" and v["w"] > v["h"] * 2 and v["h"] in (36, 41, 51, 56, 60) and v["y"] < hy:
            r = "T-10 hover slab: her btn-fill-bg (240×60, translateY −30) — ours is the ::before pseudo-element (not a DOM node); the wipe law is conformed in CSS"
        else:
            r = "T-10 chrome internal without a bound counterpart in our seat register (her btn-fill/label-icon scaffolding around the bound seats) — reported, never silently dropped"
        unbound.setdefault(e["p"], r)
    add_nc(list(unbound.items()) and [p for p in unbound], None) if False else None
    for p, r in unbound.items():
        noCounterpart.append({"section": "chrome", "heron": p, "reason": r, "bps": [bp]})

# ── fold the r335 _chrome.json page-level keys (verbatim) ──────────────────
mapping = {
    "_readme": ("r339 T-10 — the PAGE-LEVEL chrome mapping (generated by "
                "scripts/conformance/gen-chrome-mapping.py from the frozen chrome.<bp>.json specs; "
                "replaces r335's mapping/_chrome.json whose keys are folded in here). "
                "ourSection['chrome'] → the fixed masthead seat (SheetNav's header.fo-header); "
                "heronPageKey['chrome'] → the frozen _page.<bp>.json mark 'header.header' (the page-level "
                "sectionVh + pinSpan assertions). explicit[] binds the bar seats "
                "(nav.bar/rule/zones/brand/links/cta/labels) via the data-spec hooks SheetNav stamps + "
                "CSS selectors for the wrappers; every other recorded spec path carries a written "
                "noCounterpart reason (her mega-dropdown + open-state mobile panel rows are mounted "
                "below the bar in her DOM — our register is flat and our panel mounts on open, the "
                "r309 contract; that residue is the documented T-10 debt). plumbing[] skips ONLY the "
                "geometry group on the flex-remainder zones and cluster-vs-cell pairs — type/color stay "
                "asserted everywhere. No cursor tweens are recorded at any breakpoint (grep 'cursor' in "
                "_motion.*.json → 0) — SheetCursor stays per mission."),
    "ourSection": {"chrome": "header.fo-header"},
    "heronPageKey": {"chrome": "header.header"},
    "scaleFactor": {"chrome": 1},
    "explicit": explicit,
    "noCounterpart": noCounterpart,
    "plumbing": plumbing,
}
with open(OUT, "w") as f:
    json.dump(mapping, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(f"chrome.json: {len(explicit)} explicit, {len(noCounterpart)} noCounterpart, {len(plumbing)} plumbing")
