#!/usr/bin/env python3
"""R333 P-F3 probe — journey/cta/footer geometry + heading type at the matrix viewports.

Measures (madarek only; heron targets come from docs/redesign/r333/twin/matrix-*.md):
  · journey  (#chapters)  offsetHeight + .chapters-title computed font-size
  · cta      (#vision)    offsetHeight + .fo-cta-title fs + rhythm gaps (driver.py algorithm)
  · footer   (footer.fo-footer) offsetHeight + band breakdown + max heading fs (h-scan slice)

Usage: python3 scripts/r333/pf3-probe.py <out.json> [port]
"""
import json
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[2] if len(sys.argv) > 2 else "5173"
BASE = f"http://localhost:{PORT}/"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/z/evidence-r333/p-f3/probe.json"

VIEWPORTS = [
    {"name": "1920", "width": 1920, "height": 1080},
    {"name": "1440", "width": 1440, "height": 900},
    {"name": "1024", "width": 1024, "height": 768},
    {"name": "768", "width": 768, "height": 900},
    {"name": "390", "width": 390, "height": 844},
]

PROBE = """
() => {
  const rhythm = (el) => {
    // scripts/twin/driver.py geometry_record — vertical rhythm: descend (depth<=3)
    // to the shallowest level with >=2 major boxes (h>=24, w>=48), take gaps.
    let gutterLevel = 0, gutters = [], rowsN = 0;
    let frontier = [el];
    for (let depth = 1; depth <= 3 && gutters.length === 0; depth++) {
      const next = [];
      for (const f of frontier) next.push(...f.children);
      const boxes = [...next].map(c => c.getBoundingClientRect())
        .filter(r => r.height >= 24 && r.width >= 48)
        .sort((a, b) => a.top - b.top);
      if (boxes.length >= 2) {
        gutterLevel = depth; rowsN = boxes.length;
        for (let i = 1; i < boxes.length; i++) {
          gutters.push(+(boxes[i].top - (boxes[i - 1].top + boxes[i - 1].height)).toFixed(1));
        }
      }
      frontier = next;
    }
    return { gutterLevel, rowsN, gutters };
  };
  const heads = (el) => [...el.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="heading"]')]
    .slice(0, 6).map(h => ({ cls: String(h.className).slice(0, 48),
      fs: +getComputedStyle(h).fontSize.replace('px', '') }));
  const off = (sel) => { const el = document.querySelector(sel);
    return el ? { h: el.offsetHeight, top: el.getBoundingClientRect().top + window.scrollY } : null; };
  const out = { remBase: getComputedStyle(document.documentElement).fontSize };
  const j = off('#chapters');
  if (j) { const el = document.querySelector('#chapters');
    out.journey = { ...j, heads: heads(el).slice(0, 3) }; }
  const c = off('#vision');
  if (c) { const el = document.querySelector('#vision');
    out.cta = { ...c, titleFs: getComputedStyle(el.querySelector('.fo-cta-title')).fontSize,
                rhythm: rhythm(el), heads: heads(el).slice(0, 3) }; }
  const f = off('footer.fo-footer');
  if (f) { const el = document.querySelector('footer.fo-footer');
    const band = (sel) => { const n = el.querySelector(sel); return n ? n.offsetHeight : null; };
    out.footer = { ...f,
      fgrid: band('.fo-fgrid'), fstrip: band('.fo-fstrip'),
      lens: band('.fo-fstrip .fl'), wordmark: band('.fo-wordmark'),
      wordmarkSvg: (el.querySelector('.fo-wordmark-logo') || {}).offsetHeight ?? null,
      bottom: band('.fo-footer-bottom'), legal: band('.fo-legal-row'),
      heads: heads(el) }; }
  return out;
}
"""

results = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vp in VIEWPORTS:
        ctx = b.new_context(viewport={"width": vp["width"], "height": vp["height"]})
        page = ctx.new_page()
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(1200)
        try:
            page.evaluate("() => document.fonts ? document.fonts.ready : true")
        except Exception:
            pass
        # sweep the document so lazy/reveal state settles before measuring
        for frac in (0.3, 0.6, 0.85, 1.0):
            page.evaluate(
                "(f) => { const d = document.scrollingElement || document.documentElement;"
                " window.scrollTo ? window.scrollTo(0, (d.scrollHeight - window.innerHeight) * f) : null; }",
                frac)
            page.wait_for_timeout(350)
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(500)
        rec = page.evaluate(PROBE)
        rec["viewport"] = vp["name"]
        results.append(rec)
        print(f"== {vp['name']} ==\n" + json.dumps(rec, ensure_ascii=False, indent=1))
        ctx.close()
    b.close()

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=1)
print(f"saved → {OUT}")
