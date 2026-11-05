# R308 Reference Observations — Heron AI (heronaiapp.com)

Factual measurement record for the R308 mission. Every value below was measured on the live
site (headless Chromium 156, Playwright; 1440×900 unless noted) or read from its shipped
CSS/DOM. `NOT VERIFIED` marks behaviors that could not be confirmed. Captures live under
`/home/z/evidence/r308/reference/<viewport>/` (never committed). Companion machine-readable
map: `reference-interaction-map.json`.

Source facts also cross-checked against the Bearplus case study
(https://tympanus.net/codrops/2026/10/12/heron-ai/, fetched 2026-10 → evidence
`reference/case-study.txt`).

## 0. Platform facts (measured)

- Stack: Webflow (cdn.prod.website-files.com assets) + GSAP + ScrollTrigger + Lenis 1.1.5
  (smooth scroll, wrapper `.main-inner.lenis`, `overflow:hidden`, programmatic scrollTop) +
  Barba (page transitions) + custom Canvas-2D cursor + SVG mask/ink transitions. Companion
  asset host: `heronai-bp.netlify.app` (e.g. `assets/pixel-mask.svg`).
- Document structure: `body > .body-inner > .common > MAIN#main` with web components
  `header-component`, `loading-wrap`, and per-section `*-wrap` components.
- Homepage top-level section order (DOM): `home-hero-wrap` → `home-intro-wrap` →
  `home-problem-wrap` → `home-map-wrap` → `home-platform-wrap` → `home-why-wrap` →
  `home-usecase-wrap` → `home-cta-wrap` → `footer-wrap`. 9 sections.
- Page height @1440×900: **12,338 px** of scrollable content (`.main-inner` scrollHeight;
  documentElement itself never scrolls — Lenis scrolls the wrapper).
- Root font-size @1440w: **8.3333 px** (Webflow fluid rem base; body font-size 13.3333 px).
  All rem values below use this base unless converted to px.
- The site is **pointer-class aware**: custom cursor initializes only when
  `(hover: hover)` + `(pointer: fine)` match (confirmed: in a touch-emulated context no
  canvas is created and no cursor system runs). Desktop-only interactions are gated by
  `@media (hover: hover) and (min-width: 992px)`.

## 1. Design tokens (measured from shipped CSS custom properties)

```
--content--brand:      #FA3600   (signal orange — violations, alerts, accents, trail)
--content--primary:    #282828   (graphite near-black text)
--content--secondary:  #414140
--content--terriary:   #282828b8 (primary @ 72% alpha)
--content--surface:    #72726f
--content--granite-gray: #626260
--content--border:     #B3B3AF   (drafting gray hairlines)
--content--disable:    #B4B4B0
--content--white:      white
--size--border:        max(1px, .1rem) → renders 1px @1440
--size--line:          0px (page-transition line width, animated during Barba swaps)
--trans-percent / --mask-percent: 0% (page-transition mask sweep, animated)
--size--max-screen-height: calc(100dvh - 1.6rem)
--size--padding-hero:  calc(4.4rem + 1rem*2)
--loading-logo-dasharray: 0 (loader logo stroke draw)
```

Hypotheses from R308 §brief: graphite `#282828` ✔, orange `#FA3600` ✔, drafting gray
`#B3B3AF` ✔ — all three CONFIRMED exactly.

Additional measured colors (pixel-sampled + computed):
- Page/hero paper background: **rgb(246,246,238) / #F6F6EE** (corners #F8F8F1) — warm
  near-white "vintage paper".
- Loader background: same paper #F6F6EE (full-bleed).
- Guide lines (hero cursor): `#E0E0DA` rgb(224,224,218), 1px.
- Cursor interactive-state border: `#FC724D` rgb(252,114,77), 2px.
- Drag selection border: `#F15534` rgb(241,85,52), 1px; drag gradient fill
  `linear-gradient(315deg, rgba(241,85,52,.64) 0%, rgba(245,245,239,0) 67.05%)`.
- Cursor trail/dot on canvas: `rgb(250,54,0)` = #FA3600.
- The DOM fallback dot `.cursor-inner` (rarely visible): 5px circle `#DD6013`, opacity 0.

## 2. Loader (state 1–3) — measured timeline

Full-screen overlay (`.loading`, fixed, z 2147483647) on paper background:

- **t≈0–0.4s**: progress starts almost immediately after paint; counter shows 7% @439ms.
- Progress bar: a horizontal band at the **vertical center** of the viewport, growing
  **left→right**, full width = 1427px (= viewport − 2×7px frame inset), color #FA3600.
  Counter text "N%" in mono, same orange, left of the bar.
- Non-linear progress (waits on assets): 33% @848ms → 57% @2.06s → plateau ~59–60%
  @2.5–2.9s → 85% @3.7s → 98% @4.5s → **100% @~4.9s**.
- Loader content: centered architectural **line drawing** (building elevation, hatching);
  bottom-left display title "DESIGNED BY BEARPLUS, THE AWARD-WINNING DESIGN AGENCY";
  bottom-right metadata block: "WELCOME TO HERON AI" + TYPE: Technology/AI Software
  Company · FOUNDED: 2026 · FOCUS: AI-powered building code compliance for architects
  (BIM/Revit integration) · LOCATION: 2801 California St, Suite 2400, Denver CO;
  plus a system log list: 001 INITIALIZE CORE SYSTEM / 002 LOAD AI MODELS / 003 CONFIGURE
  DATA PIPELINES / 004 SYNC DISTRIBUTED NODES / 005 VALIDATE INPUT STREAMS.
