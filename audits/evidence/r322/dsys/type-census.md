# R322 type census — the landing sheet as rendered (measured, not guessed)

Generated: 2026-10-28T04:44:49.329Z · source: http://localhost:5175/ · script: `scripts/r322/type-census.mjs`

Method: Playwright chromium, computed styles on EVERY text-bearing element
(h1–h6, p, span, a, button, li, figcaption, strong, em) after `load` +
`document.fonts.ready` + 3s settle (loader exit + reveal delays). Rem values
divide by the FLUID root (html font-size — the R313 gear-box).

## 1440x900 — fluid root 8.333px

Swept 576 text-bearing elements; **44 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 46.67px / 5.601rem | 700 | Alexandria | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1 |
| 60px / 7.2rem | 700 | Alexandria | div.st-spread › div.st-copy › h2#statement-title.st-title<br>div.st-copy › h2#statement-title.st-title › span.wr.wr-scrub<br>h2#statement-title.st-title › span.wr.wr-scrub › span.wr-w ×5<br>span.wr.wr-scrub › span.wr-w › span.wr-i ×5<br>section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |
| 33.33px / 4rem | 700 | Alexandria | ol.pm-cards › li.reveal-up.reveal-d-1 › h3.pm-card-title ×2<br>ol.pm-cards › li.reveal-up.reveal-d-2 › h3.pm-card-title<br>ol.pm-cards › li.reveal-up.reveal-d-3 › h3.pm-card-title<br>ol.wy-rail › li.wy-stage › span.wy-stage-verb ×4<br>ul.rl-cards › li.reveal-up.reveal-d-1 › h3.rl-card-title ×3<br>ul.rl-cards › li.reveal-up.reveal-d-2 › h3.rl-card-title ×3<br>ul.rl-cards › li.reveal-up.reveal-d-3 › h3.rl-card-title ×2 |
| 48.96px / 5.875rem | 700 | Alexandria | div.jt › div.jt-pin › p.jt-statement |
| 40px / 4.8rem | 700 | Alexandria | div.jt-stations › article.jt-station › h3.jt-station-verb ×4 |

**Distinct display sizes:** 60 · 48.96 · 46.67 · 40 · 33.33 (5 sizes) · **distinct weights:** 700

## 991x900 — fluid root 11.883px

Swept 509 text-bearing elements; **42 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 28.52px / 2.4rem | 700 | Alexandria | div.fo-header-inner › a.fo-brand › span.fo-brand-name<br>a.fo-brand › span.fo-brand-stack › span.fo-brand-name |
| 40px / 3.366rem | 700 | Alexandria | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1<br>div.st-spread › div.st-copy › h2#statement-title.st-title<br>div.st-copy › h2#statement-title.st-title › span.wr.wr-scrub<br>h2#statement-title.st-title › span.wr.wr-scrub › span.wr-w ×5<br>span.wr.wr-scrub › span.wr-w › span.wr-i ×5<br>section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |
| 47.53px / 4rem | 700 | Alexandria | ol.pm-cards › li.reveal-up.reveal-d-1 › h3.pm-card-title ×2<br>ol.pm-cards › li.reveal-up.reveal-d-2 › h3.pm-card-title<br>ol.pm-cards › li.reveal-up.reveal-d-3 › h3.pm-card-title<br>ul.rl-cards › li.reveal-up.reveal-d-1 › h3.rl-card-title ×3<br>ul.rl-cards › li.reveal-up.reveal-d-2 › h3.rl-card-title ×3<br>ul.rl-cards › li.reveal-up.reveal-d-3 › h3.rl-card-title ×2 |
| 85.55px / 7.199rem | 700 | Alexandria | header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em |
| 34px / 2.861rem | 700 | Alexandria | div.jt › div.jt-flow › p.jt-statement-m |
| 57.04px / 4.8rem | 700 | Alexandria | div.jt-stations › article.jt-station › h3.jt-station-verb ×4 |

