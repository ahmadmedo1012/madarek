# R333 · Heron Media & Craft Inventory (A-Inventory)

- **Round:** R333 · **Task:** A-Inventory · **Spec of record for behavior:** `docs/redesign/r331/heron-program.json`
- **Target:** https://heronaiapp.com/ (live, Webflow + GSAP 3.12/ScrollTrigger + Lenis 1.1.5, LTR)
- **Method:** Playwright chromium @1440×900 and 390×844; programmatic DOM probe (117 media elements, 90 resource entries, fonts, `:root` vars, overlay geometry) + 6 screenshots + PIL pixel-metric analysis (palette / ink / orange / paper share / edge density). Images were not viewable in sub-agent context, so visual reads are triangulated from pixel metrics + DOM + the r331 deep-probe spec.
- **Evidence:** `/home/z/evidence-r333/inventory/heron-1440-top.png`, `heron-1440-mid1.png` (25%), `heron-1440-mid2.png` (50%), `heron-1440-mid3.png` (75%), `heron-390-top.png`, `heron-390-mid.png` (45%), `heron-inventory.json`, `probe.py`

**Headline finding: Heron ships ZERO `<video>`, zero Lottie, zero Rive.** 100% of the "expensive" feel comes from authored raster line-art + inline SVG + GSAP choreography + one paper-material background system. Total above-the-fold media weight ≈ 460 KB.

---

## §1 Heron inventory (24 rows)

Page geometry @1440: total scroll 12,355px (≈13.7 viewports). Sections: hero 887px · intro 723 · problem 743 · **map/journey 6,300 (51% of scroll)** · platform 710 · why 698 · usecase 887 · cta 698 · footer 711.

