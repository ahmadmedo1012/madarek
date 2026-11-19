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
    """An authored plan card: our own floor-plan drawing on paper, one orange
    header block. Generic architectural UI, no reference content."""
    vgrad(d, (0, 0, w, h), PAPER, MIST)
    pad = w * 0.035
    card = [pad, h * 0.07, w - pad, h * 0.93]
    d.rectangle([card[0] + w * 0.006, card[1] + h * 0.012, card[2] + w * 0.006, card[3] + h * 0.012], fill=G4)
    d.rectangle(card, fill=WHITE, outline=G3, width=max(1, int(w * 0.0025)))

    # orange header block with three white rules
    hdr = [card[0] + w * 0.03, card[1] + h * 0.05, card[0] + w * 0.42, card[1] + h * 0.44]
    d.rectangle(hdr, fill=ORANGE)
    for i in range(3):
        y = hdr[1] + hdr[3] * (0.22 + i * 0.20) - hdr[1] * 0.0
        d.rectangle([hdr[0] + w * 0.02, y, hdr[2] - w * (0.06 if i == 2 else 0.02), y + h * 0.012], fill=WHITE)

    # plan drawing: rooms as ruled rectangles
    px0, py0 = card[0] + w * 0.04, card[1] + h * 0.56
    px1, py1 = card[0] + w * 0.60, card[3] - h * 0.08
    d.rectangle([px0, py0, px1, py1], outline=G2, width=max(1, int(w * 0.003)))
    d.line([(px0 + (px1 - px0) * 0.45, py0), (px0 + (px1 - px0) * 0.45, py1)], fill=G2, width=max(1, int(w * 0.003)))
    d.line([(px0, py0 + (py1 - py0) * 0.5), (px1, py0 + (py1 - py0) * 0.5)], fill=G2, width=max(1, int(w * 0.002)))
    d.rectangle([px0 + (px1 - px0) * 0.05, py0 + (py1 - py0) * 0.06, px0 + (px1 - px0) * 0.28, py0 + (py1 - py0) * 0.30], fill=G4)
    d.rectangle([px0 + (px1 - px0) * 0.55, py0 + (py1 - py0) * 0.58, px0 + (px1 - px0) * 0.92, py0 + (py1 - py0) * 0.86], fill=G4)

    # rule stack + grey legend at the right
    rx = card[0] + w * 0.66
    for i in range(7):
        y = card[1] + h * (0.20 + i * 0.075)
        d.rectangle([rx, y, card[2] - w * 0.05, y + h * 0.016], fill=G3 if i % 3 else G2)


def scene_dashboard(d, w, h, wide=True):
    """An authored product card: header dots, a ruled table, one orange chip."""
    vgrad(d, (0, 0, w, h), PAPER, MIST)
    pad = w * 0.035
    card = [pad, h * 0.07, w - pad, h * 0.93]
    d.rectangle([card[0] + w * 0.006, card[1] + h * 0.012, card[2] + w * 0.006, card[3] + h * 0.012], fill=G4)
    d.rectangle(card, fill=WHITE, outline=G3, width=max(1, int(w * 0.0025)))

    # header: three dots + a title rule
    cy = card[1] + h * 0.09
    for i, col in enumerate((G3, G3, ORANGE)):
        cx = card[0] + w * (0.035 + i * 0.028)
        r = w * 0.008
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    d.rectangle([card[0] + w * 0.15, cy - h * 0.012, card[0] + w * 0.42, cy + h * 0.012], fill=G2)

    # the table: an ink header row then ruled rows with a bar meter column
    ty = card[1] + h * 0.20
    d.rectangle([card[0] + w * 0.03, ty, card[2] - w * 0.03, ty + h * 0.055], fill=INK2)
    rows = 5
    for i in range(rows):
        ry = ty + h * 0.075 + i * h * 0.115
        d.rectangle([card[0] + w * 0.03, ry, card[2] - w * 0.03, ry + h * 0.0022], fill=G4)
        d.rectangle([card[0] + w * 0.045, ry + h * 0.028, card[0] + w * (0.30 + 0.06 * (i % 3)), ry + h * 0.05], fill=G3)
        d.rectangle([card[0] + w * 0.52, ry + h * 0.032, card[0] + w * (0.60 + 0.05 * (i % 2)), ry + h * 0.045], fill=G4)
        # the meter
        d.rectangle([card[0] + w * 0.70, ry + h * 0.030, card[2] - w * 0.05, ry + h * 0.047], fill=MIST)
        d.rectangle(
            [card[0] + w * 0.70, ry + h * 0.030, card[0] + w * (0.74 + 0.035 * ((i * 2) % 5)), ry + h * 0.047],
            fill=ORANGE if i == 0 else G2,
        )


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
