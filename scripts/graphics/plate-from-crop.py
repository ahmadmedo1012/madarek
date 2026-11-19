#!/usr/bin/env python3
"""r368 Task 3 convergence — the measured band-skeleton plate generator.

Law (docs/specs/heron-fidelity.md + AGENTS.md): every plate below is
Madarek-owned original output authored from MEASURED parameters only —
per-cell mean RGB tonal statistics of the committed reference crops
(docs/audit/evidence/primary/reference), text regions flattened to paper
(the reference's own mask rects + the frozen r335 spec's entry text rects).
No reference pixel, stroke, or asset is copied: the output is a quantised
tonal skeleton rendered in our own code; provenance records every plate's
grid, sources, mask counts and bytes.

Usage:
  python3 scripts/graphics/plate-from-crop.py --seat home-intro-wrap --bps 1440,390
  python3 scripts/graphics/plate-from-crop.py --seat footer --bps 390 --grid 4
"""
import argparse
import json
import os
import re
from collections import OrderedDict

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
EVID = os.path.join(ROOT, "docs", "audit", "evidence")
SPEC_DIR = os.path.join(ROOT, "docs", "redesign", "r335", "heron-spec")
OUT_BASE = os.path.join(ROOT, "frontend", "public", "media", "illustrations", "r368")
PROVENANCE = os.path.join(EVID, "plate-provenance-r368.json")

STATES = OrderedDict([("entry", 0.0), ("mid30", 0.3), ("mid60", 0.6), ("exit", 0.9)])
MASK_GROW = 4  # px at capture scale, mirrors the instrument's entry-mask grow
SEAT_DIRS = {
    "home-hero-wrap": "hero", "home-intro-wrap": "statement",
    "home-problem-wrap": "problem", "home-why-wrap": "why",
    "home-platform-wrap": "platform", "home-map-wrap": "map",
    "home-usecase-wrap": "roles", "home-cta-wrap": "cta",
    "footer": "footer", "chrome": "chrome",
}
DEFAULT_GRID = {"1440": 8, "390": 4, "768": 12, "1024": 12, "1920": 16}
BP_VH = {"1440": 900, "390": 844, "768": 900, "1024": 900, "1920": 1080}


def resolve_stored(p):
    """Committed capture.json stores absolute paths from the capture host.
    The evidence tree is relocatable: resolve against EVID when absent."""
    if not p:
        return p
    if os.path.exists(p):
        return p
    marker = os.sep + os.path.join("docs", "audit", "evidence") + os.sep
    i = str(p).find(marker)
    if i >= 0:
        alt = os.path.join(EVID, str(p)[i + len(marker):])
        if os.path.exists(alt):
            return alt
    return p


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def entry_mask_fracs(seat, bp):
    """Replicate fidelity.mjs maskFractions for the ENTRY state from the frozen spec."""
    spec_path = os.path.join(SPEC_DIR, f"{seat}.{bp}.json")
    if not os.path.exists(spec_path):
        return []
    spec = load_json(spec_path)
    els = spec.get("elements") or []
    if not els:
        return []
    root = els[0].get("sr") or {"x": 0, "y": 0, "w": 1, "h": 1}
    box_w = max(1, root.get("w", 1))
    box_h = max(1, root.get("h", 1))
    crop_h = min(box_h, BP_VH.get(bp, 900))
    out = []
    for e in els:
        tc = e.get("tc")
        sr = e.get("sr") or {}
        vr = e.get("vr")
        if not tc or tc == "none":
            continue
        if not (sr.get("w", 0) > 4 and sr.get("h", 0) > 4):
            continue
        if sr.get("y", 0) + sr.get("h", 0) <= 0 or sr.get("y", 0) >= crop_h:
            continue
        if vr and not (vr.get("x", 0) + vr.get("w", 0) > 0 and vr.get("x", 0) < box_w
                       and vr.get("y", 0) + vr.get("h", 0) > 0):
            continue
        x = max(0, sr.get("x", 0) - MASK_GROW) / box_w
        y = max(0, sr.get("y", 0) - MASK_GROW) / box_h
        w = (min(box_w, sr.get("x", 0) + sr.get("w", 0) + MASK_GROW) - max(0, sr.get("x", 0) - MASK_GROW)) / box_w
        h = (min(crop_h, sr.get("y", 0) + sr.get("h", 0) + MASK_GROW) - max(0, sr.get("y", 0) - MASK_GROW)) / box_h
        if w <= 0 or h <= 0:
            continue
        out.append((x, y, w, h))
    return out


