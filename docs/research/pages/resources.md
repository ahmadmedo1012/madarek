# Heron — /resources

**Crawl:** `resources-1440x900.json` / `resources-390x844.json`. Title «Heron AI | Resources». docH **3276** @1440.

| section | y | h |
|---|---|---|
| resource-hero (head + filters + CMS grid) | 0 | 1866.97 |
| cta band | 1866.97 | 698.16 |
| shared footer | 2565.13 | 710.66 |

## Head (0–281.28)

- H1 `h1.heading.h1.tb-h2` **(356.67,126.66 713.33×46.67)** «Re sources» (the live site really spaces it) — BT Grotesk **46.6667/700 #282828**, centered, one line.
- Rule (0,238.98 1426.69×1), then the **filter bar** `.resource-hero-search-wrap.grid` (0,239.98 1426.69×**41.3**):
  - filter chips `div#insights / #ai-practices / #design-workflows` ≈ (561.27…, 244.14 **72.61–128.56 × 32.98**) — mono `.txt-font-mono.txt-14` 11.67/500 UPPER labels («Insights», «AI Practices», «Design Workflows»); active category id on the wrapper; chips are transparent cells (no pill boxes) sitting in the grid — the category filter of the CMS list.
- Band closes with rule (0,280.28).

## CMS card grid (0,281.28 1426.69×1585.69)

`.resource-hero-list` = **4 columns × 356.67** (x 0 / 356.67 / 713.34 / 1060.01), rows of cards **356.67 × 392.95** (4 rows @1440), separated by hairlines (grid rules; the list block closes with rule at 1865.97).

Card anatomy (first card):

```
div.resource-hero-item.w-dyn-item.active (0,281.28 356.67×392.95)
└ a.resource-hero-item-inner (same box)
  ├ div.resource-hero-item-img (0,281.28 356.67×246.66)
  │ ├ .resource-hero-item-img-main.bg-global (13.33,294.61 330.02×220)   ← paper mat, 13.33 (1.6rem) inset
  │ │   └ img.img-basic.img-abs.img-cover (13.33,294.61 330.02×220)      ← cover art
  │ └ div.resource-hero-item-img-plus (0,281.28 356.67×246.66)           ← 10×10 '+' marks at the 4 mat corners
  └ div.resource-hero-item-content (0,527.94 356.67×146.3)
    ├ .resource-hero-item-date: mono .txt-font-mono.txt-12 «31 July 2026» 10px/500 (75.64,547.94) — right-aligned cell
    └ .resource-hero-item-title (13.33,570.92 330.02×44)  13.33px 2-line title
```

- The image mat carries the drawing-window corner marks (same `plus` component as the hero window/team cards).
- No borders/radius/shadows; hover = art zoom + title roll (standard Heron link grammar).

## @390

- H1 centered ~31.76px; filter chips wrap (chips ≈ 40.08 tall, mono 13.89px).
- Grid: **1 column**, cards 374.13 wide × ~530 tall, same anatomy (mat inset 15.88, art 342.38 wide, plus marks at corners), rules between rows full-bleed.
- Shared mobile cta + footer bands.

**Notes:** this is the only "archive/index" pattern on Heron — reusable as the Madarek resources/insights template. The filter bar is a row of transparent mono cells inside a 41.3px ruled band — not pills, not buttons. Dates are mono 10px right-aligned in the content row (cell grammar again).
