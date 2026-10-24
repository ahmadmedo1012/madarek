# Heron — /about-us

**Crawl:** `about-us-1440x900.json` / `about-us-390x844.json`. Title «Heron AI | We're architects building the design partner we always wanted». docH **5419** @1440. Sections (y, h):

| section | y | h |
|---|---|---|
| about-hero (drawing-window band) | 0 | 1171.63 |
| about-intro (statement) | 885.66 | 338.31 |
| about-story | 1171.63 | 793.38 |
| about-team | 1965 | 1607.28 |
| about-inves (investors strip) | 3572.28 | 437.98 |
| shared cta band | ~4010 | 698 |
| shared footer | ~4708 | 711 |

## about-hero — full-width drawing window

- `.bg-border` **(10,63.33 1406.69×812.33)** — same drawing-frame grammar as the landing window: 4 bars 6.66px thick, 10×10 corner plus marks, paper bg.
- Inside, a centered image carousel: `div.about-hero-list` **(463.34,301.27 499.98×336.44)** with stacked `.about-hero-item` slides (about1/about2 PNGs, `img-cover-mb`) + animated deco chips (`.about-hero-item-deco-item` brand/normal squares) and one live inline-SVG line drawing `.about-hero-item.active` (283.33×336.44 path illustration).
- The band closes at 885.66 with the frame rule.

## about-intro — the statement

- Mono kicker `.txt-font-mono.txt-12` **«Tired of the busywork?»** Geistmono 10px/500 UPPER, muted, at (6.66,1034.66) — left edge.
- H1 `h1.heading.h2.tb-h3` **(414.03,952.31 598.59×120)** «We're architects building the design partner we always wanted» — BT Grotesk **40px/600 UPPER #282828**, **centered** (x centers on 1426.69), 3 masked lines ×40px; word-by-word bp-line reveal.
- Sub sentence centered below: 16.67px/500 muted (words as masked spans).

## about-story (1171.63, 793.38)

Two halves split by the vertical hairline at x=713.34: LEFT = image band `.about-story-img-wrap.bg-global` (713.34 wide) with drawing; RIGHT = `about-story-title-wrap` (title h2 40px at (840,1227.11 460.03×40)) + `about-story-sub-wrap` (1350.83, 297.19 tall — body copy 13.33px).

## about-team — the card grid (1965, 1607.28)

- Head: `about-team-title-wrap` (26.66-ish left, 584.73 wide) + `about-team-sub-wrap` right — h2 40px/600 «…» (26.66,2127.98 540×120) on the left cell.
- Cards: `.about-team-item.w-dyn-item` **475.56 × 635.48**, 3-up grid (x 0 / 475.56 / 951.12), rows at y 2301.31 + 796.56 (2 rows):
  - `.about-team-item-img-wrap` 475.56×553.84 with **10×10 plus marks at its 4 corners** (`.about-team-item-plus-item.{left,right}.{top,bot}` at (13.33,2314.64), (452.23,2314.64), (13.33,2831.83), (452.23,2831.83)) — the drawing-window corner grammar applied to a CARD.
  - Photo `.about-team-item-img.bg-global` inset 28.33: **418.91×487.19**.
  - Info strip below (0,2855.16 475.56×81.64): name `.about-team-item-info-title` 22px/700 + role `.about-team-item-info-sub` mono-adjacent 16.33 box, both CENTERED under the photo; a hidden `.about-team-item-desc` richtext (0×0, expands on hover per r308).
- Card = flat paper + corner plus marks + inset photo; **no border, no radius, no shadow** (site-wide policy).

## about-inves — investors strip (3572.28, 437.98)

Logo grid of investor marks on paper (gray wordmark images in a ruled grid; hairline top/bottom). Same mono-label + grid grammar as the footer's Social cell.

## @390

Everything stacks: hero window frame full-bleed (`.bg-border` at (7.94,51.59 …)), statement centered at 15.88–31.76px equivalents, team cards full-width (344.38 photo, plus marks at corners), 2-col → 1-col grids, shared mobile footer. All rules full-bleed hairlines between bands.

**Grammar notes for builders:** the about page reuses exactly three motifs — (1) the drawing window (bg-border + bars + plus marks), (2) the masked-line display heading (word-by-word reveal), (3) the ruled cell grid. No new component vocabulary; no card borders/shadows anywhere.
