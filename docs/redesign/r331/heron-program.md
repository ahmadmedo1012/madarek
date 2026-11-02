# HERON (heronaiapp.com) → R331 porting spec

Machine-readable twin: `heron-program.json` (same directory).
Evidence: `/home/z/heron-lab/{data,frames,videos,nav}` (indexed in `heron-frames-index.md`).
Captured viewports: **1440×900** and **390×844** (rem table covers 320–2560; frames also exist for 768×1024 and 1920×1080).

---

## 1. Scroll engine

**The window never scrolls.** `html`/`body` keep `overflow:visible`; `.body-inner{overflow:hidden;height:100vh}` and the real scroller is **`.main-inner`** (`overflow:hidden`, flex column). Lenis 1.1.5 is constructed on it and GSAP ScrollTrigger gets a **scrollerProxy for `.main-inner`** (confirmed live: `hasScrollerProxy = true`).

```js
// from heronai-bp.netlify.app/main.js (deobfuscated)
this.lenis = new Lenis({
  wrapper: document.querySelector('.main-inner'),
  content:  <wrapper.querySelector('.main-content')>,
  syncTouch: true,     // touch is synced, not smoothed
  smoothWheel: true,
  smoothTouch: false,
  infinite: false,
});
// Lenis 1.1.5 defaults (verified against the unpkg bundle — site sets nothing else):
// lerp: 0.1, duration: undefined (=> lerp mode), wheelMultiplier: 1, touchMultiplier: 1

gsap.ticker.add(t => this.lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);           // Lenis is driven BY the GSAP ticker

this.lenis.on('scroll', e => {
  ScrollTrigger.update();              // single sync point
  if (Math.abs(e.velocity) > 0.1) /* toggle container "scrolling" class */;
  clearTimeout(s); s = setTimeout(() => container.classList.add(…), 150); // settle marker
});
```

- ScrollTrigger defaults used by every trigger: `scroller: '.main-inner'`, `anticipatePin: 0`, `invalidateOnRefresh: true`.
- Menu open → `lenis.stop()` (`.lenis-stopped{overflow:hidden}`); close → `lenis.start()`.
- Scroll progress → animation mapping is **event-based** (`toggleActions: 'play'`, onEnter/onEnterBack reveal timelines). The only scrubbed timeline on the page is the **intro title per-char color tween** (§4). The pinned map journey is *not* a ScrollTrigger at all (§3).
- Behavioral probe gap: `lenis-decay.json` measured `window.scrollY` (always 0 — wrong scroller), so there is no measured lerp curve; use the source values above.

## 2. rem base + type ladder

`html { font-size: <rate>vw }` with three rates (inline `<style>` in the HTML):

| range | rate | rem @ typical width |
|---|---|---|
| ≥992px (default) | `0.5787037037vw` | 8.33px @1440 · 11.11px @1920 |
| ≤991px | `1.1990407674vw` | 9.21px @768 · 10.79px @900 |
| ≤767px | `2.5445292621vw` | 9.92px @390 · 12.21px @480 |

Everything (type, gaps, hairlines, card sizes) is rem-based, so the whole design scales with viewport width. Breakpoints: **991px** (container 728px, header menu → overlay) and **767px** (full-bleed container, mobile rem rate).

Fonts: **BT Grotesk** (400/500/600/700 + italics) for everything, **Geistmono 500** for mono labels (uppercase), fallback `Arial, sans-serif`, `font-display: swap`.

| level | rem | weight | line-height | letter-spacing | px @1440 |
|---|---|---|---|---|---|
| `.heading.h1` | 5.6 | 700 | 1 | -0.02em | 46.67 |
| `.heading.h2` | 4.8 | 600 | 1 | -0.02em | 40.00 |
| `.heading.h3` | 4.0 | 600 | 1 | -0.02em | 33.33 |
| `.heading.h4` | 3.2 | 600 | 1 | -0.02em | 26.67 |
| `.heading.h5` | 2.8 | 600 | 1 | — | 23.33 |
| `.heading.h6` | 2.4 | 600 | 1.1 | — | 20.00 |
| body / `.txt-16` | 1.6 | 500 | 1.3 | -0.02em | 13.33 |
| `.txt-14` (mono label) | 1.4 | 500 (Geistmono) | 1.1 | normal | 11.67 |
| `.txt-10` | 1.0 | — | 1.3em | — | 8.33 |