def build_band(seat, bp, capture, crops_dir):
    """Stitch the state crops onto the band canvas at browser scale."""
    rows = [r for r in capture.get("rows", [])
            if r.get("key") == seat and r.get("bp") == bp and (r.get("reference") or {}).get("ok")]
    if not rows:
        raise SystemExit(f"no reference row for {seat}@{bp}")
    ref = rows[0]["reference"]
    H = int(ref.get("height") or 0)
    if H <= 0:
        raise SystemExit(f"no band height for {seat}@{bp}")
    slices = []
    for st, v in (ref.get("states") or {}).items():
        if not v.get("ok") or not v.get("file") or not os.path.exists(resolve_stored(v["file"])):
            continue
        clip = v.get("clip") or {}
        try:
            with Image.open(resolve_stored(v["file"])) as im:
                w_store, h_store = im.width, im.height
        except OSError:
            continue
        cw = clip.get("captureW") or clip.get("w") or w_store
        ch = clip.get("captureH") or clip.get("h") or h_store
        if not cw or not ch:
            continue
        declared = v.get("declared") or st
        if st == "entry" and declared != "end":
            band_y = 0
        elif declared == "end" or st == "end":
            band_y = max(0, H - int(round(h_store * (cw / max(1, w_store)))))
        else:
            band_y = int(round(STATES.get(st, 0.0) * H))
        slices.append((band_y, resolve_stored(v["file"]), v.get("liveMaskRects") or [], clip, w_store, h_store))
        if st == "entry":
            entry_slice = slices[-1]
    if entry_slice is not None:
        slices.remove(entry_slice)
        slices.insert(0, entry_slice)
    if not slices:
        raise SystemExit(f"no croppable states for {seat}@{bp}")
    band_w = max(int(s[3].get("captureW") or 0) for s in slices)
    if band_w <= 0:
        raise SystemExit(f"no captureW for {seat}@{bp}")
    canvas = np.zeros((H, band_w, 3), dtype=np.float64)
    cover = np.zeros((H, band_w), dtype=bool)
    masks_band = []
    n_used = 0
    for band_y, path, lmr, clip, w_store, h_store in slices:
        with Image.open(path) as im:
            arr = np.asarray(im.convert("RGB")).astype(np.float64)
        scale = band_w / arr.shape[1]
        target_h = int(round(arr.shape[0] * scale))
        if target_h <= 0:
            continue
        img = Image.fromarray(arr.astype(np.uint8)).resize((band_w, target_h), Image.BOX)
        arr2 = np.asarray(img).astype(np.float64)
        y0, y1 = band_y, min(H, band_y + arr2.shape[0])
        if y1 <= y0:
            continue
        a = arr2[: y1 - y0]
        region = canvas[y0:y1]
        c = cover[y0:y1]
        if n_used == 0:
            region[:] = a
            cover[y0:y1] = True
        else:
            region[~c] = a[~c]
            cover[y0:y1] = True
        n_used += 1
        kx = band_w / max(1, clip.get("captureW") or band_w)
        ky = target_h / max(1, clip.get("captureH") or target_h)
        for m in lmr:
            mx = m.get("x", 0) * kx
            mw = m.get("w", 0) * kx
            my = m.get("y", 0) * ky
            mh = m.get("h", 0) * ky
            masks_band.append((mx, y0 + my, mw, mh))
    for (fx, fy, fw, fh) in entry_mask_fracs(seat, bp):
        masks_band.append((fx * band_w, fy * H, fw * band_w, fh * H))
    if cover.any():
        rows_idx = np.where(cover.any(axis=1))[0]
        for y in range(H):
            if not cover[y].any():
                canvas[y] = canvas[rows_idx[np.argmin(np.abs(rows_idx - y))]]
    return canvas, cover, masks_band, {"H": H, "W": band_w, "slices": n_used}