- Loader chrome: thin 1px frame around the viewport; a ruler overlay
  (`.loading-ruler`) with crosshair plus and X/Y coordinate readout
  (`X:<span data-loading-control="x">` etc., mono txt-10) that appears during load.
- **Exit @~5.2–5.7s**: `.loading-main` clip-path animates a **center-out horizontal
  split**: two panels (top 0→~44.7%, bottom ~54.2%→100%) shrink toward top/bottom edges,
  revealing the page through a widening horizontal slit (measured mid-exit:
  `polygon(0% 0%, 100% 0%, 100% 44.74%, 0% 44.74%, 0% 54.2%, 100% 54.2%, 100% …, 0% …)`).
  End state: degenerate (fully open). Loader then sets `display:none`.
- `--loading-logo-dasharray` (0 during this run) suggests an SVG stroke-draw of a logo
  mark on some variants — NOT VERIFIED on the home loader this run.

Screenshots: `1440x900/loader-00-t=2ms.png` … `loader-final-t=7249ms.png` (10 frames),
plus earlier `001-loader-*` frames and `%` counter poll log in worklog.

## 3. Hero (states 4–12)

### 3.1 Layout (measured @1440×900)
- `.home-hero` 1427×887 inside a **7px page frame** (all content inset 7px from viewport
  edges; `--content--border` hairlines run the full page edge — `.main-deco` fixed layer).
- Drawing frame `.bg-border` 1407×680 @ (17,70) — 7px-thick border bars + 10×10 corner
  plus marks (4 corners). Inner image window `.home-hero-img-inner` 1373×647 @ (33,87).
- Hero image: `<img>` natural 2060×1037, displayed 1373×647, `object-fit: contain`
  (drawing letterboxed inside its window), file
  `6a703ca7b25c47076637c631_4f993b1a199968429382e8529…` (Webflow CDN). Monochrome
  architectural elevation (hatched brutalist facade, trees, stairs).
- Bottom strip 133px: H1 "AN AI AGENT THAT WORKS INSIDE YOUR DESIGN TOOLS"
  (`h1.heading.h1` 772×93) left; right side body paragraph + "DISCOVER MORE" link.
- Rulers: `.home-hero-ruler-item` ticks along all four edges (dash lines, 64% opacity,
  brand-colored index lines).

### 3.2 Header (fixed)
- `.header` fixed @ (7,7), 1427×56, shows/hides on scroll (`on-scroll on-hide` classes).
- Logo left ("HERON AI" + cube mark); nav: PRODUCT / PRICING / RESOURCES / ABOUT;
  CONTACT US (desktop variant — the `a:has-text("CONTACT US")` at `.header-cta.only-mb`
  is mobile-only, hidden @1440); login arrow icon rightmost.

### 3.3 Hero pointer system (states 5–7) — replaces the global cursor
`.home-hero-img-wrap` carries `data-cursor="hidden"` → the global canvas/DOM cursor is
suppressed (`.cursor-main` gets class `hidden`). In its place, inside
`.home-hero-img-interact-wrap` (1427×700 @ (7,60), `display:flex` on pointer availability):

- **Guide lines**: horizontal 1427×1px and vertical 1×700px lines, `#E0E0DA`, spanning
  the full interact area, following the pointer (transform translate, eased ~lerp 0.09–0.15).
- **Crosshair plus** `.home-hero-img-plus`: 8×8px, two 8×2px bars in #FA3600, follows the
  pointer with ease; scale pulses (observed 1.15 → 1.0006 settling) after position jumps.
- **Coordinate readout** `.home-hero-img-coordi`: mono txt-10, "X:713PX Y:390PX" style,
  = pointer position **relative to the interact-wrap origin (7,60)** — i.e. scene
  (drawing-sheet) coordinates, not viewport. Verified at 6 known points:
  (7,60)→0,0; (720,450)→713,390; (1000,600)→993,540; (300,200)→293,140; (33,87)→26,27;
  settled (1400,740)→1393,680. Readout eases toward the new value (rolling digits feel).
- **Hint text** `.home-hero-interact-txt`: "Click and drag your mouse to see violations"
  (mono txt-10), persistent (still visible after drags).

### 3.4 Drag-to-inspect (states 9–12) — CONFIRMED semantics
- Drag starts inside the drawing area. After movement threshold (~2px, per case study),
  a **selection box** `.home-hero-img-plus-box` appears:
  - rect = normalize(start, current) in viewport coordinates;
  - border **1px solid #F15534**;
  - fill `linear-gradient(315deg, rgba(241,85,52,.64) 0%, rgba(245,245,239,0) 67.05%)`
    — direction-tinted fill whose orange corner tracks the drag direction (315deg for
    a down-right drag; case study code confirms direction-dependent gradient);
  - z-index 100; removed instantly on release.
- **Violation markers** `.home-hero-img-deco` (2 in hero, hidden until activated):
  - item1 @ (263,484) 200×80: "IBC 1011.11 — Handrails required."
  - item2 @ (726,494) 200×96: "IBC 1015.3 — Guardrail required for fall protection".
  - Idle state: a 12×12 pulsing orange dot (`.home-hero-img-deco-bg`, opacity oscillates
    ~0.70–0.99). Active state: the bg dot expands to fill the 200×96 marker box (CSS
    `.active` → width/height 100%), and the label text fades in (inner opacity 0→1).