All headings `text-transform: uppercase`. Colors: primary `#282828`, secondary `#414140`, tertiary `#282828b8`, border `#b3b3af`, disable `#b4b4b0`, surface `#72726f`, granite `#626260`, **brand `#fa3600`**, selection `#e15c46`. Paper texture: `--bg-img` (bg.svg tile) on `.body`/`.bg-global`; `--bg-grid` 6.4rem tile on problem-card hover.

## 3. Page map (order + trigger geometry)

Scroller metrics: 1440 → scrollHeight 12355, clientHeight 887, maxScroll 11468. 390 → 11441 / 828 / 10613.

| # | section | start/end strings | px @1440 | px @390 | notes |
|---|---|---|---|---|---|
| 1 | `home-hero-wrap` | — (load timeline, not scroll) | 0–884 | 0–~830 | height `calc(100dvh - 1.6rem)` + 4.4rem pad |
| 2 | `home-intro-wrap` | `clamp(top bottom+=50%)` → `bottom top-=50%` | 0–2053 | 0–2089 | height `clamp(60.4rem, 100dvh-1.6rem, 86.7rem)` |
| 3 | `home-problem-wrap` | same clamp pair | 279–2795 | 433–2959 | head `top+=65% bottom`; content `top+=55% bottom` |
| 4 | `home-map-wrap` | same clamp pair | 1021–9095 | 1303–7778 | **700dvh tall**, CSS-sticky inner |
| 5 | `home-platform-wrap` | same clamp pair | 7321–9805 | 6122–8336 | `.home-platform-content-inner` sticky top 377.56px; img items `top+=45% bottom` |
| 6 | `home-why-wrap` | same clamp pair | 8031–10503 | 6680–9142 | head `top+=65% bottom`; 4 img triggers `top+=45% bottom` (8851–9960) |
| 7 | `home-usecase-wrap` | same clamp pair | 8729–11390 | 7486–10090 | FAQ accordion (`top+=55% bottom` items) |
| 8 | `home-cta-wrap` | `top bottom+=100vh` → `bottom top` | 9960–11645 | 9028–10176 | cta-main `top+=40% bottom`; cta-deco `top+=40% bottom` |
| 9 | `footer.footer` | `top bottom+=100vh` → `bottom top` | 10658–12355 | 10456–11441 | 8 duplicate triggers (parallax drivers) at 1440, none at 390 |

**Pin model: there is NO GSAP pin anywhere.** The "pinned journey" is native CSS sticky:

```css
.home-map        { height: 700dvh; }              /* 6300px @1440, 5796px @390 */
.home-map-inner  { position: sticky; top: 0; height: calc(100dvh - 1.6rem); display: flex; }
```

The platform section reuses the same trick (`position:sticky; top:377.56px`). Viewport deltas (768/1920): triggers use the same strings, so only px recompute; rem rate switches at 991/767 change all box geometry (see §2).

## 4. Per-section mechanics

Global reveal grammar (identical everywhere, extracted from the live tween table):

- **Mask-line text reveal** — SplitText `type:'lines, words'` produces `h* > .bp-mask-line-mask{overflow:hidden} > .bp-line > div`. Tween `to{autoAlpha:1, yPercent:0}` (init set: autoAlpha 0, yPercent 100), **duration 0.8, ease power2.out, stagger 0.02** per line. Total = `0.8 + (n-1)*0.02` (hero title 9 lines = 0.96s, hero sub 25 = 1.28s, why sub 34 = 1.46s).
- **Hairline draw** — `.line` elements: `scaleX/scaleY 0 → 1`, origin `top left` (page) / `bottom right` (header menu), **1.2s, ease none** (linear wipe).
- **Block rise** — `opacity 0→1, y 3.2rem→0` (26.67px @1440, 31.76px @390), **1s, power3.out**, `clearProps:'all'`.
- **Image card reveal** — `scale → 1, autoAlpha → 1`, **1.6s, expo.out**, `overwrite:true` (init scale ~0.8, set pre-tween).
- **Plain fades** — frames/deco/img wraps: `opacity 0→1`, **1s, power3.out**.

