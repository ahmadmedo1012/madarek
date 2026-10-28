# Heron — scroll & motion spec in plain words (R322 package 1-c)

> Source: `scroll-spec.json` (merged 1440/768/390) + `media-inventory.json`
> (header class-state probes + evidence shots). Numbers are scroller-content px on
> `.main-inner` (the Lenis wrapper — the **window does not scroll** on this site:
> `body` is locked at viewport height and the whole page lives inside the wrapper).

## Engine inventory (all breakpoints)

- **Webflow export** (`html.w-mod-js`) + **GSAP 3.12.5** + **ScrollTrigger**
  (44 triggers @1440 · 42 @768 · 28 @390) + **Lenis attached to `.main-inner`**
  (the wrapper carries the `lenis` class; classList observed: `main-inner lenis
  [lenis-scrolling] [lenis-stopped]` — the stopped state appears during loader /
  menu open).
- No Barba, no Locomotive. `Webflow.require('ix2')` was NOT reachable at scan time —
  entrance/hover interactions run inside Webflow's IX2 engine (gap, below).
- Body/html backgrounds are transparent; the page is the paper texture on `.bg-global`.

## Lenis options — measured, not read ⚠ GAP

The Lenis instance is **not exposed** (`window.lenis` / `window.__lenis` both absent;
no reachable options object on the wrapper). So **lerp / duration / wheelMultiplier /
syncTouch are NOT captured — explicit gap** for the foreman. What we have is an
empirical feel measurement (one trusted wheel Δ1200px, rAF-sampled 2.8s):

| bp | t50 | t90 | fitted k (1/s) | ≈ lerp/frame @60fps | native jump? |
|---|---|---|---|---|---|
| 1440 | 660ms | 660ms | 3.489 | **0.056** | no |
| 768 | 181ms | 455ms | 5.061 | **0.081** | no |
| 390 | 158ms | 407ms | 5.657 | **0.090** | no |

Reading: smooth-wheel is active at every breakpoint (never a native jump); the
desktop feel is *heavier* (≈0.056 lerp ≈ k≈3.5/s, i.e. ~90% of a 1200px flick
settles in ~0.66s) while tablet/phone are snappier (~0.08–0.09). **Recommendation for
Madarek:** Lenis `lerp: 0.09–0.1` on touch devices and `0.06` on fine pointers (or
`duration ≈ 1.1s` + expo-out easing), wrapper-based like Heron's (we already scroll
a wrapper in the Madarek shell — keep parity).

## ScrollTrigger table (the 44 @1440 — the shape that matters)

