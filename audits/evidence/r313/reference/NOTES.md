# R313 — Heron Reference (AFTER-truth, the parity target)

- **Captured:** 2026-10-22/23 UTC · live `https://heronaiapp.com/`
- **Harness:** frozen `audits/evidence/r313/census.mjs` v2 (primary + 7 viewports) + agent 3-a probes (`telemetry.mjs`: loader/buttons/lenis/route/surfaces/cookie/frame) + 3-a-resume gapfill (`gapfill.mjs`: cursor, mobile-390, header-states, paper sample). All evidence in THIS directory.
- **Companion machine-readable map:** `digest.json` (the canonical numbers). r308 cross-check: `docs/redesign/r308/reference-observations.md`; deltas noted inline.
- D-numbering mirrors the baseline NOTES (D1–D17) so the two digests diff 1:1.

---

## D1 — Paper / ground color

- **#F4F4EE–#F5F5EF** live-sampled from a fresh PNG screenshot (`telemetry/paper-1440.png`, corners at 3px inset — TL/BR `#F4F4EE`, TR/BL `#F5F5EF`, footer zone `#F3F3ED`).
- Computed `body`/`html` bg are **transparent** — the paper is painted by bg layers (`--cl-bg` var on html resolves transparent in computed style; `.bg-global` layers / `.loading-bg` carry the paint). Screenshot sampling is the ground truth.
- r308 read `#F6F6EE` corners `#F8F8F1` — same warm vintage-paper family, ±2/255 per channel (sampling position/profile). **Madarek pins #F6F8FA — the R313 paper override stands.**
- Evidence: `telemetry/paper.json` (`computed`, `screenshotCorners`).

## D2 — Radius policy (landing)

- **2774 sampled → 4 non-zero radius (0.14%)** — near-absolute radius 0.
- Exceptions (`telemetry/surfaces.json`):
  1. `.cursor-inner` — **50%**, 5×5px dot `#DD6013`, opacity 0 (DOM cursor fallback, almost never visible)
  2–4. `.home-why-item-card-dot` ×3 — **99%**, 2×2/1×1px dots `#F2F2F1` (why-card "loading dots" animation)
- Crop: `telemetry/surface-0-cookie-banner_bg-global_is-visible.jpg`.
- Madarek baseline: 126/1966 (≈30× more rounded).

## D3 — Shadow policy (landing)

- **2774 sampled → 1 non-none shadow.** The single shadow:
  `.cookie-banner.bg-global.is-visible` → **`rgb(0,0,0) 0px 6.66667px 0px -1.66667px`** — hard-edged (zero blur) black offset bar under the fixed cookie banner, drafting-style drop.
- Everything else (cards, buttons, headers) is flat. Madarek baseline: 6/1966 with an elev ladder.

## D4 — Loader timeline (`.loading`, NOT session-gated)

- Nav: ttfb 324ms / DCL 786ms / load 1280ms (fresh context, no disk cache). Loader overlay (`.loading`, fixed, z 2147483647, paper bg) paints by t≈383ms.
- **Counter timeline (t from nav-start, `telemetry/loader.json` 102 samples):**

| t (ms) | pct | phase |
|---|---|---|
| 383–943 | 0 | paint + wait |
| 1131 | 16 | counter starts (~1.1s) |
| 1202 | 20 | fast ramp |
| 1565 | 34 | |
| 2165 | 50 | |
| 2400–2640 | 53–56 | slow mid |
| 3000–3240 | 59 | plateau begins |
| 3366–3840 | **60** | asset-wait plateau (~0.5s) |
| 3965 | 67 | second ramp |
| 4200 | 78 | |
| 4440 | 86 | |
| 4800 | 94 | |
| 5181–5520 | 98–99 | |
| **5649** | **100** | done |