### Hero (`home-hero`)
Layout: `container full-h` (full-bleed); `.home-hero-inner` grid rows `1fr auto`; content grid `1fr 1fr`; title-wrap pad 2.4/3.2rem; sub-wrap margin-left -2rem; hero btn 17.1rem wide, brand color.
Layers (bottom-up): interact-wrap (cursor crosshair lines — vertical 1×700px @0.2 opacity mix-blend difference, plus-cross 0.2rem strokes, mono x/y coordinate readouts `data-control`, brand interact card `#d72201` @0.72) → `bg-border` frame (4 edge strips ~7px + 4 corner plus marks 1.2rem) → `.home-hero-img-inner img` (single line-art image, `mix-blend-mode:multiply`, pad 3.2rem) → ruler (inset 3.2rem, dashed ticks, halves revealed via `clip-path: var(--clip-half)` on hover, items opacity 0→1 @0.4s) → deco cards item1 (bottom 26%/left 14%, 25.6rem) + item2 (bottom 22%/left 50%): mono micro-copy, brand bg square (1.6rem, `fadeLoop` 1.5s pulse), `.active` expands bg to full card (top/right/width/height @0.4s).
Sequence (post-loading): hairline draws (1.2s linear) ∥ title mask-lines (0.8s p2.out, st 0.02) → sub lines → img+deco+frame fades (1s p3.out) → work-card rise (3.2rem, 1s p3.out).

### Intro (`home-intro`)
Content pad `6.4rem 15rem 3.2rem` @1440 (2.4rem @mobile). **The only scrubbed animation:** title (h3, 127 chars) per-char color `#b3b3af → #282828`, per-char **0.5s power1.out, stagger 0.03** (timeline 4.28s), scrubbed over `center bottom+=10% → center top+=40%` (620px @1440, 580px @390). Partner logo marquee rows (`.marquee-left/right.anim`, 30s linear infinite, translateX 0↔-100%), prev/next controls (btn-fill recipe).

### Problem (`home-problem`)
Head flex space-between pad `3.2rem 3.2rem 6.6rem`; list → 4 cards (31.4rem fixed @≥992, 50% wrap @768–991, **Swiper 11 carousel** with `.swiper-slide-active` triggers @<768). Card SVG draw-on recipes in §5 (hover-driven on desktop, slide-active on mobile).

### Map journey (`home-map`) — the centerpiece
Sticky viewport holds:
- 2 `.home-intel-inner` ticker rows (574/589px wide, 47px tall);
- **7 `.home-map-main-img` siblings stacked on `grid-row:1/2`** — 6 cross-fade layers (init opacity 0, `.active`→1) + 1 main image, each full-bleed (1427×853 @1440);
- `.home-map-intro` card (28rem, bottom/left 3.2rem, opacity 0, 5 content items cross-fading);
- 3 `.home-map-number-wrap` markers (y 2651/2842/2925 @1440; hover/active swaps number → detail box, opacity 0.4s);
- right rail `.home-map-content-wrap` `width 0 → 55.65rem` (`.expanded`, width transition 0.4s).

The illustration itself is **13 SVG paths pre-offset off-canvas** (nth-child transforms: `translate(-100vw,-16rem)`, `(100vw,-26rem)`, `(100vw,26rem)`, `(-20rem,-100dvh)`, `(-22rem,-100dvh)`, `(-100vw,28rem)`, `(-100vw,48rem)`, `(-48rem,100dvh)`, `(-28rem,100dvh)`, `(9rem,100dvh)`, `(42rem,100dvh)`, `(100vw,26rem)`, `(-70rem,-100dvh)`) that fly in to `translate(0,0)` as the journey progresses; mobile swaps vw→% and uses `filter:url(#path-filter)`. **Stage cue points were not captured** (see §9) — port the layer stack + offsets now, re-probe the crossfade timing with a smooth wheel scroll.

