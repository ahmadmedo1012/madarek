# T-11a — Tween coverage metric + Heron census + T-11b work-list

Tool: `scripts/conformance/tween.mjs` (new, this task). Reports: `/tmp/tween-1440.json`,
`/tmp/tween-390.json`. Dev server `vite :5311`, landing `/`.

```
node scripts/conformance/tween.mjs --bp 1440 --out /tmp/tween-1440.json
node scripts/conformance/tween.mjs --bp 390  --out /tmp/tween-390.json
node scripts/conformance/tween.mjs --bp 1440 --gate 90   # exit 1 below 90 % (ratchet)
```

## What it measures

* **Side A (Heron, frozen)** — `_motion.<bp>.json`: the recorded GSAP call log,
  normalized into tween-UNITS (one per animated property per target) and grouped
  by `(section, property-family, trigger-class)` — the coverage unit.
* **Side B (ours, live)** — loads our landing at the breakpoint and inventories
  every animation it actually runs: WAAPI patch (`Element.animate` → 0 calls),
  CSSOM walk (`@keyframes` defs, `animation-timeline: view()/scroll()` rules → 0/0),
  DOM walk over every mapped section root (hidden-at-rest / keyframed /
  transition-carrying elements), and a Lenis-seated scroll journey
  (28 seats × 300 ms down + 2 s bottom dwell + 6 seats up, the scroll.mjs
  discipline) that timestamps state flips per grammar element.
