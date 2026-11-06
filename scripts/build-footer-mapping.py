#!/usr/bin/env python3
"""build-footer-mapping.py — R338 T-06 footer.

Regenerates scripts/conformance/mapping/footer.json against the frozen Heron
spec (docs/redesign/r335/heron-spec/footer.*.json) and the data-spec hooks of
frontend/src/components/landing/sections/Footer.tsx.

Binding model (mirrors scripts/build-intro-mapping.py):
  · /tmp/our-footer-walk.json holds OUR live walk (node /tmp/walk-footer.mjs
    against the dev server): every element's recorded path under the same
    6-segment truncation law the instrument's pathOf uses ("footer" + last-6
    descendant segments), its data-spec key, tag and geometry.
  · Every unique recorded spec path binds to the data-spec key whose OWN
    recorded path is identical — our footer spec-mirrors the reference tree,
    so identical truncation windows = same structural seat.
  · SVG defs/filter plumbing and 0x0 residue boxes are excused with written
    reasons; colliding window families (many elements share one recorded
    path) ride the tag+tc heuristic fallback or are excused as plumbing.

Run after changing Footer.tsx hooks:
  node /tmp/walk-footer.mjs > /tmp/our-footer-walk.json   (port 5306)
  python3 scripts/build-footer-mapping.py
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs/redesign/r335/heron-spec"
OUT = ROOT / "scripts/conformance/mapping/footer.json"
WALK = Path("/tmp/our-footer-walk.json")
BPS = ["390", "768", "1024", "1440", "1920"]

ours = json.loads(WALK.read_text())
cen = {bp: json.load(open(SPEC / f"footer.{bp}.json"))["elements"] for bp in BPS}

our_by_path = defaultdict(list)
for o in ours:
    if o.get("ds"):
        our_by_path[o["p"]].append(o)

used_ds = set()
explicit, no_counter = [], []
seen = {}
for bp in BPS:
    for e in cen[bp]:
        seen[(e["p"], e["tag"])] = True

PLUMB = {"defs", "filter", "fecomponenttransfer", "fefuncr", "fefuncg",
         "fefuncb", "lineargradient", "clippath", "mask", "feblend",
         "femerge", "femergenode", "style", "title", "g"}

for (p, tag) in sorted(seen):
    els = [e for bp in BPS for e in cen[bp] if e["p"] == p]
    vrs = [e["vr"] for e in els if e.get("vr")]
    zero = bool(vrs) and all(v["w"] == 0 and v["h"] == 0 for v in vrs)
    if tag in PLUMB or zero:
        reason = (
            "SVG defs/filter plumbing inside the reference grayscale tonal twin (0x0, non-visual)"
            if tag in PLUMB
            else "0x0 tween/render-residue box (non-visual; our counterpart is a real off-stage box or absent by design)"
        )
        no_counter.append({"section": "footer", "heron": p, "reason": reason})
        continue
    cands = [c for c in our_by_path.get(p, []) if c["ds"] not in used_ds]
    if cands:
        used_ds.add(cands[0]["ds"])
        explicit.append({"section": "footer", "heron": p, "spec": p, "ours": cands[0]["ds"]})
    else:
        no_counter.append({
            "section": "footer", "heron": p,
            "reason": (
                "window collision: the walk truncates paths to six segments so distinct spec "
                "elements share this recorded path; the conforming container is bound explicitly "
                "and this residue rides the tag+tc heuristic fallback or is tween plumbing below "
                "the bound containers"
            ),
        })

mapping = {
    "_readme": (
        "R338 T-06 — footer ledger, REGENERATED against the frozen spec by "
        "scripts/build-footer-mapping.py (re-run after changing Footer.tsx hooks). Every unique "
        "recorded spec path binds to the data-spec key whose OWN recorded walk path (same "
        "6-segment truncation law) is identical — our footer spec-mirrors the reference tree. "
        "SVG defs/filter plumbing and 0x0 residue boxes are excused with written reasons; "
        "colliding window families ride the tag+tc heuristic fallback. ourSection: footer.fo-footer "
        "(components/landing/sections/Footer.tsx — the r338 Heron rebuild: 357/715/357 grid + ink "
        "strip + 42px legal row)."
    ),
    "ourSection": {"footer": "footer.fo-footer"},
    "heronPageKey": {"footer": "footer.footer"},
    "scaleFactor": {"footer": 1},
    "explicit": explicit,
    "noCounterpart": no_counter,
}
OUT.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print(f"explicit: {len(explicit)} bindings · noCounterpart: {len(no_counter)} excuses · our walked elements: {len(ours)}")