### Platform / Why / Usecase / CTA / Footer
- Platform: sticky content inner (top 377.56px), 2 img items (`top+=45% bottom`), tabs (btn-fill hovers), grid→column at ≤991.
- Why: 4 illustration cards (1.6s expo.out reveals) with **self-running 5s CSS loops** (§5) + 16 dashed brand lines and 12 pulse points.
- Usecase: FAQ accordion — `.home-usecase-faq-item.active` brand number, `path-vertical` scales to 0, `grid-template-rows 0fr→1fr` 0.4s.
- CTA: 3-column head (min-height 9.6rem), cta-main 7-child reveal (2.05s), cta-deco 1.7s expo.out.
- Footer: form (3-child 1.3s), 2 menu columns (12/14-child, 1.42/2.2s), info column, giant `.footer-logo` (min-height 42.4rem, margin-left -1.55rem, scale+alpha 1.6s expo.out, color 0.65s `cubic-bezier(.59,.23,.22,.96)`), `.footer-title` mask reveal, copyright bar pad `1.7rem 3.2rem 1.5rem`.

## 5. Imagery build recipes (draw-on numbers)

**Shared keyframes** (problem cards):

```css
@keyframes homeProblemDraw      { 0%{opacity:0; stroke-dashoffset:var(--path-length)} 1%{opacity:1} 100%{stroke-dashoffset:0} }
@keyframes homeProblemDashAppear{ 0%{opacity:0} 100%{opacity:var(--dash-opacity)} }
@keyframes homeProblemDashFlow  { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:var(--dash-step)} }
--draw-ease: cubic-bezier(0.22, 1, 0.36, 1);  --dash-duration: 1s;
```

| card | path lengths (per element class) | draw schedule (duration@delay) | dash |
|---|---|---|---|
| manual | db-top 130 · db-inner 80 · col-upper 82 · col-lower 28 · db-bottom 75 · pkg-center 34 · pkg-top 100 · pkg-upper 100 · pkg-side 190 | 0.8@0 · 0.65@0.12 · 0.45@0.25 · 0.75@0.2 · 0.7@0.4 · 0.9@0.55 · 0.4@0.9 · 0.4@0.95 · 0.45@1.15 | pattern `0.93 2.8 9.35 2.8`, appear 0.35 ease-in @1.45 + flow 1s linear ∞ |
| disjointed | circle 180 · tops 58 · sides/bottoms/boxes/center 84 · mask 430 (stroke-width 4) | 0.8@0 · 0.35@0.2 · 0.4@0.35 · 0.6@0.45 · 0.35@0.42 · 0.4@0.48 | appear @0.65, stroke-width 1.5 |
| blind | circle 586 (1.25s) | circle 1.25@0 | outer @0.6, cube @0.8 |
| slow | uppers 102 · upper-sides/center 36 · upper-bottoms 100 · lower-tops 34 · lower-sides 136 · diagonals 102 | 0.6@0 · 0.3@0.3 · 0.45@0.25 · 0.45@0.5 · 0.4@0.45 · 0.45@0.5 · 0.35@0.6 · 0.45@0.65 · 0.425@0.9 | pattern `0.78 2.34 7.81 2.34`, appear 0.5 ease @1 |

All strokes: `fill:none; stroke-linecap:round; stroke-linejoin:round`; dashoffset driven by per-element `--path-length`.