* **Coverage rule (the brief's tolerance)** — a Heron group is covered when our
  side has a counterpart with the same property-family, an equivalent trigger
  class, and (duration within ±150 ms OR same ease family). `set()`-only Heron
  groups are census-counted but held out of the denominator (stateOnly).
  Infinite ambient loops are ours-only decoration, reported, never matched.

## Heron census (frozen spec → per section)

@1440: **1136 tween-units, 43 groups (32 animated / 11 stateOnly), 50 recorded
ScrollTriggers (4 scrubbed)**. @390: 1034 units, 39 groups (30 animated / 9
stateOnly), 22 triggers. The page-wide signature: **800 ms / power2.out /
20 ms stagger**, `from {opacity:0, y:26.667}` → `to {autoAlpha:1, yPercent:0}`.

| section | units @1440 | properties | typical dur / ease / stagger | trigger |
|---|---|---|---|---|
| footer | 214 | opacity, translateY | 800 / power2.out / 20 | scroll-reveal |
| home-problem-wrap | 200 | opacity, scale, translateY | 800 / power2.out / 20 | scroll-reveal |
| home-map-wrap | 174 | opacity, scale, translateY | 800 / power2.out / 20 | **scrub** |
| home-why-wrap | 152 | opacity, scale, translateY | 800 / power2.out / 20 | scroll-reveal |
| home-usecase-wrap | 117 | opacity, scale, scaleX, translateY, width | 800 / power2.out / 20 | scroll-reveal |
| home-hero-wrap | 77 | opacity, scaleX, scaleY, translateY | 800 / power2.out / 20 | load + scroll-reveal |
| loading (preloader) | 46 | clip-path, height/width, opacity, translateY, bg | 800 / cubic-bezier(1,0,.44,1) | load + exit |
| home-cta-wrap | 58 | opacity, translateY | 800 / power2.out / 20 | scroll-reveal |
| home-platform-wrap | 40 | opacity, translateY | 800 / power2.out / 20 | scroll-reveal + scrub |
| chrome (header) | 26 | opacity, scaleY | (fromTo, timing unrecorded) | load |
| home-intro-wrap | 32 | opacity, translateY | **600** / power2.out / **4** | scroll-reveal |

@390 differences: no home-intro-wrap tweens recorded; loading grows to 117
units; distances `y:31.756` instead of `26.667`.

## Our live inventory

@1440: **169 units** (load 44 · scroll-reveal 79 · scrub 16 · state 24 ·
ambient 6); 39 grammar elements tracked through the journey; 8 scrub-varying
tracks (all `div.rl-row#1..8`, the Roles rows); 9 `@keyframes` defs;
**0 WAAPI calls, 0 `animation-timeline: view()/scroll()` rules** — the house
engine is CSS-transition/keyframe + IntersectionObserver (reveals.ts once:true
+ useReveal.ts toggling belt + Lenis), exactly as designed. @390: 162 units,
0 scrub tracks (rl-row parallax is desktop-only).

Typical our-side reveal: `opacity 0→1 + translateY 14px→0, 650 ms,
cubic-bezier "out" family` — the `reveal-up` house seat.

## Coverage (Heron animated groups vs our counterparts)

| section | @1440 | @390 |
|---|---|---|
| home-hero-wrap | 2/6 (33.3 %) | 2/6 (33.3 %) |
| chrome | 1/2 (50 %) | 1/2 (50 %) |
| home-intro-wrap | 0/2 (0 %) | — (no Heron groups) |
| home-cta-wrap | 0/2 (0 %) | 2/2 (100 %) |
| home-why-wrap | 2/2 (100 %) | 2/2 (100 %) |
| home-problem-wrap | 2/2 (100 %) | 2/2 (100 %) |
| home-usecase-wrap | 0/4 (0 %) | 2/4 (50 %) |
| home-map-wrap | 0/2 (0 %) | 0/2 (0 %) |
| home-platform-wrap | 2/4 (50 %) | 2/4 (50 %) |
| footer | 0/2 (0 %) | 0/2 (0 %) |
| loading | 0/4 (0 %) | 0/4 (0 %) |
| **OVERALL** | **9/32 = 28.1 %** | **13/30 = 43.3 %** |

Worst @1440: home-intro-wrap, home-cta-wrap, home-usecase-wrap, home-map-wrap,
footer, loading (all 0 %). The 100 %-covered sections (why/problem) are covered
by the 650 ms out-family `reveal-up` seat matching Heron's 800 ms/power2.out
within the ±150 ms tolerance.

## T-11b work-list (ranked; specs are Heron-recorded values)

1. **Footer scroll-reveals — biggest single gap (107 elements × 2 props).**
   `.fo-footer` columns/links/mark: `opacity 0→1` + `translateY 26.667px@1440
   (31.756px@390)→0`, **800 ms, power2.out, stagger 20 ms**, scroll-reveal.
   Our footer currently has ZERO reveals (hover transitions only).
2. **home-map-wrap (chapters) scrub scene — structural gap.** Heron scrubs
   opacity (88 units → autoAlpha 1) + translateY (76 units → yPercent 0) +
   scale, scroll-linked over the section; ours runs one-shot 650 ms reveals.
   Needs a scroll-linked pass (CSS `animation-timeline: view()` fits the house
   engine, or a Lenis-driven transform).
3. **home-usecase-wrap (roles) reveals.** 37 opacity + 36 translateY units
   (from op 0 / y 26.667 → 1 / 0, 800 ms, power2.out, stagger 20 ms,
   scroll-reveal) + `width 0→auto` (16 units) + `scaleX 0→1` (2 units, the
   role-card rules). Ours has only load-fades and the rl-row scrub tracks.
4. **Hero scroll-reveals + load scales.** translateY scroll-reveal (29 units →
   yPercent 0, 800/20 ms) is missing; `scaleX/scaleY 0→1` + `y:26.667` load
   entrances (fromTo, timing unrecorded — pick 800/power2.out to match the
   page signature).
5. **home-cta-wrap reveals + reveal-deadlock (see below).** 29×2 units,
   800/power2.out/20 ms scroll-reveal. @390 covered, @1440 blocked by the
   deadlock; the CTA title never fires on ANY journey.
6. **home-intro-wrap (statement) reveals.** 16×2 units at **600 ms** (not
   800) / power2.out / **stagger 4 ms** — op 0→1 + y 26.667→0. Ours has only
   0.92→1 500 ms load fades.
7. **Preloader (loading) exit polish.** clip-path wipe + translateY
   (310 px@1440) + backgroundColor → `#b3b3af`, 800 ms
   `cubic-bezier(1, 0, 0.44, 1)`; final opacity exit 400 ms power2.out.
   Ours runs a preloader (intro-draw) but the recorded exit choreography is
   richer.
8. **Chrome (header) load entrance.** scaleY 0→1 on 12 header menu items
   (fromTo, timing unrecorded).
9. **home-platform-wrap scrub pair.** opacity + translateY scrub (1 unit each,
   fromTo FROM-side only) — likely a small pinned/scrubbed flourish.

### The reveal-deadlock finding (investigate first in T-11b)

Under a full stepped scroll journey @1440 the chapters **journey-tape overlay
(`jt-window`) opens and stays open**; afterwards `__mdrkRevealBelt.registry`
reads 0 and 15 elements (CTA title/lede/actions/meta, hero `.hro-line` ×5,
`.hro-actions`, `.hro-work-card`, `jt-*`) remain **armed-hidden and never
receive `.in-view`**, even after a 2 s bottom dwell. Reproduced outside the
instrument (plain Playwright): direct top→bottom jump reveals
lede/actions/meta but the **CTA title never reveals at all** (op 0, ty 14 px,
`in-view=false` after 2 s). These elements are reported in
`ours.neverRevealed` and held OUT of coverage — no fake matches.

## Instrument limitations (honest)

* Heron `fromTo` tweens were recorded with FROM vars only → duration/ease
  unknown for those groups (flagged `partial`; match on property+trigger).
* Heron tween→ScrollTrigger association is derived from recording-timestamp
  order (timeline marker owns subsequent tweens) — scene-sound, not per-tween
  ground truth. Scene count can exceed the trigger table (31 vs 22 @390).
* Our params are read from computed styles on the SHOWN state (walkMid at the
  bottom dwell / walk2); distances come from a most-hidden→most-shown envelope
  across four snapshot walks (pre-intro, armed, at-bottom, back-at-top) —
  ordering of observed states only, nothing invented.
* Scrub equivalence is property+trigger only (numeric scrub curves are
  scroll.mjs / `scroll-curves.<bp>.json` territory, T-10).
* 363 @1440 / 317 @390 walk candidates are `unaccounted` (hover/state
  transitions or no observable delta) — reported, not guessed.
* 15 @1440 / 14 @390 `neverRevealed` elements are excluded from coverage
  (arming artifacts are not animations we run).
* walk0 (pre-intro) may catch mid-flight entrance states; deltas there use the
  envelope, not the instantaneous frame.

Ratchet: overall coverage is the number T-11b moves; target ≥90 %. Re-run
`tween.mjs --gate 90` after each work-list item.