**No pins at all** (`pin: null` on every trigger at every breakpoint — the "long
scroll" feel is scrub ranges, not pinning). Three families:

1. **Section wrapper toggles** (one per section: `home-intro-wrap`, `home-problem-wrap`,
   `home-map-wrap`, `home-platform-wrap`, `home-why-wrap`, `home-usecase-wrap`, cta, footer):
   `start: clamp(top bottom+=50%)`, `end: bottom top-=50%`, `toggleActions: play`,
   **no tweens** — class toggles handed to CSS/IX2. Measured @1440: intro 0→2053,
   problem 279→2795, map 1021→9095, platform 7321→9805, why 8031→10503, usecase 8729→11390.
2. **Reveal family** (the site's bread and butter): trigger = a content block,
   `start: "top+=NN% bottom"` (NN = 40/45/55/65), `toggleActions: play`, timeline =
   `autoAlpha + yPercent` tweens, **power2.out**, **0.8–1.34s** each. Every captured
   section uses it (numbers in statement.md / problem.md).
3. **Scrub family** — only **3** triggers @1440 (2 @768, 2 @390 — the map pair is
   absent or merged at 390):

| trigger | start → end | scrub | measured @1440 | what it drives |
|---|---|---|---|---|
| `home-intro-content-title` | `center bottom+=10%` → `center top+=40%` | **true** | 98→718 | per-char **color** scrub of the 127-char statement (4.28s timeline, power-out) |
| `home-map-wrap` | `top bottom` → `top top` | true | 1465→2352 | `y` on `.home-map-main-inner` (0.5s) — map drifts while entering |
| `home-map-wrap` | `top 50%` → `bottom-=270 bottom` | true | 1908→7495 | the **map sequence**: 2× `home-intel-inner` autoAlpha/y/scale + map-img opacity + path scale/x/y — the 5.6-megapixel scroll story |

(The map triggers belong to package **C3 (map, 6 states)** — recorded here only
because the table is global; map internals were NOT extracted this round.)

Plus a footer/CTA sub-family @1440: `cta-wrap` and 11 × `footer.footer` triggers with
`start: top bottom+=100vh`, `end: bottom top`, `scrub: false` — late-page reveals.

## Header show/hide — thresholds and behaviour

The header is **not** ScrollTrigger-driven; a small scroll listener flips classes on
`header.header` (the outer element never moves; the visible `.header-inner` does):

| state | when | effect |
|---|---|---|
| *(none)* | scrollTop ≈ 0 | bar fully visible |
| `on-scroll` | scrollTop ≥ ~50–100px (any bp, either direction) | scrolled style (bar stays visible) |
| `on-hide` | downward scroll past ~50px — **observed @1440 only** | **`.header-inner` translates up by its own height** (`translateY(−56.86px)` ≈ −6.83rem @1440) — the bar slides out of the frame |
| back up | upward scroll (hysteresis between ~50–350px on a slow drive) | transform transitions back (sampled mid-flight at −40px) |

⚠ At 768/390 `on-hide` **never fired** in two independent drives (50px steps @150ms;
300→600→300 jumps) — either the hide is desktop-only or velocity-gated. Evidence:
`header-<bp>-{top,scrolled-down,hidden-down,back-up}.jpg` (supplement pass).

## Loader observations

`.loading` covers the viewport (1427×887 @1440 · 753×1009 @768 · 374×828 @390),
auto-dismisses — class `loaded` + collapse to 0×0 — **between 5.5–6.0s @1440,
5.0–5.5s @768, 5.5–6.0s @390** after `networkidle` (timed by 500ms polls). No click
is required. Content reveal begins as the loader collapses. For Madarek: our loader
should stay well under this (≤1.5s) — Heron's 5.5s is a heavyweight intro, not a goal.

## Consent banner (recorded, never accepted)

`.cookie-banner.bg-global` bottom strip: 601×38px @1440 (bottom-right, z 100009),
377×95 @768, 374×93 @390; 2 buttons, 67ch of text; one Escape press did **not**
dismiss it (opacity animated 0.8→1). Geometry only, per the no-interaction rule.

## Document metrics (cross-check vs R321 board — all EXACT)

| bp | docH (this run) | R321 board | Δ |
|---|---|---|---|
| 1440 | 12,355 | 12,355 | 0% |
| 768 | 12,577 | 12,577 | 0% |
| 390 | 11,441 | 11,441 | 0% |

(1024 was not re-captured this round — the brief's 4-bp plan used 1440/768/390 for
this package; 1024 docH 9,938 stands from R321.)

## Explicit gaps for the foreman

1. **Lenis literal options not captured** (instance unreachable) — use the empirical
   lerp numbers above; if the foreman wants the exact config, a source-map dig into
   their JS bundle would be a separate small task.
2. **Webflow IX2 parameters not captured** (`require('ix2')` unreachable): the hero
   entrance/ruler reveal, button hover swaps and menu hover underlines live there.
   Timings unknown; rebuild from the state evidence shots + §3 review.
3. **Map/platform/why/usecase/cta/footer internals not extracted** (by design —
   wrapper triggers only). Map belongs to **C3**; the rest to later packages.
4. Trigger `anim` details for 10 triggers errored (`targets()[0]` null after style
   unlock — recorded as `err` strings); their vars rows are intact.
5. Per-scroll-state node sampling runs at depth ≤ 3 — deep per-char / per-line
   changes (e.g. the statement color scrub) are visible in the *triggers* + evidence
   shots, not in the state node lists.

## Transplant notes (the 5 numbers that matter)

1. **Zero pins; reveal recipe: `top+=45–65% bottom`, play, autoAlpha+yPercent, power2.out, 0.8–1.34s.**
2. **Lenis feel: lerp ≈ 0.056 desktop / 0.08–0.09 touch** (wrapper scroller, body locked).
3. **Statement scrub range 98→718px @1440** (center-based, 4.28s) — the only scrub in our 4 sections.
4. **Header: on-scroll @~50–100px; on-hide (desktop) = translateY(−bar height) with hysteresis.**
5. **Loader ≈ 5.5s auto-dismiss** (do NOT copy the duration; copy the auto-dismiss + content-reveal handoff).
