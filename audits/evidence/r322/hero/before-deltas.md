# R322 WP 2-b — hero transplant: BEFORE deltas (current vs the measured extraction)

Measured live @ `r322/hero` (748624ed + V5 type rung) on Vite :5176, agent-browser
session `hero`. Rem = the shared fluid root (8.333px @1440 · 9.209px @768 ·
9.924px @390 — the same gear-box Heron rides, tokens.css R313). Extraction:
`docs/redesign/r322/heron/hero-{1440,768,390}.json` + `hero.md`.

## @1440 (root 8.333px · docH 12413, band 12170–12540)

| seat (Heron measured → ours before) | Heron | Madarek before | Δ |
|---|---|---|---|
| hero band | 171.27×106.44rem (886.65px, 98.5svh) | 1440×887 (100svh−13px) | ≈ equal ✓ |
| **art band** | **84.03rem** (700px) under 6.4rem pad | window 735px (63px pad + stage 672) | +35px |
| art ink | img-inner **164.87×77.63rem** (1373×647, contain fills the box — 96.3% of band width) | svg 1224×612 centered; ink ≈950px = **67% of band width** | −30% width |
| drafting frame | hairline rect + 4 corner plus (1.2rem) | `.bp-stage` border + plus marks ✓ | ✓ |
| ruler overlay | 2×2 dashed grid + red marker lines + 2 mono deco labels, spans the full img box | edge tick strips + dmarks, **opacity 0 at rest** (proximity reveal), display:none ≤991 | invisible at rest |
| **content band** | **16.01rem** (133px): hairlines top+bot, title cols 1–7 (99.07rem) ‖ 1px divider ‖ sub cols 8–12 (72.2rem) | strip 144px: 3 cells `47% / 1fr / max-content` (H1 ‖ lead+[LIVE]+CTA ‖ discover link) | different split, no measured band |
| H1 | 5.6rem w700 lh1, 47ch/2L, cell pad 2.4/3.2rem | 46.67px w600 lh1.05, 2L, 670×98 in the 47% cell | type ✓ (D1 rung); seat ✗ |
| divider | 1px vertical hairline at the 7/8 seam | side-cell `border-inline-start` (1px, different x) | ≈ present, wrong geometry |
| sub paragraph | 51.89rem box, 1.6rem/400 lh1.3, 165ch/4L | lead 396×51 (44ch/2L) + [LIVE] chip 141×31 | shorter copy, debug chip |
| CTA | 17.11×11.65rem flush inline-end of the sub cell, BESIDE the paragraph | 351×48 bottom-inline-start of the side cell — **diagonal leap from the H1** (reviewer defect) | the composition defect |
| marquee | 72.2×4.36rem strip under sub+CTA (5×3 mono items + arrows) | **absent** (the capabilities ticker lives in the statement band) | missing seat |

## @768 (root 9.209px · docH 12499, band 12388–12766)

| seat | Heron | Madarek before | Δ |
|---|---|---|---|
| hero band | 81.79×109.58rem (1009px) | 1012 (100svh−14px) | ≈ ✓ |
| art band | 78.13rem (720px); img-inner 76.99×72.13rem, contained ink ≈710×357 | window 703; svg 728×614 | ✓ league |
| content band | 26.26rem (242px): title 40.89rem ‖ divider ‖ sub 40.89rem | strip 301px: 56% / 1fr + discover track 2 | ✗ |
| H1 | 4rem w600 (ours: the D1 rung resolves 36.9px = 4rem ✓), 4L | 422×77, 2L in the 56% cell | seat ✗ |
| sub | 23.8rem wide, 165ch/9L + CTA 17.1×21.9rem | side 308×200 (lead 6–8 rows) + CTA 201×48 | ✗ |
| marquee | 40.89×4.36rem | absent | missing |

## @390 (root 9.924px · docH 11368, band 11269–11612)

| seat | Heron | Madarek before | Δ |
|---|---|---|---|
| hero band | 37.71×83.48rem (827.7px) | 828 (100svh−1.62rem) | ≈ ✓ |
| art band | 42.28rem (419px); img-inner 34.51×39.08rem — contained ink ≈342×172 **full window width** | window 403px: stage 340px tall, **svg 210×105 — the V10 defect** (art ≈54% of the window width, vast blank) | **the defect** |
| ruler | none @390 | display:none ≤991 ✓ | ✓ |
| content band | 36.8rem (365px) stacked: title 12.8rem (H1 3.2rem/3L + hairline) → sub 24rem (para 13.6 + full-width CTA 6.4) → marquee 4rem | strip 287px stacked: H1 67px (2L) → lead+foot rows → CTA 376×48 full-width + 109px dead pad | ✗ structure; CTA ✓ |
| H1 | 3.2rem w600 (ours: D1 floor 31.74px ✓), 3L | 67px, 2L | ✓ type |
| [LIVE] disclosure | none (Heron has no equivalent) | 141×31 chip @390 | to delete (V1 family) |

## Other pins verified before the rebuild

- killed-string sweep @1440/@390: `R313]` `[0,` `UNITS` `· LIVE` `live ·` `MDRK ·` `checkpoints` = 0 ✓; `[LIVE]` present in the hero (this package deletes it).
- the stray top-left phone glyph: `.et-mark`/`.et-rail` display:none @390 (foreman's tail kill, verified live); the remaining 7px three-bar glyph at (7,14) is the menu burger's icon — header package, left alone per the brief.
- consent banner @390: fixed, y 750–844 (94px) — the phone hero's 11rem bottom reserve owns it.
- funnel pins read from `tests/unit/landing-funnel.test.tsx`: `.fo-hero-actions .fo-hero-cta` ×1 with «أنشئ حسابك الجامعي» → /auth/register; `to="/auth/register"` count 5; `to="/auth"` count 5 — the transplant must keep all three.
- e2e/unit pins on `.fo-hero-title` text «رحلة تعلم واحدة / من المحاضرة إلى الإتقان» — copy stays.