| # | Element (selector) | What it is | How built | Size / weight (measured) | Trigger | Duration / easing | Job in the story |
|---|---|---|---|---|---|---|---|
| 1 | `.loading` preloader | Full-screen paper overlay: logo **stroke-draw** (`--loading-logo-dasharray`, path length 1443.42), `100%` counter, live `X:1131PX Y:1131PX` readout, "DESIGNED BY BEARPLUS…", "TYPE: Technology/AI Software" | CSS custom-prop dash animation + GSAP; exits via `.loaded { display:none }` | ~1 KB `load.svg` + text | on load | stroke 1443.42u draw; card spinner 1s linear, dots 1.2s ×0.2s stagger | Sets "engineering drawing" contract before any content shows |
| 2 | Paper background system | Warm paper texture + grid on `.body/.bg-global` | CSS `background-image: var(--bg-img)` = `bg.svg` tile (repeat) + `--bg-grid` deco tiles | `bg.svg` **51 KB** CSS tile; border/grid tiles cached | always (static) | — | One material the whole site is "printed on"; unifies every section |
| 3 | `bg-border` frame | 4 hairline edge strips (1373×7 / 7×833 @1440) + 4 corner plus-SVGs | CSS strips + inline SVG | <2 KB | always | — | Drafting-table frame; makes viewport a sheet of paper |
| 4 | Corner registration marks | Dozens of tiny plus/cross SVGs (10–17px) at section corners, arrows (5px) | inline SVG | <0.5 KB each | always | — | Blueprint authenticity; rhythm markers between sections |
| 5 | Hero plan drawing `.home-hero-img-inner img.img-basic` | Single large architectural **plan illustration** (building blueprint), multiply-blended into paper | `<img>` raster + `mix-blend-mode: multiply`, padding 3.2rem | rendered 1373×647, natural **2060×1037**, `Full.webp` **300.3 KB decoded** | load: fadeIn | 1s `power3.out` (opacity) | The product *is* the drawing — hero states "we render your plans" without a screenshot |
| 6 | Hero cursor measuring lines `.home-hero-img-interact-wrap` | 1px×700px vertical + horizontal crosshair lines, `mix-blend difference`, opacity 0.2, **mono X/Y coordinate readouts** (`data-control`) | DOM divs + JS mousemove | 0 (pure DOM) | mousemove (live) | rAF-follow | Turns hero into a live measuring instrument; invites inspection |
| 7 | Hero plus-cross + interact card | Small plus marks + brand block at 0.72 alpha on hover | CSS/SVG | ~1 KB | hover | CSS transitions | "Inspect this plan" affordance |
| 8 | Custom cursor `#canvas-cursor` | Full-viewport 2D **canvas** (1440×900) fixed overlay; `window.__canvasCursor` class w/ `reachedThreshold` gating; `data-cursor="hidden"` on hero/ruler items | `<canvas>` 2d context + JS class | 0 | mousemove (live) | per-frame draw | Cursor becomes a drawing tool; global signature micro-interaction |
| 9 | Intro statement image | Square line-art illustration beside the manifesto text, SVG `layer` overlay aligned to same box | `<img>` + inline SVG overlay | rendered 713×723, natural 1766×1766, `image 345.avif` **49 KB** | scroll into view (`top+=45% bottom`) | 1s `power3.out` (blockRise) | Gives the text-only statement a drafted-figure anchor |
| 10 | Problem icons ×4 (`.manual-svg/.automation-svg/.blind-svg/.slow-svg`) | 4 line-drawn icon plates for the pains list | inline SVG (multi-path) | 167×167 each, few KB | scroll | fadeIn recipe | Pains visualized as drafting errors, not stock photos |
| 11 | Journey blueprint assembly `.home-map-img-svg` | **The centerpiece**: one SVG with 13 paths, each pre-transformed off-canvas (e.g. `translate(-100vw,-16rem)`), driven to 0 as the user travels the journey | GSAP scrub timeline over 6,300px; 6 cross-fade `<img>` layers stacked in same grid cell; 3 number markers; 2 intel tickers; intro card cross-fades | rendered 1427×853; layer imgs lazy (`naturalWidth 0` until reached) | scroll scrub (pinned) | full 6,300px range; cross-fades per stage | Blueprint of the product assembles itself as you travel — the story is the drawing |
| 12 | Journey width-expansion panel `.home-map-content-wrap` | Right column opens 0 → 55.65rem revealing detail content | CSS width transition | — | stage change | 0.4s ease | Reveals depth per chapter without leaving the map |
| 13 | Platform product shots ×2+ `.home-platform-img-item` | Real **product UI screenshots** (dense app windows) | `<img>` + SVG `layer` frame; sticky inner (`top: 377.56px`) | rendered 599×353; naturals **1440×870** and **2880×1740** (2×); PNGs lazy | scroll (`top+=45% bottom`) | 1.6s `expo.out` scale 0.8→1 (imgCardReveal) | Proof the drawing became a working tool |
| 14 | Why-section before/after | Transformation proof: `Before.avif` + `Before-1.avif` pair + dense decorative SVG assembly (360×265, dozens of dots/nodes) | `<img>` pair + inline SVG | 10.7 KB + 8.9 KB | scroll | 1.7s `expo.out` scale/alpha ×4 staggered | "From chaos to CAD" in two frames |
| 15 | Use-case role cards ×8 | Portrait/photo cards per audience: Architects, Interior Designers, Landscape Architects, Engineers, BIM Managers, Drafters, Design Leads, Mall Firms | 8 stacked `<img class=img-cover>` (714×887) cross-fade + ruler-tick SVGs (17px ×8) | 116 KB + 115 KB jpgs measured (others lazy) | scroll / selection | cross-fade per role | Names the customer in their own professional skin |
| 16 | CTA sketch `cta-sketch` | Hand-drawn closing sketch (looser, human) | `<img>` + deco items + SVG layer | rendered 713×386, natural 1704×952, `cta-sketch.webp` **30 KB** | scroll | imgCardReveal 1.6s `expo.out` | Human sign-off after all the precision |
| 17 | Footer wordmark + logo | Monumental brand signature: full-width wordmark image + `.footer-logo` SVG (`.ic-embed`, 215×215) | `<img>` + stroke SVG; parallax/wordmark GSAP drivers (8 duplicated triggers) | rendered 1427×314, natural **3428×754**, `Frame 484 (1).png` **51 KB** | scroll (`top+=55% bottom`) | 1.6s `expo.out` reveal + parallax | Brand engraved at the bottom of the sheet |
| 18 | Awwwards badge `a.awwwards-link` | Vertical third-party craft endorsement rail | CSS/HTML, `bg-global` | 44×139 @ (1389, 380) — right edge, mid-viewport | always | — | External validation of craft, built into the frame |
| 19 | Cookie banner `.cookie-banner.is-visible` | Compliance bar that **matches the design system** (paper bg, btn-fill buttons ACCEPT/REJECT, LEARN MORE) | HTML/CSS + btn-fill | text: "This website uses cookies…" | on load | btn-fill hover physics | Even legal UI obeys the material system |
| 20 | Button system `.btn-fill` | Every button: fill bg wipes up (translateY −15/−30), label swaps via `label-bot` inner | CSS/GSAP transforms | 0 (DOM) | hover | wipe 0.58s, label color 0.15s, swap 0.48s | One interaction grammar everywhere; tactile consistency |
| 21 | Page transition | `.main` clipped by `clip-path: inset(var(--mask-percent))`; a hairline (`--size--line`) sweeps viewport center; `pixel-mask.svg` | CSS custom props driven by GSAP/Barba | `pixel-mask.svg` cached | route change | ~0.8s phase | Vector-line continuity between pages — site behaves like one continuous drawing |
| 22 | Typography system | **BT Grotesk** Regular/Medium/SemiBold/Bold + **GeistMono Medium** for data readouts/labels | 5 woff2 via CSS | woff2 cached (not in perf trace; ≈15–25 KB each typical) | — | — | One grotesk family = typographic confidence; mono = instrument voice |
| 23 | `:root` token layer | 19 custom props: `--content--brand:#fa3600`, `--content--primary:#282828`, `--border:#b3b3af`, `--size--line`, `--trans/mask-percent`, rem-scale (1rem=8.33px @1440) | CSS custom properties | 0 | — | — | Everything (incl. transitions) is token-driven; page scales as one sheet |
| 24 | Mobile (390) variant | Same paper system; problem list becomes Swiper 11; SVG assembly swaps vw→% units + `url(#path-filter)` | Swiper + CSS overrides | — | touch/scroll | same recipes | Craft survives breakpoint; not a separate design |