- Progress bar: horizontal 1px band split into two `#B3B3AF` translating items (`item-top`/`item-bot`, `loading-progress-item`), counter text `100%` in Geistmono 10px **#FA3600** (`loading-progress-txt-percent`). Bar frame width 1427px (= viewport − 2×7px).
- Loader chrome: thin 1px frame; `.loading-ruler` with crosshair 8×8 `#FA3600` plus + X/Y mono readout (X:1131PX style); "DESIGNED BY BEARPLUS…" title (BT Grotesk h4 26.67px) bottom-left; metadata block (TYPE/FOUNDED/FOCUS/LOCATION) + **10 system log lines** (001 INITIALIZE CORE SYSTEM … 010 START EXECUTION), all present from the start (r308 saw 5 — the list is now 10).
- **Gating: NONE on full loads** — replays on same-tab reload (reloadGate: 15% @258ms → 100% @4680ms, faster on warm cache). A `sessionStorage['isLoaded']` flag exists in the loader class (heronai-bp main.js) but does not suppress the reload replay. NOT replayed on Barba subpage transitions.
- vs r308 (100% @~4.9s, exit @5.2–5.7s): **the loader tracks real asset loading** (60% plateau = waiting on network); total is network-dependent, not a fixed clock. Madarek's fixed 8.6s clock is a different behaviour class.
- Visual: `primary/loader/l00–l19.jpg`, `telemetry/loader-t{2400,4600,5500,7300,9800}.jpg`.

## D5 — Loader EXIT (plays fully, unlike Madarek's D5)

- **Exit = 835ms center-out two-band split**, starting 717ms after the counter hits 100% (100% @5649 → first clip @6366 → fully open @7201).
- `.loading-main` clip-path polygon opens a horizontal slit at the vertical centre and widens symmetrically:
  band 49.94–50.06% @6366 → 38.38/59.30 @6480 → 28.63/67.11 @6600 → 20.62/73.53 @6720 → 14.01/78.82 @6841 → 9.69/82.29 @6964 → 7.34/84.17 @7092 → **0/100 @7201**.
- Element survives as `.loading.loaded` (inner content opacity 0); display flips to `none` (route probe sees `loaderDisplay: none`). Full timeline table in `digest.json` → `loader`.
- Madarek baseline D5: exit cut short at ~21ms (D5 race) — **the reference plays all ~0.84s of it.**

## D6 — Route transition (Barba, / → /pricing)

- **Total ≈1.6s two-phase 4-edge inset wipe** (`telemetry/route.json`, 329 samples):
  - click → Barba path/URL swap at **~142ms**
  - phase 1 (leave): `--trans-percent` 0→**50%** by **897ms** (r308: power1.in); `.main { clip-path: inset(var(--mask-percent)) !important }` closes from all 4 edges; the four `.main-deco` frame lines (top/bottom/left/right at `calc(var(--trans-percent) - var(--size--line)/2)`) converge to centre
  - midpoint: `--size--line` spikes to **1** (≈8.33px architectural line) exactly at 50%, then decays 0.81→0.375→…→0
  - phase 2 (enter): `--mask-percent` opens 50%→0 by **~1616ms** (r308: power1.out)
- **No loader replay on subpage nav** (`loaderDisplay: none` throughout; `--loading-logo-dasharray` stays 0). Back navigation animates the same way.
- After-state: `/pricing` title "Heron AI | Pay for the hours you get back".
- Crops: `telemetry/route-{200,600,1000,1700}ms.jpg`. Nav link inventory: `telemetry/route-links.json` (12 links incl. dropdown items + awwwards + bearplus credit).
- Madarek baseline: 721ms `.sx` sweep + 0.5s GuestReveal overlapping (927ms perceived) — the reference is one sequenced 1.6s grammar.

## D7 — Scroll engine

- **Lenis 1.1.5** (unpkg) on wrapper `DIV.main-inner.lenis` (overflow hidden, window scroll stays 0), driven by **GSAP 3.12.5 ticker**, `ScrollTrigger.update()` on every lenis scroll event; **Barba 2.10.3 + prefetch**; **Swiper 11**; SplitText 3.13.0/TextPlugin.
- Exact instantiation (read from `heronai-bp.netlify.app/main.js`):
  `new Lenis({ wrapper: barba?.next?.container || document.querySelector(.main-inner), content: barba?.next?.container?.querySelector(...) || ..., syncTouch: true, smoothWheel: true, smoothTouch: false, infinite: false })` — everything else default: **lerp 0.1 (lerp mode, no duration), easing `t=>min(1,1.001-2^-10t)`, wheelMultiplier 1, touchMultiplier 1**. A 150ms-quiet `setTimeout` adds an idle class on the container.
