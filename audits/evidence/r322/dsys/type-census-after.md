# R322 type census — the landing sheet as rendered (measured, not guessed)

Generated: 2026-10-28T06:36:58.699Z · source: http://localhost:5175/ · script: `scripts/r322/type-census.mjs`

Method: Playwright chromium, computed styles on EVERY text-bearing element
(h1–h6, p, span, a, button, li, figcaption, strong, em) after `load` +
`document.fonts.ready` + 3s settle (loader exit + reveal delays). Rem values
divide by the FLUID root (html font-size — the R313 gear-box).

## 1440x900 — fluid root 8.333px

Swept 570 text-bearing elements; **26 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 46.67px / 5.601rem | 600 | IBM Plex Sans Arabic | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1 |
| 33.33px / 4rem | 600 | IBM Plex Sans Arabic | div.st-spread › div.st-copy › h2#statement-title.st-title<br>div.st-copy › h2#statement-title.st-title › span.wr.wr-scrub<br>h2#statement-title.st-title › span.wr.wr-scrub › span.wr-w ×5<br>span.wr.wr-scrub › span.wr-w › span.wr-i ×5<br>div.jt › div.jt-pin › p.jt-statement |
| 40px / 4.8rem | 600 | IBM Plex Sans Arabic | section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em<br>section#product.pr-section › div.pr-head › h2#pr-title.reveal-up.reveal-d-1<br>div.pr-head › h2#pr-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |

**Distinct display sizes:** 46.67 · 40 · 33.33 (3 sizes) · **distinct weights:** 600

## 991x900 — fluid root 11.883px

Swept 502 text-bearing elements; **26 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 28.52px / 2.4rem | 600 | IBM Plex Sans Arabic | div.fo-header-inner › a.fo-brand › span.fo-brand-name<br>a.fo-brand › span.fo-brand-stack › span.fo-brand-name |
| 47.57px / 4.003rem | 600 | IBM Plex Sans Arabic | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1<br>section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |
| 28.44px / 2.393rem | 600 | IBM Plex Sans Arabic | div.st-spread › div.st-copy › h2#statement-title.st-title<br>div.st-copy › h2#statement-title.st-title › span.wr.wr-scrub<br>h2#statement-title.st-title › span.wr.wr-scrub › span.wr-w ×5<br>span.wr.wr-scrub › span.wr-w › span.wr-i ×5<br>div.jt › div.jt-flow › p.jt-statement-m |

**Distinct display sizes:** 47.57 · 28.52 · 28.44 (3 sizes) · **distinct weights:** 600

## 768x1024 — fluid root 9.209px

Swept 502 text-bearing elements; **11 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 36.86px / 4.003rem | 600 | IBM Plex Sans Arabic | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1<br>section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |

**Distinct display sizes:** 36.86 (1 sizes) · **distinct weights:** 600

## 390x844 — fluid root 9.924px

Swept 412 text-bearing elements; **13 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 31.74px / 3.198rem | 600 | IBM Plex Sans Arabic | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1<br>section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em<br>section#product.pr-section › div.pr-head › h2#pr-title.reveal-up.reveal-d-1<br>div.pr-head › h2#pr-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |

**Distinct display sizes:** 31.74 (1 sizes) · **distinct weights:** 600

## 360x800 — fluid root 9.16px

Swept 412 text-bearing elements; **13 sit in the display tier (≥28px)**.

| size (px / rem) | weight | face | selectors |
|---|---|---|---|
| 31.74px / 3.465rem | 600 | IBM Plex Sans Arabic | section.fo-hero › div.fo-hero-strip › h1.reveal-up.reveal-d-1<br>section#live.pm-section › div.pm-head › h2#pm-title.reveal-up.reveal-d-1<br>div.pm-head › h2#pm-title.reveal-up.reveal-d-1 › em<br>header.chapters-head › div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1<br>div.chapters-head-copy › h2#chapters-title.reveal-up.reveal-d-1 › em<br>section#product.pr-section › div.pr-head › h2#pr-title.reveal-up.reveal-d-1<br>div.pr-head › h2#pr-title.reveal-up.reveal-d-1 › em<br>section.wy-section › div.wy-head › h2#wy-title.reveal-up.reveal-d-1<br>div.wy-head › h2#wy-title.reveal-up.reveal-d-1 › em<br>section#roles.rl-section › div.rl-head › h2#rl-title.reveal-up.reveal-d-1<br>div.rl-head › h2#rl-title.reveal-up.reveal-d-1 › em<br>div.fo-cta-grid › div.fo-cta-inner › h2.reveal-up.reveal-d-1<br>div.fo-cta-inner › h2.reveal-up.reveal-d-1 › em |

**Distinct display sizes:** 31.74 (1 sizes) · **distinct weights:** 600


## Reading

Tables are machine-measured post-migration output. The
hand-checked verdict (seat→rung mapping, band checks, docH)
lives in the 1-d census-after companion notes.
