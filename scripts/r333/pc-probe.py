#!/usr/bin/env python3
"""R333 P-C probe — reveal state timeline after a hard scroll jump."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://[::1]:5199/"
PROBE = """
() => {
  const g = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const c = getComputedStyle(el);
    return {o: c.opacity, t: c.transform};
  };
  return {
    armed: document.documentElement.classList.contains('js-reveal-armed'),
    handle: !!window.__mdrkReveals,
    ctaTitle: g('.fo-cta-title'),
    ctaLine0: g('.fo-cta-title .mdrk-line'),
    rlRow0: g('.rl-row'),
    pmCol0: g('.pm-col'),
    pmArt: g('.pm-artzone .pm-art'),
    ctSplit: document.querySelectorAll('.fo-cta-title .mdrk-line').length,
    st: window.ScrollTrigger ? 'global' : 'n/a',
  };
}
"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errs = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(1500)
    print("AT TOP:", json.dumps(page.evaluate(PROBE), ensure_ascii=False))
    page.evaluate("window.scrollTo(0, 12075)")
    page.wait_for_timeout(80)
    print("T+80ms:", json.dumps(page.evaluate(PROBE), ensure_ascii=False))
    page.wait_for_timeout(2500)
    print("T+2.5s:", json.dumps(page.evaluate(PROBE), ensure_ascii=False))
    print("CONSOLE ERRORS:", errs[:6])
    ctx.close()
    b.close()
