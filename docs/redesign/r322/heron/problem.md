# Heron — `problem` (`home-problem`) in plain words (R322 package 1-c)

> Source: `problem-{1440,768,390}.json` + `media-inventory.json`. Rem on Heron's
> fluid root (8.33 / 9.21 / 9.92px). Text = counts only.

## The section in plain words

The four-pain-point band: **a head row (big title + side note) over a 4-column card
grid** — but the "cards" are not boxed cards: they are **open columns separated only
by the page's hairline grammar** (each column is a full-height cell with its own
1px top rule and meta row; no borders, no shadows, no fills). The whole section
starts with a 1px horizontal hairline at its top edge. Section height
**89.15rem @1440** (@768: 144.71rem — the grid wraps to 2×2 · @390: 87.65rem —
it becomes a swipe carousel).

1. **Head row** (`home-problem-head`, 22.96rem tall, pad **3.2/3.2/6.6/3.2rem**):
   - left **title-wrap 83.43rem**: a mono kicker label (1.4rem, 8ch, ink-72) above
     the **H2 display** (see below), left-aligned at the container edge;
   - right **sub note 39.62rem** (ink-72): one 1.6rem/500 body sentence,
     156ch / 3 lines @1440 (5L @768, 4L @390), aligned to the title's baseline area.
2. **Column grid** (`home-problem-list`, flex; **4 cells × 42.82rem** with 0.8rem
   gaps @1440). Every cell:
   - **meta row** (5.16rem, pad 1.6/3.2rem): a mono keyword left (~6–10ch, ink) and a
     **2-digit index right** (4ch, ghost gray), pushed apart by big justified margins
     (12.3–14.9rem); a **brand-red dot 0.8rem** absolutely positioned at the row's
     left edge, `opacity 0` until hover/reveal; under it a 1px dashed hairline;
   - **art zone 42.82×36.01rem**: a **centered inline SVG illustration 20×20rem**
     (viewBox ~200×200, 12–17 paths — technical drawings), `will-change: opacity`;
   - **content block** (pad 3.2rem): an **H5 item title 2.8rem / w600 / lh1 /
     uppercase, 20–32ch / 3 lines** (this is body-scale, not display) + a
     **1.6rem / w400 / lh1.3 body** of 88–106ch / 2–3 lines, ink-72, pad-top 1.6rem.

## Display type — where it sits and its measured size

**H2 in the head row** (`h2.heading.h2.tb-h3`), BT Grotesk, ink, uppercase:

| bp | size | weight | leading | tracking | length |
|---|---|---|---|---|---|
| 1440 | **4.8rem** (40px) | 600 | 1 | −0.02em | 53ch / 2 lines |
| 768 | 4rem (36.83px) | 600 | 1 | −0.02em | 53ch / 2 lines |
| 390 | 3.2rem (31.76px) | 600 | 1 | −0.02em | 53ch / 2 lines |

## Full type ladder (@1440)

| rung | font | size | weight | leading | notes |
|---|---|---|---|---|---|
| display | BT Grotesk | 4.8rem | 600 | 1 | the H2, ink, uppercase |
| item-title | BT Grotesk | 2.8rem | 600 | 1 | uppercase, 3L — reads as "card headline" |
| body-strong | BT Grotesk | 1.6rem | 500 | 1.3 | head sub note, 156ch |
| body | BT Grotesk | 1.6rem | 400 | 1.3 | item bodies, 88–106ch, ink-72 |
| label | Geist Mono | 1.4rem | 500 | 1.4 | uppercase ×9 (kicker, keywords, indexes) |

## Spacing (measured @1440)

- head pad **3.2 / 3.2 / 6.6 / 3.2rem**; title-wrap 83.43rem; sub 39.62rem, margin-top 3.2rem
- columns **42.82rem** ×4, gap 0.8rem; meta row pad 1.6/3.2rem; content pad 3.2rem
- art zone 36.01rem tall; art 20×20rem centered
- spacing histogram: 1.6(×13) · 2.4(×8) · 3.21(×28) · 6.6 · 12.33–14.85 (justified meta margins)

## Material

Paper texture only; 1px hairlines (solid top rules, dashed under meta rows)
rgb(179,179,175); ink / ink-72 text; **brand red** confined to the 0.8rem hover dots
and (elsewhere on the page) button fills. No card backgrounds — the grid reads as
scribed columns on the same paper.

## What changes across captured scroll states + triggers

Captured states: entering(844) / centered(1530) / leaving(2217) @1440. Two
ScrollTriggers (measured @1440 → @768 → @390):

| trigger | start | anim | measured |
|---|---|---|---|
| `home-problem-head` | `top+=65% bottom` | 3 tweens autoAlpha+yPercent, power2.out, 0.8/1.34/0.98s | 846→1800 · 711→1819 · 1076→2027 |
| `home-problem-content` | `top+=55% bottom` | 6 tweens: items autoAlpha+yPercent 0.8/0.88/1.16s + **item-img scale+autoAlpha expo.out 1.6s** | 1217→2352 · 1388→2869 · 1484→2545 |

(The `home-problem-wrap` wrapper has the usual `clamp(top bottom+=50%)` class-toggle
trigger. The **scale reveal on the drawings** (expo.out 1.6s) is the signature move —
art pops from ~0.9→1 with fade while the text blocks rise.)

## Media inventory

| asset | intrinsic | rendered @1440 | role |
|---|---|---|---|
| 4 inline SVG drawings | viewBox 200×200 (one 188×188) | **20×20rem** centered | figure → our own 4 drawings, same box |
| dashed hairline tiles | svg bg | 42.82×0.12rem | rebuild as CSS dashed borders |
| red dots ×4 | — | 0.8×0.8rem | accent, op 0 → hover |

(@768/390 the four SVGs render **16.5×16.5rem**.)

## Breakpoint comparison

| | 1440 | 768 | 390 |
|---|---|---|---|
| section | 171.27×89.15rem | 81.79×144.71rem | 37.71×87.65rem |
| grid | **4 columns** 42.82rem | **2×2** (40.9rem cells) | **Swiper**: 4 slides 31.45×47.98rem, track 125.7rem |
| display H2 | 4.8rem lh1 | 4rem lh1 | 3.2rem lh1 |
| item-title | 2.8rem lh1 | 2.4rem lh1.2 | 2rem lh1.2 |
| art | 20×20rem | 16.5×16.5rem | 16.5×16.5rem |
| pagination | — | — | dots 2.02×0.2rem, gap 0.4rem, 20rem row, 1st active |
| sub note | 156ch/3L | 156ch/5L | 156ch/4L |

## Transplant notes (the 5 numbers that matter)

1. **4 open columns 42.82rem wide, 0.8rem gaps** (2×2 @768; swipe carousel @390 with 2.02×0.2rem dots).
2. **H2 4.8rem / w600 / lh1 / 53ch 2L** with mono kicker (1.4rem, 8ch) above, sub note 39.62rem right.
3. **Art: 20×20rem SVG centered in a 36.01rem-tall zone**, scale+fade reveal (expo.out 1.6s).
4. **Meta row recipe: mono keyword + 2-digit ghost index, justified, 1px dashed rule under, red dot 0.8rem on hover.**
5. **Head pad 3.2/3.2/6.6/3.2rem; content pad 3.2rem; item-title 2.8rem 3L + body 1.6rem 88–106ch.**

## Gaps / flags

- The 390 Swiper params (slide duration, drag elasticity) not captured — geometry only.
- Hover states (red dot reveal, index color swap) inferred from `op:0` + class
  structure; not driven in the capture (no synthetic hover).
