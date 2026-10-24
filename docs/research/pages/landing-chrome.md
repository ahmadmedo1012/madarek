# Heron — Landing Chrome Grammar (THE critical sheet)

**Source:** live crawl 2026-10-24, `scripts/r315/heron-dom-crawl.mjs` → `_local/heron-dom/landing-{1440x900,390x844,768x1024,1024x768}.json` (24/24 passes ok). Extends `audits/evidence/r313/reference/digest.json` (r313) with selector-level detail. r313 numbers are cited as `r313:`; where this crawl differs both values are given with a delta.

**Coordinate system (all numbers unless marked ABS):** physical CSS px, **x from the LEFT edge** (Heron is LTR; the RTL mirror for Madarek happens in builders/judges, never in capture), origin = `.main-inner` top-left, which sits at the frame inset:

| viewport | root font | frame inset (0.8rem) | content width | main-inner h | docH (r313) |
|---|---|---|---|---|---|
| 1440×900 | 8.33333px | **6.66px** | 1426.69 | 886.69 | 12338 (12355) |
| 1024×768 | 5.92593px | **4.74px** | 1014.53 | 758.53 | 9926 (9938) |
| 768×1024 | 9.20863px | **7.37px** | 753.28 | 1009.28 | 12535 (12577) |
| 390×844 | 9.92366px | **7.94px** | 374.13 | 828.13 | 11363 (11441) |

r313 digest "insetPx: 7" is the 768/390 rounding; at 1440 the true inset is **6.66px** (= `0.8rem` × 8.333). Scroller: `.main-inner.lenis` (overflow hidden; window scroll stays 0) — unchanged from r313.

Landing page heights this run vs r313: **12338** (12355) · 9926 (9938) · 12535 (12577) · 11363 (11441) — −12…−78px content drift, same class as the r308→r313 ±17px drift; sections unchanged.

---

## 1 · Header cell grammar — desktop @1440×900