**PIL pixel-metric confirmation:** paper `#f4f4ed–#f8f8f1` covers 78–95% of every frame; ink `#4d4843` spikes at hero (edge density 28.6% top vs 7–16% elsewhere = dense line-art); brand orange present at only **0.2–1.6%** of pixels (precision accents, not fills); 75% frame shows warm photo band `#a58276` (role/before-after photography, color-matched to paper).

---

## §2 Production-value themes — why Heron feels expensive

1. **One material, everywhere.** Every surface — preloader, cookie banner, badges, overlays — sits on the same `bg.svg` paper tile. Nothing is a "different website" at any scroll depth; consistency reads as budget.
2. **Drawn, not filmed.** Zero video/Lottie. The expensive signal is bespoke line-art illustration (hero 2060px plan, 13-path self-assembling journey SVG) — authorship you can't buy from a stock library, instead of heavy footage.
3. **The UI performs measurement.** Mono X/Y readouts, 1px difference-blend crosshairs, ruler ticks, corner registration marks, `100%` counter. The chrome itself acts like an instrument, so the product claim (precision software) is enacted, not stated.
4. **One scrubbed centerpiece eats half the scroll.** The 6,300px journey (51% of the page) is a single self-assembling blueprint with staged cross-fades — pacing courage: one hero moment, everything else supports it.
5. **Photographic restraint, color-matched.** Only two photo zones (role portraits, before/after), warm-graded into the paper palette (`#a58276` bands). Photos are punctuation; line art is the prose.
6. **Reveal grammar is a single reused recipe.** `imgCardReveal` (scale 0.8→1, 1.6s `expo.out`) used 12+ times, `fadeIn`/`blockRise` (1s `power3.out`) everywhere else, buttons share one wipe physics (0.58s). Few easings, total coherence.
7. **Type confidence over type variety.** Four weights of one grotesk + one mono; hierarchy from scale and spacing (rem tokens scale the whole page like one sheet), never from font proliferation.
8. **Even the seams are animated.** Preloader logo stroke-draw and clip-path page transitions with a sweeping hairline mean the *transitions* — not just content — carry the identity.

