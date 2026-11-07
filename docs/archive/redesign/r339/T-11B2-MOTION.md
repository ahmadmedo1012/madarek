# T-11b2 — Motion coverage: map scrub scene, hero load scales, platform flourish

Branch `r339/t11b2` · continues T-11A's work-list · tool `tween.mjs --url :5314` (read-only, unchanged).
Commits: `ec94079a` (seats) → `df4257cb` (recorded from-states) → `88b94a83` (artifacts) → `bc0eb38b` (this ledger).

## Coverage (tween.mjs, Heron animated groups vs our counterparts)

| section | @1440 before → after | @390 before → after |
|---|---|---|
| home-map-wrap | 0/2 (0 %) → **2/2 (100 %)** | 0/2 → **2/2** |
| home-platform-wrap | 2/4 (50 %) → **4/4 (100 %)** | 2/4 → **4/4** |
| home-hero-wrap | 2/6 (33.3 %) → **4/6 (66.7 %)** | 2/6 → **4/6** |
| OVERALL | 9/32 = 28.1 % → **15/32 = 46.9 %** | 13/30 = 43.3 % → **19/30 = 63.3 %** |

Landed in priority order, one commit per seat-group (see git log).

## The view() pattern + fallback

`0 → 2` `animation-timeline: view()` rules in the CSSOM (0 `scroll()`); 0 WAAPI calls;
the engine stays CSS + IntersectionObserver + Lenis.

```css
@keyframes jt-head-scrub { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .chapters-head .reveal-up {
      animation: jt-head-scrub var(--t-cinema) var(--ease) both;
      animation-timeline: view();
      animation-range: entry 0% cover 40%;
    }
  }
}
```

* **Fallback**: the POSITIVE `@supports` gate — browsers without view() fall through to
  the existing IO one-shot `reveal-up` seat (650 ms); nothing is removed.
* **RM**: the `no-preference` wrapper keeps reduce-users on the static sheet (the r306
  belt still collapses every ambient instrument; these rules are simply absent).
* **Reversibility**: scroll back up and the head scrubs out (tween.mjs classifies both
  seats `scrub` via reverse-pass variance). Same contract for `pr-title-scrub`
  (platform.css, first row's title wrap, `entry 0% cover 30%`, from op 0 / y 26.667).

## Range alignment (recorded trigger windows, _motion.1440.json)

* **Map**: the scrub timeline is «top 50% → bottom-=270 bottom» (1908→7495 recorded px);
  the head pair rides its FIRST segment (0.8 s power2.out, 20 ms stagger in the 5.52 s
  scrub). Measured on our seat @1440×900 (h2 doc-top 3382, h 95): entry 0% = 8.7 % into
  the recorded window; `cover 40%` settles at 15.8 %; the seat's own traversal caps at
  26.4 % (full-cover would hold the title near-invisible through the 649dvh pin) — math
  in the journey.css comment. (The «top bottom → top top» trigger 1465→2352 owns ZERO
  tweens — an empty spacing trigger; pass-1 cited it, corrected in `df4257cb`.)
* **Platform**: recorded «top bottom → bottom top» on the row-group wrap (7765→9362) —
  the FULL cover traversal. Ours is the brief's «small flourish» (entry 0% → cover 30%):
  a documented seat deviation — the title settles by a third of the viewport instead of
  crawling at half-opacity through the band.

## r306 test disposition (the pin)

**Kept — a legitimate re-pin to a new measured contract.** The r308 law: "every
`@keyframes` is whitelisted AND RM-collapsed". The two scrub entrances joined the
ALLOWED set with their RM story (the no-preference wrapper IS the collapse: under
reduce the rules are absent, the reveal-up static sheet stands). The RM belt test
(`RM_COLLAPSED`) unchanged; nothing weakened. `verify.sh --fast` GREEN — 3051 vitest,
bundle 764.4/770 KB gz.

## Conformance no-regression (scoped, 3 sections × 5 bps)

`run.mjs --sections home-map-wrap,home-hero-wrap,home-platform-wrap`: baseline
(pre-motion, CSS @58af8bfa) **7426/8141 = 91.2 %** → with motion **7421/8141 = 91.2 %**
— identical rate at reported precision, 0 new distinct failure kinds. The ±5-check delta
is stage-machine svg-opacity transients that flip run-to-run (the predecessor's own two
same-code runs differed by 2). edge390 fails: 0.

## Residuals (≤80 lines total, this file is the ledger)

1. **hero scaleX/scaleY load groups (the 2 missing of 6)** — unreachable under the
   current tween.mjs family normalization, NOT unimplemented: our CSS speaks the `scale`
   property (`.hro-lmask` ladder — `scale: 0 1` title lines, `scale: 0 0` lead lines,
   800/power2.out, line-mirrored stagger; registers as 5 `scale`-family load units +
   the `.hro-line` translateY rise), the census speaks GSAP scaleX/scaleY, and
   PROP_FAMILY keeps them distinct (keyframes `transform` hard-maps to translateY).
   scripts/conformance is READ-ONLY — the `scale` ≡ scaleX+scaleY bridge is a T-11c
   tool decision. Hero ceiling under the current tool: 4/6 (≥5/6 not landable without it).
2. **The map's long-form stage scrub** — Heron's 5.52 s timeline cycles title/content
   pairs per stage; our stage machine (data-stage/data-finding) owns that territory,
   untouched (seat-scope rule). Covered on property+trigger; numeric curves stay
   scroll.mjs/T-10 territory.
3. **never-revealed list unchanged** — cta.* (T-11A reveal-deadlock, another task);
   jt-window/jt-card are flung-past sampling artifacts.
4. Hero rest-states compute `transform: none` (entrances END); hero DOM/data-spec
   untouched (T-17 concurrency respected — CSS-only edits).

## Law compliance

No gsap · no new `!important` · existing tokens only (`--t-cinema`, `--ease`,
`--hro-line-dur`, `--hro-p2-out`) · geometry/type/color seats untouched · Arabic copy
untouched · scripts/conformance read-only (`git diff 58af8bfa..HEAD -- scripts/conformance`
= new result artifacts only).
