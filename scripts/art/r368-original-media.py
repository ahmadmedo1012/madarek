#!/usr/bin/env python3
"""r368 — the ORIGINAL media compositions for the hero, usecase and platform seats.

Law (docs/specs/heron-fidelity.md §Included/Excluded + AGENTS.md §7): no Heron
image, crop, or pixel-derived plate may ship as a product asset. The reference
is a MEASUREMENT reference only — its seat dimensions, colour mass and
geometry inform the composition; the drawing itself is authored here from
geometric primitives in Madarek's own palette.

The previous r368 media files (hero-media-*, usecase-media-*, platform-media-*)
were downscaled crops of the reference band and are replaced by these
compositions at the same seats, so layout, bindings and CSS stay untouched.

Output (all deterministic, supersampled 2× then LANCZOS-downscaled to the seat):
  frontend/public/media/illustrations/r368/hero/hero-media-{1440,390}.png
  frontend/public/media/illustrations/r368/roles/usecase-media-{1440,390}.png
  frontend/public/media/illustrations/r368/platform/platform-media-{1440,390}-{a,b}.png
  docs/audit/evidence/media-provenance-r368.json

Usage:
  python3 scripts/art/r368-original-media.py            # write the seats
  python3 scripts/art/r368-original-media.py --check    # byte-compare, exit 1 on drift
"""
import argparse
import hashlib
import json
import os
from math import cos, pi, sin

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_BASE = os.path.join(ROOT, "frontend", "public", "media", "illustrations", "r368")
PROVENANCE = os.path.join(ROOT, "docs", "audit", "evidence", "media-provenance-r368.json")

S = 2  # supersample factor (the 1× seat stays crisp at 2× DPR review)

PAPER = (247, 247, 240)
MIST = (233, 233, 226)
GROUND = (213, 213, 205)
GROUND2 = (199, 199, 191)
G4 = (206, 206, 199)
G3 = (176, 176, 170)
G2 = (139, 139, 134)
G1 = (97, 97, 93)
INK2 = (58, 58, 55)
INK = (27, 27, 25)
ORANGE = (250, 54, 0)
WHITE = (252, 252, 247)


def vgrad(d, box, top, bottom, steps=96):
    """A deterministic vertical gradient inside box=(x0,y0,x1,y1) (device px)."""
    x0, y0, x1, y1 = box
    h = max(1, int(y1 - y0))
    for i in range(steps):
        t = i / (steps - 1)
        col = tuple(round(top[k] + (bottom[k] - top[k]) * t) for k in range(3))
        ya = y0 + h * i / steps
        yb = y0 + h * (i + 1) / steps + 1
        d.rectangle([x0, ya, x1, yb], fill=col)


def scene_campus(d, w, h, wide=True):
    """An authored campus elevation: paper sky, a colonnade slab, a recessed
    glazed band, a low stair and one orange signal block. Generic modern
    school architecture — no reference pixel participates."""
    vgrad(d, (0, 0, w, h * 0.66), PAPER, MIST)
    vgrad(d, (0, h * 0.66, w, h), GROUND, GROUND2)

    # ground line
    d.rectangle([0, h * 0.655, w, h * 0.663], fill=G4)

    # low left wing
    d.rectangle([w * 0.03, h * 0.545, w * 0.23, h * 0.70], fill=G3)
    d.rectangle([w * 0.03, h * 0.545, w * 0.23, h * 0.556], fill=G2)

    # the canopy: slab + roof shadow
    d.rectangle([w * 0.19, h * 0.325, w * 0.83, h * 0.352], fill=INK2)
    d.rectangle([w * 0.19, h * 0.352, w * 0.83, h * 0.366], fill=G1)

    # piers and the glazed bays between them
    n = 7 if wide else 5
    x0, x1 = w * 0.235, w * 0.80
    base_y = h * 0.735
    for i in range(n):
        x = x0 + (x1 - x0) * i / (n - 1)
        pw = w * 0.016
        d.rectangle([x - pw / 2, h * 0.366, x + pw / 2, base_y], fill=G1 if i % 2 else INK2)
        if i < n - 1:
            nx = x0 + (x1 - x0) * (i + 1) / (n - 1)
            d.rectangle([x + pw / 2, h * 0.392, nx - pw / 2, h * 0.586], fill=(238, 238, 231))
            # thin mullion rhythm inside the bay
            mull = 3 if wide else 2
            for m in range(1, mull + 1):
                mx = x + pw / 2 + (nx - x - pw) * m / (mull + 1)
                d.rectangle([mx - w * 0.0016, h * 0.392, mx + w * 0.0016, h * 0.586], fill=G3)

    # the recessed band under the glazing (the dark register)
    d.rectangle([w * 0.235, h * 0.586, w * 0.80, h * 0.665], fill=INK2)
    for i in range(4 if wide else 3):
        ly = h * 0.607 + i * h * 0.016
        d.rectangle([w * 0.27, ly, w * 0.76, ly + h * 0.004], fill=G2)

    # stair: five authored treads
    steps = 5
    for i in range(steps):
        t = i / steps
        d.rectangle(
            [w * 0.075 + t * w * 0.03, h * (0.665 + t * 0.012), w * 0.32 - t * w * 0.01, h * (0.677 + t * 0.012)],
            fill=G4,
        )

    # the one orange signal — the campus beacon seat
    bw = w * 0.013
    d.rectangle([w * 0.245, h * 0.505, w * 0.245 + bw, h * 0.505 + bw * (1 if wide else 1.15)], fill=ORANGE)
    # a second, quieter warm tick at the far pier (the reference's own accent census)
    d.rectangle([w * 0.795, h * 0.505, w * 0.795 + bw * 0.5, h * 0.505 + bw * 0.5], fill=ORANGE)

    # shadow under the slab
    d.polygon(
        [(w * 0.19, h * 0.735), (w * 0.83, h * 0.735), (w * 0.86, h * 0.70), (w * 0.22, h * 0.70)],
        fill=(224, 224, 216),
    )
    d.rectangle([w * 0.235, h * 0.735, w * 0.80, h * 0.742], fill=G3)