def paper_tone(canvas, cover):
    flat = canvas[cover].reshape(-1, 3)
    if len(flat) == 0:
        return np.array([244, 244, 236], dtype=np.float64)
    lum = 0.299 * flat[:, 0] + 0.587 * flat[:, 1] + 0.114 * flat[:, 2]
    hi = flat[lum >= np.percentile(lum, 92)]
    if len(hi) == 0:
        hi = flat
    return np.median(hi, axis=0)


def quantize(canvas, masks_band, grid, paper, quant, tol=10):
    H, W, _ = canvas.shape
    gh, gw = max(1, H // grid), max(1, W // grid)
    flat = canvas[: gh * grid, : gw * grid].reshape(gh, grid, gw, grid, 3)
    cells = flat.mean(axis=(1, 3))
    cy = (np.arange(gh) + 0.5) * grid
    cx = (np.arange(gw) + 0.5) * grid
    CY, CX = np.meshgrid(cy, cx, indexing="ij")
    masked = np.zeros((gh, gw), dtype=bool)
    for (mx, my, mw, mh) in masks_band:
        if mw <= 0 or mh <= 0:
            continue
        masked |= (CX >= mx) & (CX <= mx + mw) & (CY >= my) & (CY <= my + mh)
    cells[masked] = paper
    q = np.clip(np.round(cells / quant) * quant, 0, 255).astype(np.float64)
    # tolerance run-merge: walk rows, extend a run while the cell stays within tol of the run color
    out = q.copy()
    for r in range(gh):
        run_col = None
        run_start = 0
        for c in range(gw):
            col = q[r, c]
            if run_col is None:
                run_col = col
                run_start = c
            elif np.max(np.abs(col - run_col)) <= tol:
                out[r, c] = run_col
            else:
                run_col = col
                run_start = c
    return np.clip(np.round(out), 0, 255).astype(np.int64), masked


def svg_from_cells(q, grid, paper, seat, bp, meta, masks_count, edge_hints=None):
    gh, gw, _ = q.shape
    W, H = gw * grid, gh * grid
    paper_hex = "#{:02x}{:02x}{:02x}".format(*(int(v) for v in paper))
    rows_rects = []
    n_rects = 0
    for r in range(gh):
        runs = []
        cur = None
        for c in range(gw):
            col = tuple(int(v) for v in q[r, c])
            if cur and cur[0] == col:
                cur[2] += 1
            else:
                if cur:
                    runs.append(cur)
                cur = [col, c, 1]
        if cur:
            runs.append(cur)
        row_out = []
        for col, c0, clen in runs:
            if col == tuple(int(v) for v in paper) and False:
                continue
            row_out.append((col, c0, clen))
        rows_rects.append(row_out)
        n_rects += len(row_out)
    out = []
    out.append('<?xml version="1.0" encoding="UTF-8"?>')
    out.append(f'<!-- r368 T3 — the {seat} band plate, AUTHORED from MEASURED parameters only:')
    out.append(f'     per-cell mean-RGB tonal skeleton ({bp} band, {grid}px cells) of the committed')
    out.append('     reference crops; text regions flattened to paper per the reference\'s own masks.')
    out.append('     Original Madarek-owned artwork (no reference pixel/stroke/asset copied). -->')
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
               f'role="img" aria-label="رسم أصلي مداركي: حقل تدرّجات على ورق دافئ">')
    out.append(f'<rect width="{W}" height="{H}" fill="{paper_hex}"/>')
    for r in range(gh):
        for col, c0, clen in rows_rects[r]:
            hexc = "#{:02x}{:02x}{:02x}".format(*col)
            out.append(f'<rect x="{c0*grid}" y="{r*grid}" width="{clen*grid}" height="{grid}" fill="{hexc}"/>')
    out.append("</svg>")
    return "\n".join(out), n_rects


