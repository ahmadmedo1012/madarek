# W3 · Pains (`#live` / `home-problem-wrap`) — mobile carousel contract (R332)

Owner: W3 · files: `styles/landing/pains.css` (full authority) + `.pm-` tiers in
`styles/landing/strata.css` (untouched — no `.pm-` edit was needed) ·
harness: `scripts/twin/` · defect: run-001 §Supervisor-2 (pains 390 FAIL —
four 74.5px columns in one row, mono labels/titles/«الجواب:» overprinting).

## Heron fact

`docs/redesign/r331/heron-program.json` + run-001 390 capture
(`/home/z/evidence-r332/twin/run-001/390/pains/heron-p*.png`):

- **The problem list is a horizontal swiper on mobile** — `stack.swiper`:
  `"11 (problem list on mobile)"`; exact `slidesPerView`/`spaceBetween`
  **not probed** (heron-program.json:328). Section box @390: **374.1×869.5px**
  (`390.pains.heron`) — far too short for four stacked cards (each card runs
  ~300–450px), so one card sits in view and the rest live on the swipe axis.
- Per-card anatomy (each on its own baseline, no absolute overlaps):
  mono keyword label (`txt-font-mono txt-14` ≈ 13.89px @390) · ghost 2-digit
  index · title · body · the honest answer line. Heron's own probe of the
  section @390: **0 text-overlap pairs** (`defect-metrics.json 390.pains.heron`).
- Slide width measured in R322 from problem-390.md: `31.45rem` (≈312px @390
  remBase 9.92) — used as a reference rung, not a hard pin (spaceBetween
  unknown).

## Madarek now (probe-before, `/home/z/evidence-r332/w3/w3-before-*.json`)

`styles/landing/pains.css` already contained the ≤767 snap-carousel block
(`grid-auto-flow: column; grid-auto-columns: 82%` + scroll-snap + dot rail,
JS-driven) — but it never rendered. The **base** `.pm-cols` rule (line 68)
declares `grid-template-columns: repeat(4, minmax(0, 1fr))` OUTSIDE any media
query, and the ≤767 block only ever set **implicit**-track sizing
(`grid-auto-flow/-auto-columns`). With 4 explicit tracks in force,
`auto-flow: column` seats all four items in row 1 and `grid-auto-columns`
never applies (it sizes implicit tracks only):

| vp | cols (w×h px) | `.pm-cols` computed | text-overlap pairs (>4px²) |
|---|---|---|---|
| 320×844 | **58.4 × —** | gtc `58.4px ×4` | **10** |
| 360×844 | **67.6** | gtc `67.6px ×4` | **9** |
| 390×844 | **74.5 × 453.3** (run-001 `390.pains.madarek.cols[0]`) | gtc `74.55px ×4` + gac `88%` dead | **9** |
| 430×844 | **83.8** | gtc `83.8px ×4` | **1** |
| 1440×900 | 345 (desktop grid, correct) | `repeat(4,minmax(0,1fr))` | 0 |

390 worst pairs: `pm-item-title×pm-item-title` 315.5px², `pm-item-sub×pm-item-sub`
180.8px², `pm-item-answer×pm-item-answer` 161.8px², `pm-index×pm-keyword`
(mono labels) 57.9px² — the run-001 overprint signature, reproduced.

## Delta

| metric (390) | Heron | Madarek before | pass? |
|---|---|---|---|
| card/col width | one card ≈312px in a swipe view | **74.5px ×4 in one row** | FAIL |
| text overlaps in section | 0 | **9 pairs** | FAIL |
| section height | 869.5 | 869.8 (spurious — squeezed row sums to Heron's stacked-equivalent) | PASS (coincidental) |
| heading fs | 31.7557 | 31.74 | PASS |
| trigger-start | 839.3 | 1394 (**Δ554.7 — cascade from `#statement` above, W2's fix**) | out of scope |

## Fix (W3-owned edit — applied)

`styles/landing/pains.css`, the `@media (max-width: 767px) .pm-cols` block —
one declaration + rationale comment:

```css
.pm-cols {
  /* …the desktop's explicit 4-track template MUST die here… */
  grid-template-columns: none;   /* ← the fix (was inherited: repeat(4,minmax(0,1fr))) */
  grid-auto-flow: column;        /* (existing) */
  grid-auto-columns: 82%;        /* (existing; 88% in the ≤479 pocket) */
  …
}
```

The carousel itself (scroll-snap `x mandatory`, `scroll-padding-inline`,
82%/88% rungs, dot rail, JS `is-active` sync, `min-inline-size: 0` children)
was already authored and stays byte-identical — Heron's own mobile anatomy
(swiper) as a snap carousel, the twin-safer of the brief's two options.
No `!important`, no ID selectors, no new file. `strata.css` `.pm-` tiers
untouched (they only pin section padding/min-height/intrinsic-size — none
touch the track list). **`LandingPage.tsx` untouched** (markup order and
every className/test pin unchanged; the effect at lines 419–490 was already
carousel-ready).

## Proof

- Before probe: `/home/z/evidence-r332/w3/w3-before-{320,360,390,430,1440}.json` (+PNGs)
- After probe: `/home/z/evidence-r332/w3/w3-after-{…}.json` (+PNGs) —
  col widths 227/262.2/288.6/323.8, **overlaps 0 at all five vps**,
  section h @390 **869.8** (unchanged → still Δ0.03% vs Heron's 869.5),
  1440 untouched (742.5 / 40px / 0 overlaps).
- Twin rerun: `/home/z/evidence-r332/twin/w3-390/report.md` (pains
  hΔ 0.03% · fsΔ 0.05% · trigΔ 554.7 — cascade, unchanged) and
  `/home/z/evidence-r332/twin/w3-1440/report.md` (hΔ 0.01% · fsΔ 0.0% ·
  trigΔ 34.4 — exactly run-001's values). Visual diff @390 improved:
  meanDiff p0/p50/p100 **25.21/26.06/26.10 → 17.34/23.05/23.11**.
- Gates: `stylelint src/styles/landing/pains.css` → 0 issues (no NEW);
  `tsc -b --noEmit` clean; `vitest run r306-landing-sheet.test.ts
  landing-funnel.test.tsx` → 32/32 green.
- Known honest deviation: card width @390 = 288.6px vs Heron's measured
  slide rung ≈312px (−7.5%) — Heron's swiper `spaceBetween` is not probed
  (heron-program.json:328), and the R322-calibrated 88% pocket holds the
  section-height twin (Δ0.03%), so the sheet rung stays.
