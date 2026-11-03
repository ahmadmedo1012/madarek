#!/usr/bin/env python3
"""pf-gap-probe.py — P-F: attribute the cta/footer trigger-start offset.

Measures absolute document tops of platform/why/roles (+ journey, cta) on BOTH
sides at one viewport, in one dev-once call, to find where the pre-cta stack
offset between heron and madarek comes from.

Usage: bash scripts/r333/dev-once.sh --web-only -- python3 scripts/r333/pf-gap-probe.py --vp 1920
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

sys.path.insert(0, "/home/z/madarek/scripts/twin")
import driver  # noqa: E402
from playwright.sync_api import sync_playwright

CFG = json.loads(Path("/home/z/madarek/scripts/twin/config.json").read_text())

ap = argparse.ArgumentParser()
ap.add_argument("--vp", default="1920")
a = ap.parse_args()
vp = {v["name"]: v for v in CFG["viewports"]}[a.vp]
sel = {s["section"]: s for s in CFG["sectionMap"]}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]},
                              device_scale_factor=1, locale="en-US")
    out = {}
    for side in ("heron", "madarek"):
        page = ctx.new_page()
        page.goto(CFG["urls"][side], wait_until="networkidle", timeout=60000)
        driver.ready(page, extra_ms=2000)
        page.wait_for_timeout(800)
        sc0 = driver.scroller_top(page, side)
        res = {}
        for name in ("journey", "platform", "why", "roles", "cta", "footer"):
            s = sel[name][side]
            r = page.evaluate(
                """([s, sc]) => { const el = document.querySelector(s);
                     if (!el) return null;
                     const b = el.getBoundingClientRect();
                     return { top: +(b.top + sc).toFixed(1), h: +b.height.toFixed(1) }; }""",
                [s, sc0])
            res[name] = r
        out[side] = res
        print(side, json.dumps(res), flush=True)
        page.close()
    browser.close()

print("\n-- tops side by side (heron vs madarek, Δ) --")
for name in ("journey", "platform", "why", "roles", "cta", "footer"):
    h, m = out["heron"].get(name), out["madarek"].get(name)
    if h and m:
        print(f"{name:9s} H.top={h['top']:9.1f} h={h['h']:7.1f} | "
              f"M.top={m['top']:9.1f} h={m['h']:7.1f} | Δtop={h['top']-m['top']:+8.1f}")
    else:
        print(f"{name:9s} MISSING heron={bool(h)} madarek={bool(m)}")
