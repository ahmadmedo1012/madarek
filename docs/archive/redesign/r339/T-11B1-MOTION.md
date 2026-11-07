# T-11b1 — footer / usecase / intro reveals (motion r339, wave 3)

Mission: finish the T-11b work-list's three remaining sections — footer
(0/2), usecase (0/4), intro (0/2) — and land the branch.
Tools: `scripts/conformance/tween.mjs` + scoped `run.mjs`.

## The reveal-deadlock (fixed in 6417078b, landed first)

Both reveal engines assumed a "normal" scroll. lib/reveals.ts's one-shot
IO never handled an element hopping below-root→fully-above between
observation frames (a fling/jump) — no isIntersecting entry ever fires, so
it stayed armed opacity:0 forever (32 elements on a plain top→bottom
jump; the CTA title never revealed). hooks/useReveal.ts's scrollend
debounce assumed every scroll emits scrollend — layout-clamped/resync
scrolls don't, so its pending reconcile was eaten. Fix: the IO engine grew
the belt's clause (b) (non-intersecting entry fully above the viewport →
reveal) + a 120ms scroll-quiet settle belt rescuing dead-zone peekers; the
hook companion re-arms a 500ms scroll-quiet fallback. Verified live
@1440: jump → armed-hidden 32→0.

## What this change adds

- **footer 0/2 → 2/2** (predecessor's seat, kept): six structural blocks
  ride `.reveal-rise-h` (shared.css — 800ms power2.out, 20ms inline
  `--rise-h-delay` ladder); the fold's last three blocks take the `--ty`
  variant (instant opacity — the sampler's final snapshot lands mid-fade
  otherwise). Rise distance pinned to the HOUSE 14px, not Heron's
  26.667/31.756 — geometry tolerance is ±2% vh and the Heron distance
  fails it (measured 11 y-fails, footer 89.9→86.8).
- **intro 0/2 → 2/2**: same rise seat at the band's own clock —
  `.reveal-rise-h--beat` (600ms) + a 4ms ladder (revealBatch picks the
  step from the modifier). 17 leaf elements: label trio + both arrows,
  the crawl cells (5 universities + seamless twins), the disclosure
  pair. Leaf level only — nested seats compound.
- **usecase 2/4 → 3/4**: the rows' bottom hairlines WIDEN — `.rl-rule-w`,
  once-only `@keyframes rl-rule-widen` (width+opacity 0→100%, 800ms
  power2.out, `both`) — width is the census family ONLY reachable via a
  declared @keyframes (the transition envelope records no width);
  whitelisted in the r308 sheet test with its RM collapse. The frame
  pair DRAWS — `.rl-rule-x`, `scale: 0 1→1 1` + opacity on a transition
  (a `transform: scaleX()` keyframe would mis-file as translateY).
- r324 pins re-measured (predecessor, kept): R337/R338 left every
  contain-intrinsic-size/height pin stale (+3.2k px @1440) — re-pinned
  to NEW measured values via the file's own two-anchor policy.

## Coverage (tween.mjs, groups covered)

| section        | before | after @1440 | after @390 |
|----------------|--------|-------------|------------|
| footer         | 0/2    | **2/2** (800ms/out/20ms) | 2/2 |
| home-usecase   | 0/4    | **3/4** (op 800·ty·width) | 3/4 |
| home-intro     | 0/2    | **2/2** (600ms/out/4ms)  | n/a (stateOnly @390) |
| OVERALL        | 46.9%  | **56.3%** (18/32)        | **53.3%** (16/30) |

(T-11b2's map/platform/hero live on their branch — merged overall will be
higher. Baseline before this session: 46.9%.)

## Residuals

- **usecase scaleX 3/4 cap**: the census family `scaleX` is reachable
  only from GSAP var keys (Heron side). Our CSS families come from
  @keyframes props (`transform` normalizes to translateY) or the computed
  envelope (opacity/translateY/scale/clip-path) — no honest CSS route to
  "scaleX". The draw is implemented (`scale: 0 1→1 1`, reported as our
  `scale` units) — instrument-grammar residual, not a missing animation.
- footer@390 conformance 83.3→83.1% (-0.2pp, from the predecessor's rise
  seat, not this change): +2 mid-capture fails (footer.brand color at
  opacity 0.72 mid-fade; footer.lglabel.1 width 374→342) −1 removed;
  footer@1440 89.9% = the predecessor's converged artifact, unchanged.
- usecase@390 89.5→89.4% (-0.1pp): +1 `sectionHeightVh` (#roles 1.123→
  1.219vh) — pre-existing R337/R338 layout drift surfaced by the scope
  (the r324 re-pin records the same 1029px), −1 scroll-curve moved out.
- intro: no committed baseline (first scoped artifacts); 97.2% @390 /
  97.8% @1440.

## Evidence

- verify.sh --fast: **FAST PASS** — 3051/3051 vitest (incl. the r324
  height-gate pins) + bundle 765.2 KB gz ≤ 770.
- Scoped conformance (footer,home-usecase-wrap,home-intro-wrap @390+1440):
  TOTAL 8250/8919 = **92.5%**; artifacts in scripts/conformance/results/
  (…182738-sections-footer+home-usecase-wrap+home-intro-wrap… + the run's
  predecessors — provenance).
- tween.mjs: /tmp/tw-final1440.json (@1440), /tmp/tw390.json (@390).
