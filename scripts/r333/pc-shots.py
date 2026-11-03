#!/usr/bin/env python3
"""R333 P-C evidence — pre/post reveal frames at 1440 (statement/pains/roles/cta)
and 390 (cta/roles) + Arabic shaping checks + band-height measurements.
Run: python3 scripts/r333/pc-shots.py  (vite already up on 5173)"""
import json
import os
from playwright.sync_api import sync_playwright

OUT = "/home/z/evidence-r333/p-c"
os.makedirs(OUT, exist_ok=True)
BASE = "http://[::1]:5199/"

# (name, viewport, scrollY, settle_s)
SHOTS = [
    ("1440-statement-pre", 1440, 900, 0.03),
    ("1440-statement-post", 1440, 900, 2.0),
    ("1440-pains-pre", 1440, 1750, 0.03),
    ("1440-pains-post", 1440, 1750, 2.0),
    ("1440-roles-pre", 1440, 7300, 0.03),
    ("1440-roles-post", 1440, 7300, 2.0),
    ("1440-cta-pre", 1440, 15000, 0.03),
    ("1440-cta-post", 1440, 15000, 2.0),
    ("390-cta", 390, 15000, 2.0),
    ("390-roles", 390, 7300, 2.0),
]

MEASURE_JS = """
() => {
  const q = (s) => document.querySelector(s);
  const fs = (s) => { const el = q(s); return el ? getComputedStyle(el).fontSize : null; };
  const h = (s) => { const el = q(s); return el ? Math.round(el.getBoundingClientRect().height) : null; };
  return {
    docScrollH: document.documentElement.scrollHeight,
    ctaBandH: h('.fo-cta'),
    ctaTitleFs: fs('.fo-cta-title'),
    ctaLedeFs: fs('.fo-cta-lede'),
    pmSubFs: fs('.pm-sub'),
    pmItemSubFs: fs('.pm-item-sub'),
    pmAnswerFs: fs('.pm-item-answer'),
    rlNameFs: fs('.rl-row-name'),
    rlLineFs: fs('.rl-row-line'),
    armed: document.documentElement.classList.contains('js-reveal-armed'),
    // Arabic shaping: SplitText must NOT have wrapped words/chars in the CTA title
    ctaTitleSpans: q('.fo-cta-title') ? q('.fo-cta-title').querySelectorAll('.mdrk-line').length : null,
    ctaWordSpans: q('.fo-cta-title') ? q('.fo-cta-title').querySelectorAll('div > div, span[style]').length : null,
    ctaTitleHTML: q('.fo-cta-title') ? q('.fo-cta-title').innerHTML.slice(0, 160) : null,
    ctaLineOpacity: q('.fo-cta-title .mdrk-line') ? getComputedStyle(q('.fo-cta-title .mdrk-line')).opacity : null,
  };
}
"""

def run():
    results = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name, width, y, settle in SHOTS:
            rm = "rm-" if "rm" in name else ""
            ctx = browser.new_context(
                viewport={"width": width, "height": 900 if width >= 1440 else 844},
                reduced_motion="reduce" if "rm" in name else "no-preference",
            )
            page = ctx.new_page()
            page.goto(BASE, wait_until="networkidle")
            page.wait_for_timeout(1200)
            h = page.evaluate("() => document.documentElement.scrollHeight")
            sy = min(y, max(0, h - 900 if width >= 1440 else h - 844))
            page.evaluate(f"window.scrollTo(0, {sy})")
            page.wait_for_timeout(int(settle * 1000))
            page.screenshot(path=f"{OUT}/{name}.png")
            results[name] = page.evaluate(MEASURE_JS)
            results[name]["scrollY"] = sy
            results[name]["viewH"] = h
            ctx.close()
        browser.close()
    print(json.dumps(results, indent=1, ensure_ascii=False))

if __name__ == "__main__":
    run()
