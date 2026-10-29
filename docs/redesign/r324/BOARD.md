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
| P4/X12 | map plan theme pairs | 1440 light+dark | `map-1440-{light,dark}.png` | Ink ground + paper strokes |

## Reviewer rounds

(none yet — first round runs at the P2 wave completion)

## Kill list X1–X16

| # | One-liner | Status |
|---|-----------|--------|
| X1 | update toast on every page | **fixed** |
| X2 | scrollHeight unstable 8,446→12,922 | **fixed** (drift ≤0.009 %, placeholders re-measured post-X3) |
| X3 | platform §05 broken layout + bidi labels | **fixed** `25e5d150` (710px @1440 = Heron exact) |
| X4 | why §06 blurry screenshot + chips | open |
| X5 | roles §07 giant list | **fixed** `15a4d016` |
| X6 | map intro empty grid + boxes on walls | open |
| X7 | statement §02 clipped paragraph | open (before sheet cut) |
| X8 | phone header label+1px burger | **fixed** |
| X9 | inner pages ignore the type ladder | **fixed** (census 0) |
| X10 | debug/jargon sweep | **fixed** |
| X11 | logo optical size at ≤32px | open |
| X12 | dark theme not Heron-grade | **fixed (map)** — app-wide pair sweep = P4 tail |
| X13 | hero ticker cut @1440 | **fixed** |
| X14 | landing docH drift +4.6 %/+2.4 % | open (re-verdict after X4/X7) |
| X15 | help creds in prod | **fixed** |
| X16 | authenticated app unreviewed | open (P5) |