**Why-illustrations (5s infinite cycles, `--box-delay` 0/0.4/0.8s per box):**
boxes scale `0.001→1` between 12%→32% (open `cubic-bezier(0.16,1,0.3,1)`), hold to 62%, close by 70% (`cubic-bezier(0.64,0,0.78,0)`); icons `0.75→1.08@17%→1`; border pulse →1.35; 12 points scale `0.4→1.15→1` (delay = `i*0.06s`); 16 dashed `#fa3600` lines (`dasharray 4 4`, dashoffset `0→-8` 0.8s linear ∞, delay = `i*0.03s`, visible 30–87% of cycle); spinner 1s linear; card-2 dots 1.2s ease-in-out (delay = `i*0.2s`); check pops @80% (scale 1.15); active border inset `-0.2rem→-0.4rem` brand 0.4rem wide @80–92%.

**Footer wordmark**: single `ic-embed` SVG, reveal `scale→1, autoAlpha→1` **1.6s expo.out**, color transition 0.65s `cubic-bezier(.59,.23,.22,.96)`.

## 6. Header / nav

`header-component > header.header` — fixed, top 6.66px, height 56.3px @1440, width `calc(100% - 1.6rem)`, z 10 000 000. **Background stays transparent in every state** (no blur, no border-bottom, no shadow — verified computed at scrollY 0…900).

State machine (decoded from `main.js` `updateOnScroll` + `toggleScroll`, confirmed by class observations):

- `on-scroll` — added when Lenis scroll **> 1 × header height (≈56px)**, removed below (observed between 0 and 100).
- `on-hide` — added when scrolling **down** and scroll **> 5 × header height (≈280px)** (observed between 200 and 300). Effect: `.header.on-hide .header-inner{transform:translateY(-101%)}` with `transition: transform .4s` + `.header.on-hide{pointer-events:none}`. Scrolling **up** past 5× shows it again; guarded by `header.is(':hover')` and a **100ms setTimeout debounce**.
- Desktop nav: 8 links (`/heron-chat-widget`, `/heron-dashboard`, `/pricing`, `/resources?sc=insights|ai-practices|design-workflows`, `/about-us`, `/contact-us`); current page gets a 0.6rem square dot; hover color 0.4s; dropdowns open via `grid-template-rows 0fr→1fr` + opacity 0.4s ease, corner icons slide `±(100% + 1.2rem)` 0.5s `cubic-bezier(.23,1,.32,1)`.
- **btn-fill hover micro-motion** (used on ~30 CTAs site-wide): bg wipe `maskPosition 0% 0 → 100% 0`, **0.58s `steps(19)`** (mechanical stepped wipe) + label color → white **0.15s `circ.in`**; label swap (dup label translateY 100%) 0.48s `cubic-bezier(.625,.05,0,1)`.
- **Menu (≤991px only; `header-menu-btn` display:none on desktop)**: Menu button at top-right (x 288.5/y 32.7 @390). Open: `lenis.stop()`; `.header-menu.bg-global` absolute below header, `clip-path: inset(0 0 100%) → inset(0)`, **all 0.4s ease**, L/R hairline borders; menu items are SplitText mask-reveals at **delay 0.25** (CTA row 0.2); hamburger 3 lines (1.5rem wide, `--size--border` thick) — first+last `scale(0)` on active. Close reverses + `lenis.start()`. Live flip observed at t≈17ms (clip-path engages immediately, resolves over 400ms).
- No theme toggle observed on home (light-only; `--cl-bg` var exists).

## 7. Motion values (numeric)

**GSAP eases** (sampled curves):
`power1.out` `[0,.19,.36,.51,.64,.75,.84,.91,.96,.99,1]` · `power2.out` `[0,.27,.49,.66,.78,.88,.94,.97,.99,1,1]` · `power3.out` `[0,.34,.59,.76,.87,.94,.97,.99,1,1,1]` · `expo.out` `[0,.5,.75,.88,.94,.97,.98,.99,1,1,1]` · `circ.in` `[0,.01,.02,.05,.08,.13,.2,.29,.4,.56,1]` · hairlines use `none` (linear).

