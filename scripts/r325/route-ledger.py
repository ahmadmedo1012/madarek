#!/usr/bin/env python3
"""P2.4 phase 2 — the ROUTE LEDGER: per route × bp × theme → clean/DEFECT.

Instruments (all evidence-backed, no guesswork):
  1. MANIFEST  — capture status (error/partial/timeout/skipped), the
                 horizontal-overflow probe (scrollWidth > innerWidth) and
                 per-route console/pageerror capture (noise-filtered at
                 capture time by capture-routes.mjs).
  2. ISLAND SCAN — pixel analysis of every INK screenshot: large
                 contiguous near-paper luminous masses (L>205, eroded to
                 kill glyph strokes, blob ≥ 4×4 cells of 16px) that are
                 NOT text — the P2.6 «light-paper island» suspicion,
                 measured the same way the Y5-landing sweep did.
  3. DOM PROBE — scripts/r325/route-dom-probe.mjs writes
                 dom-findings.json (stuck skeletons, visible error text,
                 debug/jargon strings); merged here when present.

OUTPUT
  docs/redesign/r325/route-ledger.md          — the reviewable ledger
  audits/evidence/r325/routes/ledger-findings.json — machine findings

USAGE
  python3 scripts/r325/route-ledger.py                # full analyze
  python3 scripts/r325/route-ledger.py --islands      # island scan only
"""
import json
import os
import sys
from collections import defaultdict

from PIL import Image, ImageFilter
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'audits/evidence/r325/routes')
MANIFEST = os.path.join(OUT, 'manifest.json')
DOM = os.path.join(OUT, 'dom-findings.json')
FINDINGS = os.path.join(OUT, 'ledger-findings.json')
VLM = os.path.join(OUT, 'vlm-verdicts.json')
LEDGER = os.path.join(ROOT, 'docs/redesign/r325/route-ledger.md')

BPS = ['1440', '768', '390']
THEMES = ['paper', 'ink']
ROLE_ORDER = ['student', 'teacher', 'registrar', 'quality', 'owner',
              'head', 'dean', 'vicedean', 'faculty', 'guest', 'system']

# island-scan calibration — the Ink palette: bg #282828 (L≈40),
# surface #2E2E2E (L≈46), text #F6F6EE (L≈245). Paper tokens (bg
# #F6F6EE, surface #FFF) are L≈245/255 — anything ≥205 in an INK shot
# is either text, a light raster, or an island.
L_THRESHOLD = 205
ERODE = 9          # MinFilter kernel — kills text strokes ≤4 px
CELL = 16          # analysis cell (px) after erosion
BLOB_CELLS = 16    # ≥ 4×4 cells = 64×64 real px — bigger than any glyph run
FRAME_ISLAND_FRAC = 0.04  # or ≥4 % of the frame in blobs

ISLAND_CACHE_DIR = os.path.join(OUT, '_island-scan')


def load(p):
    try:
        with open(p) as f:
            return json.load(f)
    except Exception:
        return None


