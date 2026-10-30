#!/usr/bin/env python3
"""scan-ink-pixels.py — Y5-landing instrument #2.

Pixel-scans every ink (dark) sheet for near-paper masses: pixels with
luminance > 200 and channel spread < 26 (catches #F6F6EE, #FFF,
#F9F9F4 family) are labelled; blobs ≥ 400 px are reported with their
bounding box and mean RGB. Text/drawing strokes resolve as small thin
blobs; a real light-paper island reports as one large box.

Usage: python3 scan-ink-pixels.py <dir-with-webp-sheets>
(the committed sheets live beside this script; run against a copy of
them or regenerate with shoot-sheets.mjs).
"""
import glob
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

DIR = sys.argv[1] if len(sys.argv) > 1 else '.'
for f in sorted(glob.glob(os.path.join(DIR, '*-ink.webp'))):
    a = np.asarray(Image.open(f).convert('RGB'))
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    sat = a.max(axis=2).astype(int) - a.min(axis=2).astype(int)
    m = (lum > 200) & (sat < 26)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1][:6]
    print('==', os.path.basename(f), f'{a.shape[1]}x{a.shape[0]} light={100 * m.mean():.2f}%')
    for k in order:
        if sizes[k] < 400:
            break
        ys, xs = np.where(lab == k + 1)
        col = a[ys, xs].mean(axis=0).astype(int)
        print(f'   blob {int(sizes[k]):7d}px  y[{ys.min()}..{ys.max()}] x[{xs.min()}..{xs.max()}]  meanRGB={tuple(col)}')
