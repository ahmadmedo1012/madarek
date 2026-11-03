#!/usr/bin/env python3
"""one-off: fgrid cell detail at 1024 (finds what pushes .fo-fgrid past its floor)"""
import json
from playwright.sync_api import sync_playwright

PROBE = """
() => {
  const el = document.querySelector('footer.fo-footer');
  if (!el) return null;
  const cells = [...el.querySelectorAll('.fo-fcell')].map(c => ({
    cls: String(c.className).slice(0, 40), h: c.offsetHeight, w: Math.round(c.getBoundingClientRect().width),
  }));
  const rows = [...el.querySelectorAll('.fo-footer-bottom > *')].map(c => ({
    cls: String(c.className).slice(0, 40), h: c.offsetHeight,
  }));
  const tagKids = [...(el.querySelector('.fo-fcell-tagline')?.children || [])].map(c => ({
    cls: String(c.className).slice(0, 40), h: c.offsetHeight,
    fs: getComputedStyle(c).fontSize, lh: getComputedStyle(c).lineHeight,
  }));
  const gs = getComputedStyle(el.querySelector('.fo-fgrid'));
  const fb = getComputedStyle(el.querySelector('.fo-footer-bottom'));
  return { fgridH: el.querySelector('.fo-fgrid').offsetHeight,
           fgridRows: gs.gridTemplateRows, fgridGap: gs.gap, fgridMinH: gs.minHeight,
           cells, bottomH: el.querySelector('.fo-footer-bottom').offsetHeight,
           bottomRows: fb.gridTemplateRows, bottomFlexWrap: fb.flexWrap, kids: rows,
           tagKids, innerH: el.querySelector('.fo-footer-inner').offsetHeight,
           innerPad: getComputedStyle(el.querySelector('.fo-footer-inner')).padding };
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h in ((1024, 768), (768, 900), (1920, 1080)):
        ctx = b.new_context(viewport={"width": w, "height": h})
        page = ctx.new_page()
        page.goto("http://localhost:5173/", wait_until="networkidle")
        page.wait_for_timeout(1500)
        for frac in (0.5, 1.0):
            page.evaluate("(f)=>{const d=document.scrollingElement;window.scrollTo(0,(d.scrollHeight-innerHeight)*f)}", frac)
            page.wait_for_timeout(300)
        page.evaluate("()=>window.scrollTo(0,0)")
        page.wait_for_timeout(400)
        print(f"== {w} ==", json.dumps(page.evaluate(PROBE), ensure_ascii=False))
        ctx.close()
    b.close()
