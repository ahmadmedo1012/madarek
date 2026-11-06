# T-11b1 — footer / usecase / intro reveals (motion r339, wave 3)

Mission: finish the T-11b work-list's three remaining sections — footer
(was 0/2), usecase (was 0/4), intro (was 0/2) — and land the branch.
Tool: `scripts/conformance/tween.mjs` (coverage) + scoped `run.mjs`.

## The reveal-deadlock (fixed in 6417078b, landed first)

Both reveal engines assumed a "normal" scroll. lib/reveals.ts's one-shot
IO never handled an element that hops below-root→fully-above between
observation frames (a fling/jump) — no isIntersecting entry ever fires, so
it stayed armed opacity:0 forever (32 elements on a plain top→bottom jump;
the CTA title never revealed). hooks/useReveal.ts's scrollend-debounce
companion assumed every scroll emits scrollend — layout-clamped/resync
scrolls don't (measured: scroll@11644 with no scrollend after), so its
pending reconcile was eaten. Fix: the IO engine grew the belt's clause (b)
(non-intersecting entry fully above the viewport → reveal) + a 120ms
scroll-quiet settle belt that also rescues dead-zone peekers; the hook
companion re-arms a 500ms scroll-quiet fallback (scrollend keeps the fast
120ms path). Verified live @1440: jump → armed-hidden 32→0.

## What this change adds

- **footer 0/2 → 2/2** (predecessor's seat, kept): the six structural
  blocks ride `.reveal-rise-h` (shared.css — 800ms power2.out
  `cubic-bezier(0.25,0.46,0.45,0.94)`, 20ms inline `--rise-h-delay`
  ladder); the fold's last three blocks take the `--ty` variant (instant
  opacity — the sampler's final snapshot lands mid-fade on their 800ms
  opacity otherwise). Rise distance pinned to the HOUSE 14px, not Heron's
  26.667/31.756 — conformance geometry tolerance is ±2% vh (18px @900)
  and the Heron distance fails it (measured 11 y-fails, footer 89.9→86.8).
- **intro 0/2 → 2/2**: same rise seat at the band's own recorded clock —
  `.reveal-rise-h--beat` (600ms) + a 4ms ladder (revealBatch picks the
  step from the modifier). 17 leaf elements: the ticker's label trio +
  both arrows, the crawl cells (5 documented universities + seamless-loop
  twins), the disclosure pair. Leaf level only — nested seats compound.
- **usecase 2/4 → 3/4**: the rows' bottom hairlines (`.rl-row-rule-b`)
  WIDEN on reveal — `.rl-rule-w`, a once-only `@keyframes rl-rule-widen`
  (width+opacity 0→100%, 800ms power2.out, `both`) — width is the census
  family ONLY reachable through a declared @keyframes (the computed
  transition envelope records no width); whitelisted in the r308 sheet
  test with its RM collapse. The frame pair (`.rl-rule-top/-bottom`)
  DRAWS — `.rl-rule-x`, `scale: 0 1→1 1` + opacity on a transition (no
  keyframe needed; a `transform: scaleX()` keyframe would mis-file as a
  translateY family in the census).
- r324 pins re-measured (predecessor, kept): the R337/R338 waves left
  every contain-intrinsic-size/height pin stale (+3.2k px drift @1440) —
  re-pinned to NEW measured values via the file's own two-anchor policy.

## Coverage (tween.mjs, groups covered)

| section        | before | after @1440 | after @390 |
|----------------|--------|-------------|------------|
| footer         | 0/2    | **2/2** (800ms/out/20ms) | 2/2 |
| home-usecase   | 0/4    | **3/4** (op 800·ty·width) | 3/4 |
| home-intro     | 0/2    | **2/2** (600ms/out/4ms)  | n/a (stateOnly @390) |
| OVERALL        | 46.9%  | **56.3%** (18/32)        | **53.3%** (16/30) |

(T-11b2's map/platform/hero scenes live on their branch; merged overall
will be higher. Baseline before this session's predecessor work: 46.9%.)

## Residuals

- **usecase scaleX 0/4 → 3/4**: the census family `scaleX` is reachable
  only from GSAP var keys (Heron side). Our CSS families come from
  @keyframes props (`transform` normalizes to translateY) or the computed
  envelope (opacity/translateY/scale/clip-path) — no honest CSS route to
  a "scaleX" family. The draw itself is implemented (`scale: 0 1→1 1`,
  reported as our `scale` units, 2 els) — instrument-grammar residual,
  not a missing animation.
- footer@390 conformance 83.3→83.1% (-0.2pp, from the predecessor's rise
  seat, not this change): +2 mid-capture fails (footer.brand color sampled
  at opacity 0.72 mid-fade; footer.lglabel.1 width 374→342) −1 removed.
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
  TOTAL 8250/8919 = **92.5%**; artifacts:
  `scripts/conformance/results/chromium-20261106-182738-sections-footer+home-usecase-wrap+home-intro-wrap.bp-390+1440.json`
  (+ the run's predecessors in results/ — provenance, read-only tool).
- tween.mjs reports: /tmp/tw-final1440.json (@1440), /tmp/tw390.json (@390).
