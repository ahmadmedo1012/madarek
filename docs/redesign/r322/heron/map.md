# Heron — `map` (`home-map`) in plain words (R322 cycle C3, package 3-a)

> Source: `map-{1440,768,390}.json` + `map-scroll-spec.json` (one polite visit per bp,
> the `heron-map-extract.mjs` harness). Rem on Heron's fluid root (8.33 / 9.21 / 9.92px).
> Text = counts + non-reversible fingerprints only (never copied). Evidence:
> `audits/evidence/r322/heron/map-<bp>-<n>-<slug>.jpg` (18 shots, q70, 972KB total).

## The section in plain words

The fourth section is the **plan scroll-story** — the longest act of the page: an
architectural drawing of the building that **draws itself in** as you scroll, while
two display statements and a progress card narrate it. Section height **6300px @1440
(756.3rem — exactly the expected ≈6300)** · 5473px (594.3rem) @768 · 4819px (485.8rem)
@390 — **51% / 43.5% / 42% of the whole document**. Top edge @1440 = 2351.77 (right
after `home-problem`), width 1426.69 (171.27rem), 1-column grid, no side padding —
the section IS the full container width.

Structure (depth ≤6, @1440):

```
section.home-map (1426.69 × 6300)
└─ .home-map-main (relative)
   └─ .w-layout-blockcontainer.container.full-h
      └─ .home-map-inner            ← THE STICKY FRAME (position:sticky top:0,
         │                             1426.69 × 886.66 ≈ 100vh − page frame; flex, 2 kids)
         ├─ .home-map-main-stick     ← the PLAN COLUMN (full 1427 → narrows to 963 on .expanded)
         │  └─ .home-map-main-stick-inner
         │     ├─ .bg-border         (10px-inset hairline box, 1407×867)
         │     └─ .home-map-main-inner   ← THE PLAN STACK (1-col grid, 962.95 × 853.34)
         │        ├─ 6 × .home-map-main-img-inner   (scrub-opacity layers — see media)
         │        ├─ 2 × .home-intel-inner          (the statement cards, static grid cells)
         │        └─ 3 × .home-map-main-img-sub-hover (hover cards, opacity 0, z2)
         └─ .home-map-content-wrap   ← the CLOSING COLUMN (flex, w 0 → 464 on .expanded)
            └─ .home-map-content     (label-wrap 464×62 · title-wrap 464×612 · cms 464×213)
+ .home-map-intro                    (absolute, bottom-left of the frame — the INTRODUCTION card)
+ .line.line-vertical.right          (1px hairline on the frame's right edge, 887 tall)
```

## Composition mechanics — THE verdict (how it holds with ZERO pins)

**One CSS sticky element, nothing else.** Position census over the whole map subtree
@1440: **171 static · 26 relative · 34 absolute · 1 sticky · 0 fixed** — the single
sticky is `.home-map-inner` (`top: 0`, no z-index). The 22-position composition probe
(1452→8472, ~333px steps) proves it: the frame's viewport-y **holds at 7px** (the page
frame's inset) from scroll 2455→7469 — **5348px of measured lock** (theory:
6300 − 887 = 5413) — then releases and rides up 1:1 for the last ~1500px
(avgRatio −0.23 = −1568/7016). Every tracked child (plan stack, 6 layers, both cards,
intro card, closing column, counters, media) locks with it — **lockedScrollPx
5348–6351, transform spread 0 while locked** for all of them except `.home-map-main-inner`
(entrance drift, below). No GSAP pins (`pin: null` on all 41 triggers), no fixed
elements, no transform-compensated fake pins. What moves *inside* the frozen frame is
pure scrub: opacity crossfades + the card in/out tweens.

**@768/@390 the sticky moves one level deeper** — `.home-map-inner` becomes a plain
full-height flex block (5473/4819px) and the sticky is `.home-map-main-stick-inner`
(`top:0`), inside the plan column `.home-map-main-stick`, which is itself **5120px
@768 / 4220px @390 tall** — the column becomes the scroll track; the sticky window
holds the plan viewport (753×972 @768 · 374×788 @390) while the column scrolls past
(main-inner locked 3895px @768 / 3140px @390). The closing column is **stacked BELOW
the column** (full width, last ~346px @768 / ~591px @390 of the section) instead of
the desktop side-by-side flip — it scrolls into view naturally.