**CSS beziers**: `[.23,1,.32,1]` icons/btns · `[.625,.05,0,1]` btn-fill family · `[.5,.5,1,1]` bg-hover wipes · `[.59,.23,.22,.96]` footer wordmark · `[.22,1,.36,1]` SVG draw · `[.16,1,.3,1]` why-open · `[.64,0,.78,0]` why-close.

**Durations (s)**: 0.15 label color · 0.2 fast CSS · 0.25/0.35/0.4/0.45/0.48/0.5/0.58/0.6/0.65/0.7/0.8 (CSS + transition phases) · 0.8 mask-line per line & page-transition phase · 1 block rise / fades / intro char / dash-flow · 1.2 hairline draw · 1.6 img cards · 4.28 intro color timeline · 5 why-cycle · 30 marquee.
**Staggers**: 0.02 mask lines · 0.03 intro chars & why lines · 0.06 why points · 0.2 why dots & menu CTA · 0.25 menu items · box delays 0/0.4/0.8.

## 8. Page transitions (barba)

`@barba/core` + `@barba/prefetch`. The mechanism is a **CSS-variable-driven clip mask + center hairline sweep** (no color overlay):

```css
html { --trans-percent: 0%; --mask-percent: 0%; --size--line: 0px; }
.main { clip-path: inset(var(--mask-percent)) !important; }
```

Leave timeline (from main.js): ink SVG fill/stroke → solid (**0.5s, delay 0.2**) ∥ deco `autoAlpha .32→0` (0.5s) ∥ `--trans-percent 0→50%` + `--mask-percent → half` (**0.8s**) ∥ `--size--line 0 → <measured>` (0.8s) → then reverse half: `--mask-percent → 0%` + `--size-line → 0` (**0.8s power1.out**, `immediateRender:false`).
Video evidence (`heron-home-to-about-1440.mp4`, 13.56s): the home line-art dissolves/morphs into the About wireframe — the brand's vector-line continuity carries across the route change. The 5.5s DOM probe (`page-transition.json`) sampled the wrong elements (zero changes) — timings above come from the deobfuscated bundle.

Also: a full-screen **canvas cursor** (`#canvas-cursor`, 2D ctx, `window.__canvasCursor`, mouse-distance threshold gating, `data-cursor="hidden"` zones) and a **loading overlay** (logo stroke draw via `--loading-logo-dasharray`, path length 1443.42, bg image @0.32 alpha, `.loaded{display:none}`) precede the hero timeline.

## 9. What could NOT be extracted (honest list)

1. **Lenis feel** — decay probe read `window.scrollY` (zero throughout) instead of `.main-inner`; no measured lerp/duration. Config recovered from source (§1).
2. **Map journey cue points** — `journey-states.json` stayed at defaults (activeIdx −1, no transforms) under 100px instant jumps; the stage logic is evidently rAF/velocity-gated, not jump-driven. Layer stack, offsets and `.active` classes are known; **when each layer fades in over the 700dvh is not**. Needs one smooth-wheel probe sampling `.home-map-main-img` opacities + `.home-map-number-wrap.active` per ~200ms.
3. **Initial states of `to()` tweens** (mask-line `yPercent:100`, img-card scale) — set via `gsap.set` at init; inferred from the mask/standard pattern, not directly captured.
4. **Transition element identities** — the obfuscated string table hides which SVG fills and the exact `--mask-percent` half value; timings are solid, selectors are not.
5. **768/1920 trigger px tables** — only 1440/390 captured. Geometry recomputes from the same start/end strings; 768-specific collapses (map content 2-col, no footer parallax) inferred from CSS media queries.
6. **Header show-branch details** — one flattened branch of the direction logic is ambiguous (show threshold on scroll-up); observed classes pin `on-scroll`@1× and `on-hide`@5×.
7. **Cursor canvas rendering** (shape/blend/scale) and **Swiper config** for the mobile problem carousel — not probed.
8. **Menu-open desktop choreography** — nav-1440 menuOpen samples flip instantly (17ms); the clip-path 0.4s animation is CSS-confirmed, but item stagger order beyond delays 0.25/0.2 is not enumerated.
