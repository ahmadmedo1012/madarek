#!/usr/bin/env python3
"""record_first10s.py — first-10-seconds screen recordings, both sides (rubric §3.3).

Playwright video: for each (engine, vp, side) → create a recording context,
create the page, navigate, keep recording for `--seconds` (default 10) from
navigation start, close, rename the webm to
  <out>/<engine>-<vp>-<side>-first10s.webm
plus a manifest.json (urls, sizes, hashes, overlay policy note).

OVERLAY POLICY (rubric §3.4 — different from scripts/twin/capture.py):
  consent banners / cookie chrome / award badges are shown AS-IS on BOTH sides.
  No consent seeding, no CSS masking, no locale forcing (madarek is judged
  natively as Arabic/RTL). The ONLY allowed flag, --wheel, performs identical
  gentle user-like wheel nudges on BOTH sides at fixed times (default off).

CLI:
  python3 scripts/r333/judge/record_first10s.py --run-id run-001 \
      [--engines chromium,webkit] [--vps 1440,390] [--sides heron,madarek] \
      [--seconds 10] [--wheel] [--out-root /home/z/evidence-r333/judge] \
      [--dims 360=360x740]

Viewport dims come from scripts/twin/config.json (READ ONLY — twin is never
modified); vps absent from that config need --dims (e.g. 360=360x740).
Output: /home/z/evidence-r333/judge/run-<t>/first10s/
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, "/home/z/madarek/scripts/twin")
TWIN_CFG = json.loads(Path("/home/z/madarek/scripts/twin/config.json").read_text())
URLS = TWIN_CFG["urls"]
VPDIMS = {v["name"]: {"width": v["width"], "height": v["height"]}
          for v in TWIN_CFG["viewports"]}
UA_CHROMIUM = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
               "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")


def sha256_file(p: Path, n: int = 64) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:n]


def parse_dims(spec: str) -> dict:
    out = {}
    for part in filter(None, spec.split(",")):
        k, wh = part.split("=", 1)
        w, h = wh.lower().split("x")
        out[k.strip()] = {"width": int(w), "height": int(h)}
    return out


def record_one(pw, engine: str, vp: str, side: str, seconds: int,
               wheel: bool, dims: dict, out_dir: Path, url_override: str) -> dict:
    url = url_override or URLS[side]
    w, h = dims["width"], dims["height"]
    launch = getattr(pw, engine).launch
    browser = launch(headless=True)
    rec_entry = {
        "engine": engine, "vp": vp, "side": side, "url": url,
        "seconds": seconds, "viewport": [w, h], "wheel": wheel,
        "overlayPolicy": "as-is on BOTH sides (no consent seeding, no css mask, "
                         "no locale forcing)",
        "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    tmp = out_dir / f".rec-{engine}-{vp}-{side}"
    tmp.mkdir(parents=True, exist_ok=True)
    ctx = browser.new_context(
        viewport={"width": w, "height": h},
        device_scale_factor=1,
        user_agent=UA_CHROMIUM if engine == "chromium" else None,
        record_video_dir=str(tmp),
        record_video_size={"width": w, "height": h},
        locale="en-US" if side == "heron" else None,  # heron is EN; leave madarek native (RTL)
    )
    page = ctx.new_page()
    t0 = time.time()
    page.goto(url, wait_until="load", timeout=60000)
    # identical, symmetric interaction: two gentle wheel nudges at t≈4s and t≈8s
    marks = [4.0, 8.0] if wheel else []
    mi = 0
    while (time.time() - t0) < seconds:
        page.wait_for_timeout(100)
        if mi < len(marks) and (time.time() - t0) >= marks[mi]:
            page.mouse.wheel(0, 420)
            mi += 1
    page.close()
    video = page.video
    ctx.close()
    browser.close()
    src = Path(video.path())  # flushed once ctx+browser are closed
    dst = out_dir / f"{engine}-{vp}-{side}-first10s.webm"
    if dst.exists():
        dst.unlink()
    shutil.move(str(src), str(dst))
    shutil.rmtree(tmp, ignore_errors=True)
    rec_entry.update({"file": str(dst), "bytes": dst.stat().st_size,
                      "sha256_16": sha256_file(dst, 16)})
    print(f"[rec] {dst.name}  {rec_entry['bytes']}B", flush=True)
    return rec_entry


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--out-root", default="/home/z/evidence-r333/judge")
    ap.add_argument("--engines", default="chromium")
    ap.add_argument("--vps", default="1440,390")
    ap.add_argument("--sides", default="heron,madarek")
    ap.add_argument("--seconds", type=int, default=10)
    ap.add_argument("--wheel", action="store_true",
                    help="identical gentle wheel nudges at t=4s/8s on BOTH sides")
    ap.add_argument("--dims", default="", help="extra vp dims, e.g. 360=360x740")
    ap.add_argument("--url-override", default="", help="test hook: same URL for all sides")
    args = ap.parse_args()

    dims = dict(VPDIMS)
    dims.update(parse_dims(args.dims))
    out_dir = Path(args.out_root) / args.run_id / "first10s"
    out_dir.mkdir(parents=True, exist_ok=True)

    entries, errors = [], []
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        for engine in [e.strip() for e in args.engines.split(",") if e.strip()]:
            for vp in [v.strip() for v in args.vps.split(",") if v.strip()]:
                if vp not in dims:
                    errors.append(f"vp {vp} has no dims (pass --dims {vp}=WxH)")
                    continue
                for side in [s.strip() for s in args.sides.split(",") if s.strip()]:
                    try:
                        entries.append(record_one(
                            pw, engine, vp, side, args.seconds, args.wheel,
                            dims[vp], out_dir, args.url_override))
                    except Exception as e:
                        errors.append(f"{engine}/{vp}/{side}: {e!r}")
                        print(f"[rec] ERROR {engine}/{vp}/{side}: {e!r}", flush=True)

    mf_fp = out_dir / "manifest.json"
    mf = json.loads(mf_fp.read_text()) if mf_fp.exists() else {"entries": [], "errors": []}
    mf.setdefault("entries", []).extend(entries)
    mf.setdefault("errors", []).extend(errors)
    mf["generator"] = "record_first10s.py r333/1"
    mf["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    mf_fp.write_text(json.dumps(mf, indent=1))
    print(f"[rec] manifest {mf_fp} — {len(entries)} new, {len(mf['errors'])} errors total")
    if errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