- Wheel probe (`primary/probe-scroll.json`): 720px impulse — first motion +156ms, 63% @637ms, 98.6% @1181ms, settled @1695ms → **probeTailMs ≈1540, exponential lerp glide** (no fixed duration). Matches r308 §15 (~1.4–1.6s interpolation, long ease-out tail).
- `telemetry/lenis.json` also carries the full script inventory (clarity, mixpanel, GTM, jquery, webflow.js, gsap×4, barba×2, swiper, heronai-bp config.js/main.js, netlify rum).

## D8 — Typography ladder (root 8.333px @1440, fluid)

- Two families only: **BT Grotesk** (display+body) and **Geistmono** (instrument/micro).
- Computed (`primary/styles.json`, 201 records):

| class | family | size | weight | lh | ls | case | color |
|---|---|---|---|---|---|---|---|
| `heading.h1` (hero) | BT Grotesk | 46.67px | 700 | 46.67 (1.0) | −0.93px | UPPER | #282828 |
| `heading.h2` (sections) | BT Grotesk | 40px | 600 | 40 (1.0) | −0.8px | UPPER | #282828 |
| `heading.h3` (intro) | BT Grotesk | 33.33px | 600 | 33.33 (1.0) | −0.67px | UPPER | **#B4B4B0** |
| `heading.h4` (loader credit) | BT Grotesk | 26.67px | 600 | 1.0 | −0.53px | UPPER | #282828 |
| `txt-16` body | BT Grotesk | 13.33px | 400–500 | 17.33 (1.3) | −0.27px | none | rgba(40,40,40,.72) |
| mono `txt-14` (labels/buttons) | Geistmono | 11.67px | 500 | 16.33 | normal | UPPER | mixed |
| mono `txt-12` (loader %) | Geistmono | 10px | 500 | 13 | normal | UPPER | **#FA3600** |
| mono `txt-10` (coords) | Geistmono | 8.33px | 500 | 10.83 | normal | UPPER | rgba(40,40,40,.72) |

- **No 13px floor — micro text goes down to 8.33px** (Madarek keeps a 13px floor; deliberate §G divergence).

## D9 — Fonts

- Live `document.fonts` (`primary/styles.json` → fonts): **BT Grotesk 400/500/600/700 (+ 400/500/600/700 italic), Geistmono 500, webflow-icons 400** — 10 faces.

## D10 — Landing section map (1440×900, totalHeight 12 355px, maxScroll 11 468)

| n | cls (semantic section) | top | height | pct |
|---|---|---|---|---|
| 1 | `home-hero` | 7 | 887 | 7.2% |
| 2 | `home-intro` | 893 | 723 | 5.9% |
| 3 | `home-problem` | 1616 | 743 | 6.0% |
| 4 | `home-map` (pinned walkthrough) | 2358 | **6300** | **51.0%** |
| 5 | `home-platform` | 8658 | 710 | 5.7% |
| 6 | `home-why` | 9368 | 698 | 5.6% |
| 7 | `home-usecase` | 10067 | 887 | 7.2% |
| 8 | `cta` | 10953 | 698 | 5.6% |
| 9 | `footer` | 11651 | 711 | 5.8% |

- 9 semantic sections inside 0px web-component wrappers (`HOME-*-WRAP`); the map walkthrough is **51% of the page** (the pinned plan story dominates). Madarek: 12 sections / 16 280px (+3 925px).
- Evidence: `primary/meta.json` → sections; tiles `primary/full-tile-00..13.jpg`, scroll frames `primary/frames/f00..f20.jpg`.

## D11 — Header behaviour

