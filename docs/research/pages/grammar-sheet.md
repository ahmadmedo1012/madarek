# Heron — component grammar sheet (site-wide inventory)

Companion to the page specs in `docs/research/pages/` — every recurring component with **selector + geometry + state behavior**, from the r315 DOM crawl (`_local/heron-dom/*.json`, 2026-10-24). Global invariants first:

- **Radius 0** everywhere; the only radii on the site are the cursor dot fallback (50%, invisible) and 2×2 why-card dots (r313 D2). **Shadows: none** except the cookie banner's hard offset `0 6.67px 0 −1.67px #000` (r313 D3 — re-confirmed as the single shadow).
- **Line vocabulary** (the site's atomic component — every rule/separator is one of these `div.line` elements, never a border unless noted):
  - `.line.line-horizital` / `.line.line-vertical` — **1px solid #B3B3AF** (var --content--border; `max(1px,.1rem)`); modifiers `.top/.bot/.left/.right` for seat; ink variant `#282828` (cookie banner, noti head).
  - `.line.line-dash` — 1px **dashed** (bg-image `border2.svg` tile), opacity .64 when revealed; used: hero graticule, pricing card dividers, FAQ dividers.
  - `.line.line-brand` — 1px **#FA3600** (focus rule on form rows; parked off-screen, slides in).
  - Guides `#E0E0DA` — hero instrument crosshair (op .2).
- **Mono label** `.txt.txt-font-mono.txt-14` = Geistmono **11.6667px/500 UPPERCASE** (desktop root 8.333; = 13.89px @390, 11.85px @1024). Variants: `txt-12` 10px (dates, loader %, «Error:#404»), `txt-16` 13.33px (pricing tabs/types). Label ink: `#626260` (footer/menu labels), `#B4B4B1` (disabled/quiet), `rgba(40,40,40,.72)` (nav), `#FA3600` (CTA/error).
- **Masked display lines**: `.bp-mask-line-mask > .bp-line` — every big heading is split into per-word masked lines that wipe in on scroll (the heading.h* ladder: h1 46.67/700, h2 40/600, h3 33.33/600, h4 26.67/600, h5 23.33/600, h6 20/700 — all UPPERCASE #282828, lh = font-size).
- Fluid root: `html{font-size:.578704vw}` + mobile clamps (r313 D13): 1440→8.333px · 1280→7.407 · 1024→**5.926** · 768→9.209 · 390→9.924.

## 1 · Cells (the layout primitive)

| cell | selector | geometry | notes |
|---|---|---|---|
| header cell | `.header-menu-item-wrap` | 136.67×56.3, left 1px separator | desktop nav; also the CTA cell 166.66 |
| header logo cell | `.header-inner > .container.grid > div` | 705.02 wide, pad-left 26.67 | @390: logo 187.06 + MENU 187.06, one mid separator |
| mobile band | any full-bleed row between hairlines | 374.13 wide @390, h 39.69–63.5 | hero bands, discover row, ticker — rhythm = hairline per band |
| footer column | `.footer-main.grid > div` | 357.08 / 714.58 / 357.09 @x 0/356.67/1069.59 | 3rd col opens with vertical hairline |
| footer link cell | `.footer-menu-item` | 238.19×203.02 (row1) / 238.19×151.66 (row2) | mono label + stacked links; vertical hairlines between row2 cells |
| form row (contact) | `.contact-hero-form-input-group` | 713.34×75 (59.53 @390); item-50 → 356.67 pairs + mid vertical hairline | borderless; label inside; closes with rule pair (gray + parked brand) |
| pricing column | `.pricing-hero-grid` | 5 × 285.33 | label gutter + 4 plans; tabs row 428.02×43.97 |
| TOC row | `.policy-hero-table-item` | 464.45×50.63 | active → #282828 text + tooltip |
| table row | `.pricing-hero-table-row` | 1426.69×50.63 × 5 cols | div grid, not `<table>` |

## 2 · Buttons — one anatomy, five skins

**Anatomy (`.btn-fill` family):** `a/button > div.btn-fill` (position:relative, z1, **overflow:hidden**, padding 10px 3.33 3.33 10 desktop) `> div.btn-fill-bg` (**240×60 fill rect, absolute top:50% left:0, translateY(−50%), z2, opacity:0 at rest; display:none ≤991px**) + `div.btn-fill-label > 2 × .txt.txt-font-mono.txt-14` (**dual labels, Δ16.33 vertical roll**; wrapper 16.33 tall clips the parked twin) + `div.btn-fill-icon` **pair of 16.66×16.66** boxes (second translated −16.66; horizontal slide on hover). GSAP drives all state motion (`transition: all`).

| variant (w-variant id) | skin at rest | hover/active/focus | seats |
|---|---|---|---|
| `b76e1715` **brand-fill** | transparent, **#FA3600** mono label, arrow pair | **#FA3600 fill wipe** + labels roll + turn white + arrows slide | header CTA «contact us» 166.66×56.3 · hero/product «Discover more» 142.5×97.02 / 216.73×86.66 · contact submit 713.34×86.66 (labels 20px, `.disable`→#B4B4B1 until valid) |
| `ca0053c9` **ink-fill** | transparent, mono label rgba(40,40,40,.72) | **#282828 fill** + white roll (+chevron roll `5×5` pair on .has-submenu) | nav cells 136.67×56.3 · dropdown items 217.98×37.33 (but items roll only, no fill) · mobile menu rows 186.06×40.08 |
| `31b530d6` **fill-small** | **bg #EFEFEF**, white mono label; `.btn-fill-bg` 120×30 | btn-fill roll | cookie Accept 78.63×27.98 (93.61×37.08 @390) |
| `ed1d4352` **no-ic-small** | transparent, #282828 label, hover border 1px #282828→#FA3600 + white | label roll, no fill | cookie Reject 80.63×28.33 |
| slab CTA (`.btn-fill-hover.btn-fill-brand` on orange/dark slab) | white mono label on **#FA3600 slab** (or #282828) | inverse fill wipe + roll + dual-arrow slide ±37px | pricing plan CTA 232.03×39.64 · cta-band «Contact us» 134.08×39.64 · 404 «back to homepage» 288.77×43.05 |

**Non-btn-fill actions:**

- `.footer-form-input-submit` (40×40; 47.63 @390): transparent, arrow svg; hover = **arrow grows 13×8→17×17**, nothing else.
- `.footer-menu-item-link` (25.63 boxes): **color-only** #282828→#FA3600 (0.2s); `.w--current` latched #FA3600, no hover.
- `.header-menu-item.w--current`: #282828 text (no fill latched).
- focus-visible = the hover recipe everywhere (no outline rings); hero-discover uniquely **brightens text #FA3600→#FB653B** without filling (r313).
- Roll distances: labels ±16.33 (desktop) / ±15.27 (390); arrows ±16.66; slab arrows ±37.

## 3 · Inputs — two ladders (do not mix)

| | footer subscribe | contact sheet rows |
|---|---|---|
| element | `input#email.footer-form-input` | `input.contact-hero-form-input` |
| box | **358.08×40** (−1 x @1440; 374.13×47.63 @390 full-bleed) | fills row: 356.67/713.34×75 (59.53 @390), **border 0** |
| rest | 1px **#B3B3AF** all sides, transparent bg, BT Grotesk 13.33 | transparent; label `heading.h6.tb-h20` **20px/700 UPPER #B4B4B1** inside the row (x inset 26.66) |
| focus | border → **#ED4C1F** (0.45s) | row gets `.active`; bottom rule flips: gray `.line` covered by **#FA3600 `.line-brand`** sliding from off-screen-inline-start to x=0 (live-verified) |
| filled | border → **#FA3600** (filled+focus) | `.active` holds |
| error | — | `.contact-hero-form-error` **#FA3600 chip 106.23×30.63**, white «Wrong format» 13.33, top-right in row |
| submit | 40×40 arrow button inside the input's right end | full-row 86.66 btn-fill (§2) |

## 4 · Menus / overlays

- **Dropdown** `.header-menu-dropdown`: absolute under nav cell, `(713.34,55.3)`, **219.98 wide**, collapsed h≈2/op 0, GSAP opens. `.header-menu-dropdown-inner.bg-global` = **1px #B3B3AF ×4 sides** + paper. Items 217.98×37.33, mono 11.67, bottom hairline each, hover = roll only.
- **Mobile menu** `.header-menu` (absolute below the 49.61 bar): rows Product/Pricing/Resources/About **40.08** + `.header-cta.only-mb` **50.98** + closing hairline at 259.91; collapsed shut at rest (nothing paints), `.header-menu-btn.active` opens.
- **Cookie banner** `#heron-cookie-root > .cookie-banner.bg-global.is-visible`: FIXED z100009; desktop **601.25×38.33 @(825.44,848.36)** (padding 5/6.67/5/13.33), 4× 1px **#282828** line divs, **hard shadow 0 6.67 0 −1.67**; mobile **374.13×93.45 @(0,734.67)**, top/bot lines only, buttons side-by-side. Buttons §2. Accept hides instantly; consent cookie + `window.HeronConsent` (r313).
- **Success panels** `.w-form-done` (`.footer-form-success` / `.contact-hero-form-success`): swap the form in place — «Thanks for reaching out!» h6 20px/700 (#282828) + `.txt-reg` note + closing hairline.
- **Window/dialog motif** (404 mobile noti, chat mockup, TOC tooltip): **#282828 head bar ≈27–31px** (window chrome, white/mono title) + **paper body with 1px ink outline** — never a drop-shadow modal.

## 5 · Cards (flat paper + corner marks)

| card | geometry | chrome |
|---|---|---|
| `.about-team-item` | **475.56×635.48**, 3-up | photo 418.91×487.19 inset 28.33 + **10×10 '+' at the 4 photo corners** (`.about-team-item-plus-item`) + centered name 22px/700 + role; no border |
| `.resource-hero-item` | **356.67×392.95**, 4-up | art mat 330.02×220 inset 13.33 with 10×10 '+' at corners; mono date 10px right + title 13.33×2 lines |
| `.pricing-hero-package` column | 285.33×226.23 | mono type 13.33 + blurb 11.67 + **dashed divider** + price 23.33/700 + `«/month»` mono 10 + slab CTA 232.03×39.64 |
| `.product-how-item` | 475.56×247.83, 3-up | mono label head 42.98 + title 20px + sub 13.33; hairline top |
| `.home-hero-img-deco` (annotation pin) | ~199.54 wide | **12.05×12.05 #FA3600 square marker** + hidden mono IBC label (hover reveal) |

## 6 · Windows / instruments

- **Drawing window** `.bg-border` (+ `.bg-border-inner`): box at 10px (1.2rem) inset of its band; 4 bars `.bg-border-item` 6.66 (0.8rem) thick (top/bot 1373.38 long, left/right 646.67–780 tall), bg-image asset; **4 plus marks `.bg-border-plus` 10×10 centered on the bar corners**; inner window 16.66 (2rem) inside. Reused verbatim: landing hero (1406.69×679.98), about hero (×812.33), 404 (×813.33), footer ink strip (×294.16).
- **Ruler/graticule** `.home-hero-ruler` (landing hero only): 4 quadrant wraps (686.69×323.33) × 2 items = 8 overlays, opacity 0 at rest → .64 by pointer proximity; children `.line.line-dash` 1px (border2.svg) horizontals/verticals across the window + 3 **#FA3600 origin-measure lines** (top/bot/left edges). Desktop-only (≥992 + hover).
- **Hero instrument**: crosshair guides #E0E0DA + 8.33 orange plus + Geistmono X:Y readout (40×21.66); replaces the canvas cursor inside the window (r313 D14).
- **Edge tab** `.awwwards`: FIXED z999, `width:5.3rem; top:50%; right:.8rem; translateY(−50%)` — vertically centered tag on the right frame line (1px #B3B3AF border top/bottom/left, open to the frame); 44.16×139.45 @1440 (52.59×166.33 @390, 31.41×98.84 @1024); no breakpoint.
- **Cursor**: 10×10 #FA3600 square canvas + #FC724D reticle (r313; no canvas in touch contexts).

## 7 · Tickers / marquees

- `.home-hero-work-inner.marquee-left.anim`: 16.33px row (15.88 @390), items = square icon 16×16 + mono title; 3 texts looped ×6 copies; `marqueeLeft` 30s linear infinite. Only `marqueeLeft` is used on the strip.
- `.product-hero-logo-inner.swiper-wrapper`: client logo strip 4103.72 wide in a 133.33 band (Swiper 11).

## 8 · Tabs / chips / breadcrumbs

- **Billing tabs** `.pricing-hero-tab-item`: 428.02×43.97 in a 43.97 ruled band; active = **#282828 fill + white mono 13.33**; inactive transparent muted. Not pills.
- **Filter chips** (resources): transparent mono cells (72.61–128.56×32.98) inside a 41.3 ruled band; category ids on wrapper.
- **Breadcrumb** `.policy-hero-breakscrum-link-item`: mono 11.67 row at y 66.66; current crumb #B4B4B1; «Last updated:»+date right.

## 9 · Accordions / lists

- **FAQ** `.product-faq-item.w-dyn-item`: collapsed **62px** (856.13 wide, right cell), head `.product-faq-item-title` 20px/700, **dashed divider** between items, body expands (GSAP).
- **TOC list** `.policy-hero-table-list`: rows 50.63, active row + white-on-dark tooltip 400×37.31.
- **Footer link stacks**: label mono #626260 + links 13.33 on 25.63 boxes.

## 10 · Motion defaults (from r313, unchanged)

`transition: all` (GSAP-driven states) on btn-fill family; `color .4s` links; `border-color .45s` footer input; `transform .48s cubic-bezier(.625,.05,0,1)` icon inners; marquees linear 30s; masked-line reveals on scroll; loader ~7.5s + 835ms center-out split exit; route change = 1.6s 4-edge inset wipe (`--trans-percent` 0→50→0, `--size--line` spike). Scroll = lenis lerp 0.1 on `.main-inner`.

**Delta flags vs r313 digest:** CTA at-rest label color **#FA3600** (digest's #FFFFFF is the anchor's inherited color) · `.btn-fill-bg` true rest state = `opacity:0` + `display:none ≤991px` (digest described only the hover translate) · dropdown items measured 217.98×37.33 (digest 218×37.3 ✓) · FAQ row height 62px (new) · contact ladder is a **row-rule slide** (#B3B3AF→#FA3600, no #ED4C1F) — new fact, do not copy the footer ladder onto contact-style sheets.
