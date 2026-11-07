# T-16 — Mini Blind Panel (R333 rubric, 12 × 7 = 84)

**Judge:** sub-agent T-16, blind (no knowledge of this round's fixes; no r339 docs or git log read).
**Ours:** http://localhost:5317/ (vite dev, `مدارك · منصّة التعليم الذكي`, RTL/ar, IBM Plex Sans Arabic).
**Reference:** https://heronaiapp.com/ (live, Lenis wrapper scroll, BT Grotesk, cream/blueprint aesthetic).
**Method:** playwright chromium — 3 viewports (1440×900 / 768×1024 / 390×844) × 2 themes; full-page + 0/25/50/75/100% scroll shots (1.2s settle); 20-frame 8s smooth-scroll scrub; hover on nav/CTA/card; preloader within ~450ms; Tab focus + direct CTA focus; computed-style metrics; A/B side-by-side adjudicated via vision model over the captures (files in /tmp/t16, not committed). Note: ours' true dark mode required booting with `madarek-theme` localStorage (attribute-only toggle is reverted by the store); reference has no dark mode (its "dark" captures are identical to light).

## Scores (0–7 each)

| # | Criterion | Score | One-line justification |
|---|---|---:|---|
| 1 | Composition & layout structure | **5** | Grid-driven hero elevation is strong, but the bottom CTA/footer band is suffocated and the 75% section shows fragments at four mismatched scales with a stray ~340px thumbnail. |
| 2 | Typography (hierarchy, rhythm, measure) | **4** | Display headline works, but body ~14px / mono numerals / nav compete as equal tiers and mixed-direction caption lines break rhythm; mobile `[01]–[03]` index is below legibility at 390. |
| 3 | Spacing & density | **4** | Hero drawing breathes, yet bottom 15% stacks cookie toast + CTA + footer; plan section leaves ~15% whitespace; mobile alternates cramped hero with multi-viewport dead voids. |
| 4 | Imagery / art direction | **6** | Hand-drawn architectural elevation→floor-plan with hatching, door swings, red `[01–05]` tags is genuinely distinctive and renders natively in dark (light-on-dark linework, no inverted photos). |
| 5 | Storytelling / narrative flow | **4** | "رحلة تعلم واحدة…" is a good promise but there is no connective thread elevation→plan→product; at 50/75% nothing leads the eye in order. |
| 6 | Motion richness | **4** | Texture and reveals exist near the hero, but at 50/75% the scrub shows no progressive reveal and the moving gallery has no motion cues (no arrows/dots/edge fade) — reads static/clipped. |
| 7 | Scroll feel & progress | **4** | Lenis is present and page height is right (15,171px), but only 1 progress element vs reference's scroll-tied boot-log + edge-to-edge red progress rule; scroll-state clarity at 75% judged 2/7. |
| 8 | Micro-interactions | **4** | CTA hover shows a surface fill but low-contrast with no secondary affordance (no arrow nudge/underline sweep); focus ring is excellent (2px solid rgb(199,46,0)). |
| 9 | Info density vs breathing room | **4** | Reference gives each asset a near-empty cell (7/7 breathing); ours crowds captions/dimensions/CTA/index at equal weight around the plan and stacks five card crops on one canvas at 75%. |
| 10 | Consistency | **4** | Blueprint language is reliable *within* the drawings, but the page hosts two design languages — drafting-paper aesthetic vs generic light-SaaS product cards sharing only a red accent. |
| 11 | Arabic/RTL craft | **5** | `dir=rtl`, letter-spacing `normal`, h1 line-height 63/46.7≈1.35, body 22px — all floors met; but Arabic headlines clip mid-word at 75% and the numbered index is unreadable at 390. |
| 12 | Polish | **5** | Cookie consent toast permanently glued over the footer, orphaned red squares at page edge, sticky side tab overlapping the drawing; true dark mode is disciplined (6/7) and the red focus ring is visible. |

## Total: **53 / 84** (target ≥74, floor 6/criterion — **not met**: 9 criteria below 6)

## Top-5 weakest things seen (concrete) + fixes

1. **75%-scroll gallery section (desktop, light, 1440)** — cards clipped hard at the right edge with Arabic text running off-canvas mid-word ("مجمع", "مبادرة البنك"), a stray unaligned third thumbnail, no carousel chrome (no arrows/dots/snap/edge fade), and a large empty void. *Fix: one thumbnail scale per cell, edge fade + snap points, visible carousel controls.*
2. **Mobile 390 — dead vertical voids** — after the "أربعة أوجاع" section and before the footer there are multiple-viewport-height blank regions with only stray dash marks (reads as a failed load); hero illustration and full-bleed photo butt against screen edges with ~0 safe margin; `[01]/[02]/[03]` nav strip unreadably small. *Fix: collapse the voids, enforce ≥20px gutters + safe-area padding, hide or upsize the index at mobile.*
3. **Cookie consent toast overlapping the footer/CTA band (all viewports)** — permanently covers the densest zone of the layout. *Fix: dismissible banner with layout offset (or bottom sheet), never overlaying primary CTAs.*
4. **Two design languages under one brand** — the beige drafting-paper/mono-tag/linework system vs generic light-SaaS product cards (75% section). *Fix: carry paper background, hairline borders, and `[tag]` labels into the product-screenshot cards.*
5. **No scroll-tied progress/narrative mechanic** — reference increments a boot-log and an edge-to-edge red rule with scroll so you always know where you are; ours has a single progress element and low-contrast CTA hover fill. *Fix: scroll-scrubbed annotation reveals on the drawings + a persistent progress rule; invert-to-ink hover on CTAs.*

## Method notes / evidence
- Metrics (ours, 1440 light): rtl/ar, IBM Plex Sans Arabic, body line-height 22px, h1 46.7px/63px/weight 600/letter-spacing normal, 9 sections, 36 imgs, 66 svgs, scrollHeight 15,171px, Lenis present, 1 progress element, cursor auto.
- Metrics (ref, 1440): en/LTR, BT Grotesk, h1 46.7px with −0.93px tracking, 8 sections, 45 imgs, 144 svgs, Lenis wrapper 14,144px, 7 progress elements, no preloader, no dark mode.
- Ours preloader captured within ~450ms of commit (hydration splash renders before paint); reference shows no preloader.
- Captures: /tmp/t16 (335 files — full/scroll/frames/hover/focus/preloader for both sites). Not committed per rules.