- `.header` **fixed @ (7,56)** — height **56px** (56.2969 computed), inset **7px** from top (y=7), z 10000000, width 1427 (=100% − 2×7).
- Class states (`telemetry/header-states.json`, direct wrapper scrollTop sets):
  - true top: **`header`** (clean)
  - scrolled: **`header on-scroll on-hide`** (both flip on)
  - back to top: **`header on-hide`** (on-scroll drops, **on-hide latches** once you've scrolled)
  - transform/opacity never changed during programmatic jumps (y=7, transform none, opacity 1 in all states — the actual hide/show ride on scroll velocity; r308 observed show/hide-on-scroll behaviour)
- Nav: PRODUCT (dropdown: Heron Chat Widget, Heron Dashboard) / PRICING / RESOURCES (dropdown: Insights, AI Practices, Design Workflows) / ABOUT + CTA "contact us" (`.header-cta-new` 167×56). 4 top-level items, 2 dropdowns. `header-menu-btn` (hamburger) display:none ≥992px.
- Mobile (<992): header collapses to a 187×50 "MENU" button; desktop CTA hidden; the CTA "contact us" (`.header-cta.only-mb`) lives INSIDE the menu overlay.
- Evidence: `primary/meta.json` (headerInfo, headerStates), `telemetry/header-states.json`, `telemetry/mobile.json`.

## D12 — Buttons / CTAs (full recipes in `digest.json` → buttons, 16 entries)

Universal grammar: **radius 0, no shadow, no padding, transparent bg; hover = a fill rect wipe (`.btn-fill-bg` slide) + dual-label vertical roll (±16.33px) + icon slide; transition `color 0.4s` / `all` (JS-driven)**.

| button | default | hover | active | focus | swap |
|---|---|---|---|---|---|
| header-cta "contact us" | white text, transparent | **#FA3600 fill** + white + roll | fill held | = hover | fill wipe + label roll + arrow slide ±16.66px |
| nav items (Product/Pricing/About) | rgba(40,40,40,.72) | **#282828 fill** + white + roll | fill held | = hover | dark fill wipe + label roll (+chevron roll on dropdowns) |
| dropdown items (Chat Widget etc.) | rgba(40,40,40,.72), mono 11.67px | **no fill, no colour — label roll only (16px)** | roll | roll | pure roll |
| hero-discover | #FA3600 text, transparent, 143×97 | #FA3600 fill + white + roll | fill held | **#FA3600→#FB653B text brighten, no fill** | fill wipe + roll; focus-visible = lighter orange |
| cta-contact | white on orange slab | is-fill-active + roll + dual-arrow slide ±37px | is-fill-entered | partial roll | fill + roll + arrow slide |
| footer-subscribe-btn | #B3B3AF arrow, 40×40, pad 8.33 | **arrow grows 13×8→17×17** | same | same | icon scale only |
| footer-link-about | #282828 | **#FA3600** (colour only, 0.2s) | no change | = hover | colour swap |
| footer-link.w--current | **#FA3600 (latched)** | no change | no change | no change | none |
| map-number-1 | rgba(40,40,40,.72) 32×32 | number scales 11×7→32×32 | same | same (focus-visible unmatched) | icon scale |
| cookie-accept | bg #EFEFEF, white (fill-small 120×30) | btn-fill roll | — | — | fill-small roll |
| cookie-reject | transparent, #282828 (no-ic-small) | label roll | — | — | roll, no fill |

- No focus outlines anywhere — **:focus-visible drives the hover recipe** (or the lighter-orange text on hero-discover). `focusVisibleMatched: true` on 13/14 measured buttons.
- Input (`footer-form-input`): border 1px **#B3B3AF** → focus **#ED4C1F** → filled **#FA3600** (0.45s border-color).
- Crops: `buttons/<name>-{default,hover,active,focus}.jpg` (50+ crops).
- Madarek baseline CTA: #FA3600 bg / radius 6 / shadow glow / translateY(-1px) — **a completely different button grammar**.

## D13 — REM / responsive ladder (fluid root)

- `html { font-size: 0.578704vw }` (read live from route.json cssRules) with mobile clamps:

| width | 1440 | 1280 | 1024 | 768 | 390 | 360 |
|---|---|---|---|---|---|---|
| rootFontSize | 8.333px | 7.407px | **5.926px** | 9.209px | 9.924px | 9.160px |

- 1024 dips to the raw vw formula (5.93px) before the mobile clamps raise 768+; small screens get a LARGER root so micro text stays legible (r308 §16 confirmed).
- Madarek: flat 16px everywhere (§G non-adoption).

## D14 — Cursor layers (verified live by 3-a-resume)

- **One body-level canvas** 1440×900 fixed @(0,0), z-index 2147483600, pointer-events none (`telemetry/cursor.json`).
- **Square cursor verified by pixel read**: 10×10px bbox (≈9×9 core + AA), **100 opaque pixels, solid #FA3600** — sampled via canvas getImageData at rest over nav links and the header CTA.
- Reticle grammar (r308/r310 deep audit): interactive state = 2px **#FC724D** border, scale .56, opacity .68; trail lerp .18; DOM fallback `.cursor-inner` = 5px 50% circle #DD6013 opacity 0; `.cursor` root 1440×900 z999; `.cursor-main` gets `hidden` over the header nav.
- **Zone suppression confirmed**: 0 drawn pixels at (700,450) inside the hero interact area — `data-cursor="hidden"` on `.loading-inner`, `.home-hero-img-wrap`, ruler wraps; the hero instrument (guides #E0E0DA + 8×8 #FA3600 plus + Geistmono X:Y readout) replaces the global cursor there.
- **No canvas element at all in 390×844 touch context** (`telemetry/mobile.json` → canvas null).
- Crops: `telemetry/cursor-neutral-1440.jpg`, `cursor-hover.jpg`, `cursor-hover-cta.jpg`.

## D15 — Viewport height matrix

| viewport | totalHeight | rootFontSize | header | map section h | hero interact | canvas cursor |
|---|---|---|---|---|---|---|
| 1440×900 | 12 355 | 8.333px | 56 | 6300 | yes | yes |
| 1440×700 | 10 555 | 8.333px | 56 | 4900 | yes | yes |
| 1280×800 | 10 983 | 7.407px | 50 | 5600 | yes | yes |
| 1024×768 | 9 938 | 5.926px | 40 | 5376 | no (<992) | yes (desktop ctx) |
| 768×1024 | 12 577 | 9.209px | 52 | 5473 | no | yes (desktop ctx) |
| 390×844 | 11 441 | 9.924px | 50 | 4819 | no | **no (touch)** |
| 360×800 | 10 684 | 9.160px | 46 | 4553 | no | **no (touch)** |

- Viewport HEIGHT reshapes the story (1440×700 is 1 800px shorter; the pinned map shrinks 6300→4900; sections re-fit to innerHeight). ≤991px: hero instrument display:none (`@media (hover:hover) and (min-width:992px)` gate — re-verified live: `.home-hero-img-interact-wrap` display none at 390, `matchMedia('(hover:hover) and (min-width:992px)')` false), map pin static, hamburger header, footer strip swaps to mobile variant.
- Evidence: `viewports/*/meta.json`, `summary.json`, `telemetry/mobile.json`.

## D15b — Mobile 390×844 menu (gapfill)

- Header 49.6px fixed @ y=7.94, width 374 (= 390 − 2×7 − 1.9); hamburger `.header-menu-btn` **187×50**, label "MENU".
- Toggle: closed (`header-menu-btn` / `.header-menu` plain) → click → **`.header-menu-btn.active` + `.header-menu.active`** overlay; menu rows: PRODUCT 40px, PRICING 40, RESOURCES 40, ABOUT 40, **CONTACT US 51px (`.header-cta.only-mb`)**; second click closes (classes drop back).
- Crops: `telemetry/mobile-menu-closed-390.jpg`, `mobile-menu-open-390.jpg`; full data `telemetry/mobile.json`.

## D16 — Auth / login reality

- **No auth surface** — public marketing site; the only "account" affordances are CTAs to `/contact-us` / `/heron-dashboard` (route-links.json). No login POST, no role dashboards to census. (Madarek's D16 demo-lock situation has no reference counterpart.)

## D17 — Misc / global state

- `<html lang="en" dir="ltr">`; title "Heron AI | Works inside your design tools"; theme-color meta: none; 45 `<img>` on landing; body/html computed bg transparent (paper via layers).
- **Cookie banner** (`telemetry/cookie.json`): `#heron-cookie-root[aria-live=polite]` → `.cookie-banner.bg-global.is-visible` — fixed bottom-right, 601×38 @(832,855), z 100009, 4× 1px black border lines, hard offset shadow (the site's only shadow). Text "This website uses cookies. **Learn more**" (→ /cookie-policy, Geistmono 11.67px #FA3600 UPPER) + **Accept** (bg #EFEFEF, white, fill-small) + **Reject** (transparent, #282828). Accept hides the banner instantly; consent persisted as a JSON cookie (revision+categories+consentDate, SameSite=Lax) + `window.HeronConsent` API; banner root re-renders on reload. Crops: `cookie-banner.jpg`, `cookie-accept-hover.jpg`.
- **Motion census** (`primary/motion.json`): 152 transition rules / 84 animation rules / **24 @keyframes** (spin, marqueeLeft/Right, rotate, fadeLoop, rotate-icon, homeProblemDraw/DashAppear/DashFlow/MaskDraw, homeWhy×11, loadingActive, checkActive). Dominant duration **0.4s** (~100 rules), then 0.3/0.5/0.2/0.45s. Easings: default ease + cubic-bezier(.23,1,.32,1) + (.625,.05,0,1) + (.5,.5,1,1) + linear marquees + steps(1)/steps(4).
- **Marquee**: hero work strip `marqueeLeft`/`marqueeRight` **30s linear infinite** (dual direction).
- **Footer** (711px = grid 355 + image strip 314 + copyright 42): 3 columns — left title + subscribe form; middle links + address (60 Martin Pl, Sydney) + business@bear.plus/hello@heronaiapp.com; right 215×215 SVG line logo (full + sketch variants). **Pointer lens on the image strip: r 99.09 / pulse 104.04, lerp .09/.15, enter 0.55s / leave 0.8s / pulse ~1s, ink-mask + turbulence edge** (r308 §13; identical at 1440×700/1280×800; hidden ≤767). Copyright "©2026 HERON AI. All rights reserved. Concept Crafted by Bearplus".
- **Frame system**: fixed 1px #B3B3AF frame at the **7px inset** (scales with root: 6px @1280/360, 7px @768/390), content width 1427 @1440; hero drawing frame 1407×680 with 7px bars + 10×10 corner plus marks; ruler tick strips on the drawing window (64% opacity, proximity reveal); 6.4rem grid on problem-card hover; coordinate labels at strip edges. Crops: `telemetry/frame-tl-1440.jpg`, `frame-hero-corner-1440.jpg`.
- Analytics stack live: Clarity, Mixpanel 2.84, GTM G-N1KKXK6ZR5, Netlify RUM (lenis.json → bundleFindings).

---

## r308 cross-check deltas (NOTES)

1. **Loader log lines: 10 now vs 5 in r308** (list extended 001–010).
2. **Loader total: ~7.2s this run vs ~5.7s r308** — asset-progress-driven, network-dependent (60% plateau = network wait). No fixed clock.
3. **Paper: #F4F4EE/#F5F5EF this run vs #F6F6EE/#F8F8F1 r308** — same warm family, ±2/channel sampling variance.
4. **Section heights stable**: 12 355px total, 9 sections identical to r308's 12 338 (±17px — content drift).
5. **1024×768 added** (r308 matrix lacked it): 9 938px, root 5.926px, header 40px — the fluid-rem dip point.
6. Everything else (cursor 9px #FA3600 square, reticle #FC724D, hero instrument <992px gate, footer lens constants, route 1.6s sweep, Lenis wrapper) **re-confirmed unchanged**.

## Completion

- Reference evidence tree COMPLETE: `primary/` (meta/styles/motion/probe-scroll + 20 loader frames + 21 scroll frames + 14 tiles), `viewports/` ×7, `telemetry/` (loader, lenis, buttons, buttons-discovery, route, route-links, cookie, surfaces, cursor, mobile, header-states, paper + crops), `buttons/` (50+ state crops), `digest.json` (canonical), this NOTES.md.
- Repo source untouched; census.mjs untouched; nothing committed. Added files only under `audits/evidence/r313/reference/` (telemetry.mjs was 3-a's; gapfill.mjs is 3-a-resume's).