- **Activation logic**: markers whose rect intersects the live selection box get
  `active` (measured: drag (400,300)→(900,650) activated BOTH markers).
- **Release state**: selection box disappears immediately; **markers stay active
  (revealed) permanently** — still active 1200ms after release. Dragging again does not
  deactivate them.
- The case study confirms: plain DOM + coordinate math (no WebGL); markers are remapped
  because `object-fit` scales/letterboxes the source image ("the code measures the image
  as displayed and remaps each marker"); pointer-to-reveal mapping near 1:1.

## 4. Global cursor system (states 5, 7, 9) — canvas-instrumented measurements

Three cooperating layers (all confirmed by instrumenting `getContext('2d')` with a Proxy
that logs every call):

1. **Canvas 2D layer** (fixed, viewport-sized 1440×900, created only on fine-pointer
   devices): draws per frame —
   - `clearRect(0,0,1440,900)`, then
   - **trail**: polyline of past interpolated cursor positions. Per frame while moving
     fast: one new segment (`moveTo/lineTo/stroke`), `strokeStyle #FA3600`,
     `lineWidth 1.4`, per-segment `globalAlpha` ramping **quadratically** from ≈0
     (oldest) to ≈0.99 (newest) — measured 33 accumulated segments during one 1.2s
     sweep. The trail appears **only above a velocity threshold** (slow 12-step moves
     produce zero strokes) and **vanishes on the first still frame** (no fade-out tail).
   - **dot**: `fillRect(x, y, 9, 9)` with `fillStyle rgb(250,54,0)` — a **9×9 px
     #FA3600 square**, position eased toward the pointer (observed trailing ~4.6px and
     converging over ~0.4–0.6s), alpha ≈0.995 while settling. The case study's "9px
     square dot" is exact.
   - **Loop stopping**: after the pointer settles, frames contain only
     `clearRect + fillRect(dot)` for ~8 frames, then drawing stops entirely (wake/sleep
     pattern — verified: 1200ms idle produced no draw calls beyond the final settle
     frames). Confirms case study: "the loop stops once values settle".
2. **Interactive-state element** `#canvas-cursor-hover`: fixed, `width/height 2.8rem`
   (23.3px), `z-index 2147483601`, `pointer-events:none`, initially opacity 0 at scale
   ~0.43. This is the hover/pressed-state layer: 2px solid `#FC724D` border square;
   measured pressed state: scale 0.56, opacity 0.68 (a **contracting square outline =
   targeting reticle**). Hover/press transitions are GSAP-tweened (position lerped).
3. **DOM fallback** `.cursor > .cursor-main > .cursor-inner` (z 999): `.cursor-main`
   transform-lerped toward pointer; `.cursor-inner` 5px circle `#DD6013` opacity 0
   (kept hidden while the canvas system runs; observed visible only in screenshots where
   the canvas dot was also present — treated as a fallback/legacy layer).
   `.cursor-main` gets class `hidden` over `data-cursor="hidden"` regions.

