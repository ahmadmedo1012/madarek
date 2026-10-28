# Heron — `hero` (`home-hero`) in plain words (R322 package 1-c)

> Source: `hero-{1440,768,390}.json` + `media-inventory.json` (supplement).
> Rem on Heron's fluid root (8.33px @1440 · 9.21px @768 · 9.92px @390). Text = counts only.

## The section in plain words

A **single full-viewport screen** (≈98% of the inner viewport height at every
breakpoint: 106.44rem @1440 · 109.58rem @768 · 83.48rem @390) with a **6.4rem top
padding** (@390: 4.4rem) so the fixed header band breathes over it. It is built as
**two stacked bands inside one 12-column grid** (@390: 4-column grid):

1. **The art band** (`home-hero-img-wrap`, 171.27×84.03rem @1440): a full-bleed
   technical-drawing canvas. Layers, back → front:
   - `.home-hero-img` — the paper texture (`bg-global` CSS background) with
     **3.2rem padding** all round;
   - the **hero illustration**: one `<img>` (intrinsic **2060×1037**, rendered
     **164.81×77.6rem** @1440, `object-fit: contain`, eager, alt present 109ch —
     never copied) shrunk to **77×72.14rem @768** and **34.5×39.06rem @390**;
   - 4 corner **grid tiles** (SVG background patterns, 164.87×0.8rem strips);
   - the **"ruler" overlay** (`home-hero-ruler`, 164.87×77.63rem, z3): a 2×2 grid of
     dashed measurement lines (1px dashed SVG tiles, opacity .64) + a few solid
     **brand-red marker lines** + two **mono overlay labels** sitting directly on the
     art (1.2rem @80% white + 1.4rem white, 10ch and 38ch/2L — status tags);
   - one red deco square **1.46rem** (op .87) — the accent dot.
   The ruler layers were measured at **opacity 0** post-loader (they are Webflow-IX2
   reveal targets — see *Gaps*).
2. **The content band** (`home-hero-content.grid`, 171.27×**16.01rem** @1440, closed
   by 1px hairlines top and bottom): the 12-col grid with **title-wrap spanning the
   left ~7 columns (99.07rem)** and **sub-wrap the right ~5 (72.2rem)**, separated by
   a 1px vertical hairline:
   - **title cell** (pad 2.4rem y / 3.2rem x): the H1 — see display type below.
   - **sub cell**: a flex row = paragraph block (55.09rem wide, pad 1.6rem) +
     **CTA button 17.11×11.65rem** flush right (the `btn-fill` pattern: stacked twin
     mono labels + red mask-fill layer + 2×2rem arrow icon; label color brand red);
     below them a **marquee strip** (`home-hero-work`, 72.2×4.36rem): 5 copies of a
     mono-label + arrow-icon loop (17/14/13ch items, gap 1.6rem), infinitely
     translating left (`.marquee-left.anim`, measured mid-frame at translateX −14.7px).

## Display type — where it sits and its measured size

**H1 in the title cell** (`h1.heading.h1.tb-h3`), BT Grotesk:

| bp | size | weight | leading | tracking | case | length |
|---|---|---|---|---|---|---|
| 1440 | **5.6rem** (46.67px) | **700** | 1 | −0.02em | uppercase | 47ch / 2 lines |
| 768 | 4rem (36.83px) | 600 | 1 | −0.02em | uppercase | 47ch / 2 lines |
| 390 | 3.2rem (31.76px) | 600 | 1 | −0.02em | uppercase | 47ch / 2 lines |

(The 5.6rem @1440 is exactly the dsys package's `--fs-d1` clamp ceiling — confirmed
independent measurement.)

## Full type ladder in this section (@1440)

| rung | font | size | weight | leading | notes |
|---|---|---|---|---|---|
| display | BT Grotesk | 5.6rem | 700 | 1 | uppercase, ink, the H1 |
| body | BT Grotesk | 1.6rem | 400 | 1.3 | 165ch/4L paragraph, ink |
| body-link | BT Grotesk | 1.6rem | 600 | 1.3 | 15ch inline link inside paragraph |
| label | Geist Mono | 1.4rem | 500 | 1.4 | uppercase ×19 (marquee, btn, overlay tags) |
| label-2 | Geist Mono | 1.2rem | 500 | 1.3 | uppercase ×2 @op .8 (art overlay code) |

## Spacing values (measured, @1440; ÷root for other bps)