**The `.expanded` two-state layout (@1440):** near the scrub end the section gains
class `expanded` (probe: flip lands between 7469→8472; on reverse-scroll it STAYS
flipped — direction-sensitive; the harness records `loadState` vs `resetState`
apart): the plan column narrows **1427→963px** and the closing column opens
**0→464px** — a *width* animation, not a transform. @768/390 the class still toggles
(last ~4 probe positions) but the stacked layout makes it a visual no-op.

**Entrance drift:** `.home-map-main-inner` (the WHOLE plan stack — layers + cards
inside) starts translated **−886.7px @1440** (≈ one viewport up; the stack's natural
seat is map top + 23px) and scrubs to 0 over 1465→2352 (the 0.5s `y` tween); @768
the drift is **−5473.3px** (1860→2869 — the whole column height, a fast
curtain-drop); @390 the entrance trigger exists but its animation is **EMPTY** — no
drift on phone, the plan scrolls in plainly.

## The 6 states (semantic picks — cues measured, not guessed)

| state | @1440 | @768 | @390 | what changes (verified cues) |
|---|---|---|---|---|
| 01-statement | 2455 | 3044 | 2747 | card1 fully ON (op 1, 20-char h1 statement) over the settled paper; sticky engaged; scrub ≈ 9% |
| 02-plan | 3458 | 3793 | 3402 | card1 OUT, card2 arriving (op 0.12) — the pure-paper beat is transient (this pick = interpolated fallback; no stable plateau exists) |
| 03-card | 4461 | 4542 | 4056 | the INTRODUCTION card `active` + item1 ON (141 chars); scrub ≈ 46% |
| 04-findings | 5798 | 5441 | 4579 | plan **layer1 ON** (the drawing begins), intro item1 gone — items rotate one-at-a-time |
| 05-room | 7469 | 6939 | 5887 | **all 6 layers ON** — the finished plan; orange = 0.5% of frame (a bounded room highlight, NOT a full-bleed phase) |
| 06-closing | 8472 | 8138 | 7195 | sticky **released** (frame rides up −700px), `.expanded`: plan 1427→963 + column 0→464 @1440 (stacked column scrolls in @768/390); orange rises to 1.7% / 1.9% / 3.9% |

State evidence: `map-<bp>-<n>-<slug>.jpg` + per-state JSON (`probe` = 40+ tracked
elements with rect/opacity/transform at that scroll; `cues` = the verified narrative
mapping; `watch` = the layout classes; `diffVsPrev` = node-level diff).

## Key transplant numbers

| | 1440 | 768 | 390 |
|---|---|---|---|
| root font | 8.33px | 9.21px | 9.92px |
| section top / height | 2351.77 / **6300** (756.3rem) | 2869.02 / 5473.31 (594.3rem) | 2544.83 / 4819.39 (485.8rem) |
| sticky element | `.home-map-inner` 1426.69×886.66 | `.home-map-main-stick-inner` (col 5120 tall) | same (col 4220 tall) |
| sticky window / lock | 886.66 tall · locked 5348px | 972 tall · locked 3895px | 788 tall · locked 3140px |
| plan stack (main-inner) | 962.95×853.34 (115.6×102.44rem) | 753.28×972.45 (81.79×105.59rem) | 374.13×689.19 (37.71×69.47rem) |
| plan layers | 4 img + 2 svg, ONE box, contain | same | same |
| intel cards | 115.6×102.44 + 120.22×106.54rem | 81.79×105.59 + 85.06×109.81rem | 37.71×79.48 + 39.22×82.66rem |
| card h1 (×2) | 5.6rem w700 ls−0.93, 1 line | 4.8rem w700 ls−0.88 | 4rem w700 ls−0.79, **2 lines** |
| closing h2 | 4.8rem w600 ls−0.8, 3 lines | 3.2rem w600 ls−0.59 | 3.2rem w600 ls−0.64 |
| closing column | 0→464px (55.7rem) beside plan | stacked below, ~346px | stacked below, ~591px |
| intro card | 28.01rem wide · 165px w/ item · 61px collapsed | 27.99rem · 182 · 68 | 28.01rem · 191 · 73 |
| intro card insets | abs. left/bottom 3.2rem, 1px hairline | 3.2rem | 3.2rem |
| intro items | 5 × 1.6rem — 141/135/176/176/20 chars | same | same |
| hover cards | 3 × 23.51rem (8.76/6.68/8.76rem tall), abs z2, op 0 | same family | same family |
| mono furniture | 1.2rem + 1.4rem Geist Mono up | same | same |
| entrance drift | −886.7px → 0 | −5473.3px → 0 | none (empty tween) |

