#!/usr/bin/env python3
"""report.py — Heron Twin per-section verdicts (numbers only).

For every viewport dir in the run:
  · per side/section: medians across progress steps
      - heading font-size (first heading element)
      - vertical rhythm: median inter-child gutter
  · section height Δ% (heron vs madarek), trigger-start Δpx (top − vh)
  · side-by-side strips @ p=0/50/100 and diff heatmaps (PIL ImageChops +
    numpy — no odiff)
  · verdict PASS / FAIL / PARTIAL per config thresholds:
      PASS = all 4 within; FAIL = any metric > 2× threshold; else PARTIAL

Writes: <run>/report/vp-<vp>/…  +  <run>/report.json  +  <run>/report.md
"""
from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

import sys
sys.path.insert(0, str(Path(__file__).parent))
CFG = json.loads((Path(__file__).resolve().parent / "config.json").read_text())

TH = CFG["thresholds"]


def median(vals):
    vals = [v for v in vals if v is not None]
    return statistics.median(vals) if vals else None


def load_records(fp: Path):
    out = {}
    if not fp.exists():
        return out
    for line in fp.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        out.setdefault(r["section"], {})[r["p"]] = r
    return out


def section_metrics(recs: dict):
    """recs: {p: record}. Returns medians for one side/section.

    Primary heading = per-step LARGEST font-size among recorded
    h1–h4/[class*=title] elements (the band's display type), then median
    across steps.

    Rhythm = median of NON-NEGATIVE inter-child gaps, and ONLY when the band
    is a plain stack: if ANY negative gap exists (layered/sticky composition,
    boxes overlapping), the side's rhythm is n/a — a positive gap inside a
    layered band is leftover structure, not rhythm. Fully-composed bands
    (no ≥2 major boxes) are also n/a.
    """
    heads, guts, tops = [], [], []
    heights, nneg, npos = [], 0, 0
    for p in sorted(recs):
        g = recs[p].get("geometry") or {}
        if not g.get("found"):
            continue
        hs = g.get("headings") or []
        if hs:
            heads.append(max(h["fontSizePx"] for h in hs if h.get("fontSizePx")))
        for x in (g.get("gutters") or []):
            if x >= 0:
                guts.append(x)
                npos += 1
            else:
                nneg += 1
        heights.append(recs[p]["range"]["height"])
        tops.append(recs[p]["range"]["top"])
    layered = nneg > 0
    return {
        "headingFontSize": median(heads),
        "rhythmGap": None if (layered or not guts) else median(guts),
        "height": median(heights),
        "top": median(tops),
        "rhythmGapsPositive": npos,
        "rhythmGapsNegative": nneg,
        "rhythmLayered": layered,
    }


def verdict(deltas: dict):
    over = {k: v for k, v in deltas.items() if v is not None and v["over"]}
    within = {k: v for k, v in deltas.items() if v is not None and not v["over"]}
    if not over and len(within) == len(deltas):
        return "PASS", over
    if any(v["ratio"] > 2.0 for v in over.values()):
        return "FAIL", over
    return "PARTIAL", over


def delta(a, b, kind):
    if a is None or b is None:
        return None
    if kind == "pct":
        base = abs(b) if b else None
        if not base:
            return None
        d = abs(a - b) / base * 100.0
    else:
        base = TH["triggerStartDeltaPx"] if kind == "px_trigger" else None
        d = abs(a - b)
    return d


def pct_delta(a, b, threshold):
    d = delta(a, b, "pct")
    if d is None:
        return None
    return {"delta": round(d, 2), "threshold": threshold,
            "ratio": round(d / threshold, 2), "over": d > threshold}


def px_delta(a, b, threshold):
    d = delta(a, b, "px")
    if d is None:
        return None
    return {"delta": round(d, 1), "threshold": threshold,
            "ratio": round(d / threshold, 2), "over": d > threshold}


