#!/usr/bin/env python3
"""probe.py — one-shot DOM probe of heron live + madarek local.

Verifies, per side:
  · scroller architecture (.main-inner for heron / window+__mdrkLenis for madarek)
  · section selectors exist + absolute document ranges (top, height)
  · exposed globals (gsap / ScrollTrigger / lenis)
  · fonts status + html font-size (rem base)

Writes JSON to <outdir>/probe-<vp>.json (heavy-evidence area, outside repo).
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HERON_URL = "https://heronaiapp.com/"
MADAREK_URL = "http://localhost:5173/"
CONSENT_SEED = "window.localStorage.setItem('madarek.consent','accepted');"

HERON_SECTIONS = {
    "hero": ".home-hero-wrap",
    "statement": ".home-intro-wrap",
    "pains": ".home-problem-wrap",
    "journey": ".home-map-wrap",
    "platform": ".home-platform-wrap",
    "why": ".home-why-wrap",
    "roles": ".home-usecase-wrap",
    "cta": ".home-cta-wrap",
    "footer": ".footer-wrap, footer-wrap, footer",
}
MADAREK_SECTIONS = {
    "hero": "section.fo-hero.hro",
    "statement": "#statement",
    "pains": "#live",
    "journey": "#chapters",
    "platform": "#product",
    "why": ".wy-section",
    "roles": "#roles",
    "cta": "#vision",
    "footer": "footer.fo-footer",
}

RANGE_JS = """
(seed) => {
  const out = {};
  for (const [name, sel] of Object.entries(seed)) {
    let el = null;
    for (const s of sel.split(',').map(s => s.trim())) {
      el = document.querySelector(s);
      if (el) break;
    }
    if (!el) { out[name] = null; continue; }
    const r = el.getBoundingClientRect();
    const sc = (window.__mdrkProbeScrollerTop ?? window.scrollY) || 0;
    out[name] = {
      selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).filter(Boolean).slice(0,3).join('.') : ''),
      top: Math.round((r.top + sc) * 10) / 10,
      height: Math.round(r.height * 10) / 10,
    };
  }
  return out;
}
"""

SCROLLER_JS = """
() => {
  const g = {};
  for (const k of ['gsap', 'ScrollTrigger', 'lenis', 'Lenis', 'barba', 'jQuery', 'Swiper', '__mdrkLenis']) {
    try { g[k] = typeof window[k]; } catch { g[k] = 'err'; }
  }
  const mi = document.querySelector('.main-inner');
  const bi = document.querySelector('.body-inner');
  const de = document.documentElement;
  return {
    globals: g,
    mainInner: mi ? { scrollHeight: mi.scrollHeight, clientHeight: mi.clientHeight, scrollTop: mi.scrollTop, overflowX: getComputedStyle(mi).overflowX, overflowY: getComputedStyle(mi).overflowY } : null,
    bodyInner: bi ? { scrollHeight: bi.scrollHeight, clientHeight: bi.clientHeight, overflow: getComputedStyle(bi).overflow } : null,
    htmlFontSize: getComputedStyle(de).fontSize,
    htmlDir: de.getAttribute('dir'),
    docScrollHeight: de.scrollHeight,
    winScrollY: window.scrollY,
    fontsStatus: document.fonts ? document.fonts.status : 'n/a',
    lenisHandle: typeof window.__mdrkLenis,
    lenisLimit: (() => { try { return window.__mdrkLenis ? { limit: window.__mdrkLenis.limit, velocity: window.__mdrkLenis.velocity, target: window.__mdrkLenis.targetScroll } : null; } catch (e) { return 'err:' + e.message; } })(),
  };
}
"""


def probe(page, url, sections, label, wait_extra_ms=2500):
    t0 = time.time()
    page.goto(url, wait_until="networkidle", timeout=45000)
    page.wait_for_timeout(wait_extra_ms)
    try:
        page.evaluate("() => document.fonts ? document.fonts.ready : null")
    except Exception:
        pass
    page.wait_for_timeout(500)
    info = page.evaluate(SCROLLER_JS)
    # probe scroller top: heron uses .main-inner, madarek uses window
    scroller_top = 0.0
    if info.get("mainInner"):
        scroller_top = info["mainInner"]["scrollTop"] or 0.0
    else:
        scroller_top = info.get("winScrollY") or 0.0
    ranges = page.evaluate(
        "(seed) => { window.__mdrkProbeScrollerTop = arguments !== undefined ? null : null; return null; }",
        sections,
    ) if False else None
    # evaluate with scroller top injected
    ranges = page.evaluate(
        """(args) => {
             const { seed, sc } = args;
             const out = {};
             for (const [name, sel] of Object.entries(seed)) {
               let el = null;
               for (const s of sel.split(',').map(s => s.trim())) {
                 el = document.querySelector(s);
                 if (el) break;
               }
               if (!el) { out[name] = null; continue; }
               const r = el.getBoundingClientRect();
               out[name] = {
                 selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).filter(Boolean).slice(0,3).join('.') : ''),
                 top: Math.round((r.top + sc) * 10) / 10,
                 height: Math.round(r.height * 10) / 10,
                 display: getComputedStyle(el).display,
               };
             }
             return out;
           }""",
        {"seed": sections, "sc": scroller_top},
    )
    return {"label": label, "url": url, "loadMs": int((time.time() - t0) * 1000), "scroller": info, "sections": ranges}


def main():
    vp = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
    vh = {"1440": 900, "390": 844}.get(str(vp), 900 if vp >= 768 else 700)
    outdir = Path("/home/z/evidence-r332/twin/probe")
    outdir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": vp, "height": vh},
            device_scale_factor=1,
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
            locale="en-US",
        )
        ctx.add_init_script(CONSENT_SEED)
        # heron
        ph = ctx.new_page()
        try:
            heron = probe(ph, HERON_URL, HERON_SECTIONS, "heron")
        except Exception as e:
            heron = {"label": "heron", "error": repr(e)}
        ph.close()
        # madarek
        pm = ctx.new_page()
        try:
            madarek = probe(pm, MADAREK_URL, MADAREK_SECTIONS, "madarek")
        except Exception as e:
            madarek = {"label": "madarek", "error": repr(e)}
        pm.close()
        browser.close()
    out = {"viewport": {"width": vp, "height": vh}, "heron": heron, "madarek": madarek}
    outp = outdir / f"probe-{vp}.json"
    outp.write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print("WROTE", outp)
    # console summary
    for side in ("heron", "madarek"):
        d = out[side]
        if "error" in d:
            print(f"[{side}] ERROR {d['error']}")
            continue
        sc = d["scroller"]
        print(f"[{side}] mainInner={bool(sc['mainInner'])} lenisHandle={sc['lenisHandle']} "
              f"htmlFont={sc['htmlFontSize']} dir={sc['htmlDir']} fonts={sc['fontsStatus']}")
        if sc.get("lenisLimit") and isinstance(sc["lenisLimit"], dict):
            print(f"   lenis limit={sc['lenisLimit']['limit']:.0f} target={sc['lenisLimit']['target']:.0f}")
        if sc.get("mainInner"):
            print(f"   .main-inner scrollHeight={sc['mainInner']['scrollHeight']} clientH={sc['mainInner']['clientHeight']}")
        for name, rng in d["sections"].items():
            if rng is None:
                print(f"   {name:10s} MISSING")
            else:
                print(f"   {name:10s} top={rng['top']:>8.0f} h={rng['height']:>8.0f}  {rng['selector'][:60]}")


if __name__ == "__main__":
    main()
