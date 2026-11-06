# W1 · Hero — QA proof notes (R332)

Owner wave: W1 (hero full-bleed rebuild) · defect: run-001 §Supervisor-1
("window inside a window") · verdict before: hero PARTIAL (composition only;
height Δ 0.03% / heading fs Δ 0.0% already twin-accurate).

## What was wrong (root cause, one line)

`landing.css:720 .bp-stage` — the shared drawing-window rule (`border: 1px
solid var(--rule); background: var(--surface); padding: var(--sp-4);
inline-size: min(100%, 108rem); margin-inline: auto`) binds the hero stage
(`class="bp-stage hro-stage"`) and, because `LandingPage.tsx` imports
`landing.css` (line 62) AFTER `Hero.tsx` (line 28 → `r331/hero.css`), it wins
every equal-specificity tie → the hero drawing rendered inside a **900×558px
white bordered box centred at x=270** (270px dead paper margins each side,
probe-before.json), with the `.hro-edge` frame strips hugging THAT box.

## Fixed (≥3 substantive differences, before → after @1440×900)

1. **The inner white box is gone (full-bleed paper).**
   stage computed: `border 1px solid rgb(179,179,175)` + `background
   rgb(255,255,255)` + `width 899.98px` → **`border 0px none` +
   `background rgba(0,0,0,0)` + `width 1440px`** (`.hro .hro-stage`
   specificity reset in r331/hero.css). Pixel proof
   (`w1/frames/after-madarek-p050.png`): flat-white column fraction at
   x=700 **0.88 → 0.00** — the page paper now runs edge-to-edge.
2. **The ink is full-bleed (tree breaks the viewport edge).**
   svg box 866×312.5 (inside the 900px window) → **1440×519.6**, x=0.
   Ink strokes in the rightmost 30 pixel columns: **0 → 122** (before, the
   right edge was dead white paper); left-edge ink 177 → 260. The 62svh
   stage cap holds (519.6 ≤ 558) so the fold does not move.
3. **The frame is the viewport frame (bgBorderFrame), not an inner window.**
   `.hro-edge` strips moved (Hero.tsx) from the stage box (edges x=271…1169,
   y=64…620 — wrapping the window) to the section: **t/b span x 10→1430,
   s/e span y 10→877 (inset 1.2rem = 10px, Heron remBase-true; 0.8rem ≤767)**
   + corner plus marks centred on the frame corners (4.2px insets). Pixel
   proof: top strip row y=10 = rgb(179,179,175) across 1403px; before, y=10
   was bare paper. Ruler chrome re-seated inset 3.2rem (Heron's ruler);
   stray `.bp-dmark` corner marks hover-gated with the dashed frame they
   annotate (clean corners at rest).
4. **Captions re-anchored to the annotation layer.** [01]/[03] deco cards
   were %-seated on the 900px window box (the run-001 "captions near the
   drawing baseline" eyes-on note); they now ride the full-bleed stage.
   Leaf-text AABB overlap (visible texts only, ancestors excluded):
   **0 pairs at 1920 / 1440 / 1024 / 768 / 390 — before AND after**
   (`revert-probe.py` re-injects the before CSS state for the same metric;
   the earlier raw 127-pair count was `.hi-layer` container artifacts).
   No caption overlap introduced or left at any viewport; the composition
   defect (captions trapped in the window) is killed by the re-seat.

## Regression guard (must-not-regress numbers — HOLD)

Twin after-run `twin/w1-after/report.json` vs run-001:

| metric | run-001 | w1-after | threshold |
|---|---|---|---|
| height Δ% | 0.03 (887 vs 886.7) | **0.03** | ≤3 ✓ |
| heading fs Δ% | 0.0 (46.6667 both) | **0.0** | ≤4 ✓ |
| trigger-start Δpx | 6.7 | **6.7** | ≤40 ✓ |
| 390 h-scroll (scrollWidth − innerWidth) | 0 | **0** | ≤1 ✓ |

All five probe viewports (1920/1440/1024/768/390): hero height, h1 fs and
h-scroll identical to before the fix (`probe-before.json` vs
`probe-after.json`); stage cap 62svh, `calc(100svh − 13px)` fold, intro
choreography and `.fo-hero*` funnel hooks untouched.

## Files changed (W1 ownership only)

- `frontend/src/styles/r331/hero.css` — `.fo-hero.hro` position:relative;
  `.hro-art` padding-inline 7px→0; `.hro-stage`→`.hro .hro-stage` (+border 0,
  margin-inline 0, padding-inline 0 — defeats landing.css `.bp-stage`);
  `.hro-edge` insets 0→1.2rem (0.8rem ≤767); `.bp-rulers` inset 3.2rem;
  `.bp-plus-*` → frame-corner seats; `.bp-dmark` hover gate.
- `frontend/src/components/landing/hero/Hero.tsx` — frame (4 `.hro-edge` +
  4 `.bp-plus`) moved from `.hro-stage` to the section root; dmarks moved out
  of `.bp-rulers` to the stage (dashed-frame corners); header anatomy comment.
- `frontend/src/components/landing/cursor/HeroInspect.tsx` — NOT needed
  (its geometry is SVG-box-relative; unaffected by the re-seat).

## Outside-ownership edit required (NOT applied — documented)

`frontend/src/styles/landing.css:720` (`.bp-stage`) — delete the box-making
properties (border / background / inline-size / margin-inline) or gate the
rule `:not(.hro-stage)`; exact edit in `sections/hero.md` §5. Until then the
`.hro .hro-stage` reset holds the composition (verified by probe).

## Evidence index (/home/z/evidence-r332/w1/)

- `probe-before.json` / `probe-after.json` — 5-viewport before/after
  geometry + caption overlap metric (probe.py).
- `probe-before-reconstructed.json` + `revert-probe.py` — before-state CSS
  reconstruction for the caption metric.
- `frames/before-{heron,madarek}-p050.png`, `frames/after-{heron,madarek}-p050.png`
  — copied run-001 / w1-after twin frames.
- `after-1440-p50-heronLEFT-madarekRIGHT.png` — after side-by-side;
  `before-vs-after-madarek-1440-p50.png` — stacked before/after.
- Twin after-run: `/home/z/evidence-r332/twin/w1-after/` (51 frames/side,
  report.json + report.md — metrics all inside threshold; the PARTIAL label
  is the harness's rhythm-missing classification, same as run-001:
  `missingMetrics: rhythmGapPx`).

Honest gaps: e2e/unit suites not run this wave (per wave instruction —
`npx tsc -b --noEmit` clean exit 0); visual heat meanDiff p50 33.56→32.33
(the metric mixes RTL text rendering; composition verified by geometry +
pixels above).