---

## §3 Madarek counterpart map

Madarek (مدارك): Arabic-first smart-learning platform, blueprint/line-drawing identity, orange accent. Sections: hero / statement / pains / journey(map) / platform / why / roles / cta / footer. Current state: ONE tiny product screenshot, line-drawn plan hero, no video/loops/preloader/cursor. Product: student lecture+AI tutor+exams, teacher grading, registrar dashboards. RTL (mirror horizontal geometry; vertical rhythm and recipes port 1:1 per `scripts/twin/config.json`).

**Owner legend:** P-A design system/tokens · P-B brand & motion identity · P-C illustration · P-D interaction/micro-motion · P-E iconography/labels · P-F scroll choreography · P-G product capture · P-H data-viz/before-after · P-I photography/roles · P-J QA/audit.

| Heron element | Madarek equivalent (to be produced) | Asset type | Owner |
|---|---|---|---|
| Paper bg tile + border frame (rows 2–3) | Blueprint-grid paper system in Madarek palette (cream + orange ink), RTL-safe tiles | CSS asset (SVG tiles) | P-A |
| Preloader (row 1) | مدارك wordmark **stroke-draw** (Arabic stroke path) + % counter + enrollment-type tag | SVG + GSAP overlay | P-B |
| Hero plan drawing (row 5) | Line-drawn **campus/semester plan** (student → lecture → AI tutor → exam hall) at 2060×1037, multiply blend | Hero illustration (2× webp/avif) | P-C |
| Cursor measuring lines + mono readouts (rows 6–7) | RTL measuring layer over hero: crosshair lines + Arabic-Indic numeral X/Y readouts | DOM/JS micro-layer | P-D |
| Canvas cursor (row 8) | Custom dot/crosshair cursor (hover-aware, `data-cursor=hidden` on interactive) | Canvas or DOM cursor | P-D |
| Problem icons ×4 (row 10) | 4 pain line-icons: manual grading, scattered records, blind spots, slow reporting | Inline SVG set | P-E |
| Journey blueprint assembly (rows 11–12) | `#chapters` pinned journey: 13-path **learning-journey map** self-assembling on scrub + stage cross-fades | SVG scrub timeline | P-F |
| Platform product shots ×2 (row 13) | Real captures @2× (2880×1740): student lecture+AI tutor screen, teacher grading/exam dashboard; sticky + imgCardReveal | Product screenshots | P-G |
| Why before/after (row 14) | Paper report (chaos) vs Madarek dashboard (order) pair reveal | Image pair + reveal | P-H |
| Role cards ×8 (row 15) | Madarek roles: student, teacher, registrar, parent, supervisor… illustrated/photo cards 714×887 cross-fade | Card imagery set | P-I |
| CTA sketch (row 16) | Hand-drawn graduation/enrollment sketch as human closing note | Sketch illustration | P-C |
| Footer wordmark + logo (row 17) | Giant مدارك wordmark (SVG stroke, parallax) + logo stroke-draw | SVG + image | P-B |
| Awwwards badge (row 18) | Quality-mark slot (e.g., MoE/compliance or audit badge) in the frame rail | Static badge slot | P-J |
| Cookie banner in-system (row 19) | Arabic cookie bar rebuilt on the same paper/btn-fill system | HTML/CSS | P-D |
| Button btn-fill system (row 20) | Shared RTL button: fill wipe + label swap, one physics everywhere | Component (CSS/GSAP) | P-D |
| Page transition (row 21) | Hairline sweep + clip-path transition between SPA routes | GSAP/Barba-style transition | P-F |
| Typography system (rows 22–23) | Arabic grotesk contract (e.g., IBM Plex Sans Arabic / Rubik, 3–4 weights) + mono for numerals; token layer w/ brand orange | Fonts + `:root` tokens | P-A |
| Mobile variant (row 24) | RTL mobile: problem list swipe (RTL Swiper), %-unit SVG assembly | Responsive recipes | P-F |

---

## §4 Gap tickets (Heron element ⇒ no Madarek counterpart today)

