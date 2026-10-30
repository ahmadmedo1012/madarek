#!/usr/bin/env python3
"""P2.4 phase 1 — per-route CONTACT SHEETS from the capture manifest.

For every (role, slug) with ≥1 done capture this tiles the captured
(breakpoint × theme) viewport shots into one labeled montage:

    audits/evidence/r325/routes/_sheets/<role>/<slug>.webp

Grid: rows = themes (paper over ink), cols = bps (1440 · 768 · 390);
missing combos render as a hatched placeholder so the sheet records
exactly what the sweep produced (same honesty contract as the
manifest). Cells keep each shot's aspect (viewport shots, so 1440 is
wide-landscape and 390 is tall-portrait) normalized to a shared cell
HEIGHT band per row... in practice cells are normalized to a common
width per column and top-aligned; the montage is a REVIEW surface, not
a pixel ruler.

WHY python/PIL: the capture harness already round-trips through
python3+PIL for PNG→webp (toWebp in capture-routes.mjs — Playwright's
screenshot API has no webp type and its bundled ffmpeg demuxes no PNG
stills), so PIL is the one proven image tool in this toolchain.

USAGE
  python3 scripts/r325/route-sheets.py                 # all roles
  python3 scripts/r325/route-sheets.py --role student  # one role
  python3 scripts/r325/route-sheets.py --force         # rebuild existing
"""
import json
import os
import sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'audits/evidence/r325/routes')
MANIFEST = os.path.join(OUT, 'manifest.json')
SHEETS = os.path.join(OUT, '_sheets')

BPS = ['1440', '768', '390']
THEMES = ['paper', 'ink']
CELL_W = {            # normalized cell width per breakpoint column
    '1440': 470,
    '768': 300,
    '390': 190,
}
LABEL_H = 26
PAD = 6
BG = (24, 24, 28)
FG = (230, 230, 235)
MISSING = (45, 45, 52)

def load_manifest():
    with open(MANIFEST) as f:
        return json.load(f)

def find_shot(caps, role, slug, bp, theme):
    """The best done capture file for a combo (top shot preferred)."""
    for key in (f'{role}/{slug}@{bp}-{theme}', f'{role}/{slug}@{bp}-{theme}-mid'):
        e = caps.get(key)
        if e and e.get('status') == 'done' and e.get('file') and os.path.exists(e['file']):
            return e['file']
    return None

def fit(img, w):
    """Scale to width w, keep aspect."""
    h = max(1, round(img.height * w / img.width))
    return img.resize((w, h), Image.LANCZOS)

def sheet_for(caps, role, slug, route_path):
    cells = {}   # (bp, theme) -> path | None
    for bp in BPS:
        for th in THEMES:
            cells[(bp, th)] = find_shot(caps, role, slug, bp, th)
    if not any(cells.values()):
        return None

    # cell heights: normalize each COLUMN to its width; row height = max in row
    col_imgs = {}
    for bp in BPS:
        for th in THEMES:
            p = cells[(bp, th)]
            if p:
                try:
                    col_imgs[(bp, th)] = Image.open(p).convert('RGB')
                except Exception:
                    col_imgs[(bp, th)] = None
            else:
                col_imgs[(bp, th)] = None

    # layout: label band + two theme rows
    widths = [CELL_W[bp] for bp in BPS]
    W = PAD + sum(widths) + PAD * 2 + PAD * (len(BPS) - 1)
    # measure row heights
    row_h = {}
    for th in THEMES:
        h = 0
        for bp in BPS:
            im = col_imgs.get((bp, th))
            if im:
                ch = round(im.height * CELL_W[bp] / im.width)
                h = max(h, ch)
        row_h[th] = min(max(h, 120), 900)  # clamp pathological tall pages
    H = LABEL_H + PAD + sum(row_h.values()) + PAD * 3
    canvas = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(canvas)

    # label band
    title = f'{role} · {slug}   —   {route_path}'
    d.text((PAD + 2, 7), title, fill=FG)

    y = LABEL_H + PAD
    for th in THEMES:
        x = PAD
        for bp in BPS:
            im = col_imgs.get((bp, th))
            if im:
                cim = fit(im, CELL_W[bp])
                if cim.height > row_h[th]:  # clamp — crop bottom
                    cim = cim.crop((0, 0, cim.width, row_h[th]))
                canvas.paste(cim, (x, y))
            else:
                d.rectangle([x, y, x + CELL_W[bp], y + row_h[th]], fill=MISSING)
                d.text((x + 6, y + 6), f'no capture {bp} {th}', fill=FG)
            # bp column header on the first row
            if th == THEMES[0]:
                d.text((x + 2, y - 14), f'{bp}', fill=(150, 150, 160))
            x += CELL_W[bp] + PAD
        y += row_h[th] + PAD

    out_dir = os.path.join(SHEETS, role)
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f'{slug}.webp')
    canvas.save(out, 'WEBP', quality=88, method=4)
    return out

def main():
    args = sys.argv[1:]
    force = '--force' in args
    role_filter = None
    if '--role' in args:
        role_filter = args[args.index('--role') + 1]

    caps = load_manifest()['captures']
    # group done captures by (role, slug); remember a route path per slug
    groups = {}
    paths = {}
    for key, e in caps.items():
        if '@' not in key:
            continue
        rs, tail = key.rsplit('@', 1)
        role, slug = rs.split('/', 1)
        if role_filter and role != role_filter:
            continue
        groups.setdefault((role, slug), set()).add(tail)
        if e.get('resolvedPath'):
            paths[(role, slug)] = e['resolvedPath']

    made = skipped = 0
    for (role, slug) in sorted(groups):
        out = os.path.join(SHEETS, role, f'{slug}.webp')
        if not force and os.path.exists(out):
            skipped += 1
            continue
        p = sheet_for(caps, role, slug, paths.get((role, slug), '?'))
        if p:
            made += 1
            print('sheet', os.path.relpath(p, ROOT))
    print(f'route-sheets: built {made}, existing {skipped} → {os.path.relpath(SHEETS, ROOT)}')

if __name__ == '__main__':
    main()