- Cursor color adaptation over dark surfaces: NOT VERIFIED on the homepage (the site's
  dark surfaces are images; the case study states the cursor "shifts colour over dark
  areas"). The interactive-state element uses `mix-blend-mode: normal` (measured).
- `data-cursor` attribute grammar (homepage inventory): only `data-cursor="hidden"` is
  used — on `.loading-inner`, `.home-hero-img-wrap`, the four `.home-hero-ruler-item-wrap`s,
  `.home-intro-partner-ctrls`. It suppresses the global cursor where a local system
  takes over (or during load).

## 5. Case-study implementation facts (Codrops, Bearplus — fetched, summarized)

All below is from the actual article text (evidence: `case-study.txt`):

- Hero drag reveal: `MOVEMENT_THRESHOLD = 2`; selection box via `Math.min/abs`;
  direction-dependent gradient `rgba(255,54,0,.3)→0`; markers activated by AABB overlap
  (`boxRect` vs `markerRect`); DOM + coordinate math instead of WebGL because the
  visual language is 2D drawings; markers remapped against the *displayed* image box
  because `object-fit` letterboxes.
- Observe → Advise → Act → Learn: four states, not four cards; the scroll is the
  timeline; the same model/object persists across scenes while the overlay layer changes.
- Ink transitions: two images (sketch → render) same composition; scroll-driven SVG
  mask, top-to-bottom or centre-out; edge = `feTurbulence` (baseFrequency 0.045/0.055,
  numOctaves 4, seed 5) → `feDisplacementMap` scale 100 → `feGaussianBlur` stdDev 1.8 →
  `feComponentTransfer` alpha slope 2.2 / intercept −0.6. Tied to scroll, not time.
- One clock: `gsap.ticker.add(t => { lenis.raf(t*1000); cursor.update(t);
  inkMask.update(t); pointerEffects.update(t); })` — Lenis, ScrollTrigger, Cursor, Ink
  masks, Pointer effects all resolve from the same frame state (no drift).
  Cursor internals per article: lerp 0.18, speed smoothing 0.2, trail only when
  `speed > 1.5`, loop re-wakes while `movement > 0.05`.
- Footer: circular SVG mask = inspection lens revealing the logo; circle lerped 0.09,
  secondary "pulse" layer 0.15 (1.05× radius, opacity 0.2); enter tween r→radius 0.55s,
  leave r→0 0.8s (pulse 1s); respects `prefers-reduced-motion` (durations → 0).
- Page transitions: Barba in sync mode; GSAP tweens CSS custom properties
  `--trans-percent` / `--mask-percent` (50%→100% / 50%→0% on enter, 0→50% on leave,
  0.8s power1.in/out) plus `--size-line` (architectural line width sweep) — a geometric
  mask sweep, not a fade. About page: floor plan resolves into the logo.
- Performance: canvas caps devicePixelRatio; animate only transform/opacity/clip-path;
  heavy sections initialize near viewport; desktop interactions never run on mobile;
  cleanup on page swap.
- Responsive: viewport HEIGHT matters as much as width (1440×900 vs 1440×700 are two
  different canvases); scenes fit the available viewport, positions recalculated from
  `window.innerHeight` + measured content height, ScrollTrigger refreshed on resize.
- Identity: red only for violations/alerts; BT Grotesk typography; drawing-sheet grid;
  labels run to the viewport edges; each section one focal point.

## 6. Scroll story structure (measured @1440×900, Lenis wrapper scroll space)

Scrollable height **12,355 px** (`.main-inner` scrollHeight; second run 12,355 — stable).
Viewport client height 887 (900 − 13 frame/scrollbar). Section order + geometry (child of
each `*-wrap` web component; wraps themselves are 0-height shells):

| # | Section (DOM tag) | Scroll range (px) | Height | % of page | What it is |
|---|---|---|---|---|---|
| 1 | `home-hero-wrap` → `.home-hero` | 0 – 887 | 887 | 7.2% | Full-viewport drawing hero + drag-to-inspect + H1 strip |
| 2 | `home-intro-wrap` → `.home-intro` | 893 – 1616 | 723 | 5.9% | Statement + intro image (ink mask) + partner logos |
| 3 | `home-problem-wrap` → `.home-problem` | 1616 – 2358 | 743 | 6.0% | "PROBLEMS" + 4 SVG-drawn problem cards (Manual/Disjointed/BLIND/SLOW) |
| 4 | `home-map-wrap` → `.home-map` | 2358 – 8658 | **6300** | **51.0%** | PINNED model walkthrough (Observe→Advise→Act→Learn spine) |
| 5 | `home-platform-wrap` → `.home-platform` | 8658 – 9368 | 710 | 5.7% | Platform modules [01]… + 2 Before/After ink-mask panels |
| 6 | `home-why-wrap` → `.home-why` | 9368 – 10066 | 698 | 5.7% | "WHY US / BUILT TO WORK THE WAY YOU DO" + masked img boxes |
| 7 | `home-usecase-wrap` → `.home-usecase` | 10067 – 10953 | 887 | 7.2% | "USE CASES / MADE FOR THE PEOPLE IN THE MODEL" — 7-role accordion |
| 8 | `home-cta-wrap` → `.cta` | 10953 – 11651 | 698 | 5.7% | "SEE WHAT HERON CAN DO IN YOUR MODEL" + Book-a-demo CTA + deco strip (ink mask) |
| 9 | `footer-wrap` → `.footer` | 11651 – 12362 | 711 | 5.8% | 3-zone footer + pointer lens image strip + copyright |

**The pinned map walkthrough is 51% of the whole page** — the narrative center of gravity.

ScrollTrigger inventory (41 triggers read live): **every trigger has `pin: false`** —
GSAP never pins; the two pinned scenes are **CSS `position: sticky`** (see §7). Scrub is
used selectively (`home-intro-content-title` start 98 / end 718 `scrub: true`; most others
`toggleActions: 'play'` on enter). Trigger bands overlap heavily from `home-map-wrap`
(1021–9095) onward — one scroll position drives several simultaneous timelines
(map image cross-fades + right-column reveals + header state).

Measured section headline text (for tone reference):
- intro: "THE REPETITIVE PARTS OF MODELLING SHOULDN'T EAT YOUR DAY. HERON HANDLES THE
  FIDDLY, MANUAL WORK SO YOU CAN STAY FOCUSED ON THE DESIGN, NOT THE SOFTWARE."
- problem: "PROBLEMS / Your design tools do what you tell them, nothing more …"
- map: label "Your model. Your tools. Connected." title "RUN AN AGENT NATIVELY IN YOUR
  MODEL / Heron runs inside the design software you already use… every action shown to
  you first" + 4 checklist items ("Works with Revit, Rhino, ArchiCAD, SketchUp." /
  "Understands your geometry and intent." / "Suggests fixes while you work." /
  "Edits automatically after your approval.")
- why: "WHY US / BUILT TO WORK THE WAY YOU DO / Heron fits into your process instead of
  replacing it. It watches quietly, speaks up when something needs attention, and only
  acts when you say so…" + a "[Scroll to continue]" hint label.
- usecase: "USE CASES / MADE FOR THE PEOPLE IN THE MODEL".
- cta: coordinate labels "[0,246] [831,0] [2303,0] [0,544]" + "SEE WHAT HERON CAN DO IN
  YOUR MODEL / Book a demo and we'll show Heron working inside one of your own projects."
  + "Contact us" button.

## 7. Pinned / sticky scenes (all CSS sticky, no GSAP pin)

Fixed + sticky layer inventory (live):
- **`.main-deco` fixed** — full-viewport fixed layer holding the 1px page-edge hairline
  frame (`--content--border`) that never scrolls.