## Type ladder (@1440)

| rung | font | size | weight | leading | notes |
|---|---|---|---|---|---|
| display-1 | BT Grotesk | 5.6rem (46.67px) | 700 | 1 | ls −0.93, uppercase, 20 chars × 2 (the statement cards) |
| display-2 | BT Grotesk | 4.8rem (40px) | 600 | 1 | ls −0.8, uppercase, 35 chars, 3 lines (closing column) |
| body | BT Grotesk | 1.6rem (13.33px) | 500 | 1.3 | ls −0.27 × 9 nodes, 565 chars (intro items + column copy) |
| meta | BT Grotesk | 1.4rem (11.67px) | 500 | 1.4 | ls −0.23 × 3, 427 chars |
| label | Geist Mono | 1.2rem (10px) | 500 | 1.3 | uppercase × 7, 115 chars (counters, room labels) |
| label-2 | Geist Mono | 1.4rem (11.67px) | 500 | 1.4 | uppercase × 3, 74 chars |

Mono label rows sit in 173.83px (20.86rem) 1-col grids; the [nn/05]-style counters
never change text during the story (static rows — progression is opacity-only).

## Grid, spacing, colors, material

- **Grid:** the section's only grid is 1 full-width column (1426.69px); the plan stack
  is a 1-col grid (962.95px) whose cells host the layers AND both intel cards; @390 a
  2-col 187.06×2 grid appears (stacked phone furniture).