**Distinct display sizes:** 85.55 · 57.04 · 47.53 · 40 · 34 · 28.52 (6 sizes) · **distinct weights:** 700

## 390x844 — fluid root 9.924px

Swept 419 text-bearing elements; **29 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 32.76px / 3.301rem | 700 | Alexandria | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1 |
| 28.86px / 2.908rem | 700 | Alexandria | div.st-spread › div.st-copy › h2#statement-title.st-title<br>div.st-copy › h2#statement-title.st-title › span.wr.wr-scrub<br>h2#statement-title.st-title › span.wr.wr-scrub › span.wr-w ×5<br>span.wr.wr-scrub › span.wr-w › span.wr-i ×5<br>section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>section#product.pr-section › div.pr-head › h2#pr-title.reveal-up.reveal-d-1<br>div.pr-head › h2#pr-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |
| 71.45px / 7.2rem | 700 | Alexandria | header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em |
| 47.63px / 4.799rem | 700 | Alexandria | div.jt-stations › article.jt-station › h3.jt-station-verb ×4 |

**Distinct display sizes:** 71.45 · 47.63 · 32.76 · 28.86 (4 sizes) · **distinct weights:** 700

## Reading (the V5 verdict against the numbers)

The owner's claim «display headings are black-weight, 80–110px, in at least four
different sizes» is **confirmed, and worse at the edges**:

- **1440:** 5 distinct display sizes (60 · 48.96 · 46.67 · 40 · 33.33), every one
  at weight **700** (Alexandria 700 — the heaviest wired cut). One ladder token
  (`--fs-display-lg` 7.2rem) feeds the 60px row, but `.jt-statement`
  (clamp 48.96), `.fo-hero-title` (`--fs-h1` 46.67), `.jt-station-verb` (4rem
  40) and the card titles (4rem 33.33) fork around it — five sizes, no scale.
- **991 (tablet-band edge):** **6 distinct sizes, max 85.55px** — the fluid
  root's tablet band (1.1990407674vw → root 11.883px) amplifies the same 7.2rem
  rung to 85.55px. This is the measured source of the owner's «80–110px».
- **390:** 4 distinct sizes; **`.chapters-title` renders 71.45px** — it (and
  `.jt-station-verb`, 47.63px) **escaped the ≤767 re-pin list** in landing.css
  (the ≤767 block re-pins `.pm/.pr/.wy/.rl-title` to 3.2rem→2.908rem and
  `.st-title/.fo-cta-title` to 2.4rem, but `.chapters-title` was never added).
  «الرحلة — أربعة فصول تتحرك أمامك» at 71.45px on a 390 window is the V5
  «one headline breaks into one-word lines» defect, verbatim.
- **Weight census:** the display tier is 100% weight 700 — no 400/500/600
  anywhere. The R322 scale (DESIGN.md §R322) re-weights to 400–600 and collapses
  the five/six ad-hoc sizes into the D1/D2/D3 rungs (clamps carry a vw mid-term,
  so band amplification is impossible by construction).

R322 fix seats for task 1-d (the migration): `.chapters-title` +
`.jt-station-verb` need the mobile re-pin IMMEDIATELY regardless of the new
scale; every `--fs-display-lg` consumer maps to `--fs-d2`; `.fo-hero-title`
maps to `--fs-d1`; card/station titles map to `--fs-d3`.

## Additivity proof (the verification gate)

The R322 token layer is additive only — no consumer yet. Before/after hero
shots (`shots/landing-hero-{1440,390}-{before,after}.png`, taken by this
script's own sweep before and after the tokens.css edit, compared by
`scripts/r322/hero-diff.mjs`):

- **1440:** 124 / 1,296,000 pixels differ (0.0096%), max channel delta 6 —
  the animated grain/ticker ambient layer only (sub-frame noise).
- **390:** **0 differing pixels — pixel-identical.**

The census JSON regenerated after the token edit (same numbers: 44/42/29
display elements at 1440/991/390) — the tokens changed nothing measurable.

