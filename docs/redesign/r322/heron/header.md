# Heron — `header` in plain words (R322 package 1-c)

> Source: `header-{1440,768,390}.json` + `media-inventory.json` (supplement) + header
> state shots `audits/evidence/r322/heron/header-<bp>-{top,scrolled-down,hidden-down,back-up}.jpg`.
> All rem on Heron's own fluid root (`rootFontSize`: 8.33px @1440 · 9.21px @768 · 9.92px @390).
> Text is recorded as counts/roles only — no Heron copy is reproduced here or in the JSONs.

## The section in plain words

A **fixed, full-container-width top bar** that lives *inside* the page frame: a hairline
rectangle inset 0.8rem from every viewport edge (`.main-deco`), and the header bar spans
the full width between the left and right hairlines, sitting flush under the top one.
The bar is one row tall — **6.76rem @1440 · 5.6rem @768 · 5rem @390** — closed by a
**1px bottom hairline** (rgb(179,179,175)) that doubles as the page's first rule.

Inside, a **12-column grid** (@1440/768; 4 columns @390) with the page gutter (2rem
desktop / 1.6rem @390) splits the row into two cells:

- **Left cell — logo zone** (~50% of the row @1440: 84.64rem): a two-part logo — an
  SVG **mark 3.8×4.36rem** (viewBox 34×39) + an SVG **wordmark 11.2×1.84rem**
  (viewBox 122×20), left-aligned at the container's left edge (pad-left 3.2rem,
  pad-y 1.2rem). Both are inline SVG (our rebuild uses the Madarek mark, same seats).
- **Right cell — menu zone** (85.64rem @1440): a flex row of **4 menu items**, each
  **16.41rem wide × full bar height**, mono-label style (see ladder), each carrying a
  219.98×2px (26.41×0.24rem) hover-underline SVG that is invisible until hover;
  followed by a **CTA block 20.01rem wide** separated from the menu by a 1px vertical
  hairline, full bar height, containing the `btn-fill` button (see below).

**The button pattern (`btn-fill`, reused site-wide):** a 2rem-tall stack of **two
identical mono labels** (`.label-top` / `.label-bot`) — on hover they vertically swap
(cycling marquee style); a **red fill layer** (`rgb(250,54,0)`, 408×102px ≈ 48.98×12.24rem,
`will-change: mask-position`) wipes in behind the label via an animated mask; a
**2×2rem arrow icon** (double-stacked, slides on hover). In the header the CTA label
color is the brand red on the paper background; in the hero the same pattern renders
red-on-paper at 17.11×11.65rem.

## Type ladder found (all `letter-spacing: -0.02em` everywhere)

| rung | font | size | weight | leading | transform | use |
|---|---|---|---|---|---|---|
| label | Geist Mono | **1.4rem** | 500 | 1.4 | uppercase | menu items, CTA label (×2), sub-labels |
| label-2 | Geist Mono | 1.2rem | 500 | 1.3 | uppercase | smaller meta (other sections) |
| body | BT Grotesk | 1.6rem | 400/500/600 | 1.3 | — | logo fallback link text (w500) |

## Spacing (measured, @1440 unless noted)

- bar height **6.76rem** (5.6rem @768, 5rem @390); pad-y inside items 1.2rem
- menu item width **16.41rem** ×4; CTA **20.01rem**; logo cell 84.64rem
- pad-left of first cell **3.2rem** (= half gutter+col rhythm, the "26.67px" seen sitewide)
- hairlines: bottom rule 1px rgb(179,179,175); CTA left rule 1px same color

## Material

- Background: **no solid paint** — the paper texture SVG (`…bg.svg`) as CSS
  background (`.bg-global`) on `.header-inner`, so the bar reads as the page
  continuing, not a floating card. Ink text rgb(40,40,40); secondary ink at 72%;
  hairlines rgb(179,179,175); brand red rgb(250,54,0) reserved for the CTA.
- z-index ~10000000 (above content, below cursor canvas & consent banner z≈100009).

## Media inventory (dims + roles)

- SVG logo mark 3.8×4.36rem — icon (replaced by our mark)
- SVG wordmark 11.2×1.84rem — figure (replaced by our wordmark)
- 4× hover-underline SVGs 26.41×0.24rem — figure
- 2× CTA arrow icons 2×2rem (viewBox 20×20) — icon
- 2× 5px status dots (viewBox 6–7) — icon (menu item markers)
- paper texture `…bg.svg` as CSS background on `.header-inner` — material layer

## What changes across scroll states (from `headerBehavior` + supplement states)

The outer `header.header` element **never moves** (fixed at the frame's top, opacity 1,
no transform at every sampled step). The state machine flips CSS classes on it:

- **`on-scroll`** — added at ~50–100px of scroller scrollTop (all 3 breakpoints);
  removed when back at ~0–50px.
- **`on-hide`** — observed **@1440 only**, on downward scroll (from ~50px down):
  the **inner bar `.header-inner` translates up by its own height**
  (`matrix(1,0,0,1,0,-56.86)` ≈ −6.83rem) sliding the whole row out of the frame;
  on the way up it transitions back (sampled mid-flight at −40.13px). Class removal
  happens between 50→350px on the slow up-drive — i.e. **direction-gated with
  hysteresis**, not a plain threshold.
- @768 / @390 **`on-hide` never fired** in two independent drives (50px steps @150ms,
  and 300→600→300 jumps) — either desktop-only or velocity-gated. **Gap flagged for
  the foreman**; the state shots `header-768-*.jpg` / `header-390-*.jpg` show the
  `on-scroll` state only.
- No ScrollTriggers target the header — the show/hide is standalone JS
  (not GSAP ScrollTrigger), listening to the Lenis scroller.

## Breakpoint comparison

| | 1440 | 768 | 390 |
|---|---|---|---|
| bar height | 6.76rem | 5.6rem | 5rem |
| grid | 12 cols (12.44rem) | 12 cols (4.99rem) | 4 cols (8.23rem) |
| gutter | 2rem | 2rem | 1.6rem |
| mono label | 1.4rem lh1.4 | 1.4rem lh1.4 | 1.4rem lh1.1 |
| menu cell | 16.41rem ×4 + CTA 20.01rem | items shrink w/ grid | menu collapses (burger — not captured, see gaps) |
| hide-on-scroll-down | yes (translateY −bar-height) | not observed | not observed |

## Transplant notes (the 5 numbers that matter)

1. **Bar height: 6.76rem @1440 → 5.6rem @768 → 5rem @390** (full-width, 1px bottom hairline).
2. **Logo cell ≈ 50% of the row; menu items 16.41rem each; CTA 20.01rem** with 1px left rule.
3. **Mono label rung 1.4rem / w500 / uppercase / lh1.4 / ls −0.02em** — every nav string sits on it.
4. **Hide threshold ≈ 50–100px down, hysteresis on the way up, hide = translateY(−bar height)** — direction-gated, not ScrollTrigger.
5. **Zero solid background — paper texture + hairlines only**; brand red only in the CTA label/fill.

## Gaps / flags for the foreman

- Mobile (≤768) **burger / open-menu state not captured** (the bar height hints the
  menu is icon-only at 390; the opened drawer geometry is unknown).
- `on-hide` at 768/390 not observed in either drive (may be desktop-only).
- The header has no header-specific evidence shots in the *main* run; the supplement
  added 4 states × 3 bps (`header-<bp>-{top,scrolled-down,hidden-down,back-up}.jpg`).