def island_scan(path):
    """Light-paper islands in one INK shot → (frac, [blobs]) or None.
    Two-stage: eroded-blob detection, then every blob is VERIFIED on
    the raw luminance (a real paper surface averages ≥200; a dark card
    with light glyphs averages far below — kills text false-positives)."""
    cache = os.path.join(ISLAND_CACHE_DIR,
                         os.path.relpath(path, OUT).replace('/', '__')
                         .replace('.webp', '.json').replace('.png', '.json'))
    if os.path.exists(cache):
        return load(cache)
    try:
        im = Image.open(path).convert('L')
    except Exception:
        return None
    if im.width > 1440:
        im = im.resize((1440, round(im.height * 1440 / im.width)), Image.BILINEAR)
    # binarize → erode (kills glyph strokes) → cell-grid → labeling
    mask = im.point(lambda v: 255 if v >= L_THRESHOLD else 0)
    mask = mask.filter(ImageFilter.MinFilter(ERODE))
    a = np.asarray(mask, dtype=np.uint8) > 0
    H, W = a.shape
    gh, gw = H // CELL, W // CELL
    if gh < 1 or gw < 1:
        return None
    grid = a[:gh * CELL, :gw * CELL].reshape(gh, CELL, gw, CELL).mean(axis=(1, 3)) > 0.6
    # BFS connected components on the grid
    seen = np.zeros_like(grid, dtype=bool)
    blobs = []
    for i in range(gh):
        for j in range(gw):
            if grid[i, j] and not seen[i, j]:
                stack, cells = [(i, j)], []
                seen[i, j] = True
                while stack:
                    y, x = stack.pop()
                    cells.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < gh and 0 <= nx < gw and grid[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
                if len(cells) >= BLOB_CELLS:
                    ys = [c[0] for c in cells]; xs = [c[1] for c in cells]
                    blobs.append({
                        'bboxPx': [min(xs) * CELL, min(ys) * CELL,
                                   (max(xs) + 1) * CELL, (max(ys) + 1) * CELL],
                        'cells': len(cells),
                    })
    frac = round(sum(b['cells'] for b in blobs) * CELL * CELL / (H * W), 4)
    # stage 2 — verify each blob against the RAW image luminance
    raw = np.asarray(im, dtype=np.float32)
    real = []
    for b in blobs:
        x0, y0, x1, y1 = b['bboxPx']
        region = raw[y0:min(y1, H), x0:min(x1, W)]
        if region.size and region.mean() >= 200:
            real.append(b)
    out = {'frac': round(sum(b['cells'] for b in real) * CELL * CELL / (H * W), 4),
           'blobs': sorted(real, key=lambda b: -b['cells'])[:4]}
    os.makedirs(ISLAND_CACHE_DIR, exist_ok=True)
    try:
        with open(cache, 'w') as f:
            json.dump(out, f)
    except Exception:
        pass
    return out


def fmt_bytes():
    total = 0
    for dirpath, _dirs, files in os.walk(OUT):
        for fn in files:
            if fn.endswith(('.webp', '.png')):
                total += os.path.getsize(os.path.join(dirpath, fn))
    return total / 1e6


def main():
    args = sys.argv[1:]
    islands_only = '--islands' in args

    man = load(MANIFEST) or {'captures': {}}
    caps = man['captures']
    dom = load(DOM) or {}
    vlm = load(VLM) or {}

    # group manifest keys by (role, slug)
    groups = defaultdict(dict)   # (role, slug) -> {(bp,theme,kind): entry}
    paths = {}
    for key, e in caps.items():
        if '@' not in key:
            continue
        rs, tail = key.rsplit('@', 1)
        role, slug = rs.split('/', 1)
        m = tail.rsplit('-', 1)
        kind = 'mid' if m[-1] == 'mid' else 'top'
        base = m[-1] if kind == 'mid' else tail            # e.g. '1440-ink' or '1440-ink-mid'→'1440-ink'
        bptheme = base if kind == 'top' else m[0] + '-' + m[1] if False else None
        # simpler: strip '-mid'
        bptheme = tail[:-4] if kind == 'mid' else tail
        if '-' not in bptheme:
            continue
        groups[(role, slug)][(bptheme, kind)] = e
        if e.get('resolvedPath'):
            paths[(role, slug)] = e['resolvedPath']

    findings = []
    routes_scanned = 0

    def add(role, slug, bp, theme, cls, desc, evidence=None):
        findings.append({
            'role': role, 'slug': slug, 'path': paths.get((role, slug), '?'),
            'bp': bp, 'theme': theme, 'class': cls, 'desc': desc,
            'evidence': evidence,
        })

    for (role, slug), entries in sorted(groups.items(), key=lambda kv: (ROLE_ORDER.index(kv[0][0]) if kv[0][0] in ROLE_ORDER else 99, kv[0][1])):
        routes_scanned += 1
        for bptheme in [f'{bp}-{th}' for bp in BPS for th in THEMES]:
            bp, theme = bptheme.split('-')
            top = entries.get((bptheme, 'top'))
            if not top:
                add(role, slug, bp, theme, 'MISSING', 'no capture recorded')
                continue
            st = top.get('status', '?')
            if st in ('error', 'partial', 'timeout'):
                add(role, slug, bp, theme, 'CAPTURE-' + st.upper(),
                    top.get('error', 'capture failed'), top.get('file'))
            elif st == 'skipped':
                add(role, slug, bp, theme, 'SKIP', top.get('reason', 'skipped'), None)
                continue
            # overflow (any bp; the mission names 390)
            ov = top.get('overflow')
            if ov and ov.get('scrollW', 0) > ov.get('innerW', 0):
                add(role, slug, bp, theme, 'OVERFLOW-X',
                    f"scrollW {ov['scrollW']} > innerW {ov['innerW']} (+{ov['scrollW'] - ov['innerW']}px)",
                    top.get('file'))
            # console errors
            ce = top.get('consoleErrors') or []
            if ce:
                add(role, slug, bp, theme, 'CONSOLE',
                    ' | '.join(ce[:2])[:220], top.get('file'))
            # island scan — ink shots only
            if theme == 'ink' and top.get('file') and os.path.exists(top['file']):
                scan = island_scan(top['file'])
                if scan and scan['blobs']:
                    worst = scan['blobs'][0]
                    area = worst['cells'] * CELL * CELL
                    if scan['frac'] >= FRAME_ISLAND_FRAC or area >= BLOB_CELLS * CELL * CELL:
                        v = vlm.get(f'{role}/{slug}') or {}
                        tag = ' (VLM-CONFIRMED UI panel)' if v.get('verdict') == 'ISLAND-UI' else ''
                        add(role, slug, bp, theme, 'INK-ISLAND',
                            f"light mass {area}px² at {worst['bboxPx']} ({scan['frac'] * 100:.1f}% of frame){tag}",
                            top['file'])
            # DOM probe findings (any theme — probe ran 1440)
            if bp == '1440':
                for d in dom.get(f'{role}/{slug}', []):
                    if d.get('theme') == theme:
                        add(role, slug, bp, theme, d['class'].upper(), d['desc'][:220], top.get('file'))

    with open(FINDINGS, 'w') as f:
        json.dump({'routes': routes_scanned, 'findings': findings}, f, indent=1, ensure_ascii=False)
    print(f'findings: {len(findings)} across {routes_scanned} routes → {os.path.relpath(FINDINGS, ROOT)}')
    if islands_only:
        return

    # ── the markdown ledger ──────────────────────────────────────────
    by_rs = defaultdict(list)
    for fd in findings:
        by_rs[(fd['role'], fd['slug'])].append(fd)

    cls_count = defaultdict(int)
    for fd in findings:
        cls_count[fd['class']] += 1

    n_caps = sum(1 for e in caps.values() if e.get('status') == 'done')
    n_mid = sum(1 for k, e in caps.items() if e.get('status') == 'done' and k.endswith('-mid'))

    L = []
    L.append('# R325 P2.4 — the route ledger «every route, every seat, every size, both inks»')
    L.append('')
    L.append(f'> Generated {man.get("generatedAt", "?")} from `audits/evidence/r325/routes/manifest.json`')
    L.append(f'> + pixel island-scan + the DOM probe. **{routes_scanned} routes × 3 bps × 2 themes')
    L.append(f'> = {routes_scanned * 6} surfaces**; {n_caps} viewport shots on disk ({fmt_bytes():.0f} MB,')
    L.append(f'> {n_mid} of them mid-scroll for long pages). Evidence root:')
    L.append('> `audits/evidence/r325/routes/<role>/<slug>-<bp>-<theme>.webp`.')
    L.append('')
    L.append('## Verdict')
    L.append('')
    clean = routes_scanned * 6 - len(findings)
    L.append(f'- **{clean}/{routes_scanned * 6} surfaces CLEAN** — {len(findings)} findings.')
    L.append('- Findings by class: ' + ', '.join(f'`{k}`={v}' for k, v in sorted(cls_count.items(), key=lambda kv: -kv[1])))
    L.append('- Classes: `INK-ISLAND` light mass in an Ink shot (verify: text/raster gap vs real surface) ·')
    L.append('  `OVERFLOW-X` horizontal scroll · `CONSOLE` page/console errors · `STUCK-SKELETON`/`ERROR-TEXT`/')
    L.append('  `JARGON` from the DOM probe · `CAPTURE-*` harness status · `SKIP` honest no-id gap · `MISSING` not captured.')
    L.append('')
    L.append('## The ledger (per role)')
    L.append('')
    for role in ROLE_ORDER:
        rows = [(rs, fds) for rs, fds in by_rs.items() if rs[0] == role]
        if not rows:
            continue
        L.append(f'### {role}')
        L.append('')
        L.append('| route | 1440 paper | 1440 ink | 768 paper | 768 ink | 390 paper | 390 ink |')
        L.append('|---|---|---|---|---|---|---|')
        for (r, slug), fds in sorted(rows, key=lambda kv: kv[0][1]):
            def cell(bp, th):
                hits = [f for f in fds if f['bp'] == bp and f['theme'] == th]
                if not hits:
                    return '✅'
                return '⚠ ' + '<br>'.join(sorted({h['class'] for h in hits}))
            p = paths.get((r, slug), '?')
            L.append(f'| `{slug}` — `{p}` | {cell("1440", "paper")} | {cell("1440", "ink")} | {cell("768", "paper")} | {cell("768", "ink")} | {cell("390", "paper")} | {cell("390", "ink")} |')
        L.append('')
        det = [f for f in findings if f['role'] == role]
        if det:
            L.append('<details><summary>finding detail (evidence paths)</summary>')
            L.append('')
            for f in det:
                L.append(f"- **{f['class']}** `{f['slug']}` {f['bp']}-{f['theme']}: {f['desc']}"
                         + (f" — `{os.path.relpath(f['evidence'], ROOT)}`" if f.get('evidence') else ''))
            L.append('')
            L.append('</details>')
            L.append('')
    with open(LEDGER, 'w') as f:
        f.write('\n'.join(L) + '\n')
    print(f'ledger: {os.path.relpath(LEDGER, ROOT)}')


if __name__ == '__main__':
    main()
