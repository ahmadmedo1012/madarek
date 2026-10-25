# R318 · C1-C evidence — §A2 / §A9 / §A10 contrast + gutter marker

Agent C1-C, branch `c1/c`. Head 55afbae + this change. Probe: Playwright
chromium-1223 headless, loader bypassed (`sessionStorage madarek-intro-skip=1`),
theme forced on `<html data-theme>`; §A2 states driven by setting `.jt`
`--jt-p` ∈ {0, 0.5, 1} inline + `.jt-intro` `data-on="on"` (one rAF pair each).
Ratios = WCAG relative-luminance contrast, alpha colours composited over the
measured ground. Raw probe data: `probe-before.json` / `probe-after.json`.

## §A2 — the INTRODUCTION card (`.jt-intro`, pin instance ≥992px)

| element (state)                    | before L | after L | before D | after D |
|------------------------------------|----------|---------|----------|---------|
| title «مقدمة» (p 0 / .5 / 1)        | 1.44     | 13.57   | 1.56     | 13.85   |
| mono `[تابع التمرير]` (p .5 / 1)   | 1.44     | 13.57   | 1.56     | 13.85   |
| revealed body word (line 1, w0)     | 10.41    | 10.41   | 8.99     | 8.99    |
| unrevealed words (p 0 & p .5)      | fully clipped (leak 0px, `translateY(115%)` inside `overflow:hidden`) — unchanged, verified hidden | ✓ | ✓ | ✓ |
| ≤991 readable twin `.jt-intro-m` title / more | 1.44 / 1.44 | 13.57 / 13.57 | 1.56 / 1.56 | 13.85 / 13.85 |

Root cause: base.css `p { color: var(--text-secondary) }` (the generic
paragraph ink) painted both `<p>` seats at ~1.4:1 on the card's dark
`var(--text)` ground. Fix is local: `.jt-intro-title` / `.jt-intro-more`
own `color: var(--bg)` (paper) — the token pair swaps with the theme, so the
dark sheet keeps the same ratio. Body-line colour and the `.wr-scrub`
unmasking chain were already correct (paper-mix ≥8.99:1 revealed; unrevealed
words fully clipped — no `.wr-scrub` change needed). Card geometry, seat and
opacity windows untouched (C3 owns the re-seat).

## §A9 — consent «موافق» (`.cb-accept`) — the real primary

| state                              | before L | after L | before D | after D |
|------------------------------------|----------|---------|----------|---------|
| label on fill (rest)               | 1.15     | 13.57   | 1.15     | 13.85   |
| hover/focus fill-wipe pair         | 1.15     | 5.50    | 1.15     | 6.20    |
| `:active` inverted pair            | —        | 13.57   | —        | 13.85   |
| «أرفض» `.cb-reject` label          | 13.57    | 13.57   | 13.57    | 13.85   |

Seat (kept): 78.7×28.0 @1440 (measured 78.63×27.98), radius 0, 1px ink
border inside the border-box; banner 601×38 one line @1440; ≤479 panel:
accept 163.4×44 (44px touch floor), banner 358.8×94.2 @390. Before fill was
the r315 ghost (rgb(239,239,239) + WHITE label, light-theme pin) — retired
with the pin; now `var(--text)` fill + `var(--bg)` label, hover keeps the
site's `.btn` wipe grammar on the text-safe accent rung (`--accent-ink` +
`--accent-fg`), `:active` inverts to paper/ink. `.cb-reject` untouched
(passes in both themes).

## §A10 — EdgeTab ≤991px gutter marker

| width | before: full tab body (hit × mark) over content | after: visual 15×14 @x0, hit 44×44 transparent |
|-------|--------------------------------------------------|-----------------------------------------------|
| 360   | hit 44×188, mark 15.4×15.4 @x24.4 → ON `.bp-stage` | ✓ zero text-rect intersection |
| 390   | hit 52.6×189.7, mark 16.7×16.7 @x26.4 → ON `.bp-stage` | ✓ |
| 430   | mark 18.4×18.4 @x29.1 → ON `.bp-stage` | ✓ |
| 480   | mark 20.5×20.5 @x32.4 → ON `.bp-stage` | ✓ |
| 600   | mark 25.6×25.6 @x40.3 → ON `.bp-stage` | ✓ |
| 768   | hit 48.8×176.5, mark 15.5×15.5 @x24.5 → ON `.bp-stage` | ✓ |
| 820   | mark 16.5×16.5 @x26.2 → ON `.bp-stage` | ✓ |

After the fix the rect scan at every width finds ZERO text-leaf and card
intersections with the visual (the single classified rect per width is the
full-bleed decorative `.fo-hero-strip` top hairline / `.bp-stage` bounding
box — textless, backgroundless; pixel scan of the band shows only paper
grain beside the marker). The visual (14px orange square + 1px `--rule`
outer hairline = 15×14px) lives inside the 20px page-gutter band, never
reaching content; the ≥44px transparent hit area carries the touch floor;
aria-label preserved, still a real `<button>`; the rotated label is
`display:none` at ≤991. Desktop ≥992px unchanged (hit 44.2×163 @x6.7,
mark 14×14, label visible).

## docH protection

`document.documentElement.scrollHeight` @1440×900: **12340 before → 12340
after** — the protected value, inside the 12,340 ±1% band. No section heights
touched.

## Crops (JPEG q70, all <150KB)

- `a2-intro-1440-light-before/after.jpg` — the card at `--jt-p` .5
- `a9-consent-1440-light-before/after.jpg` — the banner pair
- `a10-etab-390-before/after.jpg` — the 390×844 edge band