def strip_and_heat(vdir: Path, repdir: Path, section: str, recs: dict, vp: dict):
    """Side-by-side strip at 0/50/100 + diff heatmap at 0/50/100."""
    steps = [0, 50, 100]
    cells, heat_stats = [], []
    for p in steps:
        imgs = {}
        for side in ("heron", "madarek"):
            rec = recs[side].get(p) or recs[side].get(p + 1) or recs[side].get(p - 1)
            if rec is None:
                continue
            fp = vdir / section / f"{side}-p{rec['p']:03d}.png"
            if fp.exists():
                imgs[side] = (Image.open(fp).convert("RGB"), rec["p"])
        if len(imgs) < 2:
            continue
        h_img, m_img = imgs["heron"], imgs["madarek"]
        hm = h_img[0].resize((m_img[0].width, m_img[0].height))
        diff = ImageChops.difference(hm, m_img[0])
        gray = diff.convert("L")
        heat = ImageOps.autocontrast(gray)
        import numpy as np
        arr = np.asarray(gray, dtype=np.uint8)
        heat_stats.append({"p": p, "meanDiff": round(float(arr.mean()), 2),
                           "pctPxOver32": round(float((arr > 32).mean() * 100), 2)})
        hp = repdir / f"{section}-heat-p{p:03d}.png"
        heat.save(hp)
        # cells for the strip: [H, M] pairs per step
        target_h = 240
        for side, (im, actual_p) in imgs.items():
            w = int(im.width * target_h / im.height)
            cells.append((f"{side[:1].upper()}@p{actual_p:03d}", im.resize((w, target_h))))
    if not cells:
        return None
    # strip layout: groups of 2 per step
    pad, label_h = 6, 18
    groups = [cells[i:i + 2] for i in range(0, len(cells), 2)]
    group_ws = [sum(im.width for _, im in g) + pad * (len(g) + 1) for g in groups]
    W = max(group_ws)
    H = label_h + len(groups) * (240 + pad + label_h) + pad
    canvas = Image.new("RGB", (W, H), (18, 18, 18))
    d = ImageDraw.Draw(canvas)
    y = pad
    for g, gw in zip(groups, group_ws):
        x = pad
        d.text((x, y), " | ".join(f"{lbl} ({im.width}×{im.height})" for lbl, im in g),
               fill=(240, 240, 240))
        y += label_h
        for lbl, im in g:
            canvas.paste(im, (x, y))
            x += im.width + pad
        y += 240 + pad
    sp = repdir / f"{section}-strip.png"
    canvas.save(sp)
    return {"strip": sp.name, "heat": heat_stats}


def heron_wrap_trigger(recs: dict, heron_sel: str):
    """Supplementary: heron's own ScrollTrigger record for the section wrap.

    Heron exposes window.ScrollTrigger; the driver records matching triggers
    per frame. Returns the numeric start/end (scroller px) of the trigger whose
    element IS the section wrap.
    """
    cls = heron_sel.lstrip(".").split()[0]
    for p in sorted(recs):
        sts = ((recs[p].get("motion") or {}).get("scrollTriggers") or [])
        for t in sts:
            tc = str(t.get("triggerCls", ""))
            if tc.split()[0].split(".")[0] == cls:
                return {"start": t.get("start"), "end": t.get("end"),
                        "pin": t.get("pin"), "progress@p": t.get("progress")}
    return None


def process_vp(run: Path, vp: str) -> dict:
    vdir = run / vp
    repdir = run / "report" / f"vp-{vp}"
    repdir.mkdir(parents=True, exist_ok=True)
    ranges = {}
    rfp = vdir / "ranges.json"
    if rfp.exists():
        ranges = json.loads(rfp.read_text())
    vh = None
    # viewport height from any record
    for side in ("heron", "madarek"):
        recs = load_records(vdir / f"{side}-records.jsonl")
        for s in recs.values():
            for r in s.values():
                g = r.get("geometry") or {}
                if g.get("viewport"):
                    vh = g["viewport"]["vh"]
                    break
            if vh:
                break
        if vh:
            break
    vph = vh or 900

    recs_h = load_records(vdir / "heron-records.jsonl")
    recs_m = load_records(vdir / "madarek-records.jsonl")
    sections = sorted(set(recs_h) | set(recs_m))
    out = {"vp": vp, "viewportHeight": vph, "sections": {}}

    for sec in sections:
        mh = section_metrics(recs_h.get(sec, {}))
        mm = section_metrics(recs_m.get(sec, {}))
        heron_sel = next((s["heron"] for s in CFG["sectionMap"] if s["section"] == sec), "")
        stw = heron_wrap_trigger(recs_h.get(sec, {}), heron_sel)
        vh_h = (ranges.get("heron", {}).get(sec, {}) or {})
        vh_m = (ranges.get("madarek", {}).get(sec, {}) or {})
        h_h = mh["height"] if mh["height"] is not None else vh_h.get("height")
        h_m = mm["height"] if mm["height"] is not None else vh_m.get("height")
        deltas = {
            "sectionHeightPct": pct_delta(h_h, h_m, TH["sectionHeightDeltaPct"]),
            "headingFontSizePct": pct_delta(mh["headingFontSize"], mm["headingFontSize"],
                                            TH["headingFontSizeDeltaPct"]),
            "rhythmGapPx": px_delta(mh["rhythmGap"], mm["rhythmGap"],
                                    TH["rhythmMedianGapDeltaPx"]),
        }
        # trigger start = top − vh (document px where the section top meets viewport bottom)
        ts_h = (mh["top"] if mh["top"] is not None else vh_h.get("top"))
        ts_m = (mm["top"] if mm["top"] is not None else vh_m.get("top"))
        tsh = (ts_h - vph) if ts_h is not None else None
        tsm = (ts_m - vph) if ts_m is not None else None
        deltas["triggerStartPx"] = px_delta(tsh, tsm, TH["triggerStartDeltaPx"])
        v, over = verdict(deltas)
        missing = [k for k, dv in deltas.items() if dv is None]
        vis = strip_and_heat(vdir, repdir, sec, {"heron": recs_h.get(sec, {}),
                                                 "madarek": recs_m.get(sec, {})},
                             {"width": 0, "height": vph})
        out["sections"][sec] = {
            "heron": mh, "madarek": mm,
            "heronWrapTrigger": stw,
            "triggerStart": {"heronPx": round(tsh, 1) if tsh is not None else None,
                             "madarekPx": round(tsm, 1) if tsm is not None else None},
            "deltas": deltas, "verdict": v, "overThreshold": over,
            "missingMetrics": missing,
            "frames": {"heron": len(recs_h.get(sec, {})), "madarek": len(recs_m.get(sec, {}))},
            "visual": vis,
        }
        print(f"[{vp}] {sec:10s} {v:8s} hΔ%={deltas['sectionHeightPct'] and deltas['sectionHeightPct']['delta']} "
              f"fsΔ%={deltas['headingFontSizePct'] and deltas['headingFontSizePct']['delta']} "
              f"rhythmΔ={deltas['rhythmGapPx'] and deltas['rhythmGapPx']['delta']}px "
              f"trigΔ={deltas['triggerStartPx'] and deltas['triggerStartPx']['delta']}px "
              f"frames H:{out['sections'][sec]['frames']['heron']} "
              f"M:{out['sections'][sec]['frames']['madarek']}"
              + (f" n/a:{','.join(missing)}" if missing else ""), flush=True)
    return out