- **Spacing histogram @1440:** 0.4 · 0.8 · **1.2 (×33) · 1.6 (×22)** · 2 · 2.4 ·
  **3.21 (×14)** · 39.84rem (the one big offset — the closing column's h2 top
  margin: the statement sits 39.84rem below the column's label chip).
- **Colors:** ink `rgb(40,40,40)` (×10) + ink-72 `rgba(40,40,40,.72)` (×6) · ghost
  `rgb(180,180,176)` (×5) · **brand red `rgb(250,54,0)`** — 12× 1px borders (the
  room-number chips) + 3 text nodes · paper `rgb(255,255,238)` page ground · chip bg
  `rgb(179,179,175)` ×11 + one dark chip `rgb(40,40,40)` (the INTRODUCTION head).
- **Material:** `bg-global` paper on the cards; hairlines are tiny background SVGs —
  `bg-border-grid.svg` 164.87×0.8rem (×2 horizontal) + `bg-border.svg` 0.8×100.04rem
  (×2 vertical) behind the plan — rebuild as CSS borders (family note).

## Media inventory (src = last path segment only; nothing downloaded)

| asset | intrinsic | rendered @1440 | role |
|---|---|---|---|
| `…c77_kk.png` | 1734×1676 | 962.95×853.34 contain | plan layer (base drawing) |
| `…c29_ll.png` | 2312×2234 | same box | plan layer (line work) |
| `…c84_fff.png` | 2312×2234 | same box | plan layer (the fills — carries the orange room) |
| `…c5e_Dimensions.png` | 2312×2234 | same box | plan layer (dimension lines) |
| svg `.home-map-img-svg.filter` | vb 1156×1117 | same box | texture/filter overlay (13 paths) |
| svg (masked) | vb 1156×1117 | same box | room highlights — 3 mask + 16 path + 12 g (the 6 scrubbed paths) |
| svg ×4 (10×10, vb 12) | — | 10×10 | icons (2 paths each) |
| svg ×2 (26.66, vb 32) | — | 3.2×3.2rem | icons |
| `…89428f_bg.svg` | — | 195.83×72.95 / ×55.64 | the 3 hover-card chromes |
| `…c93_bg-border-grid.svg` / `…c91_bg-border.svg` | — | 164.87×0.8 / 0.8×100.04rem | hairline furniture |

Orange, pixel-verified on the evidence JPEGs: **0.3–0.5% of the frame through states
1–5** (a bounded room-sized fill on the drawing + a small persistent orange furniture
spot on the right rail; bottom-left + right rail @390), rising to **1.7% / 1.9% /
3.9% at the closing** (a concentrated ~240×110px solid-orange block at x≈440–680,
y≈230–345 @1440 + the red room-number furniture). The 9 orange-filled SVG shapes the
census found never exceed opacity 0 in the probe — the visible orange is raster layer
content + red furniture, not animated fills.

## Headlines — how many, where, for how long

**3 distinct headlines, each exactly ONE static text** (djb2 fingerprints constant
across all 22 probe positions — no swapping):

| headline | text | visible @1440 | @768 | @390 |
|---|---|---|---|---|
| card1 h1 | 20 chars | 2121→3123 | 3044→3343 | 2224→3009 |
| card2 h1 | 20 chars | 3458→4795 | 3943→4542 | 3271→4056 |
| closing h2 | 35 chars, 3 lines | 2121→8138 per opacity — **but clipped by the 0-width content-wrap until the `.expanded` flip; truly visible only ≈7500→8138** | 7239→8138 | 6149→6933 |

**ONE statement per state — verified:** states 1/2 each show exactly one card
statement (card1, then card2); states 3–5 show none (the intro card + plan carry the
story); state 6 shows the closing h2. The intro-card head is a 12-char label, not a
headline.

## The map ScrollTrigger table (3 of the 41 triggers @1440)

| trigger | start → end | scrub | measured @1440 → @768 → @390 | drives |
|---|---|---|---|---|
| `home-map-wrap` | `clamp(top bottom+=50%)` → `bottom top-=50%` | — (play) | 1021→9095 · 1356→8847 · 1303→7778 | class toggle only — the `.expanded` flip near the end (no tweens) |
| `home-map-wrap` | `top bottom` → `top top` | **true** | 1465→2352 · 1860→2869 · 1717→2545 | `y: 0` on `.home-map-main-inner`, 0.5s — the entrance drift (**empty animation @390**) |
| `home-map-wrap` | `top 50%` → `bottom-=270 bottom` @1440 / `bottom-=307.2 bottom` @768 / **`bottom-=1519.2 top`** @390 | **true** | **1908→7495 · 2365→7026 · 2131→5845** | the 5.52s map sequence (11 tweens below) |

The 5.52s sequence timeline (all eases power2.out — sampled 0.44/0.75/0.94 at
t=0.25/0.5/0.75; scroll @1440 = 1908 + t/5.52 × 5587, i.e. **≈506px of scroll per
0.5s step**):

| t | scroll @1440 | tween | targets → values |
|---|---|---|---|
| 0.00–0.50s | 1908–2413 | card1 IN | `.home-intel-inner` autoAlpha→1, y→0, scale→1 (fade-in + settle — the −887px entrance offset belongs to the whole stack, not the card) |
| 1.00–1.50s | 2917–3421 | card1 OUT | autoAlpha→0, y→−2.5px, scale→0.96 (fade + 4% shrink) |
| 1.50–2.00s | 3421–3926 | card2 IN | same recipe |
| 2.50–3.00s | 4430–4934 | card2 OUT + **layer1** + paths | card2 out · `.home-map-main-img-inner` opacity→1 · **6 svg paths** scale→1, opacity→1, x→0, y→0 (0.52s — the room-highlight outlines) |
| 3.02 / 3.52 / 4.02 / 4.52 / 5.02–5.52s | 4982→7495 | layers 2–6 | `.home-map-main-img-inner` opacity→1, 0.5s each, 0.5s stagger (≈506px/layer @1440) |

Plain words: the entrance scrub slides the WHOLE plan stack down into the sticky
frame (−887px @1440 — one viewport of descent, the cards ride inside it); the
sequence scrub then runs a fixed 11-tween movie — statement card 1 in/out, statement
card 2 in/out (each: fade + 2.5px rise + 4% scale-shrink), then six drawing layers
fade in one every half-second (the plan drawing itself), with the room-highlight
paths scaling in alongside the first layer (each 0.5s step ≈ 506px of scroll
@1440). The intro card's 5 findings rotate in step with the layers (one visible at
a time), then the card collapses to its head. At scrub end the wrapper class flips
`.expanded`, which at desktop swaps 464px of plan width for the closing column.