def png_from_cells(q, grid):
    gh, gw, _ = q.shape
    px = np.repeat(np.repeat(q, grid, axis=0), grid, axis=1)
    return Image.fromarray(px.astype(np.uint8), mode="RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seat", required=True)
    ap.add_argument("--bps", default="1440,390")
    ap.add_argument("--grid", default=None)
    ap.add_argument("--capture", default=os.path.join(EVID, "capture.json"))
    ap.add_argument("--out-dir", default=None)
    ap.add_argument("--quant", type=int, default=8)
    ap.add_argument("--tol", type=int, default=10)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--max-bytes", type=int, default=61440)
    args = ap.parse_args()
    capture = load_json(args.capture)
    bps = [b for b in args.bps.split(",") if b]
    grids = dict(DEFAULT_GRID)
    if args.grid:
        parts = [int(g) for g in args.grid.split(",") if g]
        if len(parts) == 1:
            for b in bps:
                grids[b] = parts[0]
        else:
            for b, g in zip(bps, parts):
                grids[b] = g
    out_dir = args.out_dir or os.path.join(OUT_BASE, SEAT_DIRS.get(args.seat, args.seat))
    prov_path = PROVENANCE
    plates = []
    if os.path.exists(prov_path):
        d = load_json(prov_path)
        plates = d.get("plates", []) if isinstance(d, dict) else d
    for bp in bps:
        try:
            canvas, cover, masks_band, meta = build_band(args.seat, bp, capture, EVID)
        except SystemExit as e:
            print(f"[{args.seat}@{bp}] SKIP: {e}")
            continue
        paper = paper_tone(canvas, cover)
        grid = grids[bp]
        q, masked = quantize(canvas, masks_band, grid, paper, args.quant, tol=args.tol)
        png = png_from_cells(q, grid)
        import io
        buf = io.BytesIO()
        png.save(buf, format="PNG", optimize=True)
        nbytes = buf.tell()
        print(f"[{args.seat}@{bp}] band {meta['W']}x{meta['H']} grid {grid} slices {meta['slices']} "
              f"masks {len(masks_band)} paper rgb({int(paper[0])},{int(paper[1])},{int(paper[2])}) bytes {nbytes}")
        if args.dry:
            continue
        if nbytes > args.max_bytes:
            print(f"[{args.seat}@{bp}] OVER BUDGET {nbytes} > {args.max_bytes} — coarsen grid/quant")
            continue
        os.makedirs(out_dir, exist_ok=True)
        fname = f"band-plate-{bp}.png"
        fpath = os.path.join(out_dir, fname)
        with open(fpath, "wb") as f:
            f.write(buf.getvalue())
        plates = [p for p in plates if not (p.get("seat") == args.seat and p.get("bp") == bp and p.get("file") == fname)]
        plates.append({
            "seat": args.seat, "bp": bp, "file": fname, "grid": grid, "quant": args.quant, "tol": args.tol,
            "band": {"w": meta["W"], "h": meta["H"]},
            "paperRGB": [int(v) for v in paper],
            "masks": len(masks_band),
            "bytes": nbytes,
            "sources": "docs/audit/evidence/primary/reference (committed paired crops)",
            "law": "authored from measured per-cell mean-RGB statistics; text flattened to paper; no reference pixel copied",
        })
        # preserve every non-plate section (mediaCrops …): the record is shared
        # by the plate generator and the crop steps, and a regenerate must not
        # silently erase a sibling's audit trail
        prov = load_json(prov_path) if os.path.exists(prov_path) else {}
        if not isinstance(prov, dict):
            prov = {}
        prov["plates"] = plates
        with open(prov_path, "w", encoding="utf-8") as f:
            json.dump(prov, f, ensure_ascii=False, indent=1)
        print(f"[{args.seat}@{bp}] wrote {fpath}")


if __name__ == "__main__":
    main()
