#!/usr/bin/env python3
"""capture.py — Heron Twin frame capture.

ONE browser instance, TWO pages (heron live + madarek local). For each section
× side: find the section's absolute document range (top, height) at scroll 0,
then walk progress p ∈ {0,2,…,100}% of the section's scrollable span
(target y = top + p/100·(height − vh), clamped to [0, maxScroll]), seek EXACTLY,
settle, full-frame screenshot + JSON geometry/motion record.

CLI:
  python3 scripts/twin/capture.py --vp 1440 --sections hero,statement --out DIR

Resumable: existing (section, side, p) PNG + record pairs are skipped.
Output layout (outside the repo):
  DIR/<vp>/<section>/<side>-p<pct>.png     — frames
  DIR/<vp>/<side>-records.jsonl            — one JSON record per frame
  DIR/<vp>/ranges.json                     — measured section ranges + maxScroll
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

import sys
sys.path.insert(0, str(Path(__file__).parent))
import driver  # noqa: E402

ROOT = Path(__file__).resolve().parent
CFG = json.loads((ROOT / "config.json").read_text())

CONSENT_SEED = """
try { window.localStorage.setItem('madarek.consent', 'accepted'); } catch (e) {}
"""
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vp", required=True)
    ap.add_argument("--sections", default=",".join(s["section"] for s in CFG["sectionMap"]))
    ap.add_argument("--out", default=CFG["paths"]["defaultRun"])
    ap.add_argument("--sides", default="heron,madarek")
    ap.add_argument("--step", type=int, default=None,
                    help="override progress step pct (e.g. 10 for a smoke run)")
    ap.add_argument("--engine", default="chromium", choices=["chromium", "webkit"],
                    help="browser engine; webkit needs the r333 userland lib fix "
                         "(scripts/r333/webkit-userland.sh) + software-EGL env vars "
                         "set before this process starts")
    return ap.parse_args()


def load_done(fp: Path) -> set:
    done = set()
    if fp.exists():
        for line in fp.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
                done.add((r["section"], r["p"]))
            except Exception:
                continue
    return done


def measure_ranges(page, side: str, sections: list) -> dict:
    """At scroll 0: absolute document top/height per section selector."""
    selmap = {s["section"]: s[side] for s in CFG["sectionMap"] if s["section"] in sections}
    # evaluate with the side-specific scroller top injected from python
    sc0 = driver.scroller_top(page, side)
    ranges = page.evaluate(
        """(args) => {
             const { seed, sc } = args;
             const out = {};
             for (const [name, sel] of Object.entries(seed)) {
               const el = document.querySelector(sel);
               if (!el) { out[name] = null; continue; }
               const r = el.getBoundingClientRect();
               out[name] = { top: +(r.top + sc).toFixed(1), height: +r.height.toFixed(1) };
             }
             return out;
           }""", {"seed": selmap, "sc": sc0})
    return ranges


def capture_side(page, side: str, url: str, vp: dict, sections: list, outdir: Path,
                 done: set, step: int = None) -> dict:
    cap = dict(CFG["capture"])
    if step:
        cap["progressStepPct"] = step
    page.goto(url, wait_until="networkidle", timeout=60000)
    driver.ready(page, extra_ms=2500)
    page.wait_for_timeout(1000)

    # R332 blind-panel policy (QA-3R finding): BOTH sides' consent/cookie
    # chrome and badge overlays are masked — heron's `.cookie-banner` +
    # `.awwwards` badge unblind every pair (present 9/9) while madarek's
    # consent is seeded away (0/9). Consent UI is out of structure scope.
    page.add_style_tag(content=(
        " .cookie-banner, .awwwards, [class*='cookie'], [class*='awwwards'] "
        " { display: none !important; }"))

    # R332 blind-panel policy (QA-1R/QA-3R finding): madarek's reveal
    # system did not settle within the capture budget in 6/9 pairs —
    # prime every intersection observer by sweeping the section range
    # once before the capture loop (the observers fire on intersection;
    # the sweep seat-fires them, the seeks below then find settled states).
    maxscroll = driver.max_scroll(page, side)
    ranges = measure_ranges(page, side, sections)
    sweep_lo = min([r["top"] for r in ranges.values() if r] or [0])
    sweep_hi = max([r["top"] + r["height"] for r in ranges.values() if r] or [0])
    step = max(400, vp["height"] // 2)
    yy = max(0, sweep_lo - vp["height"])
    while yy <= min(sweep_hi + vp["height"], maxscroll):
        driver.seek(page, side, yy, tol=cap["seekTolerancePx"], retries=3)
        page.wait_for_timeout(120)
        yy += step

    ranges = measure_ranges(page, side, sections)

    rec_fp = outdir / f"{side}-records.jsonl"
    rec_fp.parent.mkdir(parents=True, exist_ok=True)
    missing = [s for s in sections if ranges.get(s) is None]
    if missing:
        print(f"  [{side}] WARNING no element for: {missing}", flush=True)

    n_new = 0
    with open(rec_fp, "a", encoding="utf-8") as recf:
        for sname in sections:
            rng = ranges.get(sname)
            if rng is None:
                continue
            top, height = rng["top"], rng["height"]
            span = max(0.0, height - vp["height"])
            secdir = outdir / sname
            secdir.mkdir(parents=True, exist_ok=True)
            selmap = {s["section"]: s[side] for s in CFG["sectionMap"]}
            for p in range(cap["progressStartPct"], cap["progressEndPct"] + 1,
                           cap["progressStepPct"]):
                if (sname, p) in done:
                    continue
                y = top + (p / 100.0) * span
                y = max(0.0, min(y, maxscroll))
                t0 = time.time()
                seekinfo = driver.seek(page, side, y, tol=cap["seekTolerancePx"],
                                       retries=cap["seekRetries"])
                driver.settle(page, cap["settleMs"])
                pct = f"{p:03d}"
                png = secdir / f"{side}-p{pct}.png"
                page.screenshot(path=str(png))
                geo = driver.geometry_record(page, side, selmap[sname], vp)
                motion = driver.motion_state(page, side, selmap[sname])
                rec = {
                    "section": sname, "side": side, "p": p,
                    "targetY": round(y, 1),
                    "scrollY": round(driver.scroller_top(page, side), 1),
                    "seek": seekinfo, "range": rng, "maxScroll": round(maxscroll, 1),
                    "geometry": geo, "motion": motion,
                    "captureMs": int((time.time() - t0) * 1000),
                    "ts": time.strftime("%H:%M:%S"),
                }
                recf.write(json.dumps(rec, ensure_ascii=False) + "\n")
                recf.flush()
                n_new += 1
                if p % 10 == 0:
                    print(f"  [{side}] {sname} p={p} y={y:.0f} ok={seekinfo['ok']} "
                          f"({rec['captureMs']}ms)", flush=True)
    return {"ranges": ranges, "maxScroll": round(maxscroll, 1), "newFrames": n_new}


def main():
    args = parse_args()
    vps = {v["name"]: v for v in CFG["viewports"]}
    if args.vp not in vps:
        raise SystemExit(f"unknown vp {args.vp}; config has {list(vps)}")
    vp = {"width": vps[args.vp]["width"], "height": vps[args.vp]["height"]}
    sections = [s.strip() for s in args.sections.split(",") if s.strip()]
    known = {s["section"] for s in CFG["sectionMap"]}
    unknown = [s for s in sections if s not in known]
    if unknown:
        raise SystemExit(f"unknown sections {unknown}")
    outdir = Path(args.out) / args.vp
    outdir.mkdir(parents=True, exist_ok=True)

    sides = [s.strip() for s in args.sides.split(",") if s.strip()]
    results = {}
    t0 = time.time()
    with sync_playwright() as pw:
        browser = getattr(pw, args.engine).launch(headless=True)
        ctx = browser.new_context(viewport=vp, device_scale_factor=1,
                                  user_agent=UA, locale="en-US")
        ctx.add_init_script(CONSENT_SEED)
        for side in sides:
            url = CFG["urls"][side]
            print(f"[capture] vp={args.vp} side={side} url={url} "
                  f"sections={sections}", flush=True)
            page = ctx.new_page()
            done = load_done(outdir / f"{side}-records.jsonl")
            try:
                results[side] = capture_side(page, side, url, vp, sections, outdir,
                                             done, step=args.step)
            except Exception as e:
                results[side] = {"error": repr(e)}
            finally:
                page.close()
        browser.close()

    ranges_fp = outdir / "ranges.json"
    try:
        existing = json.loads(ranges_fp.read_text()) if ranges_fp.exists() else {}
    except Exception:
        existing = {}
    for side, r in results.items():
        if "ranges" in r:
            existing.setdefault(side, {}).update(r["ranges"])
            existing[side]["maxScroll"] = r["maxScroll"]
    ranges_fp.write_text(json.dumps(existing, indent=1))

    summary = {"vp": args.vp, "engine": args.engine, "sections": sections,
               "elapsedS": int(time.time() - t0),
               "sides": {k: {kk: vv for kk, vv in v.items() if kk != "ranges"}
                         for k, v in results.items()}}
    (outdir / "capture-summary.json").write_text(json.dumps(summary, indent=1))
    print(json.dumps(summary, indent=1), flush=True)
    print(f"[capture] DONE in {summary['elapsedS']}s", flush=True)


if __name__ == "__main__":
    main()