Numbered `INV-nn`; owner tag; each scoped ≤25 min for one agent.

| Ticket | Gap (Heron ref) | Owner | ≤25-min scope |
|---|---|---|---|
| INV-01 | Preloader: no loading moment exists in Madarek → build مدارك stroke-draw overlay + % counter, exit to hero timeline (row 1) | P-B | SVG path + dasharray CSS var + `.loaded` toggle; test exit at 2s |
| INV-02 | Paper background system: Madarek has no material tile / border frame → cream+grid SVG tiles + 4 edge strips + corner marks (rows 2–4, 23 tokens) | P-A | 2 tile SVGs (<50 KB) + `:root` vars + frame divs |
| INV-03 | Hero plan illustration is placeholder-grade → draft campus-plan line illustration 2060×1037 @2×, multiply blend (row 5) | P-C | Vector sketch → webp/avif + `mix-blend-mode:multiply` swap |
| INV-04 | Measuring layer: no crosshair/coordinate readout → 1px difference-blend lines + Arabic-Indic X/Y mono readout on hero (rows 6–7) | P-D | 2 divs + mousemove handler + mono label |
| INV-05 | Custom cursor absent → dot/crosshair cursor w/ hover thresholds (`data-cursor=hidden` passthrough) (row 8) | P-D | Canvas or transform-follow element + media(hover) guard |
| INV-06 | Pain icons ×4 line-set missing (manual grading / scattered records / blind spots / slow reports) (row 10) | P-E | 4 × 167px inline SVGs on grid |
| INV-07 | Journey assembly scrub: `#chapters` is static → 13-path SVG pre-transformed off-canvas, GSAP scrub to 0, stage cross-fades (rows 11–12) | P-F | Split map into 13 paths + scrub timeline; verify in twin harness |
| INV-08 | Product proof: only ONE tiny screenshot → capture student lecture+AI tutor + exam/grading dashboard @2880×1740, frame with SVG layer + imgCardReveal (row 13) | P-G | 2–3 captures + crop/export + reveal class |
| INV-09 | Before/after transformation pair absent (paper report vs dashboard) (row 14) | P-H | 2 frames + staggered 1.7s expo.out reveal |
| INV-10 | Role imagery: roles section has no persona cards → 4–8 cards 714×887 cross-fade + ruler ticks (row 15) | P-I | Pick/produce 4 cards + crossfade logic |
| INV-11 | CTA sketch (human hand-drawn closing note) missing (row 16) | P-C | 1 sketch 1704×952 + reveal |
| INV-12 | Footer signature: no giant wordmark/logo treatment → مدارك SVG stroke + parallax driver (row 17) | P-B | Wordmark SVG + reveal + parallax trigger |
| INV-13 | Button grammar: no shared fill-wipe/label-swap physics (row 20) | P-D | `.btn-fill` component + apply to 3 key CTAs |
| INV-14 | Page transition: hairline sweep + clip-path between routes missing (row 21) | P-F | `--mask-percent` vars + route hook; 0.8s phase |
| INV-15 | Mono instrument labels (coordinates, tickers, type-tags) absent (rows 6, 22) | P-E | Load mono font subset + 3 label instances |
| INV-16 | Corner registration marks / plus deco set missing (row 4) | P-E | Reusable plus-SVG component, 8 placements |
| INV-17 | Quality-mark rail (awwwards-equivalent slot) absent (row 18) | P-J | Static badge slot in frame, right edge |
| INV-18 | Cookie/consent bar not on the design system (row 19) | P-D | Rebuild Arabic consent bar on paper + btn-fill |
| INV-19 | Typography contract: no Arabic grotesk 3–4 weights + mono numerals decision locked (row 22) | P-A | Pick family, subset woff2, `:root` scale tokens |
| INV-20 | Mobile craft pass: RTL swipe problem list + %-unit SVG assembly variants (row 24) | P-F | Swiper RTL init + media-query overrides |

**Ticket count: 20.** Priority order by production-value leverage: INV-07 (centerpiece scrub) → INV-08 (product proof) → INV-01/INV-12 (brand moments) → INV-03 (hero illustration upgrade) → INV-02 (material system).
