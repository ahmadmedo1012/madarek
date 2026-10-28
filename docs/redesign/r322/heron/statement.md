# Heron — `statement` (`home-intro`) in plain words (R322 package 1-c)

> Source: `statement-{1440,768,390}.json` + `media-inventory.json`. Rem on Heron's
> fluid root (8.33 / 9.21 / 9.92px). Text = counts only (127 single characters, never copied).

## The section in plain words

The manifesto band right after the hero: **a 6+6 split of the 12-column grid** (a
square art cell on the left, a text cell on the right), then **a full-width partner
strip** pinned to the section's bottom. Section height **86.73rem @1440**
(@768: 57.22rem · @390: 85.41rem — at 390 the cells stack vertically).

1. **Left cell — the ink illustration** (`home-intro-img-wrap`, 85.64×86.73rem @1440,
   square-ish): an `ink-mask` stack — a **main `<img>`** (intrinsic **1766×1766**
   avif, `object-fit: contain`, no alt) + a **sub layer with an ink filter** + an
   SVG overlay (3 children) that masks/reveals the drawing. At 768/390 the cell is a
   perfect square (**40.9rem / 37.7rem**).
2. **Right cell — the statement** (`home-intro-body`, 85.64rem wide, opened by a
   **1px vertical hairline** on its left edge; content pad **6.4rem top · 15rem
   sides · 3.2rem bottom**): contains **only two things** — no paragraph:
   - the giant statement title (see display type below), and
   - a single **CTA button 16.34×5rem** (`home-intro-btn`, 1px hairline border,
     `btn-fill` twin-label mono pattern, brand-red label) sitting directly under
     the title (margin-top 3.2rem).
3. **Partner strip** (full container width, 19.06rem tall @1440): a label row
   (mono 1.4rem, hairlines top+bottom, **pagination ctrl arrows** at right) above a
   **Swiper logo track** — 8 partner logos as `<img>` (≈11.2rem wide each, lazy PNGs)
   scrolling horizontally — and under it a **desc strip** (mono 1.2rem, 95ch, one
   line @1440/768, two lines @390) closed by a top hairline.

## Display type — the char-split scrubbed statement

`h2.heading.h3.tb-h6` — **split by JS into 127 single-character `<div>`s** (each
`display:inline-block`, so every glyph is individually scrubbable):

| bp | size | weight | leading | tracking | case | chars | initial color |
|---|---|---|---|---|---|---|---|
| 1440 | **4rem** (33.33px) | 600 | 1 | −0.02em | uppercase | 127 (≈8 lines × 16) | **ghost rgb(179,179,175)** |
| 768 | 2.4rem (22.1px) | 600 | 1.2 | −0.02em | uppercase | 127 | ghost |
| 390 | 2.4rem (23.82px) | 600 | 1.1 | −0.02em | uppercase | 127 | ghost |

The scrub trigger (below) tweens **`color` per character** ghost → ink
(rgb(40,40,40)) as the user scrolls — the section's signature move.

## Full type ladder (@1440)

| rung | font | size | weight | leading | notes |
|---|---|---|---|---|---|
| display | BT Grotesk | 4rem | 600 | 1 | 127 × 1ch divs, uppercase, ghost→ink scrub |
| label | Geist Mono | 1.4rem | 500 | 1.4 | uppercase ×3 (partner label, btn, ctrls) |
| label-2 | Geist Mono | 1.2rem | 500 | 1.3 | uppercase ×1 (desc strip, 95ch, ink-72) |

## Spacing (measured @1440)

- right-cell content pad **6.4 / 15 / 3.2 / 15rem** (t/r/b/l — the 15rem side pads
  are the widest on the page and give the statement its isolation)
- title margin-bottom **3.2rem**; btn 16.34×5rem; partner label row 4.5rem;
  partner track 11.4rem; desc strip pad 0.8/3.2rem
- spacing histogram: 0.8 · 1.25(×24) · 1.4 · 1.6 · 2 · 3.21(×5) · 6.4 · **15.01rem**