def scene_arcade(d, w, h, wide=True):
    """An authored arcade seen from the quad: a deep canopy on three piers,
    a warm banner, tiled ground. Original geometry, Madarek palette."""
    vgrad(d, (0, 0, w, h * 0.55), PAPER, MIST)
    vgrad(d, (0, h * 0.55, w, h), GROUND, GROUND2)

    # the canopy slab, tilted by the eye level
    top = [(w * 0.05, h * 0.42), (w * 0.98, h * 0.30), (w * 0.98, h * 0.36), (w * 0.05, h * 0.48)]
    d.polygon(top, fill=INK2)
    d.polygon([(w * 0.05, h * 0.48), (w * 0.98, h * 0.36), (w * 0.98, h * 0.375), (w * 0.05, h * 0.495)], fill=G1)

    # the shaded underside
    d.polygon([(w * 0.05, h * 0.48), (w * 0.98, h * 0.36), (w * 0.98, h * 0.40), (w * 0.05, h * 0.545)], fill=(72, 72, 68))

    # piers
    n = 3 if wide else 2
    for i in range(n):
        x = w * (0.22 + 0.30 * i) if wide else w * (0.30 + 0.34 * i)
        d.rectangle([x, h * 0.375, x + w * 0.055, h * 0.80], fill=G1)
        d.rectangle([x, h * 0.375, x + w * 0.012, h * 0.80], fill=G2)
        d.rectangle([x + w * 0.043, h * 0.375, x + w * 0.055, h * 0.80], fill=INK2)

    # the warm banner on the right pier
    d.rectangle([w * 0.70, h * 0.415, w * 0.775, h * 0.735], fill=ORANGE)

    # tiled ground: faint perspective lines
    for i in range(1, 7):
        t = i / 7
        y = h * (0.80 + t * 0.20)
        d.rectangle([0, y, w, y + h * 0.0035], fill=(233, 233, 225))
    for i in range(1, 5):
        x = w * i / 5
        d.line([(w * 0.5 + (x - w * 0.5) * 0.4, h * 0.74), (x, h)], fill=(233, 233, 225), width=max(1, int(w * 0.003)))

    # horizon detail: a low distant block
    d.rectangle([w * 0.02, h * 0.505, w * 0.14, h * 0.548], fill=G3)


