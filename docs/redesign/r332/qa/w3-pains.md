# W3 · Pains — QA proof notes (R332)

Owner wave: W3 (pains mobile carousel) · defect: run-001 §Supervisor-2
("Madarek renders 4 columns in one row, each 74.5px wide") · verdict before:
pains 390 FAIL (0.03% height — spurious match) / 1440 PARTIAL.

## What was wrong (root cause, one line)

The ≤767 snap-carousel block in `styles/landing/pains.css` set only
**implicit**-track sizing (`grid-auto-flow: column; grid-auto-columns: 82%`)
while the base `.pm-cols` rule's **explicit** `grid-template-columns:
repeat(4, minmax(0, 1fr))` stayed in force — with 4 explicit tracks,
`auto-flow: column` seats every item in row 1 and `grid-auto-columns` (implicit
tracks only) never applies → the four cards squeezed into one
74.5px-per-column row @390 (run-001 `390.pains.madarek.cols[0].w=74.5,
h=453.3`), and mono labels / titles / «الجواب:» lines overprinted across
columns.

Fix: `grid-template-columns: none;` in the ≤767 `.pm-cols` block (one
declaration + rationale comment; nothing else in the sheet changed).

## Before → after (probe `probe_w3.py`, evidence `/home/z/evidence-r332/w3/`)

Metric: every text-node client rect inside `#live`, pairwise intersection,
ancestor/descendant pairs excluded, area > 1px² (>4px² count in parens
identical here).

| vp | col w before | col w after | card h before/after (390) | overlaps before | overlaps after | page h-scroll after |
|---|---|---|---|---|---|---|
| 320×844 | 58.4 | **227.0** (82% carousel) | — | **10** | **0** | 0 |
| 360×844 | 67.6 | **262.2** | — | **9** | **0** | 0 |
| 390×844 | 74.5 | **288.6** (88% pocket) | 453.3 → **298.9** | **9** | **0** | 0 |
| 430×844 | 83.8 | **323.8** | — | **1** | **0** | 0 |
| 1440×900 | 345 | 345 (desktop, untouched) | — | 0 | 0 | — |

390 overlap detail, before → after:

- `pm-item-title × pm-item-title` 315.5px² → **0**
- `pm-item-sub × pm-item-sub` 180.8px² → **0**
- `pm-item-answer × pm-item-answer` 161.8px² → **0**
- `pm-index × pm-keyword` (the mono labels: `GRADING01` colliding) 3 × ~57.7px² → **0**
- `pm-item-sub × pm-item-answer` (the «الجواب:» line) → **0**

## Fixed (≥3 substantive differences, before → after @390×844)

1. **One card per swipe, not four 74.5px columns in a row.** `.pm-cols`
   computed `grid-template-columns: 74.55px 74.56px 74.56px 74.56px` →
   implicit carousel tracks `288.6px ×4` (88% of the 328px content box);
   card box 74.5×453.3 → **288.6×298.9**; `scrollWidth 352 → 1184` vs
   `clientWidth 328` — a real horizontal snap scroller (Heron's swiper-11
   anatomy), snap `x mandatory` + `scroll-padding-inline` unchanged.
2. **Zero text overprint at every phone width.** 10/9/9/1 intersecting
   text-rect pairs @320/360/390/430 → **0 / 0 / 0 / 0** (titles, body copy,
   mono keyword labels, ghost indices and the «الجواب:» answer lines each
   on their own baseline inside the card).
3. **The mono meta row reads as a row again.** `pm-index × pm-keyword`
   collisions (3 pairs @390) gone — keyword left, ghost index + dot at the
   far edge on one baseline, closed by the dashed rule (the reference's
   meta grammar), instead of `GRADING01`/`P01` printing through each other.
4. **The dot rail works.** The R322 dot rail + JS were dead chrome while the
   columns couldn't scroll: now `scrollIntoView` on card 3 moves
   `scrollLeft → −577` (RTL) and the `is-active` dot follows (verified:
   active index 0 → 2). Carousel keyboard seat (`tabIndex=0` ≤767 via the
   existing effect) now has a scroll region to operate on.
5. **Visual twin improves at all anchors.** Section-level meanDiff vs Heron
   @390: p0 **25.21 → 17.34**, p50 **26.06 → 23.05**, p100 **26.10 → 23.11**
   (`pctPxOver32` 18.32/18.01/18.07 → 13.82/15.65/15.73).

## Regression guard (must-not-regress numbers — HOLD)

Twin reruns `twin/w3-390/report.md` + `twin/w3-1440/report.md` vs run-001:

| metric | run-001 | w3 rerun | threshold |
|---|---|---|---|
| 1440 height Δ% | 0.01 (742.6 vs 742.5) | **0.01** | ≤3 ✓ |
| 1440 heading fs Δ% | 0.0 (40 both) | **0.0** | ≤4 ✓ |
| 1440 trigger Δpx | 34.4 | **34.4** | ≤40 ✓ |
| 390 height Δ% | 0.03 (869.8 vs 869.5) | **0.03** — the fix re-seats the REAL carousel at the same height (card 298.9 + head + dots) | ≤3 ✓ |
| 390 heading fs Δ% | 0.05 | **0.05** | ≤4 ✓ |
| 390 trigger Δpx | 554.7 (cascade from `#statement`) | **554.7 — unchanged, W2's parallel fix; not chased** | (cascade) |
| 768/600 sanity | — | 2×2 grid @768 (gtc `360px 360px`, dots hidden), carousel @600 (82% tracks, 0 overlaps) | ✓ |

Gates: `npx stylelint src/styles/landing/pains.css` → **0 issues** (no NEW);
`npx tsc -b --noEmit` → clean; `npx vitest run tests/unit/r306-landing-sheet.test.ts
tests/unit/landing-funnel.test.tsx` → **32/32 green**.

## Touch report

- `frontend/src/styles/landing/pains.css` — one declaration + comment inside
  the existing `@media (max-width: 767px) .pm-cols` block. No other rule in
  the file moved; desktop (≥768) blocks byte-identical.
- `frontend/src/styles/landing/strata.css` `.pm-` tiers — **untouched**.
- `frontend/src/pages/LandingPage.tsx` — **untouched** (no markup edit was
  needed: the pains DOM, classNames, test pins and the carousel effect were
  already correct; only the CSS track list was broken).
