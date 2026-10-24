# Heron — /pricing

**Crawl:** `pricing-1440x900.json` / `pricing-390x844.json`. Title «Heron AI | Pay for the hours you get back». docH **3153** @1440.

| section | y | h |
|---|---|---|
| pricing-hero (head + tabs + packages + table) | 0 | 1244.63 |
| product-faq | 1244.63 | 499.98 |
| cta band | 1744.61 | 698.16 |
| shared footer | 2442.77 | 710.66 |

## Head (0–342.95)

- H1 `h1.heading.h1.tb-h2` **(455,119.98 516.66×93.34)** «Pay for the hours you get back» — BT Grotesk **46.6667/700 #282828**, **centered**.
- Sub `.txt-20.tb-txt-16` **(285.33,226.66 856.02×20)** 16.6667px/500 muted — centered («Start free, then let Heron work inside your tools…»).

## Billing tabs (0,299.98 1426.69×43.97)

```
div.pricing-hero-tab-wrap.pricing-hero-grid.bg…
├ [empty first cell 285.33]                       ← the grid's label gutter, aligns with the table's first column
├ div.pricing-hero-tab-item.active (285.33,299.98 428.02×43.97)  bg #282828, «Monthly» mono txt-16 13.33px/500 #FFFFFF
└ div.pricing-hero-tab-item        (713.34,299.98 428.02×43.97)  transparent, «Yearly (Save 15%)» mono 13.33 muted
```
- Active tab = **solid #282828 fill + white mono label** (the nav-cell fill grammar, not orange). Bottom rule of the band: hairline (0,342.95 1426.69×1).

## Package cards — a ruled 5-column grid, NOT boxed cards (0,342.95 1426.69×226.23)

`.pricing-hero-package-wrap.bg-global` with top hairline; `.pricing-hero-package.pricing-hero-grid` = **5 columns × 285.33** (label gutter + 4 plans). Column x: 285.33 · 570.67 · 856 · 1141.34. Per plan cell (inset 26.66):

| element | geometry | style |
|---|---|---|
| type `.txt-font-mono.txt-16` «Free / Standard / Business / Enterprise» | (…,369.61 205.36×17.31) | Geistmono **13.3333/500** #282828 |
| blurb `.txt-14` | (…,393.58 205.36×32.66) | BT Grotesk 11.6667 muted |
| `.line.line-dash.line-horizital` | (…,438.56 285.34×1) | 1px **dashed** divider (border2.svg tile) |
| price `.heading.h5.mb-h4` | (…,459.56) | BT Grotesk **23.3333/700** #282828 — «$99» + `.txt-font-mono.txt-12` «/month» 10px |
| CTA `a.pricing-hero-package-btn.btn-fill-hover` | (…,509.55 **232.03×39.64**) | mono «Get started»/«Contact us» white on **#FA3600 slab** (r313 `cta-contact` grammar: hover = dark #282828 fill wipe + label roll + dual-arrow slide ±37px) |

Plans: **Free** ($0, «Get started») · **Standard $99/mo** ($90 yearly) · **Business $295/mo** ($290) · **Enterprise Custom** («Contact us»). No card borders/backgrounds — columns are separated only by the grid rhythm; the dashed rule under the blurb is the only internal stroke.

## Comparison table (0,569.19 1426.69×675.44) — a div grid, not `<table>`

```
div.pricing-hero-table-row.pricing-hero-grid  (1426.69 × 50.63)  × N rows (y 569.19, 619.81, 670.44, 721.06, 771.69 …)
├ div.pricing-hero-table-col.item-first (0,… 285.33×50.63)
│   └ .pricing-hero-table-col-title (26.66,… ~211.53×17.31)  BT Grotesk 13.33/500 #282828  ← row label
├ 4 × div.pricing-hero-table-col (285.33-wide at x 285.33/570.67/856/1141.34)
    ├ value: .pricing-hero-table-col-sub (inset 26.66) 13.33px muted (e.g. «$0», «5 / month»)
    └ or check: .pricing-hero-table-col-check 16.66×16.66 (svg path 9.63×6.83) at the 26.66 inset
```
- Row height **50.63**; rows are separated by hairline rules (the grid carries them); the header row (y 569.19) repeats the plan names in the 4 data columns.
- Check = 16.66×16.66 inline check SVG; unchecked/limited = text value or nothing.

## FAQ — the accordion (1244.63, 499.98)

- LEFT cell (26.66,1271.28): mono label + `h2.heading.h2.tb-h4` **«Got questions? We've got answers»** 40px/600, 3 masked lines (416.66×120).
- RIGHT list `div.product-faq-cms.w-dyn-list` **(570.56,1244.63 856.13×499.98)**:
  - `.product-faq-item.w-dyn-item` **62px tall collapsed** (r313 D12's "218×37.3" was the dropdown item; FAQ items are full-width 856.13 rows);
  - head `.product-faq-item-title` `heading.h6.tb-h16` **20px/700** (597.22,1264.63 759.5×22) — question;
  - divider between items: `.line.line-dash.line-horizital` **856.13×1 dashed**;
  - answer body expands below the head (accordion, GSAP height; answer text 13.33px muted).
- e.g. «Does Heron change model without asking?».

## @390

Head h1 centers at ~31.76px/3 lines; tabs stack into 2 half-width cells; package columns become **full-width stacked blocks** separated by dashed rules (price + CTA full-bleed rows 47.63-ish tall); the comparison table becomes row-pairs (label + value rows, checks keep 16.66 boxes at 19.84 root-scaled ≈ 19.85px); FAQ single column, items 62→~79px. Shared mobile footer.

**Deltas:** r313 digest had no pricing page numbers (r313 measured the landing only) — this file is the fresh baseline. Active-tab fill is #282828 (dark), NOT #FA3600 — do not mirror the CTA orange into the tab.
