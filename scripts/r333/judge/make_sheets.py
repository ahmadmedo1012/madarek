#!/usr/bin/env python3
"""make_sheets.py — R333 judge evidence sheets from a Twin capture run.

Builds the blinded reviewer evidence for the absolute 12-criterion rubric
(docs/redesign/r333/rubric.md + judge-protocol.md) out of an existing Twin
frame capture (scripts/twin/capture.py output — do NOT modify scripts/twin/*).

What it builds (default roots under /home/z/evidence-r333/judge/):
  run-<t>/sheets/<vp>/<section>.png      filmstrip grid: header = progress %,
                                         row A + row B = the two sides at
                                         IDENTICAL progress steps. A/B order is
                                         randomized per (vp, section) with a
                                         seeded permutation. md cannot animate,
                                         so sequences are filmstrips — fixed
                                         evenly-spaced steps chosen at build
                                         time (reviewers cannot re-pick frames).
  run-<t>/calibration/<vp>/<section>.png Heron-only strips, open label — the
                                         calibration pass of the protocol.
  run-<t>/sheets-index.json              SIDE-BLIND manifest (verify input).
  run-<t>/forms/reviewer-{1,2,3}.json    score-form templates (protocol §2).
  keys/run-<t>.json                      SEALED A/B key (mode 600, outside the
                                         repo). Opened once, post-lock, by the
                                         lead. Never inside the repo/run dir.

Missing frames/sides are rendered as gray `MISSING p=NNN` placeholder cells and
marked incomplete in the manifest — missing evidence is visible, never dropped.

CLI:
  python3 scripts/r333/judge/make_sheets.py \
      --frames-root /home/z/evidence-r333/twin/run-001 \
      [--run-id run-001] [--out-root /home/z/evidence-r333/judge] \
      [--vps auto|1920,1440,1024,768,390,360] [--sections auto|hero,statement,...] \
      [--frames-per-strip 7] [--cell-width 440] [--seed auto]

  python3 scripts/r333/judge/make_sheets.py --verify \
      [--out-root /home/z/evidence-r333/judge] --run-id run-001 \
      [--expect-vps 1920,1440,1024,768,390,360] [--allow-partial]

Dark theme: capture dark runs as sibling vps named e.g. `1440-dark` under the
frames root; they flow through the same pipeline (rubric: dark is scored on
contrast/harmony only).

Overlay policy: static sheets come from the Twin capture, which masks consent/
badge chrome EQUALLY on both sides (capture-level policy for geometry parity).
Overlay parity itself is judged from first10s recordings (record_first10s.py),
which show chrome as-is on both sides — see rubric §3.4.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

GENERATOR = "make_sheets.py r333/1"
FORM_SCHEMA = "madarek-r333-judge-form/1"
CRITERIA = [
    "composition", "typography_craft", "spacing_rhythm", "imagery", "storytelling",
    "motion_quality", "scroll_feel", "micro_interactions", "density_contrast_legibility",
    "consistency", "arabic_rtl_craft", "polish_finish",
]
SIDES = ("heron", "madarek")
FORBIDDEN = ("heron", "madarek")  # must not appear in sheets/forms/manifest text

MARGIN = 10
LABEL_W = 64
GUTTER = 10
HEADER_H = 30
FOOTER_H = 24

# ── small utils ──────────────────────────────────────────────────────────────

def load_font(size: int, bold: bool = True):
    names = ["DejaVuSans-Bold.ttf", "DejaVuSans.ttf"] if bold else \
            ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf"]
    roots = ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/dejavu",
             "/usr/local/share/fonts", str(Path.home() / ".fonts")]
    for root in roots:
        for n in names:
            p = Path(root) / n
            if p.exists():
                try:
                    return ImageFont.truetype(str(p), size)
                except Exception:
                    pass
    try:  # PIL >= 9.2 variable default font
        return ImageFont.load_default(size)
    except TypeError:
        return ImageFont.load_default()


def load_records(fp: Path) -> dict:
    """{section: sorted [p, ...]} from a twin <side>-records.jsonl."""
    out: dict[str, list] = {}
    if not fp.exists():
        return out
    for line in fp.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        sec, p = r.get("section"), r.get("p")
        if sec is None or p is None:
            continue
        out.setdefault(sec, set()).add(int(p))
    return {k: sorted(v) for k, v in out.items()}


def frame_path(vdir: Path, section: str, side: str, p: int) -> Path:
    return vdir / section / f"{side}-p{p:03d}.png"


def pick_steps(inter: list, n: int) -> list:
    """N evenly spaced steps from a sorted intersection, endpoints included."""
    if not inter:
        return []
    if len(inter) <= n:
        return list(inter)
    idx = [round(i * (len(inter) - 1) / (n - 1)) for i in range(n)]
    return [inter[i] for i in idx]


# ── strip rendering ──────────────────────────────────────────────────────────

def render_strip(out: Path, vp: str, section: str, steps: list,
                 rows: list, cell_w: int, header: str, footer: str) -> dict:
    """rows = [("A", {p: path-or-None}), ("B", {...})] — draw the filmstrip."""
    dims = None
    for _, cells in rows:
        for path in cells.values():
            if path and Path(path).exists():
                with Image.open(path) as im:
                    dims = im.size
                break
        if dims:
            break
    if dims is None:  # nothing on disk at all — draw placeholder-sized cells
        dims = (cell_w, int(cell_w * 0.625))
    fw, fh = dims
    cell_h = max(1, round(cell_w * fh / fw))

    cols = len(steps)
    W = MARGIN * 2 + LABEL_W + cols * cell_w + max(0, cols - 1) * GUTTER
    H = MARGIN * 2 + HEADER_H + len(rows) * cell_h + len(rows) * GUTTER + FOOTER_H
    img = Image.new("RGB", (W, H), (18, 18, 20))
    d = ImageDraw.Draw(img)
    f_h = load_font(17)
    f_b = load_font(15)
    f_lbl = load_font(26)
    f_ph = load_font(14)

    d.text((MARGIN, MARGIN + 4), header, fill=(235, 235, 235), font=f_h)

    # column headers: progress %
    y0 = MARGIN + HEADER_H
    for c, p in enumerate(steps):
        x = MARGIN + LABEL_W + c * (cell_w + GUTTER)
        d.text((x + 4, y0), f"p={p:03d}", fill=(160, 200, 255), font=f_b)

    for r, (tag, cells) in enumerate(rows):
        ry = y0 + 20 + r * (cell_h + GUTTER)
        d.rectangle([MARGIN, ry, MARGIN + LABEL_W - 8, ry + cell_h],
                    fill=(30, 30, 34))
        d.text((MARGIN + 14, ry + cell_h // 2 - 16), tag, fill=(255, 210, 90),
               font=f_lbl)
        for c, p in enumerate(steps):
            x = MARGIN + LABEL_W + c * (cell_w + GUTTER)
            path = cells.get(p)
            if path and Path(path).exists():
                with Image.open(path) as im:
                    im = im.convert("RGB").resize((cell_w, cell_h), Image.LANCZOS)
                img.paste(im, (x, ry))
                d.rectangle([x, ry, x + cell_w, ry + cell_h], outline=(60, 60, 66))
            else:  # MISSING is evidence, never silent
                d.rectangle([x, ry, x + cell_w, ry + cell_h], fill=(70, 70, 74),
                            outline=(120, 60, 60))
                d.text((x + 8, ry + cell_h // 2 - 9), f"MISSING p={p:03d}",
                       fill=(255, 140, 140), font=f_ph)
    d.text((MARGIN, H - FOOTER_H + 2), footer, fill=(150, 150, 155), font=f_b)

    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, format="PNG")
    return {"dims": [W, H], "cell": [cell_w, cell_h], "cols": cols,
            "rows": len(rows)}


# ── build mode ───────────────────────────────────────────────────────────────

def detect(frames_root: Path):
    vps = sorted([d.name for d in frames_root.iterdir()
                  if d.is_dir() and (d.name.isdigit() or re.fullmatch(r"\d+-dark", d.name))],
                 key=lambda s: (int(s.split("-")[0]), s))
    sections, vps_ok = set(), []
    for vp in vps:
        vdir = frames_root / vp
        recs = [load_records(vdir / f"{s}-records.jsonl") for s in SIDES]
        secs = set.intersection(*[set(r) for r in recs]) if all(recs) else \
            set().union(*[set(r) for r in recs])
        if secs:
            vps_ok.append(vp)
            sections |= secs
    order = ["hero", "statement", "pains", "journey", "platform", "why",
             "roles", "cta", "footer"]
    secs = sorted(sections, key=lambda s: (order.index(s) if s in order else 99, s))
    return vps_ok, secs


def cmd_build(args):
    frames_root = Path(args.frames_root)
    if not frames_root.exists():
        raise SystemExit(f"frames-root not found: {frames_root}")
    run_id = args.run_id or frames_root.name
    out_root = Path(args.out_root)
    run_dir = out_root / run_id
    if run_dir.exists() and any(run_dir.iterdir()) and not args.force:
        raise SystemExit(f"{run_dir} not empty; pass --force to overwrite "
                         f"(new seed invalidates prior forms — see protocol §4.3)")

    vps = ([v.strip() for v in args.vps.split(",")] if args.vps != "auto"
           else detect(frames_root)[0])
    sections = ([s.strip() for s in args.sections.split(",")] if args.sections != "auto"
                else detect(frames_root)[1])
    if not vps or not sections:
        raise SystemExit(f"detection failed: vps={vps} sections={sections}")

    seed = random.randrange(1 << 30) if args.seed == "auto" else int(args.seed)
    rng = random.Random(seed)

    key = {"run": run_id, "seed": seed, "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
           "generator": GENERATOR, "framesRoot": str(frames_root),
           "framesPerStrip": args.frames_per_strip, "assignments": {}}
    index = {"run": run_id, "generatedAt": key["generatedAt"], "generator": GENERATOR,
             "framesRoot": str(frames_root), "framesPerStrip": args.frames_per_strip,
             "cellWidth": args.cell_width, "vps": vps, "sections": sections,
             "note": "side-blind manifest; A/B order sealed in keys/ (outside repo)",
             "calibrationIsOpenLabel": True, "sheets": {}, "calibration": {}}

    footer = ("A/B filmstrip sequences at identical progress steps · "
              "MISSING cells are evidence · A/B order sealed (keys/, outside repo)")
    for vp in vps:
        vdir = frames_root / vp
        recs = {s: load_records(vdir / f"{s}-records.jsonl") for s in SIDES}
        for sec in sections:
            # union, not intersection: a frame only ONE side captured must appear
            # as a MISSING cell on the other row — never silently dropped
            pool = sorted(set(recs[SIDES[0]].get(sec, [])) |
                          set(recs[SIDES[1]].get(sec, [])))
            steps = pick_steps(pool, args.frames_per_strip)
            if not steps:
                print(f"[build] WARN {vp}/{sec}: no frames at all — placeholder strip")
            order = list(SIDES)
            rng.shuffle(order)
            side_of = {"A": order[0], "B": order[1]}
            rows, rows_complete = [], True
            for tag in ("A", "B"):
                side = side_of[tag]
                cells = {}
                for p in steps:
                    fp_ = frame_path(vdir, sec, side, p)
                    cells[p] = fp_ if fp_.exists() else None
                    if cells[p] is None:
                        rows_complete = False
                rows.append((tag, cells))
            png = run_dir / "sheets" / vp / f"{sec}.png"
            grid = render_strip(
                png, vp, sec, steps, rows, args.cell_width,
                header=f"A/B filmstrip — vp {vp} — {sec} — {len(steps)} frames/side",
                footer=footer)
            index["sheets"][f"{vp}/{sec}"] = {
                "png": str(png.relative_to(run_dir)), "grid": grid,
                "frames": steps, "rowsComplete": rows_complete}
            key["assignments"].setdefault(vp, {})[sec] = {
                "A": side_of["A"], "B": side_of["B"], "frames": steps,
                "rowsComplete": rows_complete}
            print(f"[build] {vp}/{sec}: A={side_of['A']} B={side_of['B']} "
                  f"steps={steps} complete={rows_complete}")

            # calibration strip (heron-only, open label) — side name NOT in index
            cal_cells = {p: (frame_path(vdir, sec, SIDES[0], p)
                             if frame_path(vdir, sec, SIDES[0], p).exists() else None)
                         for p in steps}
            cal_png = run_dir / "calibration" / vp / f"{sec}.png"
            cal_grid = render_strip(
                cal_png, vp, sec, steps, [("H", cal_cells)], args.cell_width,
                header=f"CALIBRATION — vp {vp} — {sec} — {SIDES[0]} only (open label)",
                footer="calibration pass: fix the anchor scale BEFORE opening sheets/")
            index["calibration"][f"{vp}/{sec}"] = {
                "png": str(cal_png.relative_to(run_dir)), "grid": cal_grid,
                "frames": steps}

    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "sheets-index.json").write_text(json.dumps(index, indent=1))
    for n in (1, 2, 3):
        write_form(run_dir / "forms" / f"reviewer-{n}.json", run_id, n)
    keys_dir = out_root / "keys"
    keys_dir.mkdir(parents=True, exist_ok=True)
    kfp = keys_dir / f"{run_id}.json"
    kfp.write_text(json.dumps(key, indent=1))
    os.chmod(kfp, 0o600)
    print(f"[build] WROTE {run_dir}  ({len(index['sheets'])} sheets)")
    print(f"[build] SEALED KEY {kfp} (mode 600) — do not open until forms lock")
    return 0


def write_form(fp: Path, run_id: str, n: int):
    zero = {c: 0 for c in CRITERIA}
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(json.dumps({
        "schema": FORM_SCHEMA, "run": run_id, "reviewer": n, "engine": "chromium",
        "startedAt": None, "completedAt": None,
        "heron": dict(zero), "heron_notes": {},
        "first10s": {"viewed": [], "notes": ""},
        "blind": {},  # pre-populated per vp/section right after build
        "limiting_vp": {}, "dark": {"contrast": 0, "harmony": 0, "notes": ""},
        "webkit_notes": {"scroll_feel": "", "polish_finish": ""},
        "reasons": [],
        "attestations": {"heronFirst": False, "sequencesNotStills": False,
                         "overlaysAsIsBothSides": False, "noPeerScoresSeen": False},
    }, indent=1), encoding="utf-8")


def populate_forms(run_dir: Path, index: dict):
    """Pre-populate blind structure for every vp/section so reviewers just fill scores."""
    for n in (1, 2, 3):
        fp = run_dir / "forms" / f"reviewer-{n}.json"
        form = json.loads(fp.read_text(encoding="utf-8"))
        zero = {c: 0 for c in CRITERIA}
        blind = {}
        for entry, meta in index["sheets"].items():
            vp, sec = entry.split("/", 1)
            blind.setdefault(vp, {})[sec] = {
                "A": dict(zero), "B": dict(zero), "missing_frames": []}
        form["blind"] = blind
        fp.write_text(json.dumps(form, indent=1), encoding="utf-8")


# ── verify mode ──────────────────────────────────────────────────────────────

def cmd_verify(args):
    out_root = Path(args.out_root)
    run_id = args.run_id or (Path(args.frames_root).name if args.frames_root else None)
    if not run_id:
        raise SystemExit("--run-id required for --verify (or pass --frames-root)")
    run_dir = out_root / run_id
    fails: list[str] = []
    warns: list[str] = []

    idx_fp = run_dir / "sheets-index.json"
    if not idx_fp.exists():
        raise SystemExit(f"FAIL {idx_fp} missing")
    index = json.loads(idx_fp.read_text(encoding="utf-8"))

    # 1. sheets exist, both rows, dims match manifest, complete
    for entry, meta in sorted(index["sheets"].items()):
        png = run_dir / meta["png"]
        if not png.exists():
            fails.append(f"missing sheet {png}")
            continue
        with Image.open(png) as im:
            got = list(im.size)
        if got != meta["grid"]["dims"]:
            fails.append(f"{entry}: dims {got} != manifest {meta['grid']['dims']}")
        if meta["grid"]["rows"] != 2:
            fails.append(f"{entry}: grid rows={meta['grid']['rows']} != 2 (both sides)")
        if not meta["rowsComplete"]:
            msg = f"{entry}: rowsComplete=false (MISSING cells rendered)"
            (warns if args.allow_partial else fails).append(msg)

    # 2. expected vp coverage
    if args.expect_vps:
        want = [v.strip() for v in args.expect_vps.split(",")]
        have = index["vps"]
        for v in want:
            if v not in have:
                fails.append(f"expected vp {v} absent from run")

    # 3. no side names in the SIDE-BLIND artifacts (sheets/** + top-level json).
    #    forms/ contain the open-label `heron` calibration block by protocol §2 —
    #    excluded here; calibration/ and first10s/ are open-label by design.
    pat = re.compile("|".join(FORBIDDEN), re.I)
    blind_paths = [p for p in run_dir.rglob("*")
                   if p.is_file() and not p.relative_to(run_dir).parts[0]
                   in ("forms", "first10s", "calibration")]
    for p in blind_paths:
        rel = str(p.relative_to(run_dir))
        if pat.search(p.name):
            fails.append(f"side name leaked in filename: {rel}")
        if p.suffix in (".json", ".html", ".txt"):
            try:
                if pat.search(p.read_text(encoding="utf-8")):
                    fails.append(f"side name leaked inside: {rel}")
            except Exception:
                pass

    # 4. sealed key: exists outside repo + run dir, mode 600, covers every vp/section
    kfp = out_root / "keys" / f"{run_id}.json"
    if not kfp.exists():
        fails.append(f"sealed key missing: {kfp}")
    else:
        try:
            key = json.loads(kfp.read_text(encoding="utf-8"))
            for entry in index["sheets"]:
                vp, sec = entry.split("/", 1)
                a = key.get("assignments", {}).get(vp, {}).get(sec)
                if not a or a.get("A") not in SIDES or a.get("B") not in SIDES:
                    fails.append(f"key entry incomplete for {entry}")
        except Exception as e:
            fails.append(f"key unreadable: {e}")
        repo = Path(__file__).resolve().parents[3]
        if repo in kfp.resolve().parents:
            fails.append(f"sealed key inside repo: {kfp}")
        if run_dir in kfp.resolve().parents:
            fails.append(f"sealed key inside run dir: {kfp}")
        mode = stat_mode(kfp)
        if mode != 0o600:
            warns.append(f"key mode {oct(mode)} != 600")
        if key.get("seed") is None:
            fails.append("key missing seed")

    # 5. forms: 3 templates, schema, criteria, blind structure, attestations false
    for n in (1, 2, 3):
        fp = run_dir / "forms" / f"reviewer-{n}.json"
        if not fp.exists():
            fails.append(f"form template missing: {fp}")
            continue
        form = json.loads(fp.read_text(encoding="utf-8"))
        if form.get("schema") != FORM_SCHEMA:
            fails.append(f"{fp.name}: schema != {FORM_SCHEMA}")
        if form.get("run") != run_id:
            fails.append(f"{fp.name}: run mismatch")
        if set(form.get("heron", {})) != set(CRITERIA):
            fails.append(f"{fp.name}: heron criteria keys != 12 rubric keys")
        for entry, meta in index["sheets"].items():
            vp, sec = entry.split("/", 1)
            row = form.get("blind", {}).get(vp, {}).get(sec)
            if not row or set(row.get("A", {})) != set(CRITERIA) or \
               set(row.get("B", {})) != set(CRITERIA):
                fails.append(f"{fp.name}: blind structure incomplete for {entry}")
        if any(form.get("attestations", {}).values()):
            fails.append(f"{fp.name}: attestations must start false")

    for w in warns:
        print(f"WARN {w}")
    if fails:
        for f in fails:
            print(f"FAIL {f}")
        print(f"VERIFY: FAIL ({len(fails)} failures, {len(warns)} warnings)")
        return 1
    print(f"VERIFY: PASS — {len(index['sheets'])} sheets, "
          f"{len(index.get('calibration', {}))} calibration strips, "
          f"key sealed at {out_root / 'keys' / (run_id + '.json')}")
    return 0


def stat_mode(p: Path) -> int:
    import stat as _stat
    st = p.stat()
    return _stat.S_IMODE(st.st_mode)


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--frames-root", default="/home/z/evidence-r333/twin/run-001")
    ap.add_argument("--run-id", default=None)
    ap.add_argument("--out-root", default="/home/z/evidence-r333/judge")
    ap.add_argument("--vps", default="auto")
    ap.add_argument("--sections", default="auto")
    ap.add_argument("--frames-per-strip", type=int, default=7)
    ap.add_argument("--cell-width", type=int, default=440)
    ap.add_argument("--seed", default="auto")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--expect-vps", default="")
    ap.add_argument("--allow-partial", action="store_true")
    args = ap.parse_args()

    if args.verify:
        sys.exit(cmd_verify(args))
    rc = cmd_build(args)
    if rc == 0:  # fill blind structure now that index exists
        run_id = args.run_id or Path(args.frames_root).name
        populate_forms(Path(args.out_root) / run_id,
                       json.loads((Path(args.out_root) / run_id /
                                   "sheets-index.json").read_text(encoding="utf-8")))


if __name__ == "__main__":
    main()
