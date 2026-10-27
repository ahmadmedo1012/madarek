# R321 §A1 — desktop scroll performance: the cycle-1 decomposition

Head: `ff7aeed6` → the lenis-idle fix (`perf-idlefix.json`). Harness:
`scripts/r316/perf.mjs` (1440×900 · 4×CPU · scroll = 12×600px wheel down
@80ms + 12 up). Targets (§A1): ≤2% frames >20ms · CLS ≤0.05 · LCP
≤2.5s skip-loader / ≤4s first-visit.

## The measured ladder (all @1440, 4×CPU, median of runs)

| state | %frames>20ms | p95 | longtasks | CLS | LCP | docH |
|---|---|---|---|---|---|---|
| a7e335d (owner's baseline) | ~54% >33ms | 50 | 115/212 >33ms | 0.27* | 21s* | 12,607 |
| ff7aeed6 scroll (harness) | **75.9%** | 183 | 60 / 6,816ms | 0.007 | 2.44s (skip-loader) | 12,530 |
| + grain-off | 73.2% | 150 | 58 / 6,502ms | — | — | — |
| + svg-off (ALL svgs hidden) | 71.4% | 150 | 62 / 6,611ms | — | — | — |
| + no IntersectionObserver (reveals dead) | 67.5% | 167 | 45 / 4,781ms | — | — | — |
| + reducedMotion (Lenis + drivers OFF, native scroll) | **38.8%** | 100 | 20 / 2,099ms | — | — | +9% (RM artefact) |
| + rAF neutered (everything off) | ~0% | — | 1 / 116ms | — | — | — |
| cv-chapters (content-visibility, NOT adopted) | 33.3% | 133 | 56 / 5,825ms | — | — | **12,722 ✗ ratchet** |
| lenis-idle attr retired (this cycle) | 75.0% | 150 | 60 / 6,697ms | 0.007 | 2.47s | 12,530 |

*the owner's numbers used the loader-ON cold methodology; the harness
scroll rows are loader-SKIP (the §A1 2.5s target leg — met).

## Where the time goes (CDP trace, devtools.timeline)

- **UpdateLayoutTree (style recalc): 231 events / 4,465ms** — the #1
  cost. 54 events >30ms average **781 recalculated elements each**
  (families of 756/935/2614). Per-element cost in the worst seats
  ≈0.13–0.15ms (~100× normal — var-chain + color-mix + heavy selector
  matching resolution).
- FunctionCall 5,384 / 1,340ms · FireAnimationFrame 435 / 836ms ·
  Paint 461ms · Layerize 402ms · Layout 153ms · IO compute 44ms.
- The gBCR census: 105 reads/11s (NO read storm — the R319 fix3 holds).

## The seat probes (write + forced flush, @1440 4×CPU, ms/cycle)

| seat | subtree | cost | note |
|---|---|---|---|
| `--jt-p` @ `.jt-pin` | 880 | 7.06 | NOT used by the driver (R319 seats it lower) |
| `--jt-p` @ `.jt-plan` | 612 | **0.00** | the SVG plan — free |
| `--jt-p` @ `.jt-statement` | 0 | 0.10 | |
| `--jt-p` @ `.jt-intro` | 69 | **10.09** | pathological: 3-level var chain (--jt-p → per-line --wr-p clamp → per-word --wr-n) + color-mix, ≈0.15ms/element |
| `--wy-p` @ `.wy` | 110 | 2.26 | |
| `data-stage` flip @ `.jt` | ~2,000 | 27.36 | 4-8 flips per run (stage boundaries) |
| seats verified live: P_SEAT_SEL matches 3/3 — the pin fallback never runs | | | |

## What is RULED OUT

1. **SVG raster/paint** — svg-off (every svg hidden) changes nothing.
2. **The grain film** — grain-off −2.7% only.
3. **The reveal system** — no-IO −12% only (and reveals are one-shot).
4. **gBCR read storms** — 105 reads total (R318/R319 fixes hold).
5. **The lenis-idle attribute** — retired this cycle (correct regardless:
   a root-attribute flip invalidates the whole document; zero CSS
   consumers existed) — but NOT the main driver (−1%).
6. **content-visibility: auto** — WINS frames (75→33%) but BREAKS the
   §A2 docH ratchet (12,722 > 12,540 cap; contain-intrinsic-size +
   sticky choreography drift) and ADDS render-on-approach longtasks
   (60→56/6.7s→5.8s is noise; the spikes just MOVE to section
   boundaries). NOT adopted; the experiment lives in
   `scripts/r321/a1-cv-experiment.mjs`.

## The remaining decomposition (the next session's map)

The storm is **rAF-driver-coupled** (rm-native ≈ 3× smoother with all
drivers off). The unaccounted ~2.8s of recalc: ~2-3 recalcs of
~756-element families per wheel step that track the Lenis glide. The
three verified sub-targets, in yield order:

1. **The .jt-intro var chain (10ms/frame ≈ 1.2s/run)** — rewrite the
   intro card's scrub as direct per-line `--wr-p` writes from the
   driver (JS computes the clamp curves; the words keep their masks;
   the card's in/out ramp becomes two direct opacity writes). Same
   visual grammar, one var level instead of three.
2. **The mystery 756-element family** — instrument with
   `disabled-by-default-blink.style` + elementCount clustering per
   scroll band (the family is stable at 756 — find the section: likely
   the jt side column or the rl/pm card grids reacting per glide
   frame; candidate: `.jt` stage-adjacent churn or Lenis's own
   per-frame class/attr work on `<html>`).
3. **The data-stage flips (27ms × 4-8)** — stage changes rewrite the
   attribute on `.jt` (2,000 descendants): move `data-stage` DOWN to
   the consuming layer roots (the zone-wash + station-warm groups).

LCP first-visit (loader ON): **5.04s vs the ≤4s target** — the loader's
own duration gates it (Heron's reference loader is ~7.2s; ours is
already shorter). Options for the next session: compress the loader's
60% plateau (~1s), or let the hero world mount/paint under the loader
overlay so LCP fires at paint, not at exit.

## Artifacts

- `audits/evidence/r321/perf-baseline.{json,md}` — the ff7aeed6 baseline
- `audits/evidence/r321/perf-{default,grain-off,svg-off}.{json,md}` — the variant matrix
- `audits/evidence/r321/perf-trace.json` + `/tmp/mdrk-r316-traces/` — the CDP trace tables
- `scripts/r321/a1-{experiment,invalidation,seats,seatcheck,cv-experiment}.mjs` — the isolation instruments (re-runnable)