## Material

Paper texture on the art cell (`bg-global`); 1px hairlines rgb(179,179,175) frame the
partner strip and the right cell's left edge; ink + ink-72 text; **brand red** only in
the CTA label; the statement itself is the only "ghost" gray type on the page
(pre-scrub state).

## What changes across captured scroll states + triggers

Captured states: entering(122) / centered(798) / leaving(1474) @1440. Three
ScrollTriggers own this section (measured @1440 → @768 → @390):

| trigger | start | end | scrub | measured range | anim |
|---|---|---|---|---|---|
| `home-intro-content-title` | `center bottom+=10%` | `center top+=40%` | **true** | 98→718 · 14→721 · 420→1000 | 4.28s timeline, per-char **color** tween, power-out ease |
| `home-intro-body` | `top+=45% bottom` | — | play | 253→1450 · 170→1386 · 519→1524 | autoAlpha + yPercent, 1.1s power2.out |
| `home-intro-partner-wrap` | `top+=55% bottom` | — | play | 651→1609 · 460→1536 · 779→1675 | 0.8s autoAlpha+yPercent + partner-inner 1s power3 opacity/y |

(The wrapper `home-intro-wrap` also has a `clamp(top bottom+=50%)`→`bottom top-=50%`
class-toggle trigger — no tweens.)

## Media inventory

| asset | intrinsic | rendered @1440 | role |
|---|---|---|---|
| ink illustration `<img>` | 1766×1766 (avif) | 85.64×86.73rem contain | illustration (our own ink render, same box) |
| ink SVG overlay | 3 children | 85.64×86.73rem | illustration (mask/texture) |
| partner logos ×8 | lazy PNGs | ≈11.2rem wide each | figure (our partner/University marks) |
| hairline tiles | svg bg | 0.12rem strips | rebuild as CSS borders |

## Breakpoint comparison

| | 1440 | 768 | 390 |
|---|---|---|---|
| section | 171.27×86.73rem | 81.79×57.22rem | 37.71×85.41rem |
| grid | 12 cols, gutter 2rem | 12 cols, gutter 2rem | 4 cols, gutter 1.6rem |
| art cell | 85.64×86.73rem | 40.9×40.9rem square | 37.7×37.7rem square |
| text cell | right of art, 85.64rem | right of art, 40.9rem | **below art**, 37.71×32.45rem |
| statement | 4rem lh1 | 2.4rem lh1.2 | 2.4rem lh1.1 |
| content pad | 6.4/15/3.2/15rem | 2.4rem uniform | 2.4/1.6rem |
| partner strip | full width, 19.06rem | full width, 16.3rem | full width, 15.2rem; desc wraps 2L |

## Transplant notes (the 5 numbers that matter)

1. **6+6 cell split with a 1px vertical hairline on the text cell's left edge** (RTL: mirror to right edge); art cell square.
2. **Statement 4rem / w600 / lh1 / 127 chars ≈ 8 lines**, char-split for the scrub, ghost rgb(179,179,175) → ink.
3. **Scrub range 98→718px @1440** (title-center-based, `center bottom+=10%` → `center top+=40%`), 4.28s timeline.
4. **Content pad 6.4rem top / 15rem sides / 3.2rem bottom** — the 15rem side gutter is the section's whole personality.
5. **Partner strip 19.06rem** (label row 4.5 + track 11.4 + desc 3.16rem) with hairlines top/bottom and 8 logos ≈11.2rem wide.

## Gaps / flags

- The Swiper's autoplay params (speed, loop mode) weren't reachable — geometry only.
- The ink-mask filter effect (sub layer) is CSS/SVG we did not decompose; treat as
  "one illustration + one texture overlay" and review against
  `statement-<bp>-{entering,centered,leaving}.jpg`.
- Partner logo `naturalWidth` read 0 (lazy, off-screen at capture) — widths from layout box only.
