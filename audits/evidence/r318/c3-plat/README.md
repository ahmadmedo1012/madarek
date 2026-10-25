# R318 · C3-PLAT — §A5 platform re-composition — evidence

Task: C3-PLAT (branch `c3-plat`, rebased on main `3f604f4f`).
Probe: `/home/z/foreman/c3-plat-probe.mjs` (playwright-core, loader bypassed,
theme light, settled reveal state — scrolled to the band + 1400 ms settle).
Raw twins: `c3-plat-before.json` / `c3-plat-after.json` (this directory).

## 1 · The sheet-title re-seat (defect 1 — H1 × left-sheet overlap)

`#pr-title` at 1440, light, settled:

| state | title rect (x, y, w, h) | font | vs the sheet frame |
|---|---|---|---|
| before | 26.7, 8733.5, **1386.7**, 76.8 | 60px display | box ran over the panel: title×panel **47,362.6 px²**, glyphs under the sheet frame at x≈560–643 |
| after | 1083.7, 8746.5, **312.7**, 61.3 | **26.67px** (3.2rem/600 — the reference's h4 rung) | INSIDE the sheet (346.7×645 @ 1066.7, 8686.1): pad l/r 17 · t 46.4 · ≥8 everywhere · ×frame-ring **0** · ×drawing **0** |

Wording untouched («لا وعود — هذه الواجهة نفسها»); element stays an accessible
`h2#pr-title` (aria-labelledby contract intact); the drawing cell is aria-hidden.
At 1024/768 the head is display:none (the pre-existing 992–1024 / ≤991 tiers) —
title 0×0, unchanged behavior.

## 2 · Paper ground (defect 2 — the solid-black plan sheet)

Cause: `PlatformPlanArt.tsx` drew the 596×464 exterior-wall rect with the bare
`.bp-ink-2` class — a stroke-weight-only class with no `fill`, so the rect fell to
the SVG default fill (black). Pixel audit of the plan-sheet region (cv2):

| state | near-black share | paper share | accent-room share |
|---|---|---|---|
| before (panel 26.7..643.4 × 645) | **37.3%** (30.8% @ rgb(1,1,1) + 6.5% @ 0,0,0) | 13.1% | 4.4% |
| after (sheet cell 1066.7..1413.4 × 645) | **0.1%** (ink strokes only) | **53.1%** | 4.0% |

Fix: `bp-ink bp-ink-2` on the wall-band rect (`fill: none`); the drawing rides
the sheet's paper ground + hairline cells (faint 2.4rem grid) + ONE solid
`var(--accent)` room + ink walls/hatch — the reference's measured grammar.

## 3 · Cards inside their frames (defect 3 — viewport/each-other clipping)

`.prf-stage { overflow: clip }` — the frame's own hairline box owns the boundary.
Every visible `.prf-card` rect vs its stage (probe assert: inside + ≥8px frame
padding; hidden cards skipped):

**1440** — lead stage 577.8×393.6, std stage 445.3×360.2:

| card | before (escape) | after pad l/t/r/b |
|---|---|---|
| attend «الحضور تلقائي» | r −24 · t −14 (hung over the frame) | 445.8 / 342.7 / **8 / 8** — inside |
| chat «مساعد الفهم» | l −80 | **8 / 8** / 369.8 / 273.6 — inside |
| mastery «مصفوفة الإتقان» | r −36 · **crossed the viewport right edge by 9.3px** | **8** / 288.9 / 397.8 / **8** — inside |
| std chat | l −56 (sat over the sheet frame) | **8** / 242.2 / 269.3 / **8** — inside |

**1024** — lead 410.9×309.9, std 316.3×288.3: chat 8/8/218.9/189.9 · mastery
8/205.2/230.9/**8** · std chat 8/170.3/140.3/**8** — all inside (mastery crossed
the viewport edge by 1px before).

**768** — the 15rem cover strips (720×138.1): chat 8/8/544/18.1 · mastery moved
to the frame's bottom inline-start corner (was bottom-start −20, sitting under
the chat card: **pairwise overlap 13,509.6 px²** before the corner swap) →
556/33.4/**8/8** · std chat 8/20.2/544/**8** — all inside, pairwise **0**.

Pairwise card overlaps: **0 at every tier** (was 13,509.6 px² @768).
Viewport-edge crossings: **0 at every tier** (was +9.3px @1440, +1px @1024,
−16px @768).

## 4 · The 12-col hairline grid (defect 4 — 361/601/464, RTL-mirrored)

Measured at 1440 (usable 1386.7 = 1440 − 2×3.2rem; 115.56px/col):

| region | reference (scaled to our measure) | ours | seat |
|---|---|---|---|
| sheet (361) | 351 | **346.7** (3 cols) | reading start (physical right, RTL-mirrored) |
| canvas (601) | 584.5 | **577.8** (5 cols) | lead frame |
| inspector (464) | 451.2 | **462.2** (4 cols, incl. 1px hairline + 16px pad) | std frame + note (row 2) |
| hairline @ x=968 (full 710px) | mirrored ≈ x 479 | **x 488.9** (the 4-col line) | `.pr-section::before`, 1px var(--rule), inset-block 0 |

## 5 · Protected ladders (hard constraints)

| check | before | after |
|---|---|---|
| docH @1440 | 12,340 | **12,340 EXACT** |
| docH @1024 | 9,959 | **9,959 EXACT** |
| docH @768 | 12,627 | **12,627 EXACT** |
| section floors | 85.2rem ≥992 · 55.2rem 768–991 · 52.1rem ≤479 | untouched (710px / 504.9px / 508.3px measured) |
| «تلقائي» mechanism readout | present | unchanged (foreman's §A5 --% kill kept) |
| aria-hidden cards / reduced-motion | static-complete | unchanged contracts |

## 6 · Gate

`node scripts/r318/defect-gate.mjs --viewports 768,1024,1440 --skip ocr,perf
--base-url http://localhost:4194 --out audits/evidence/r318/gate-c3plat.md`
→ **0 failing checks** (30/30 PASS: word-integrity, contrast, collisions,
placeholders, overflow × light/dark). No new reds; the 360/390 banner-seat reds
are out of scope (C4). OCR/perf skipped per round state (§A6 / C2 harness).

## Shots (JPEG q70, all ≤150KB)

`platform-{1440,1024,768}-{before,after}.jpg` in this directory.
