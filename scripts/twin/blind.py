#!/usr/bin/env python3
"""blind.py — A/B blind sheets for the Heron Twin run.

For one representative frame per section per side (p=50, fallback nearest
captured step): re-capture FRESH (new page, seek to the stored targetY) with an
injected blur stylesheet (headings/body text/logos blurred, layout intact),
save as  <run>/blind/<vp>/<section>-<A|B>.png  with RANDOMIZED A/B order per
section, and emit <run>/blind/<vp>/sheet.html pairing them.

The A/B key is recorded ONLY in <run>/blind/blind-key.json — never in the sheet.
"""
from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

import sys
sys.path.insert(0, str(Path(__file__).parent))
import driver  # noqa: E402

CFG = json.loads((Path(__file__).resolve().parent / "config.json").read_text())
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

CONSENT_SEED = "try { window.localStorage.setItem('madarek.consent','accepted'); } catch (e) {}"

SHEET_TMPL = """<!doctype html>
<html><head><meta charset="utf-8"><title>Blind A/B — Heron Twin</title>
<style>
 body {{ font-family: system-ui, sans-serif; background:#111; color:#eee; margin:2rem; }}
 .row {{ margin-bottom:2.5rem; }}
 .pair {{ display:flex; gap:12px; flex-wrap:wrap; }}
 .cell {{ background:#000; padding:6px; }}
 .cell img {{ display:block; max-width:46vw; height:auto; border:1px solid #333; }}
 .tag {{ font-weight:700; font-size:1.1rem; margin-bottom:4px; }}
</style></head><body>
<h1>Blind A/B — Heron Twin {run_name} — vp {vp}</h1>
<p>Which side is the reference? The key lives in blind-key.json, not here.</p>
{rows}
</body></html>
"""


def nearest_step(recs: dict, want: int = 50):
    if not recs:
        return None, None
    p = min(recs.keys(), key=lambda x: (abs(x - want), x))
    return p, recs[p]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", default=CFG["paths"]["defaultRun"])
    ap.add_argument("--vps", default="")
    args = ap.parse_args()
    run = Path(args.run)
    vps = args.vps.split(",") if args.vps else sorted(
        [d.name for d in run.iterdir() if d.is_dir() and d.name.isdigit()],
        key=lambda s: int(s))

    key = {"run": run.name, "seed": random.randrange(1 << 30), "vps": {}}
    rng = random.Random(key["seed"])

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for vp in vps:
            vdir = run / vp
            if not vdir.exists():
                continue
            bdir = run / "blind" / vp
            bdir.mkdir(parents=True, exist_ok=True)
            # viewport from config
            vpc = next(v for v in CFG["viewports"] if v["name"] == vp)
            vpdim = {"width": vpc["width"], "height": vpc["height"]}
            ctx = browser.new_context(viewport=vpdim, device_scale_factor=1,
                                      user_agent=UA, locale="en-US")
            ctx.add_init_script(CONSENT_SEED)
            key_v = {}
            rows = []
            recs_h = _load(vdir / "heron-records.jsonl")
            recs_m = _load(vdir / "madarek-records.jsonl")
            sections = sorted(set(recs_h) & set(recs_m))
            for sec in sections:
                p, rec = nearest_step(recs_h[sec])
                if rec is None:
                    continue
                # both sides must have the same p (they do — same walk)
                sides = {"heron": recs_h[sec], "madarek": recs_m[sec]}
                order = ["heron", "madarek"]
                rng.shuffle(order)
                assignment = {order[0]: "A", order[1]: "B"}
                imgs = {}
                for side in order:
                    p2, rec2 = nearest_step(sides[side])
                    if rec2 is None:
                        continue
                    page = ctx.new_page()
                    try:
                        page.goto(CFG["urls"][side], wait_until="networkidle",
                                  timeout=60000)
                        driver.ready(page, extra_ms=2000)
                        page.wait_for_timeout(1800)  # R332: entrance-fade guard — the first panel run caught mid-reveal frames (QA-1/QA-3 both flagged the wash-out asymmetry)
                        # R332 blind-panel policy: mask BOTH sides' consent chrome
                        # (heron cookie-banner + awwwards badge vs madarek seeded
                        # consent) — QA-3R: the asymmetry alone unblinds every pair.
                        page.add_style_tag(content=(
                            " .cookie-banner, .awwwards, [class*='cookie'], "
                            "[class*='awwwards'] { display: none !important; }"))
                        # prime reveal observers: sweep the target's neighborhood
                        # once (madarek's observers didn't settle in 6/9 pairs).
                        rng_top = max(0, int(rec2["targetY"]) - 900)
                        for yy in range(rng_top, int(rec2["targetY"]) + 900, 450):
                            driver.seek(page, side, yy, tol=4, retries=3)
                            page.wait_for_timeout(140)
                        driver.seek(page, side, rec2["targetY"])
                        driver.settle(page, 1400)
                        page.add_style_tag(content=CFG["blind"]["blurCss"])
                        page.wait_for_timeout(900)
                        fp = bdir / f"{sec}-{assignment[side]}.png"
                        page.screenshot(path=str(fp))
                        imgs[assignment[side]] = fp.name
                    except Exception as e:
                        rows.append(f"<div class='row'><b>{sec}</b> {side} ERROR {e}</div>")
                    finally:
                        page.close()
                key_v[sec] = {"A": assignment.get("A", order[0]),
                              "B": assignment.get("B", order[1]), "p": p}
                if len(imgs) == 2:
                    rows.append(
                        f"<div class='row'><div class='tag'>{sec} (vp {vp})</div>"
                        f"<div class='pair'><div class='cell'><div class='tag'>A</div>"
                        f"<img src='{imgs['A']}'></div>"
                        f"<div class='cell'><div class='tag'>B</div>"
                        f"<img src='{imgs['B']}'></div></div></div>")
                print(f"[blind {vp}] {sec}: A={assignment.get('A')} "
                      f"B={assignment.get('B')} p={p}", flush=True)
            key["vps"][vp] = key_v
            (bdir / "sheet.html").write_text(
                SHEET_TMPL.format(run_name=run.name, vp=vp, rows="\n".join(rows)),
                encoding="utf-8")
            ctx.close()
        browser.close()

    kfp = run / "blind" / "blind-key.json"
    kfp.parent.mkdir(parents=True, exist_ok=True)
    kfp.write_text(json.dumps(key, indent=1))
    print("WROTE", kfp, flush=True)


def _load(fp: Path):
    out = {}
    if not fp.exists():
        return out
    for line in fp.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
            out.setdefault(r["section"], {})[r["p"]] = r
        except Exception:
            continue
    return out


if __name__ == "__main__":
    main()
