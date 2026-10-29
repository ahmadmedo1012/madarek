# R324 section ledger — Heron ↔ Madarek (P1)

> Heron numbers: measured by scripts/r324/heron-extract.mjs (docY/height, scroller content coords).
> Madarek numbers: measured border-box heights (scripts/r324/section-heights.json, Playwright @ same bps).
> docH contract: landing docH within ±2 % of Heron at 1440/1024/768/390/360 (X14), section by section.

| Heron section | our counterpart | h @1440 | h @1024 | h @768 | h @390 | Δ@1440 |
|---|---|---|---|---|---|---|
| `home-hero` | `— (hero/footer chrome)` | 887 | 759 | 1009 | 828 |  |
| `home-intro` | `.st-section` | 723 | 514 | 527 | 837 | +14.0 % |
| `home-problem` | `.pm-section` | 743 | 528 | 1333 | 869 | -19.1 % |
| `home-map` | `.chapters` | 6300 | 5376 | 5454 | 4819 | -1.7 % |
| `home-platform` | `.pr-section` | 710 | 505 | 508 | 517 | +0.0 % |
| `home-why` | `.wy-section` | 681 | 484 | 877 | 806 | -0.1 % |
| `home-usecase` | `.rl-section` | 887 | 759 | 1336 | 948 | +30.2 % |
| `cta` | `.fo-cta` | 698 | 496 | 541 | 500 | +0.0 % |
| `footer` | `— (hero/footer chrome)` | 711 | 505 | 949 | 1239 |  |

Heron docH: **12338** @1440 · **9926** @1024 · **12535** @768 · **11363** @390.
Madarek docH (post-walk, measured): 12,922 @1440 · 11,761 @1024 · 11,874 @768 · 11,950 @390 · 11,462 @360.

Δ docH @1440: +4.7 % (target ±2 %) · @1024: +18.5 % · @768: -5.3 % · @390: +5.2 %