def write_markdown(run: Path, report: dict):
    md = ["# Heron Twin — run report (numbers only)",
          "",
          f"Spec of record: `{CFG['meta']['specOfRecord']}` — thresholds: "
          f"height Δ≤{TH['sectionHeightDeltaPct']}%, heading font-size Δ≤{TH['headingFontSizeDeltaPct']}%, "
          f"rhythm median gap Δ≤{TH['rhythmMedianGapDeltaPx']}px, trigger start Δ≤{TH['triggerStartDeltaPx']}px.",
          "Verdict rule: " + CFG["verdictRule"],
          ""]
    for vpname, vpdata in report.items():
        md.append(f"## viewport {vpname} (vh={vpdata['viewportHeight']})")
        md.append("")
        md.append("| section | verdict | height Δ% (≤3) | heading fs Δ% (≤4) | rhythm Δpx (≤8) | trigger Δpx (≤40) | frames H/M | meanDiff@p50 |")
        md.append("|---|---|---|---|---|---|---|---|")
        for sec, s in vpdata["sections"].items():
            d = s["deltas"]
            def cell(x):
                return "—" if x is None else f"{x['delta']}{'!' if x['over'] else ''}"
            p50 = next((h for h in (s.get("visual") or {}).get("heat", []) if h["p"] == 50), None)
            md.append(f"| {sec} | **{s['verdict']}** | {cell(d['sectionHeightPct'])} "
                      f"| {cell(d['headingFontSizePct'])} | {cell(d['rhythmGapPx'])} "
                      f"| {cell(d['triggerStartPx'])} | {s['frames']['heron']}/{s['frames']['madarek']} "
                      f"| {'—' if p50 is None else p50['meanDiff']} |")
        md.append("")
        for sec, s in vpdata["sections"].items():
            md.append(f"### {sec} — {s['verdict']}")
            md.append(f"- heron: height={s['heron']['height']} heading={s['heron']['headingFontSize']} "
                      f"rhythm={s['heron']['rhythmGap']} (gaps +{s['heron'].get('rhythmGapsPositive', 0)}/-{s['heron'].get('rhythmGapsNegative', 0)}) "
                      f"top={s['heron']['top']}")
            md.append(f"- madarek: height={s['madarek']['height']} heading={s['madarek']['headingFontSize']} "
                      f"rhythm={s['madarek']['rhythmGap']} (gaps +{s['madarek'].get('rhythmGapsPositive', 0)}/-{s['madarek'].get('rhythmGapsNegative', 0)}) "
                      f"top={s['madarek']['top']}")
            md.append(f"- triggerStart: heron={s['triggerStart']['heronPx']}px "
                      f"madarek={s['triggerStart']['madarekPx']}px  "
                      f"(geometric top−vh both sides; madarek exposes no ST handle)")
            if s.get("heronWrapTrigger"):
                hw = s["heronWrapTrigger"]
                md.append(f"- heron own ScrollTrigger for wrap: start={hw['start']} "
                          f"end={hw['end']} pin={hw['pin']}")
            if s.get("missingMetrics"):
                md.append(f"- n/a metrics (no comparable signal on one/both sides): "
                          f"{', '.join(s['missingMetrics'])}")
            if s["overThreshold"]:
                md.append(f"- OVER: {json.dumps(s['overThreshold'])}")
            md.append("")
    (run / "report.md").write_text("\n".join(md), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", default=CFG["paths"]["defaultRun"])
    args = ap.parse_args()
    run = Path(args.run)
    vps = sorted([d.name for d in run.iterdir()
                  if d.is_dir() and d.name.isdigit()], key=lambda s: int(s))
    report = {}
    for vp in vps:
        report[vp] = process_vp(run, vp)
    (run / "report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
    write_markdown(run, report)
    print("WROTE", run / "report.json", "and", run / "report.md", flush=True)


if __name__ == "__main__":
    main()