## Lenis observables

Wrapper `div.main-inner.lenis` (classList observed `main-inner lenis
[lenis-scrolling] [lenis-stopped]` — the stopped state sampled at capture end);
computed `overflow: hidden`, `scroll-behavior: auto`; **instance not exposed**
(`window.lenis` / `window.__lenis` absent; globals matched: `Lenis`, `lenisVersion`;
no `data-lenis-*` attributes; options unreachable — family gap, use the 1-c empirical
lerp 0.056 desktop / 0.08–0.09 touch).

## Provenance cross-checks

- docH 12355 / 12577 / 11441 — **exact match** with the 1-c board (0% Δ).
- Map height 6300 @1440 — exactly the expected ≈6300.
- The 1-c scroll-spec gap "map pair absent or merged @390" is **closed**: the sequence
  trigger exists @390 (2131→5845, end anchor `bottom-=1519.2 top`) — the earlier pass
  had errored trigger reads.
- Every scroll action drove `.main-inner` (the window never scrolled); 3 visits total,
  sequential, 15s gaps; consent banner geometry recorded, one Escape press, never
  clicked; loader auto-dismissed (timeline in each JSON).

## Transplant notes (the 5 numbers that matter)

1. **ONE sticky frame** (`top:0`, ~100vh minus the page frame) inside a
   6300/5473/4819px section — pinless by construction; at ≤768 move the sticky to the
   plan column and stack the closing column below it.
2. **The 6-layer crossfade stack** in ONE box (115.6×102.44rem @1440): opacity-only,
   0.5s per layer, 0.5s stagger, power2.out scrub, ≈506px of scroll per layer.
3. **Two 20-char statement cards** in/out over the plan (autoAlpha + scale 0.96 +
   −2.5px rise — they ride the stack's one-viewport descent), 5.6rem/4.8rem/4rem w700.
4. **The INTRODUCTION card**: 28rem wide, absolute bottom-left 3.2rem insets, 1px
   hairline, dark head chip + 12-char label, 5 findings of 135–176 chars @1.6rem —
   ONE at a time, bottom-anchored (grows upward), collapses to head-only at the end.
5. **The closing flip**: plan 1427→963 + column 0→464 (width animation, not
   transform), direction-sensitive class toggle at scrub end — plus the 3 hover cards
   (23.51rem, absolute z2) as desktop-only hover furniture.

## Gaps / flags

- **Hover cards not fired** (opacity 0 through the whole probe): the 3
  `.home-map-main-img-sub-hover` cards are hover-revealed; their show/hide lives in
  Webflow IX2 (unreachable — family gap). Geometry + chrome captured only.
- The per-state node walk is depth ≤6; the scrub-animated nodes (cards/layers at
  depth 7+) are tracked by the 40-element composition probe instead (per-state
  `probe` field) — `diffVsPrev` therefore only diffs the shallow furniture.
- The 02-plan "pure paper" beat has **no stable plateau** at any bp (card2 arrives as
  card1 leaves) — the state-2 pick is the recorded interpolated fallback.
- The `[nn/05]` counter rows never change text across states — the progression is
  opacity-only or IX2-driven (unreachable).
- Orange census: 9 orange-filled SVG shapes stay at opacity 0 — the visible orange is
  raster content + red furniture (pixel-verified above); the "solid-orange room" is a
  bounded highlight, not a full-bleed phase.
- The 390 entrance trigger carries an EMPTY animation (authoring choice, not a
  capture failure) — verified in both the pristine and post-scroll trigger passes.