- section pad-top **6.4rem**; art band height **84.03rem**; content band **16.01rem**
- grid: 12 cols ×12.44rem, **gutter 2rem** (row-gap 0)
- title cell pad **2.4rem y · 3.2rem x**; sub paragraph pad **1.6rem** all sides
- marquee item gap **1.6rem**; btn-fill internal pads 1.2rem/0.4rem
- spacing histogram (px→rem @1440): 3.3→0.4 · 5→0.6 · 10→1.2 · 13.3→1.6 · 16.7→2 ·
  20→2.4 · 26.7→3.21 · 40→4.8 · 53.3→6.4

## Material

Paper texture background (`bg.svg` CSS bg) everywhere; hairlines 1px rgb(179,179,175);
ink rgb(40,40,40) / ink-72 for secondary; **brand red rgb(250,54,0)** only as: deco
square, ruler marker lines, CTA label/fill. Overlay labels on art are white (art is dark).

## What changes across captured scroll states

`scrollStates` = initial(0) / centered(443) / leaving(798) @1440 — sampled to depth 3:
**no transforms or opacity changes on any structural node**. The hero has **zero
ScrollTriggers** of its own; all motion is (a) the entrance (loader → IX2 reveal of
the ruler lines / title), and (b) the always-running marquee. The evidence shots
`hero-<bp>-{initial,centered,leaving}.jpg` show the same composition at all three.

## Media inventory (dims + roles)

| asset | intrinsic | rendered @1440 | role |
|---|---|---|---|
| hero illustration `<img>` | 2060×1037 | 164.81×77.6rem (contain) | illustration (replace w/ our artwork, same box) |
| ruler dashed tiles | svg bg tiles | 164.87×0.12rem strips | figure (rebuild as CSS borders) |
| corner grid tiles | svg bg | 164.87×0.8rem | figure |
| red deco square | — | 1.46×1.46rem | accent |
| marquee arrows | svg 1.6×1.6rem ×~10 | icon |
| btn arrow icons | svg 2×2rem ×2 | icon |
| paper texture | `…bg.svg` CSS bg | material layer |

## Breakpoint comparison

| | 1440 | 768 | 390 |
|---|---|---|---|
| section height | 106.44rem (98.5vh) | 109.58rem (98.6vh) | 83.48rem (98.1vh) |
| art band | 171.27×84.03rem | 81.79×78.2rem | 37.71×42.25rem |
| illustration | 164.81×77.6rem | 77×72.14rem | 34.5×39.06rem |
| grid | 12 cols, gutter 2rem | 12 cols (4.99rem), gutter 2rem | **4 cols (8.23rem), gutter 1.6rem** |
| content band | title(7cols)+sub(5cols) side-by-side, 16.01rem | title(6cols)+sub(6cols), 26.3rem | **stacked**: title full-w 12.8rem, sub below 24rem |
| display | 5.6rem w700 | 4rem w600 | 3.2rem w600 |
| body | 1.6rem | 1.6rem | 1.6rem (144ch/— across more nodes) |
| CTA | 17.11×11.65rem right-flush | in sub cell | **full-width 37.71×6.45rem** |

## Transplant notes (the 5 numbers that matter)

1. **Two-band anatomy: art band 84.03rem + content band 16.01rem** (@1440; art eats ~84% of the screen).
2. **Display H1 5.6rem / w700 / lh1 / −0.02em / 47ch over 2 lines** — RTL-mirrored, same seat (left cell cols 1–7).
3. **Grid: 12 cols, gutter 2rem, container = viewport − 1.6rem frame (171.27rem)** — matches the dsys provisional `--grid-gutter: 1.5rem` within 0.5rem; re-pin to 2rem.
4. **Illustration box 164.81×77.6rem, object-fit contain** — our artwork must hit this aspect (~2.13:1) to keep the ruler overlay aligned.
5. **Content band split 99.07rem title / 72.2rem sub with 1px divider; CTA 17.11×11.65rem**; marquee 4.36rem strip below.

## Gaps / flags for the foreman

- **Entrance animation is Webflow IX2, not captured**: the loader dismisses (~5.5–6s)
  then IX2 reveals the ruler lines (measured `op:0` post-loader). No IX2 API was
  reachable (`Webflow.require('ix2')` falsy), and the hero has no ScrollTriggers —
  so the reveal's timing/easing is unknown. Recommendation: rebuild as a modest
  staged fade-in (ruler dashes ~0.8s, title rise, art scale 1.02→1) and review
  against `hero-1440-initial.jpg`.
- The marquee's exact period/velocity was not timed (transform sampled mid-loop only).
- Hero `<img>` alt is 109ch — presence recorded, content never read.