- **`.header` fixed** @ (7,7) 1427×56 — `on-scroll on-hide` classes (hides on scroll down).
- `.cookie-banner` fixed 38px; `.awwwards` fixed badge 139px (Awwwards SOTD ribbon).
- `.loading` fixed overlay (display none after load).
- **`.home-map-inner` sticky, h = 887 = full client height**, inside 6300px section
  (2358 → 8658). The map walkthrough pin. While pinned (measured at 350px scroll steps):
  - the drawing window `.home-map-main-stick` (1427×853 inside a `bg-border` frame) stays
    fixed; **4 stacked full-frame images cross-fade in sequence** (kk.png → ll.png →
    fff.png → Dimensions.png, all 1427×853, `img-abs` stack; measured layer-2 opacity
    0 → 0.07 → 0.92 → 1 between scroll 4458–5158, layer-3 by 5508) — "the same model
    persists while the overlay changes".
  - overlay annotation texts stay fixed in the window ("Right there with you", "For the
    whole design", `home-intel-item` status lines).
  - `.home-map-intro` ("Introduction / Architects spend hours on manual…") fades in
    0 → 1 across scroll ≈4100–5150 while pinned.
  - 3 SVG number stations (`.home-map-number-wrap`, clickable, `cursor: pointer`) ride
    the scroll track past the fixed drawing.
  - **End of pin ≈ scroll 7600: `.home-map` gains class `expanded`** and the right
    column `.home-map-content-wrap` animates **width 0 → 463.7px** (measured 0 → 230 →
    429 → 456 → 463.7px; CSS `transition: width 0.4s`; stylesheet target 55.65rem),
    opening the checklist column; afterwards the whole scene scrolls away normally.
- **`.home-platform-content-inner` sticky, h = 145** (a slim tab/label strip) inside the
  710px platform section — a secondary micro-pin, sticky top 8658.

## 8. Ticker / marquee (hero "work" strip)

- Location: hero bottom-right, `.home-hero-work` wrap **601×36 @ (832,857)** — inline with
  the H1 strip, right of the hero paragraph.
- Content: 3 benefit items with hexagon outline icons — "Faster iterations" (137px),
  "Fewer mistakes" (116px), "Less busywork" (109px).
- Mechanism: CSS `animation: marqueeLeft 10s linear infinite` on
  `.home-hero-work-inner.marquee-left.anim` — continuous leftward crawl, measured
  **≈40 px/s** (x 811→686 over 3.1s). No pause-on-hover observed in measurement window.

## 9. SVG stroke-drawing animations (problem section + why section)

Problem section — 4 cards, each with its own line-drawn SVG illustration
(`manual-svg / automation-svg / blind-svg / slow-svg`), driven by an inline keyframe
system (extracted from shipped CSS, verified live — 11 concurrently animated SVG
elements measured while in view):

```
--draw-ease: cubic-bezier(0.22, 1, 0.36, 1);  --dash-duration: 1s;
@keyframes homeProblemDraw       { 0% { opacity:0; stroke-dashoffset: var(--path-length); …100% dashoffset 0 } }
@keyframes homeProblemDashAppear { 0% { opacity: 0; … } }              (0.35s)
@keyframes homeProblemDashFlow   { 0% { stroke-dashoffset: 0; … } }    (1s, continuous — flowing dashes)
@keyframes homeProblemMaskDraw   { 0% { stroke-dashoffset: var(--mask-length); … } }
```
- Paths use `stroke-dasharray: var(--path-length) var(--path-length)`, `fill:none`,
  `stroke-linecap/linejoin: round`; the *-draw layer draws in (1s, expo-out-ish bezier),
  the *-dash layer (1px) fades in (0.35s) then flows forever (1s loop) — a live
  "current flowing through the drawing" effect. Measured live: dashoffset drifting
  −1.06 → −2.12px with opacity 0.06 → 0.20 while entering.
- Why section keyframe set (same grammar): `homeWhyBoxReveal` (0/11% scale 0.001),
  `homeWhyIconBgSwap`, `homeWhyIconReveal` (scale .75), `homeWhyIconBorderPulse`
  (scale .92), `pointReveal` (scale .4), `homeWhyLineVisibility` (0/30% opacity 0),
  `homeWhyDashMove`, `homeWhySpin`, `loadingActive`/`checkActive` (74% hold points),
  `homeWhyCard2Reveal`, `homeWhyCardDotLoading`, `homeWhyCardDotsVisibility`,
  `homeWhyBorderActive` — sequenced state-machine reveals with long "hold" plateaus
  (e.g. nothing changes until 74% of the timeline, then everything snaps).
- **Loader logo stroke-draw (`--loading-logo-dasharray`): NOT VERIFIED — stays 0 in every
  measurement (home loader and /about-us).** Subpages have NO loader at all (direct load,
  no `.loading` progress; /about-us title renders while `--loading-logo-dasharray` = 0).

## 10. Ink / drawing→photo mask reveals (5 instances, scroll-scrubbed)

`.ink-mask` structure everywhere: `.ink-mask-img.main` (finished image) +
`.ink-mask-img.sub.ink-filter` (SVG-masked layer, displacement-filtered edge).
Instances (live inventory):

| Where | Size | Driver |
|---|---|---|
| `.home-intro-img` | 713×723 | scroll |
| `.home-platform-img-item-wrap` ×2 (Before/After) | 599×353 each | scroll |
| `.cta-deco-item-img` (CTA deco strip) | (deco strip) | scroll |
| `.footer` (inside `.hidden-tb`, tablet-up only) | 1427×314 | **pointer** (see §13) |

- Mask geometry (measured attribute morphs): an SVG `path` in a 1000×981.76 viewBox,
  `M 0 Y Q 500 1.25·Y 1000 Y L 1000 0 L 0 0 Z` — a **downward-bulging quadratic curve**
  (control point 25% below the baseline). Scroll morphs **Y top→bottom**: intro mask
  measured Y = 228 → 788 → 1014 (fully open) as the section scrolls out; platform masks
  Y = 1 → 0.59 → 590 (same sweep). I.e. **reveal direction = top-to-bottom wipe with an
  ink-bleed edge**, driven by scroll position, not time.
- Edge filter (case study, exact params): `feTurbulence fractalNoise baseFrequency
  0.045 0.055 numOctaves 4 seed 5` → `feDisplacementMap scale 100` → `feGaussianBlur
  1.8` → `feComponentTransfer alpha slope 2.2 intercept −0.6`.

## 11. Scroll-driven text appearance

- Masked-line reveals: `bp-mask-line-mask` + `bp-line` wrappers; in the usecase section
  text is split into **per-word spans** ("Hand" "the" "repetitive" "modelling"…), each
  behind its own line mask (measured `whyPhases`: mask elements at y139/169/209, h16–40,
  animating clip/height). Why-section headings use the same system.
- Scrub-linked: `.home-intro-content-title` trigger start 98 / end 718 **scrub: true**
  (title reveal is 1:1 with scroll, reversible).
- Heading-level reveals: `toggleActions: 'play'` (play once on enter; no measured
  re-conceal when scrolling back above).

## 12. Use-case / role tabs (accordion grammar)

- 7 roles: Architects (default active), Interior Designers, Landscape Architects,
  Engineers, BIM MANAGERS, DRAFTERS, DESIGN LEADS.
- Select = click anywhere on the row (whole row is `cursor: pointer`): `.active` moves to
  the clicked row; its description expands (measured innerHTML delta +1179 chars on
  Architects → Interior Designers). Active row: number turns `--content--brand` orange
  (`home-usecase-faq-item.active .home-usecase-faq-item-numb`), the vertical path
  divider scales to 0, title re-reveals through the word-mask system. Hover (any row):
  number → orange, icon → black, hover underline line fades in.

## 13. Footer (measured)

Geometry (footer 711px = main grid 355 + image strip 314 + copyright 42):
- Left column (357px): title wrap + email form (`input[type=email]` "Enter your email").
- Middle (715px): content items + link list (Home, About us, Contact us, Heron Chat
  Widget, Heron Dashboard, Pricing, Insights, AI Practices, Design Workflows, address
  "60 Martin Pl, Sydney, NSW 2000, Australia", Direction, business@bear.plus,
  hello@heronaiapp.com, Website).
- Right column (357px): logo block — `.footer-logo-inner.full` 215×215 (SVG line-logo;
  fades in with scroll, measured opacity 0.61 mid-entry → 1) + `.footer-logo-inner.sketch`
  (alternate sketch image, opacity 0 — **no pointer interaction measured on the logo
  itself**; the pointer lens lives on the image strip).
- **Pointer-controlled inspection lens — CONFIRMED on the image strip**
  (`.footer-img-wrap` → `.ink-mask`): moving the pointer over the strip (1427×314)
  opens two SVG mask circles: main lens **r settles at 99.09** (viewBox units) and a
  pulse ring **r 104.04 = 1.05×**; `cx/cy` follow the pointer **with visible lag**
  (lerp — measured cx 637→603→570→531→496 chasing the pointer), revealing the masked
  `sub` layer (with the turbulence `ink-filter` edge) inside the circle.
  Timings measured: **enter r 0→99 in ≈0.55s; leave r 99→0 in ≈0.8s** (99→74→48→23→0 at
  200ms steps; pulse ring decays 104→83→61→40→19→0 ≈1s). Matches case-study code
  (lens lerp 0.09, pulse lerp 0.15, enter 0.55s, leave 0.8s / pulse 1s,
  `prefers-reduced-motion` → duration 0).
- The identical lens values (r 99.09/104.04) reproduce at 1440×700 and 1280×800.
- Mobile (≤767): image strip swaps to a `.footer-img-item.hidden-dsk` variant
  (390px: 334×48 strip) and the lens/ink structure (`.hidden-tb`) is hidden — no
  pointer lens on touch (not measurable anyway).
- Copyright line: "©2026 HERON AI. All rights reserved. Concept Crafted by Bearplus".

## 14. Route transitions (Barba, measured live)

Clicking a header nav link (e.g. About → /about-us) swaps pages via Barba in sync mode;
measured on the return transition (frames sampled every 60ms on the landing):

- `--trans-percent`: 0.9% → 5.2% → 14.1% → 26.4% → **50%** (≈800ms, power1.in) —
  then continues **50% → 87.5% → 92.9% → 99.3% → 100%** (≈800ms, power1.out).
- `--mask-percent` runs the **inverse** curve: 0.9% → 50% then 50% → 12.5% → 0%.
- `--size-line` (architectural line width) **spikes to 1 (rem ≈ 8.33px)** exactly at the
  50% midpoint, then decays 1 → 0.25 → 0.14 → 0.01 → 0 with the enter phase.
- Net: a two-phase geometric mask sweep (~1.6s total), no fade, no loader on subpages
  (`--loading-logo-dasharray` stays 0; `.loading` display none throughout).

## 15. Scroll physics + backward scroll

- Lenis 1.1.5 smooth scroll on `.main-inner` (documentElement never scrolls).
  Measured programmatic jump 746 → 2400: interpolation ~1.4s with a long ease-out tail
  (1939 → 2400 over ~1.1s, last 15px over 700ms). Backward (10793 → 8600): same
  character, ~1.6s. Wheel scrolling shows classic Lenis damping (y 746 → 1939 → 2139 →
  … → 2399 → 2400 asymptote).
- Scrub-linked animations (intro title) reverse with scroll by construction; class-toggle
  reveals measured `toggleActions:'play'` (no re-conceal observed on backward scroll —
  reveal permanence NOT VERIFIED beyond the intro scrub trigger).

## 16. Typography (computed, @1440×900; root font-size 8.3333px)

Two families only:
- **Display + body: "BT Grotesk", Arial, sans-serif** — every heading and text class.
- **Instrument/micro: "Geistmono", Arial, sans-serif** — `.txt-font-mono` only
  (coordinates, loader %, cookie "Accept" button, status labels).

| Class | Family | Size | Weight | Line-height | Letter-spacing | Case | Color |
|---|---|---|---|---|---|---|---|
| `heading.h1` (hero H1) | BT Grotesk | 46.67px (5.6rem) | 700 | 1.0 (46.67) | −0.93px | UPPER | #282828 |
| `heading.h2` (section head) | BT Grotesk | 40px (4.8rem) | 600 | 1.0 | −0.8px | UPPER | #282828 |
| `heading.h3` (intro title) | BT Grotesk | 33.33px | 600 | 1.0 | −0.67px | UPPER | **#B4B4B0** (disabled gray) |
| `heading.h4` (loader credit) | BT Grotesk | 26.67px | 600 | 1.0 | −0.53px | UPPER | #282828 |
| `heading.h5` (problem sub) | BT Grotesk | 23.33px | 600 | 1.0 | −0.47px | UPPER | #282828 |
| `heading.h6` (Observe etc.) | BT Grotesk | 20px | 700 | 22px | −0.4px | UPPER | #fff (on orange) |
| `txt-16` body | BT Grotesk | 13.33px | 400–500 | 17.33px (1.3) | −0.27px | none | rgba(40,40,40,.72) |
| `txt-14` | BT Grotesk | 11.67px | 500 | 16.33px | −0.23px | none | rgba(40,40,40,.72) |
| `txt-font-mono txt-12` (loader %) | Geistmono | 10px | 500 | 13px | normal | UPPER | **#FA3600** |
| `txt-font-mono txt-10` (coordinates) | Geistmono | 8.33px | 500 | 10.83px | normal | UPPER | rgba(40,40,40,.72) |

- Fluid type: root font-size scales with viewport **width** — 8.333px@1440, 7.407px@1280,
  9.209px@768, 9.924px@390, 9.160px@360 (small screens get a LARGER root so micro text
  stays legible). All rem values above are @1440.
- The "instrument feel" of micro text = Geistmono + uppercase + 72%-alpha ink, not a
  second display font.

## 17. Frame, margins, grid, registration marks

- Page frame: all content inset **7px** from viewport edges @1440 (≈0.84rem; scales with
  root font — 6px@1280/360, 7px@768/390). `.main-deco` (fixed) draws the 1px
  `#B3B3AF` hairline frame at the inset so it never scrolls.
- Content width 1427 @1440 (= 100% − 2×7). Hero drawing frame `.bg-border` 1407×680 with
  7px-thick bars + **10×10 plus marks at 4 corners** (measured at (15,68),(1415,68),
  (15,742),(1415,742)); inner image window 1373×647 @ (33,87).
- Rulers: `.home-hero-ruler-item` tick strips along all 4 edges of the drawing window
  (dash lines, 64% opacity, orange index lines; revealed on proximity — hover on the
  ruler zones raises opacity 0 → 1).
- Drawing-sheet grid: `--bg-grid` background at **6.4rem cells** — appears on problem
  card hover (`.home-problem-item-main:after`, opacity 0 → 1, 0.4s).
- Coordinate labels run to the strip edges (hero readout, CTA corner labels
  "[0,246][831,0][2303,0][0,544]").
- Stroke widths: hairlines 1px (`--size--border: max(1px,.1rem)`); dash overlay strokes
  1px; drawing frames 7px bars; loader bar height ≈7px full-width band.

## 18. Viewport matrix (lighter passes, all measured)

| | 1440×900 | 1440×700 | 1280×800 | 768×1024 | 390×844 | 360×800 |
|---|---|---|---|---|---|---|
| scrollH | 12,355 | 10,555 | 10,983 | 12,577 | 11,441 | 10,684 |
| clientH | 887 | 687 | 788 | 1009 | 828 | 785 |
| root font | 8.333px | 8.333px | 7.407px | 9.209px | 9.924px | 9.160px |
| canvas cursor | yes | yes | yes | **yes** (narrow-desktop ctx) | no | no |
| hero interact (drag/guides/readout) | yes | yes | yes | **no** (display:none <992px) | no | no |
| map pin (sticky) | yes 887px | yes 687px | yes 788px | **no (static)** | no (static) | no (static) |
| map section h | 6300 | 4900 | 5600 | 5473 | 4819 | 4553 |
| hamburger menu | no | no | no | yes (192×52) | yes (187×50) | yes (173×46) |
| footer img strip | 1427×314 | 1427×314 | 1268×279 | 753×217 + mobile var 99px | mobile var 334×48 | mobile var 309×44 |
| footer lens (r) | 99.09/104.04 | 99.09/104.04 | 99.09/104.05 | n/a (pointer lens needs hover) | n/a | n/a |

- **Viewport HEIGHT reshapes the story** (case-study claim confirmed by measurement):
  1440×700 page is 1,800px shorter than 1440×900; the pinned map shrinks 6300→4900 and
  the sticky element matches the 687px client height — scenes re-fit to
  `window.innerHeight`.
- ≤991px (768/touch): **the entire hero pointer system is disabled**
  (`.home-hero-img-interact-wrap` display:none — gated by
  `@media (hover:hover) and (min-width:992px)`), the map pin becomes static flow, the
  header collapses to a hamburger, sections restack (problem 743→1333px, usecase
  887→1336px @768), and the footer swaps the image strip for a mobile variant.
- Canvas cursor initializes on **fine pointers regardless of width** (present at 768 in a
  desktop context) but the hero drag system additionally requires ≥992px.
- On real touch (390/360, hover:none + pointer:coarse): no canvas, no `.cursor-main`
  visible activity, no hero drag — the drawing is static; ticker/marquee still runs;
  content reveals still run on scroll.

## 19. Facts vs assumptions

**Verified by direct measurement (this lab):** everything in §1–§18 — loader timeline &
exit geometry; hero frame/rulers/plus marks/coordinate system (scene-relative, origin at
interact-wrap (7,60)); guide lines (#E0E0DA, 1px, full-span, lerp-follow, idle-opacity
0.16, no idle fade over 3s); crosshair plus 8×8 #FA3600; drag selection box (threshold
~2px, normalize(start,current), 1px #F15534 border, 315deg-direction gradient, AABB
marker activation, markers stay revealed after release); canvas cursor (9×9 #FA3600
square, lerp 0.18, trail only when fast, quadratic alpha ramp, loop sleeps when idle);
pressed reticle (2px #FC724D square, scale 0.56); marquee (10s linear infinite, ≈40px/s);
map pin (CSS sticky, image cross-fades, width-0.4s expansion); ink masks (5 instances,
quadratic-curve top→bottom sweep, scroll-driven); footer lens (r 99.09 + 104.04 pulse,
lerped follow, 0.55s in / 0.8s out); route transition (trans/mask inverse sweep + line
spike, ~1.6s); typography table; viewport matrix; section table.

**Case-study-sourced (consistent with measurement but not independently verified):**
feTurbulence parameter values on live site; cursor "shifts colour over dark areas"
(negative: homepage has no dark DOM surfaces — the adaptation claim could NOT be
reproduced; mix-blend-mode normal measured); About-page "floor plan resolves into logo"
transition (About page not interaction-probed); `prefers-reduced-motion` branches.

**NOT VERIFIED (recorded as unknown):**
- Loader logo stroke-draw (`--loading-logo-dasharray` stays 0 in all runs) — may be dead
  code or a variant not served to this client.
- Cursor color adaptation over dark surfaces (no dark DOM region exists on the homepage).
- Map number station click behavior (buttons exist, not clicked — avoid state changes).
- Reveal re-conceal on backward scroll beyond the scrubbed intro title.
- Hero marker hover (ruler/proximity zones partially measured: ruler opacity 0.996 when
  pointer near window edge, 0.0009 mid-window — proximity-based, threshold unmapped).
- Cookie-banner "Accept" click (never clicked — no consent state changes).

## 20. Concrete reference behaviors (implementation checklist)

1. Paper ground `#F6F6EE`, 7px viewport frame, fixed 1px `#B3B3AF` hairline at the frame.
2. One accent only: `#FA3600` = violation/alert/attention. Graphite `#282828` ink,
   72%-alpha for secondary, `#B4B4B0` for disabled/ghost headings.
3. Registration marks everywhere: corner plus marks, ruler ticks, X:…PX Y:…PX readouts,
   "[n,n]" corner labels — in Geistmono uppercase micro type.
4. Custom canvas cursor on fine pointers: 9px orange square, lerped (0.18), velocity
   trail above speed 1.5, sleeps when settled; reticle square on press; `data-cursor`
   suppression zones; hero swaps in a local guide-line + plus + coordinate system.
5. Drag-to-inspect: selection box + direction-tinted gradient + AABB marker activation;
   markers persist after release; pointer-to-reveal mapping near 1:1.
6. Scroll = timeline: pinned full-viewport walkthrough at the page's center (51% of
   scroll), same object persists, overlay layers cross-fade, right column expands at
   pin end (0.4s width).
7. Ink masks for drawing→photo: quadratic-curve SVG mask sweeping top→bottom with
   turbulence-displaced edge, scrubbed by scroll; footer variant driven by pointer lens.
8. Continuous instruments: hero marquee ticker (10s linear), flowing dashes on drawings
   (1s loop), pulsing marker dots — the page is "alive" even when idle.
9. Sequenced state reveals with hold plateaus (74% hold points in why-section keyframes)
   — "tool responding", not "animation playing".
10. Route changes speak the drawing language: inverse mask/percent sweep + line-width
    spike, ~0.8s + 0.8s, no fades.
11. Fluid rem type (root scales with width), BT Grotesk + Geistmono only, uppercase
    display with −2% tracking, 1.0 line-height headings.
12. Graceful degradation ladder: fine-pointer+≥992px → full system; fine-pointer narrow →
    cursor only; touch → static drawing, mobile image variants, hamburger.

*(End of measurement record. Companion machine-readable map: `reference-interaction-map.json`.)*