`.header` — **fixed**, z-index 10000000, box `(0, 0 1426.69 × 56.3)` → ABS (6.66, 6.66). Height **56.3px** (56.2969 = r313's "56"). DOM:

```
header-component.web-component (display:contents)
└ header.header                      FIXED (0,0 1426.69×56.3) z10000000
  └ div.header-inner.bg-global       (0,0 1426.69×56.3)      ← paper via --bg-img
    └ div.container.grid
      ├ [logo cell]  div#w-node-…9b2404c7   (0,0 705.02×56.3)   flex, padding 10px 0 10px 26.67px
      └ [nav+CTA]    div#w-node-…9b2404ca   (713.34,0 713.34×56.3) flex, margin-left −8.33px
        ├ div.header-menu-inner (713.34,0 546.69×56.3)
        │  └ div.header-menu.bg-global (713.34,0 546.69×56.3)
        │    └ 4 × div.header-menu-item-wrap (136.67×56.3)
        │      ├ div.line.line-vertical.left  (1×56.3 #B3B3AF)  ← cell separator, on each cell's LEFT edge
        │      └ button/a.header-menu-item    (136.67×56.3)
        │        └ div.btn-fill (overflow:hidden, padding 10px, z1)
        │          ├ div.btn-fill-bg          (240×60 #282828, top:50% translateY(−50%), CSS opacity:0)
        │          └ div.btn-fill-label > 2 × div.txt.txt-font-mono.txt-14 (dual labels)
        └ a.header-cta-new (1260.03,0 166.66×56.3)  ← CTA cell
```

**Rules of the bar**

- Top rule of the bar = the fixed frame's top line itself (`.main-deco .line.line-horizital.top`, y=0, 1px #B3B3AF). **Bottom rule:** `div.line.line-horizital.bot` `(0, 55.3 1426.69×1)` #B3B3AF. Nothing else outlines the bar.
- **Hairline separators** are 1px `#B3B3AF` `div.line.line-vertical.left` elements, 56.3 tall, standing on the LEFT edge of every nav/CTA cell: x = **713.34, 850.02, 986.69, 1123.36, 1260.03**. So: logo cell 705.02 wide → 8.33px breathing gap → separator → nav cells **136.67** wide ×4 → CTA cell **166.66** wide. (r313 D11 "width 1427" = 1426.69 ✓.)

**Logo cell** (0–705.02)

- `div.header-logo-inner` (26.66, 10 133.31×36.3), flex.
- Mark: `a.header-logo-item.bg-global` `(26.66,10 31.66×36.3)` — bg image mark (hover: svg grows 31→32px, r313).
- Wordmark: `a.header-logo-item.item-txt` `(58.31,20.5 101.66×15.3)`, padding-left 8.33px. r313: 32×36 mark + 102×15 wordmark ✓ (delta ≤0.7px, font-load rounding).

**Nav cells** (4 × 136.67×56.3)

- Labels: `div.txt.txt-font-mono.txt-14` — **Geistmono 11.6667px / 500, UPPERCASE**, color `rgba(40,40,40,0.72)` (--content--terriary). Two stacked copies at y=10 and y=26.33 (Δ16.33) inside `overflow:hidden` wrappers — the dual-label roll (top exits −16.33, bottom enters; r313 D12).
- Current page (`a.header-menu-item.w--current`, e.g. Pricing on /pricing): color **#282828** (full ink, not 72%).
- Hover/active/focus: `#282828` fill wipe via `.btn-fill-bg` + label roll + white text; dropdown cells also roll a **dual chevron pair** `div.header-menu-item-ic.{top,bot}` (5×5 each; top parked at translate(15,−15), bot at rest).
- Items: PRODUCT (button.has-submenu) · PRICING (a) · RESOURCES (button.has-submenu) · ABOUT (a).

**Dropdown panels** (collapsed at rest)

- `div.header-menu-dropdown` absolute at `(713.34, 55.3 219.98×~2)` — height collapses to ~2px, opacity 0; opens on hover (GSAP; r313 crops measured open items).
- `div.header-menu-dropdown-inner.bg-global` — **1px solid #B3B3AF on all 4 sides**, paper bg.
- Items: `a.header-menu-dropdown-item` **217.98×37.33**, mono 11.67px, bottom hairline `1px #B3B3AF`; hover = pure label roll (16px), **no fill, no color change** (r313 D12).
- Product → Heron Chat Widget, Heron Dashboard. Resources → Insights, AI Practices, Design Workflows.

**CTA cell** (1260.03–1426.69, 166.66 wide)

- `a.header-cta-new` (href /contact-us) **166.66×56.3** (r313: 167×56.3 ✓), own left separator at x=1260.03.
- Inner `div.btn-fill` (variant `w-variant-b76e1715…`): flex, padding `10px 3.33px 3.33px 10px`, overflow hidden.
- Labels: 2 × `div.txt.txt-font-mono.txt-14` «contact us» — **Geistmono 11.6667px/500 UPPERCASE, color #FA3600 at rest** (paints orange on paper; pixel-verified), at (1270.03,10) and rolled twin (1270.03,26.33) +16.33. *Delta vs digest:* digest's default color #FFFFFF is the `<a>`'s inherited color; the visible label color at rest is **#FA3600**. On hover the fill wipes in and labels turn white (r313 crops: hover = solid #FA3600 + white rolled label).
- Arrow: pair of 16.66×16.66 arrow boxes at x=1406.7 and x=1390.05 (second translated −16.66) — slide ±16.66px on hover.
- Fill rect: `div.btn-fill-bg` **240×60, #FA3600**, `position:absolute; top:50%; left:0; transform:translateY(−50%); z-index:2; opacity:0` (global CSS; GSAP drives opacity/translate on hover; **`display:none` inside `@media (max-width:991px)`**). At capture its bbox measured (1260.03, −1.86) — covering the cell — but paints nothing (opacity 0; pixel-verified paper). *This resolves digest's "translateY −30px → 0" note: the −30 is GSAP's y on top of the centered rect; the at-rest invisibility is the CSS `opacity:0`.*

**Behavior** (r313 D11, re-confirmed): classes only — top `header`; scrolled `header on-scroll on-hide`; back-to-top `header on-hide`. Hide/show rides scroll velocity; y stays 7 ABS.

---

## 2 · Header — mobile @390×844 (two-cell row)

`.header` **fixed** `(0,0 374.13×49.61)` → ABS (7.94, 7.94) — **49.61px tall** (r313 D15b: 49.6 ✓; BOARD K-B's "2×48px cells" is approximate — measured 49.61).

```
header.header (0,0 374.13×49.61) FIXED
└ div.header-inner.bg-global
  ├ [logo cell]  0 … 187.06
  │   └ div.header-logo-inner (11.91,9.92 97.23×29.77)
  │     ├ a.header-logo-item.bg-global  (11.91,11.72 22.81×26.16)   mark
  │     └ a.header-logo-item.item-txt   (34.72,19.19 74.42×11.22)    wordmark
  ├ div.line.line-vertical.left (187.06,0 1×49.61 #B3B3AF)           the ONE mid separator
  └ [MENU cell] div.header-menu-inner (187.06,0 187.06×49.61)
    └ a.header-menu-btn (187.06,0 187.06×49.61)  label «MENU» (mono txt-14)
      └ div.header-menu-btn-ic (343.38,21.31 14.88×6.97)
        └ 3 × div.header-menu-btn-ic-line 14.88×1 #282828 at y 21.31 / 24.30 / 27.28 (Δ2.99px)
```

- Bottom rule: `div.line.line-horizital.bot` (0,48.61 374.13×1) #B3B3AF. Top rule = frame line. **No other separators, no boxed toggle cluster, no tagline, nothing under the bar** (pixel-scan of the 390 top shot y 50–140: paper + artwork only).
- Menu rows are Geistmono 13.8931px/500 uppercase (txt-14 @ root 9.9237) — same grammar as desktop nav, one size step up.

**Menu overlay** (`.header-menu`, absolute under the bar): rows at their OPEN positions in the DOM — Product / Pricing / Resources / About **40.08px** each (y 49.61, 89.69, 129.77, 169.84; x 188.06, 186.06 wide) + `a.header-cta.only-mb` **50.98px** (188.06, 209.92) with dual mono «Contact us» labels; closing hairline (188.06,259.91 186.06×1). At rest the panel is collapsed shut (content boxes exist but paint nothing — verified by pixel-scan; Webflow/GSAP clip animation). Click `.header-menu-btn` → `.header-menu-btn.active` + `.header-menu.active` (r313 D15b crops). `.header-cta-new` is `display:none` at 390; desktop `.btn-fill-bg` rects are `display:none` ≤991px (CSS).

**The mobile "ticker row"** — honest finding: **there is NO ticker/marquee row directly under the mobile bar.** The only ticker is the hero work strip, which on mobile is the **last band of the 100svh hero**, between two full-width hairlines:

| element | @390 | @1440 (for contrast) |
|---|---|---|
| hairline above | `.line.line-horizital` (0,787.42 374.13×1) | (825.28,849.33 601.41×1) — only over the right cell |
| `div.home-hero-work-wrap` | (0,788.42 374.13×**39.69**) | (825.28,850.33 601.41×**36.33**) |
| `div.home-hero-work-inner.marquee-left.anim` | row 15.88px tall @ y 800.33 | row 16.33px tall @ y 860.33 |
| items | `item` = icon 15.88×15.88 + `item-title` mono 13.89px/500 UPPER rgba(40,40,40,.72) | icon 16.33×16.33 + mono 11.67px |
| contents (3, looped ×N copies) | «Faster iterations» · «Fewer mistakes» · «Less busywork» | same |
| hairline below | (0,827.11 374.13×1) = hero bottom = frame line | (0,885.66) |
| motion | `marqueeLeft` 30s linear infinite (r313; only marqueeLeft is used on the strip — no marquee-right element exists in the DOM) | same |

Mobile band order inside the hero (@390): window frame band 51.59–475.73 → hairline 483.67 → **H1 band** (h1 at (9.92,499.55 354.28×95.25), BT Grotesk **31.7557px**/700 uppercase #282828, 3 lines) → hairline 609.67 → sub band (paragraph (15.88,626.55 342.38×82.5) 15.88px + «Bearplus agency» link) → hairline 723.92 → full-width «Discover more» row (0,724.92 374.13×63.5) → hairline 787.42 → ticker band → frame line. **Every mobile band is separated by a full-bleed 1px hairline** — that is the mobile rhythm builders must copy.

---

## 3 · Consent banner (cookie)

Desktop @1440 — DOM + geometry (exact):

```
div#heron-cookie-root (aria-live=polite, React portal, display:block)
└ div.cookie-banner.bg-global.is-visible[data-cookie-banner]   FIXED z 100009
  (825.44, 848.36  601.25 × 38.33)   → ABS (832.1, 855.02)  ← r313 @(832,855) ✓ same point
  padding 5px 6.67px 5px 13.33px
  box-shadow: rgb(0,0,0) 0px 6.66667px 0px −1.66667px   ← the site's ONLY shadow (hard, 0 blur)
  ├ div.line.line-vertical.left  (825.44,848.36 1×38.33  #282828)
  ├ div.line.line-vertical.right (1425.69,848.36 1×38.33 #282828)
  ├ div.line.line-horizital.top  (825.44,848.36 601.25×1 #282828)
  ├ div.line.line-horizital.bot  (825.44,885.69 601.25×1 #282828)   ← 4 SEPARATE 1px line DIVS
  └ div.cookie-banner-content (838.77,853.36 581.27×28.33) flex
    ├ div.cookie-banner-description > .w-richtext > p «This website uses cookies.»
    │   (838.77,858.86 233.5×17.31)  BT Grotesk 13.3333/500  #282828
    │   └ a «Learn more» (1004.98,859.86 67.28×15)  Geistmono 11.6667/500 UPPER #FA3600 → /cookie-policy
    └ div.cookie-banner-action (1257.45,853.36 162.58×28.33) flex gap 3.33
      ├ button.cookie-banner-accept[data-cookie-accept-all] (1257.45,853.53 78.63×27.98)
      │   bg #EFEFEF, text white mono «Accept» (btn-fill fill-small; .btn-fill-bg 120×30 parked; hover = btn-fill roll, r313)
      └ button.cookie-banner-reject[data-cookie-reject-all] (1339.41,853.36 80.63×28.33)
          transparent, #282828 mono «Reject» (variant no-ic-small, .btn-fill-bg 144×36)
```

- Borders are **#282828** (var --content--primary; r313 called it "cl-black" — same value, the token name was misleading).
- "Learn more" is INSIDE the richtext `<p>`, flowing after the sentence (total sentence+link fits one 17.31px line at 1440).

Mobile @390 — **full-bleed bottom sheet**:

```
div.cookie-banner.bg-global.is-visible  FIXED (0, 734.67  374.13 × 93.45)
padding 11.91px 15.88px;  shadow rgb(0,0,0) 0 7.93893px 0 −1.98473px
├ .line-horizital.top (0,734.67 374.13×1 #282828)   ┆ sides = the frame's own vertical lines (no side divs)
├ .line-horizital.bot (0,827.13 374.13×1 #282828)
└ .cookie-banner-content (15.88,746.58 342.38×69.64)
  ├ description (15.88,746.58 277.86×20.63): p 15.88px + a «Learn more» Geistmono 13.8931px #FA3600 (213.66,748.58)
  └ action row (15.88,779.11 193.19×37.11): Accept 93.61×37.08 (#EFEFEF) | Reject 95.61×37.11 — side by side
```

- **Delta vs owner ticket K-C:** "mobile ≈374×100" → measured content box **374.13×93.45**; the missing ~6.5px is the 7.94px hard shadow + rounding. Definitely not 175px (K-C's note stands). Buttons stack side-by-side (not full-width): 93.6 + 95.6 + gap 3.97 ≈ 193 from x=15.88.
- Accept hides the banner instantly; consent = JSON cookie + `window.HeronConsent` (r313 D17).

---

## 4 · Edge tab — `.awwwards` (the only edge-anchored element)

```
div.awwwards                    FIXED z 999 · CSS: width 5.3rem, top 50%, right 0.8rem, translateY(−50%)
└ a.awwwards-link.bg-global     href https://www.awwwards.com/sites/heron-ai, target _blank
  │ border: 1px #B3B3AF on top/bottom/left only (open side faces the frame line) — a "tag" on the right rule
  └ svg.svg (43.16×137.45 @1440)  ← "honorable mention" ribbon line-art
```

| viewport | box (x,y w×h) | note |
|---|---|---|
| 1440×900 | (1382.53, 373.62 **44.16×139.45**) | width 5.3rem × root; **vertically centered** (top:50%+translateY(−50%) — the measured matrix(…,0,−69.73) IS that centering, not a GSAP offset); right edge flush with the frame's right line (right: 0.8rem = the inset) |
| 1024×768 | (983.13, 329.84 31.41×98.84) | same recipe at root 5.926 |
| 768×1024 | (704.48, 427.52 48.8×154.23) | |
| 390×844 | (321.53, 330.9 **52.59×166.33**) | |

- Size tracks the fluid root (5.3rem). **Present at every measured width — no breakpoint.** Contents: only the SVG; no text, no mono label.
- **Nothing else sits at any frame edge, and NOTHING sits at the frame's top edge** — no mono label, no coordinates, nothing overlapping the header (DOM walk + pixel scan of the top 7px band: paper + frame line only). This is the ground truth behind owner tickets K-A4/K-A5: Heron has no fixed label over the masthead.

---

## 5 · The fixed frame (`.main-deco`) + hero drawing window

**Frame** (never scrolls; unchanged from r313, now with exact pixels):

```
div.main-deco        FIXED full-viewport (pointer-transparent)
└ div.main-deco-inner (0,0 1426.69×886.69)  ← at the 6.66px inset (@1440)
  ├ div.line.line-horizital.top  (0,0    1426.69×1) #B3B3AF
  ├ div.line.line-horizital.bot  (0,885.69 1426.69×1) #B3B3AF
  ├ div.line.line-vertical.left  (0,0    1×886.69)   #B3B3AF
  └ div.line.line-vertical.right (1425.69,0 1×886.69) #B3B3AF
```

- 4 lines only. **No plus marks on the viewport frame** (the two `<svg>` children are 0×0 placeholders; plus marks belong to the drawing window below and to the loader chrome).
- During route transitions the 4 lines converge to center (`--trans-percent` 0→50%, `--size--line` spikes to 1 ≈ 8.33px; r313 D6 — re-confirmed by the `--trans-percent`/`--mask-percent` vars present in `:root`).
- Line color token: `--content--border` = `#B3B3AF`; line thickness `max(1px, .1rem)`.

**Hero drawing window** @1440 (the K-A1/K-A3 target):

```
section.home-hero (0,0 1426.69×886.66)
└ div.container.full-h (0,53.33 1426.69×833.33)
  └ div.home-hero-inner
    ├ [window band] (0,53.33 1426.69×699.98)
    │  div.home-hero-img.bg-global           ← paper
    │  div.bg-border          (10,63.33 1406.69×679.98)      ← drawing frame, 10px (1.2rem) in from the band
    │  └ div.bg-border-inner
    │    ├ .bg-border-item.bg-border-horizital.top  (26.66,63.33  1373.38×6.66)
    │    ├ .bg-border-item.bg-border-horizital.bot  (26.66,736.66 1373.38×6.66)
    │    ├ .bg-border-item.bg-border-vertical.left  (10,79.98    6.66×646.67)
    │    ├ .bg-border-item.bg-border-vertical.right (1410.03,79.98 6.66×646.67)   ← 0.8rem-thick bars, bg-image asset
    │    ├ .bg-border-plus.top.left  (8.34,61.67 10×10)   ┐
    │    ├ .bg-border-plus.top.right (1408.34,61.67 10×10) │ inline-SVG '+', CENTERED on the bar corners:
    │    ├ .bg-border-plus.bot.left  (8.34,734.97 10×10)   │ + center = frame corner + 3.33px = (13.34,66.67) TL
    │    └ .bg-border-plus.bot.right (1408.34,734.97 10×10)┘
    │  div.home-hero-img-inner (26.66,79.98 1373.38×646.67)   ← window, 16.66px (2rem) inside the frame
    │  └ img.img-basic.img-abs  (26.66,79.98 1373.38×646.67)  ← FULL.WEBP, object-fit CONTAIN, absolute
    │    (transparent-paper elevation; ground line + tree/palm silhouettes are IN the image — no DOM line for them)
    │  [dashed ruler/graticule] div.home-hero-ruler > .home-hero-ruler-inner
    │    4 × .home-hero-ruler-item-wrap (686.69×323.33 quadrants) × 2 items = 8 × .home-hero-ruler-item.{left,right,top,bot}
    │      each = full window overlay, opacity 0 AT REST (proximity reveal 0→.64 when the pointer nears the quadrant)
    │      children: div.line.line-dash — 1px, bg-image = border2.svg dash tile, opacity .64
    │        horizontals (full 1373.38 width) at y = 210.25, 232.09, 356.91, 388.88, 402.92, 534.75, 612.77
    │        verticals   (1×645.67)      at x = 285.39, 297.09, 396.08, 407.78, 481.05, 523.92, 624.47, 635.39,
    │                                      791.28, 802.98, 894.97, 916.78, 1032.16, 1141.28 …
    │        + ORANGE reference lines #FA3600, opacity .64, measuring from the window's top-left origin:
    │          top edge    (285.39,79.98  855.88×1) · bottom edge (285.39,725.66 855.88×1) · left edge (26.66,211.03 1×402.5)
    │  [hero instrument, pointer-only, ≥992px + hover:hover] div.home-hero-img-interact-wrap (HIDDEN, op 0)
    │      guides #E0E0DA: H line (0,402.81 1426.69×1) + V line (712.84,53.33 1×699.98, op .2)
    │      orange plus .home-hero-img-plus (709.17,399.14 8.33×8.33) + readout .home-hero-img-coordi (693.34,392.48 40×21.66, Geistmono X:Y)
    │  [2 orange square markers] div.home-hero-img-deco.item1/.item2 (~199.54 wide each)
    │      .home-hero-img-deco-bg 12.05×12.05 #FA3600 @ (437.52,483.49) and (899.99,493.54)
    │        (natural 12.47 = 1.5rem, scale .967 mid-entrance) — annotation pins with hidden mono labels:
    │        «IBC 1011.11 · Handrails required.» / «IBC 1015.3 · Guardrail required for fall protection …»
    │        (.txt-font-mono.txt-12 10px + .txt-14, revealed on hover)
    └ [bottom band] (0,753.31 1426.69×133.34) — hairlines at y 753.31 & 885.66
       ├ left cell 825.28 wide: h1 (26.66,773.31 771.97×93.34) «AN AI AGENT THAT WORKS INSIDE YOUR DESIGN TOOLS»
       │   BT Grotesk 46.6667/700 UPPER #282828, lh 46.67, 2 lines. Width = **54.1%** of content width
       │   (delta vs K-A2's "≈47%": measured 771.97/1426.69; @390 it is 354.28 wide = 94.7%, 3 lines @31.76px)
       └ right cell 601.41 wide: sub paragraph .txt-16 (838.61,766.64 432.25×51.94) + «Bearplus agency» link
          (838.61,783.95 421.97×33.31, 600 weight) · hairline (825.28,849.33 601.41×1) · ticker band (§2)
          · a.home-hero-btn «Discover more» (1284.19,753.31 142.5×97.02) — r313: 143×97 ✓, focus-visible
            brightens text #FA3600→#FB653B without filling (unique)
```

**K-A3 checkpoint (dashed frame + ticks + ± marks):** the ± marks are 10×10 at the four corners of the 6.66px bars — i.e. **~15–20px inside the frame** exactly as the owner describes (window box is 16.66 inside `bg-border`, whose corners carry the marks). The "dashed inner frame" is the quadrant-gated `.line.line-dash` graticule (1px `border2.svg` dash tile, opacity .64 at full reveal) — NOT a static rectangle: at rest it is fully invisible; it reveals per-quadrant by pointer proximity (desktop only; at 390 the whole `home-hero-img-interact-wrap`+ruler system is `display:none` — the window still shows the bars, marks, artwork and the 2 orange markers).

---

## 6 · Footer — @1440 (height 711 = 710.66 wrap + 1px rule)

Top rule `div.line.line-horizital.bot` (0,11626.36 1426.69×1). `footer.footer` (0,11627.36 1426.69×710.66). Grid: `.footer-main.grid` (0,11627.36 1426.69×**354.67**) — **3 columns 357.08 | 714.58 | 357.09** at x = 0, 356.67, 1069.59 (the 3rd opens with its own vertical hairline 1×354.67 @1069.59; r313 "357/715/357" ✓).

**LEFT column (357.08)**

- `.footer-title` (13.33,11640.69 330.42×80.02): the H1 sentence repeated as masked display lines — `heading.h4.tb-h5` **26.67px/600 UPPER #282828**, 3 lines × 26.67 (word-by-word bp-line mask reveal on scroll).
- Bottom rule (0,11828.44 357.08×1) → `.footer-form-wrap` (0,11829.44 357.08×152.59):
  - mono label `«Subscribe»` Geistmono 11.67/500 UPPER **#626260** (13.33,11842.77);
  - form title `.txt-16` «Want to see more cool websites like this?» (13.33,11900.75 330.42×34.63, 2 masked lines) + «Sign up for occasional updates from Bearplus.»;
  - **subscribe input** `input#email.footer-form-input` **(−1, 11968.7 358.08×40)** — transparent bg, **1px solid #B3B3AF all sides**, BT Grotesk 13.33, padding 6.67/13.33 (r313: 358×40 ✓; the −1 x means the border's outer edge kisses the frame's left line);
  - **arrow submit** `button.input-submit.footer-form-input-submit` **(317.08,11968.7 40×40)** inside the input's right end (40×40 ✓); hover: arrow svg grows 13×8→17×17 (r313);
  - input ladder (r313, re-confirmed default rung live): border **#B3B3AF → :focus #ED4C1F → filled+focus #FA3600**, `transition: border-color .45s`;
  - success panel `.footer-form-success` «Thanks for reaching out!» (heading.h6.mb-h5 20px/700) + note, hidden until submit.

**MIDDLE column (714.58)** — ruled cell matrix, hairlines between rows (y=11828.38 across the column; verticals 1×151.66 @594.86 & @833.05 in the bottom row; 1×62.5 @594.86 between the two business cells)

- Row 1 (11627.36, 203.02 tall) — 3 cells 238.19 wide: mono labels 11.67 #626260 + links `.footer-menu-item-link` 13.33/500, boxes 25.63 tall:
  - **Company**: Home (`.w--current` → **#FA3600 latched**) · About us · Contact us
  - **Product**: Heron Chat Widget · Heron Dashboard · Pricing
  - **Resources**: Insights · AI Practices · Design Workflows
  - link grammar (r313): color-only hover #282828→#FA3600 (0.2s); current page latched orange, no hover.
- Row 2 (11830.38, 151.66 tall) — 3 cells 238.19:
  - **Address**: «60 Martin Pl, Sydney, NSW 2000, Australia» (link, 2 masked lines)
  - **business** → `business@bear.plus` + (rule @11905.2) **General inquiries** → `hello@heronaiapp.com`
  - **Social**: 2-col pairs — Website · Dribbble / FWA · Awwwards / Instagram · Linkedin

**RIGHT column (357.09)** — `.footer-logo-inner.full` **(1140.64,11697.19 214.98×214.98)**: `svg.footer-logo-svg` giant line logo (r313: 215×215 ✓), `.footer-logo-path` strokes draw in on scroll (scroll fade 0.61→1); `.sketch` variant parked at opacity 0. Perfectly centered in the column (center 1248.13 = column center 1248.14).

**Ink strip** — `.footer-img-wrap` (0,11982.03 1426.69×**314.16**), rules above/below; contains its own `.bg-border` (10,11992.03 1406.69×294.16) frame; `.ink-mask` + `.ink-mask-img.main/sub` + `svg.layer` turbulence edge; pointer lens r 99.09 (hidden ≤767; r313).

**Copyright band** — `.footer-copyright-wrap.grid` (0,12296.19 1426.69×**41.83**):
- left cell 483.86 with vertical hairline @482.86: `«©2026 HERON AI. All rights reserved. Concept Crafted by Bearplus.»` Geistmono 11.67/500 UPPER #282828 (26.66,12310.34);
- policy links `a.footer-policy-item` with 1×41.83 left hairlines: **Privacy Policy** (1036.13, 119.08×41.83) · **Terms & Conditions** (1155.2, 154.92×41.83), labels BT Grotesk 13.33.

**Mobile @390** (footer-wrap 0,10123.73 374.13×**1239.11**): everything stacks full-width with hairline rules between blocks — title h4 (14.88,10143.58 344.38×52.41) · subscribe: mono label + form title + `input#email` **374.13×47.63 full-bleed** + submit **47.63×47.63** @(326.5,10336.45) · link cells 2-per-row (`a.footer-menu-item-link` 155.3×27.95 at x 10.92 / 188.06) · info items 103.2 tall · mobile ink strip `.footer-img-wrap` **136.94** tall · copyright band. No text collisions; the 215×215 logo cell and the lens strip are desktop-only content.

---

## 7 · Landing section map (this crawl, @1440, for the height table)

| n | section | y | h | note |
|---|---|---|---|---|
| 1 | home-hero | 0 | 886.66 | incl. 56.3 header + window 700 + bottom band 133.3 |
| 2 | home-intro | 893 | ~723 | statement band |
| 3 | home-problem | ~1616 | ~743 | |
| 4 | home-map | ~2358 | ~6300 | 51% pinned walkthrough (r313 ✓) |
| 5 | home-platform | ~8658 | ~710 | |
| 6 | home-why | ~9368 | ~698 | |
| 7 | home-usecase | ~10067 | ~887 | |
| 8 | cta | 10953 | 698 | dashed rule → .cta-main.grid (0,11009.2 1426.69×230.25): centered h2 40px «SEE WHAT HERON CAN DO YOUR MODEL» + sub + orange CTA slab `a.cta-main-item-btn-inner` 134.08×39.64 (white mono «Contact us» on #FA3600, hover dark #282828 fill wipe + roll, r313) → dashed rule → .cta-deco.grid 387.91 with 714.58-wide drawing strip |
| 9 | footer | 11627 | 711 | §6 |

Loader (context): visible ~7.5s this run (loaderGoneMs 7480 @1440, 7844 @390, ~7.8–7.9s @768/1024; subpages don't replay it — 1.7–3.1s waits are the Barba entrance only; the 404 has no loader at all: 36–65ms). All r313 loader facts stand.

**Deltas vs digest.json (summary):** header 56 vs 56.3 (same, rounding) · inset "7px" vs 6.66px @1440 (0.8rem — 7 is the 390/768 rounding) · CTA default label color: digest #FFFFFF (anchor) vs **#FA3600 visible at rest** (this crawl, pixel-checked) · fill mechanism: digest "translateY −30→0" vs CSS `top:50%/translateY(−50%) + opacity:0`, GSAP-driven (both true; this crawl names the CSS) · cookie banner 601×38 ✓ exact (601.25×38.33), mobile 374×93.45 (owner est. 374×100 incl. shadow) · footer 711 ✓, columns 357/715/357 ✓, input 358×40 ✓, arrow 40×40 ✓, logo 215×215 ✓ (214.98) · hero-discover 143×97 ✓ (142.5×97.02) · H1 width 54.1% @1440 (K-A2 brief said ≈47% — Madarek should target ~54% of content width, 2 lines) · page height 12338 vs 12355 (−17px drift, r308-identical) · **new, not in digest: the `.awwwards` edge tab geometry; the quadrant-gated ruler internals; the mobile band-by-band hairline rhythm; `.btn-fill-bg{display:none}` ≤991px.**