def scene_plan_card(d, w, h, wide=True):
    """An authored plan card (r368 T3 wave-4 enrichment): graph-paper ground,
    a survey plan with FILLED rooms in two tones + wall strokes with door
    gaps, dimension ticks, an orange highlighted room, a tooltip chip and a
    ruled legend — geometric primitives only, no reference pixel."""
    vgrad(d, (0, 0, w, h), PAPER, MIST)

    # graph-paper ground inside the card
    pad = w * 0.035
    card = [pad, h * 0.07, w - pad, h * 0.93]
    d.rectangle([card[0] + w * 0.006, card[1] + h * 0.012, card[2] + w * 0.006, card[3] + h * 0.012], fill=G4)
    d.rectangle(card, fill=WHITE, outline=G3, width=max(1, int(w * 0.0025)))
    gx = max(2, int(w * 0.014))
    gy = max(2, int(h * 0.020))
    x = card[0] + gx
    while x < card[2]:
        d.rectangle([x, card[1], x + 1, card[3]], fill=(240, 240, 235))
        x += gx * 3
    y = card[1] + gy
    while y < card[3]:
        d.rectangle([card[0], y, card[2], y + 1], fill=(240, 240, 235))
        y += gy * 3

    # the plan: a wall outline with door gaps, rooms FILLED in two tones,
    # one room highlighted in orange (the reference's signal room)
    px0, py0 = card[0] + w * 0.05, card[1] + h * 0.10
    px1, py1 = card[0] + w * 0.66, card[1] + h * 0.78
    wall = max(1, int(w * 0.004))
    # room fills first (walls overdraw)
    d.rectangle([px0, py0, px0 + (px1 - px0) * 0.46, py0 + (py1 - py0) * 0.52], fill=MIST)
    d.rectangle([px0 + (px1 - px0) * 0.50, py0, px1, py0 + (py1 - py0) * 0.30], fill=(232, 232, 226))
    d.rectangle([px0 + (px1 - px0) * 0.50, py0 + (py1 - py0) * 0.34, px1, py1], fill=MIST)
    d.rectangle([px0, py0 + (py1 - py0) * 0.56, px0 + (px1 - px0) * 0.46, py1], fill=(226, 226, 220))
    # the orange room
    orx = px0 + (px1 - px0) * 0.10
    ory = py0 + (py1 - py0) * 0.14
    d.rectangle([orx, ory, orx + (px1 - px0) * 0.24, ory + (py1 - py0) * 0.26], fill=ORANGE)
    # outer walls with two door gaps
    for seg in (0, 1, 2, 3):
        if seg == 0:
            d.rectangle([px0, py0, px1, py0 + wall], fill=INK2)
        if seg == 1:
            d.rectangle([px1 - wall, py0, px1, py0 + (py1 - py0) * 0.55], fill=INK2)
            d.rectangle([px1 - wall, py0 + (py1 - py0) * 0.68, px1, py1], fill=INK2)
        if seg == 2:
            d.rectangle([px0, py1 - wall, px0 + (px1 - px0) * 0.35, py1], fill=INK2)
            d.rectangle([px0 + (px1 - px0) * 0.52, py1 - wall, px1, py1], fill=INK2)
        if seg == 3:
            d.rectangle([px0, py0, px0 + wall, py1], fill=INK2)
    # inner partitions with gaps
    mx = px0 + (px1 - px0) * 0.48
    d.rectangle([mx - wall // 2, py0, mx + wall // 2, py0 + (py1 - py0) * 0.28], fill=INK2)
    d.rectangle([mx - wall // 2, py0 + (py1 - py0) * 0.40, mx + wall // 2, py1], fill=INK2)
    d.rectangle([px0, py0 + (py1 - py0) * 0.52, px0 + (px1 - px0) * 0.30, py0 + (py1 - py0) * 0.52 + wall], fill=INK2)
    # dimension ticks top
    for i in range(7):
        tx = px0 + (px1 - px0) * i / 6
        d.rectangle([tx, py0 - h * 0.030, tx, py0 - h * 0.014], fill=G2)
    d.rectangle([px0, py0 - h * 0.022, px1, py0 - h * 0.020], fill=G3)

    # the tooltip chip over the plan's upper right (the reference's card)
    tip = [px1 - w * 0.02, py0 + h * 0.05, min(card[2] - w * 0.05, px1 + w * 0.24), py0 + h * 0.26]
    d.rectangle([tip[0] + w * 0.004, tip[1] + h * 0.008, tip[2] + w * 0.004, tip[3] + h * 0.008], fill=G4)
    d.rectangle(tip, fill=WHITE, outline=G2, width=max(1, int(w * 0.002)))
    d.rectangle([tip[0] + w * 0.02, tip[1] + h * 0.035, tip[0] + w * 0.16, tip[1] + h * 0.055], fill=G2)
    d.rectangle([tip[0] + w * 0.02, tip[1] + h * 0.085, tip[0] + w * 0.24, tip[1] + h * 0.100], fill=G3)
    d.rectangle([tip[0] + w * 0.02, tip[1] + h * 0.12, tip[0] + w * 0.19, tip[1] + h * 0.134], fill=G3)
    d.rectangle([tip[0] + w * 0.02, tip[1] + h * 0.16, tip[0] + w * 0.08, tip[1] + h * 0.185], fill=ORANGE)

    # the legend column at the right: colour chips + rules
    lx = card[0] + w * 0.72
    for i, col in enumerate((ORANGE, G2, G3, MIST, G3, G2, G3)):
        ly = card[1] + h * (0.14 + i * 0.098)
        d.rectangle([lx, ly, lx + w * 0.045, ly + h * 0.045], fill=col, outline=G4, width=1)
        d.rectangle([lx + w * 0.075, ly + h * 0.012, card[2] - w * 0.04, ly + h * 0.030], fill=G3 if i % 2 else G2)
    # legend footer rule
    d.rectangle([lx, card[3] - h * 0.10, card[2] - w * 0.04, card[3] - h * 0.098], fill=G3)


def scene_dashboard(d, w, h, wide=True):
    """An authored dashboard card (r368 T3 wave-4 enrichment): window chrome,
    a stat row with chip + figures, a bar chart with axis and gridlines, a
    two-column list with orange action chips and avatar dots — geometric
    primitives only, no reference pixel."""
    vgrad(d, (0, 0, w, h), PAPER, MIST)
    pad = w * 0.035
    card = [pad, h * 0.07, w - pad, h * 0.93]
    d.rectangle([card[0] + w * 0.006, card[1] + h * 0.012, card[2] + w * 0.006, card[3] + h * 0.012], fill=G4)
    d.rectangle(card, fill=WHITE, outline=G3, width=max(1, int(w * 0.0025)))

    # header: three dots + a title rule + a search pill
    cy = card[1] + h * 0.075
    for i, col in enumerate((G3, G3, ORANGE)):
        cx = card[0] + w * (0.035 + i * 0.028)
        r = w * 0.008
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    d.rectangle([card[0] + w * 0.15, cy - h * 0.012, card[0] + w * 0.40, cy + h * 0.012], fill=G2)
    d.rectangle([card[0] + w * 0.58, cy - h * 0.016, card[2] - w * 0.04, cy + h * 0.016], fill=MIST, outline=G4, width=1)
    d.rectangle([card[0] + w * 0.60, cy - h * 0.005, card[0] + w * 0.72, cy + h * 0.005], fill=G3)

    # stat row: three stat blocks (chip + big figure + delta rule)
    sy = card[1] + h * 0.15
    for i in range(3):
        sx = card[0] + w * (0.035 + i * 0.315)
        d.rectangle([sx, sy, sx + w * 0.028, sy + h * 0.028], fill=ORANGE if i == 0 else G3)
        d.rectangle([sx + w * 0.045, sy - h * 0.004, sx + w * 0.20, sy + h * 0.022], fill=INK2)
        d.rectangle([sx + w * 0.045, sy + h * 0.040, sx + w * (0.13 if i else 0.17), sy + h * 0.054], fill=G3)
        if i:
            d.rectangle([sx + w * 0.045, sy + h * 0.062, sx + w * 0.11, sy + h * 0.070], fill=G4)

    # the chart: gridlines + axis + five bars (one orange)
    ch0 = card[0] + w * 0.035
    ch1 = card[2] - w * 0.035
    cy0 = card[1] + h * 0.34
    cy1 = card[1] + h * 0.64
    for i in range(4):
        gy = cy0 + (cy1 - cy0) * i / 3
        d.rectangle([ch0, gy, ch1, gy + 1], fill=(240, 240, 235))
    d.rectangle([ch0, cy1, ch1, cy1 + max(1, int(h * 0.006))], fill=G2)
    d.rectangle([ch0, cy0, ch0 + max(1, int(w * 0.004)), cy1], fill=G2)
    n = 5
    bw = (ch1 - ch0) * 0.11
    heights = (0.55, 0.85, 0.42, 1.0, 0.66)
    for i in range(n):
        bx = ch0 + (ch1 - ch0) * (0.08 + i * 0.18)
        bh = (cy1 - cy0) * heights[i]
        d.rectangle([bx, cy1 - bh, bx + bw, cy1], fill=ORANGE if i == 3 else G3)
    # chart caption rules
    d.rectangle([ch0, cy1 + h * 0.030, ch0 + (ch1 - ch0) * 0.4, cy1 + h * 0.042], fill=G3)
    d.rectangle([ch1 - (ch1 - ch0) * 0.22, cy1 + h * 0.030, ch1, cy1 + h * 0.042], fill=G4)

    # the two-column list: rows with avatar dot + rules + orange action chips
    ly0 = card[1] + h * 0.72
    rows = 2
    for i in range(rows):
        ry = ly0 + i * h * 0.095
        colw = (ch1 - ch0) * 0.47
        for c in range(2):
            rx = ch0 + c * (colw + (ch1 - ch0) * 0.06)
            r = w * 0.011
            d.ellipse([rx, ry + h * 0.005, rx + 2 * r, ry + h * 0.005 + 2 * r], fill=G2 if (i + c) % 2 else G3)
            d.rectangle([rx + w * 0.035, ry + h * 0.012, rx + colw * 0.55, ry + h * 0.026], fill=G3)
            d.rectangle([rx + w * 0.035, ry + h * 0.038, rx + colw * 0.38, ry + h * 0.048], fill=G4)
            # the action chip (orange on the first row's right column)
            chip_col = ORANGE if (i == 0 and c == 1) else MIST
            d.rectangle([rx + colw * 0.68, ry + h * 0.008, rx + colw, ry + h * 0.048], fill=chip_col, outline=G4, width=1)


SEATS = [
    ("hero", "hero-media-1440.png", (1368, 643), scene_campus, True),
    ("hero", "hero-media-390.png", (340, 388), scene_campus, False),
    ("roles", "usecase-media-1440.png", (724, 880), scene_arcade, True),
    ("roles", "usecase-media-390.png", (374, 254), scene_arcade, False),
    ("platform", "platform-media-1440-a.png", (598, 351), scene_plan_card, True),
    ("platform", "platform-media-1440-b.png", (598, 351), scene_dashboard, True),
    ("platform", "platform-media-390-a.png", (372, 226), scene_plan_card, False),
    ("platform", "platform-media-390-b.png", (372, 225), scene_dashboard, False),
]


def render(scene, w, h, wide):
    im = Image.new("RGB", (w * S, h * S), PAPER)
    d = ImageDraw.Draw(im)
    scene(d, w * S, h * S, wide)
    return im.resize((w, h), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="byte-compare, exit 1 on drift")
    args = ap.parse_args()

    rows = []
    drift = 0
    for seat_dir, name, (w, h), scene, wide in SEATS:
        out = os.path.join(OUT_BASE, seat_dir, name)
        im = render(scene, w, h, wide)
        tmp = out + ".new"
        im.save(tmp, "PNG", optimize=True)
        data = open(tmp, "rb").read()
        if args.check:
            cur = open(out, "rb").read() if os.path.exists(out) else b""
            if hashlib.sha256(cur).hexdigest() != hashlib.sha256(data).hexdigest():
                print(f"drift: {out}")
                drift += 1
            os.unlink(tmp)
        else:
            os.replace(tmp, out)
        rows.append(
            {
                "file": os.path.relpath(out, ROOT),
                "seat": seat_dir,
                "width": w,
                "height": h,
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "supersample": S,
                "source": "scripts/art/r368-original-media.py",
                "license": "Madarek-owned original artwork (authored geometric composition, this repository's own palette)",
                "referenceUse": "seat dimensions and tonal mass only — no reference image, crop, pixel or trace participates",
            }
        )
        print(f"{'stable' if args.check else 'wrote'} {out} {w}x{h} {len(data)}B")

    if args.check:
        print(f"r368 original media: {len(SEATS) - drift}/{len(SEATS)} stable")
        raise SystemExit(1 if drift else 0)

    payload = {
        "generated_by": "scripts/art/r368-original-media.py",
        "law": "docs/specs/heron-fidelity.md — original Madarek artwork only; the frozen seats are kept so layout, bindings and CSS do not move",
        "replaces": "the r368 reference-band crops (hero-media-*, usecase-media-*, platform-media-*), retired for originality",
        "assets": rows,
    }
    os.makedirs(os.path.dirname(PROVENANCE), exist_ok=True)
    with open(PROVENANCE, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"provenance -> {PROVENANCE}")


if __name__ == "__main__":
    main()
