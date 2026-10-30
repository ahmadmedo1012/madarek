# R324 BOARD — evidence & reviewer scores

> Method: Heron counterpart captured first, transplant the grammar, overlay sheet
> at the same anchors, then judge. Gates are safety nets, never the verdict.

## Rubric (unchanged, stricter)

3 independent reviewers × 0–10 on hierarchy · grid/alignment · spacing rhythm ·
typography · material/colour · density/restraint · consistency · motion/scroll ·
polish · responsiveness. **Mean ≥ 9, no category < 8.** VLM advisory only.

## Evidence log

| Phase | Surface | Breakpoints | Sheets | Verdict |
|-------|---------|-------------|--------|---------|
| P2/X3 | platform §05 (before → after) | 1440 light+dark · 768 dark · 390 light+dark | `platform-1440-before.png` (the unstyled 115px rail) → `platform-1440-{light,dark}` / `platform-768-dark` / `platform-390-{light,dark}` | section 710px @1440 = Heron exact · probe-x3 geometry clean · gates green |
| P2/X5 | roles §07 ledger | 1440 | `roles-1440-after.png` | 0.0 % vs Heron |
| P2/X7 | statement §02 scrub | 1440+390 light+dark | `statement-1440-{light,dark}` / `statement-390-{light,dark}` (before cut) | per-char color scrub rides the reference grammar |
| P2/X4 | why §06 stage | 1440 light+dark | `why-1440-{light,dark}.png` | sharp q92 captures; no fake chips |
| P2/X6 | map plan rooms | 1440 light+dark ×s1–s6 + intro anchors | `map-s1..s6-1440-{light,dark}.png` | room label reads accent-ink; walls clean |
| P2/X14 | landing docH verdict | 4 anchors × post-render reads | `footer-x14-{1440,390}-{light,dark}.png` + `probe-x14-bands.mjs` | every band ±0.4 % (2 riders documented); docH all anchors PASS ±2 % |
| P4/X12 | map plan theme pairs | 1440 light+dark | `map-1440-{light,dark}.png` | Ink ground + paper strokes |

## Reviewer rounds

(none yet — first round runs at the P2 wave completion)

## Kill list X1–X16

| # | One-liner | Status |
|---|-----------|--------|
| X1 | update toast on every page | **fixed** |
| X2 | scrollHeight unstable 8,446→12,922 | **fixed** (drift ≤0.009 %, placeholders re-measured post-X3) |
| X3 | platform §05 broken layout + bidi labels | **fixed** `25e5d150` (710px @1440 = Heron exact) |
| X4 | why §06 blurry screenshot + chips | **fixed** `29517897` (720w q92 re-encode; chip retired) |
| X5 | roles §07 giant list | **fixed** `15a4d016` |
| X6 | map intro empty grid + boxes on walls | **fixed** `65baefac` (cascade war + debris) |
| X7 | statement §02 clipped paragraph | **fixed** `65acc394` (per-char color scrub, sheets 1440/390 light+dark) |
| X8 | phone header label+1px burger | **fixed** |
| X9 | inner pages ignore the type ladder | **fixed** (census 0) |
| X10 | debug/jargon sweep | **fixed** |
| X11 | logo optical size at ≤32px | **fixed** (markStrokePx ramp 1.5@32→1.125@16→0.9 floor; `logo-optical-1440-{light,dark}.png`) |
| X12 | dark theme not Heron-grade | **fixed (map)** — app-wide pair sweep = P4 tail |
| X13 | hero ticker cut @1440 | **fixed** |
| X14 | landing docH drift +4.6 %/+2.4 % | **fixed** (anchor parity + post-render reads; verdict 1440 +1.67 % · 1024 +1.90 % · 768 +0.76 % · 390 +0.63 % — PASS; ledger re-pinned) |
| X15 | help creds in prod | **fixed** |
| X16 | authenticated app unreviewed | open (P5) |
