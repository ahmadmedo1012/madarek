# 4-A1 — Landing Page Audit (scroll-craft lens)

Agent: 4-A1 (opus) · Scope: `/` public landing — `frontend/src/pages/LandingPage.tsx`, `frontend/src/styles/landing.css`, `BrandMark.tsx`, `LibyaFlag.tsx` (+ polish.css landing blocks it defers to, useReveal, Parallax, CountUp).
Evidence: 33 screenshots in `/tmp/madarek-shots/a1-*` (desktop 1280×900 ×16 scroll positions, mobile 390×844 ×12, dark ×4, megamenu/mobile-menu/focus states), 10 VLM critique calls, pixel-level PNG analysis, live DOM/contrast/geometry probes, interaction probes (keyboard, reveal integrity, breakpoints).

## Scores: desktop 5.5/10, mobile 6/10, dark 5/10

| Section | Score | One-liner |
|---|---|---|
| Hero | 5/10 | Busy 5-text-element stack; motion choreography is genuinely good but the still frame reads flat; serif-italic Arabic em-words look machine-slanted |
| Partners/institution strip | 3/10 | Text-only wordmarks at opacity .55 (2.66:1) read as a placeholder trust strip |
| University facts | 5/10 | Real numbers + honest source notes; generic centered count-up row |
| Campus photo | 6/10 | Best beat: parallax + vignette + grain + caption; dated pill-radius framing |
| Features grid | 4/10 | The classic identical 6-card icon grid (the AI-page tell) |
| Flipped-classroom band | 6/10 | Split + interactive checklist rows works; real content |
| AI (Oasis) band | 6/10 | Believable chat mockup, live typing indicator; wall-of-text reply bubble |
| Bento mosaic | 5/10 | Real spans, but pastel-card sameness; corner circles read as leftovers |
| Roles | 3/10 | Same layout family as Features (literally reuses `.landing-features*` classes) |
| Proof band | 5/10 | Claims a real pilot with honest notes; centered, quiet, mid-page |
| Who-it's-for | 5/10 | Role-based quotes (no fabricated names — good); generic 3-card row |
| Final CTA | **1/10** | **Headline invisible + secondary button invisible, in BOTH themes, desktop and mobile** |
| Footer | 6/10 | Clean RTL 4-col grid; small tap targets on mobile |

## Objective geometry table (desktop 1280×900, live probe after reveals)

| Section | offsetTop | height | gap-to-next |
|---|---|---|---|
| ministry strip | 0 | 38 | 0 (header sticky overlaps) |
| header (sticky) | 38 | 62 | 0 |
| hero (incl. mockup) | 100 | 1740 | **0** |
| logos strip | 1840 | 205 | 0 |
| facts row | 2045 | 268 | 0 |
| campus photo | 2313 | 627 | 0 |
| features grid | 2940 | 1002 | 48 |
| band-peach (flipped) | 3990 | 636 | 48 |
| band-lavender (AI) | 4674 | 690 | ~1 |
| bento | 5363 | 744 | ~1 |
| roles | 6108 | 890 | 48 |
| proof band | 7046 | 761 | 247 (incl. who-for section head) |
| who-for grid | 8054 | 208 | 156 (incl. CTA band padding) |
| final CTA band | 8412 | 744 | 0 |
| footer | 9156 | 327 | — |
| **Total** | | **9484px = 10.54 viewports** | |

Mobile 390×844: **11882px = 14.08 viewports** (just over the 8–14vh scroll budget). Hero 1062px (1.26vh), features stack 1951px, roles stack 1337px, bento stack 1466px. **No horizontal overflow at 390/768/1024/1440** (`scrollWidth` never exceeds innerWidth).

### Verdict on the VLM-baseline "catastrophic vertical gaps": NOT REAL — they are a measurement artifact
- Live geometry: hero→logos→facts gaps are **0px** (contiguous sections; spacing lives inside padding tokens). There is no empty band anywhere between sections.
- Artifact 1 — **`html { scroll-behavior: smooth }`** (base.css:24, polish.css:682) animates every `window.scrollTo()`; the shared snap scripts (`snap-scroll.mjs` etc.) wait only 500ms after a smooth jump, capturing **mid-animation frames** (my first pass reproduced 5KB near-blank "top of page" shots this way).
- Artifact 2 — a `fullPage` screenshot taken **without pre-scrolling renders the page ~85% blank** (pixel stddev ≈ 0 for most 300px bands below the fold; only band backgrounds paint) because all 39 `.reveal-up` elements sit at `opacity: 0` until their one-shot IntersectionObserver fires.
- **Campaign-wide tooling note:** every agent's VLM baseline on this codebase is suspect until snaps use `scrollTo({behavior:'instant'})` + a full pre-scroll pass. (My re-taken shots follow that protocol.)

## P0 / P1 / P2 / P3 findings

### P0-1 — Final CTA headline is invisible in BOTH themes (the page's close/conversion beat is broken)
- **Where:** `frontend/src/styles/landing.css:1042` (`.landing-final-cta-title { color: var(--text) }`) on `.band-dark` (`landing.css:687` — `background: var(--neutral-900)`).
- **What:** Light theme: `--text` = #191918 on band #191918 → **1.00:1**. Dark theme: `--text` = #F2EAD8 on band #F2EAD8 (neutral-900 flips to cream) → **1.00:1**. Only the `em` word «بانتظارك» (copper accent) paints.
- **Evidence:** pixel analysis of element clip `a1-ctatitle-light.png`: 91.9% of the title box is pure band color, 3.6% accent; dark: 94.0% band color. Independently confirmed by VLM on `a1-d-08400` ("only one accent-colored word visible"), `a1-m-11038` ("headline completely invisible… conversion killer"), `a1-dark-08584` ("effectively invisible").
- **Fix sketch:** `color: var(--neutral-50)` (the band's own ink pair — 16.9:1 in both themes) or simply `color: inherit`. The CSS comment at landing.css:1040-1041 documents the *previous* bug but the "fix" inverted the pair.

### P0-2 — Final CTA secondary ("ghost") button text invisible in both themes
- **Where:** `frontend/src/styles/landing.css:1090-1094` (`.landing-final-cta-btn.ghost { color: var(--text); border: 1px solid var(--rule) }`).
- **What:** same token collision as P0-1 — button label #191918 on band #191918 (light) / #F2EAD8 on #F2EAD8 (dark). Computed live: `rgb(25,25,24) on rgb(25,25,24)`.
- **Evidence:** probe C2 in interaction run; VLM on `a1-d-08400` ("secondary button… nearly invisible… looks like a UI glitch").
- **Fix sketch:** `color: var(--neutral-50)` + `border-color: color-mix(in oklab, var(--neutral-50) 35%, transparent)`.

### P1-1 — Serif-italic emphasis on Arabic headline words (every heading on the page)
- **Where:** `landing.css:427-435` (`.landing-title em` → `font-serif` + `font-style: italic`), same pattern at `landing.css:709-713` (band titles), `:815-820` (section titles), `:1045-1050` (final CTA). `--font-serif: 'IBM Plex Serif', Georgia, serif` (tokens.css:46).
- **What:** Arabic script has no italic tradition; the em-words («التعليم», «الجامعيّ», «تتفاعل», «أدوار», «تجربة فعلية», «بانتظارك»…) render as slanted Naskh — reads machine-made/falling-over on the platform's single most visible typographic surface. Also a taste-floor violation ("emphasis inside a headline uses italic or bold of the same family").
- **Evidence:** VLM hero critique: "Forcing it into a Latin-style italic slant makes it look like it's falling over… reads as a machine-translated error" (`a1-d-00000`).
- **Fix sketch:** upright, same-family emphasis: `font-style: normal; font-weight: var(--fw-black); color: var(--accent-strong)` (10.29:1) — one CSS block fixes all four selectors.

### P1-2 — Reveal system can permanently skip content on fast scroll flings
- **Where:** `frontend/src/hooks/useReveal.ts:33-51` (one-shot IO, `threshold: 0.12`, unobserves after first fire) + `.reveal-up` base opacity 0 (polish.css:583-601).
- **What:** an element that enters AND exits the viewport between two IO observation frames never gets `in-view`; at 1200px/frame **12 of 39 elements stayed invisible** (CTA row, CTA meta, all 4 pilot stats, feature cards…). They only recover if the user scrolls back up over them. Real trackpad flings on a 9.5k-px page reach these speeds.
- **Evidence:** reveal-integrity probe: `(a) wheel 400px/90ms: 0 missing · (c) instant 1200px/frame: 12 missing`.
- **Fix sketch:** add `rootMargin: '200px 0px'` lookahead, or a `scrollend` sweep that force-reveals anything above `scrollY + innerHeight`, or `once: false` + a settled class.

### P1-3 — Identical card grids as the page structure; Roles duplicates the Features layout family
- **Where:** `LandingPage.tsx:533-582` (6 identical `landing-feature-card`s) and `:738-781` (roles section reuses **the same** `.landing-features` / `.landing-features-grid` classes); plus `:824-857` (third 3-col card row for who-for).
- **What:** craft-floor ban ("same-size cards of icon + heading + text as the page structure"; "the same layout family twice on one page"). Three separate sections of identical icon-cards is the single biggest "template" signal on the page — confirmed by VLM on `a1-d-03000` ("screams AI-generated template") and `a1-d-05600` ("highly repetitive… formula fatigue").
- **Fix sketch:** give Roles a different device (persona rail, alternating zigzag list, or tabbed persona switcher); merge or differentiate who-for; break the features 3×2 with one asymmetric wide card.

### P1-4 — Global `scroll-behavior: smooth` poisons all programmatic scrolling + screenshots (campaign-wide)
- **Where:** `frontend/src/styles/base.css:24`, `polish.css:682`.
- **What:** every `window.scrollTo(x, y)` animates; snap tools capture mid-flight; combined with P1-2 this produced the false "catastrophic gaps" baseline (see geometry section). Product side: minor — it also makes `scrollTo`-based "back to top" style code laggy.
- **Fix sketch:** scope smooth scrolling to anchor navigation only (JS `scrollIntoView({behavior:'smooth'})` on nav clicks, drop the CSS property), and/or patch `scripts/snap-*.mjs` to use `behavior:'instant'` + pre-scroll (this unblocks every campaign agent's re-baselines).

### P2-1 — Eyebrow label above every section heading (9 instances)
- **Where:** `LandingPage.tsx:331` (hero chip), `:445` (معتمدة من), `:523` (المنظومة), `:590`+`:663` (band eyebrows), `:690` (منظومة كاملة), `:740` (الأدوار), `:788` (دراسة ميدانية), `:826` (لمن صُمِّت), `:862-865` (final CTA eyebrow).
- **What:** scroll-craft hard rule: "an eyebrow above every section heading — at most one per three sections." Every single section carries one; with the identical centered section-head formula it makes 6 sections read as clones.
- **Fix sketch:** keep the hero announcement chip + at most 1–2 section eyebrows; let headings carry themselves.

### P2-2 — "Partners" strip is text-only wordmarks at 0.55 opacity (2.66:1) and self-referential
- **Where:** `LandingPage.tsx:444-454`, `landing.css:650-665` (`.landing-logos-grid { opacity: 0.55 }`).
- **What:** 6 text labels (no logos) at 55% opacity → effective #9c9b98 on #fbfaf9 = **2.66:1** (this is exactly the 6 axe contrast errors the dev console prints on load). VLM: "reads as a cheap placeholder… looks like you forgot to swap the wireframe assets." Content-wise the list is the university accrediting itself (جامعة الزاوية، عمادة الطلاب…) — weak trust claim.
- **Fix sketch:** real monochrome institutional marks at ≥0.8 opacity, or cut the section and let the facts row carry credibility.

### P2-3 — Div-built fake dashboard as the hero mockup
- **Where:** `LandingPage.tsx:381-440` (sidebar rows, KPI tiles, bar chart, floating badges).
- **What:** taste refuse-list ("div-built fake screenshots, fake dashboards"); VLM on `a1-d-01000`: "reads as a high-fidelity wireframe, not a real product… sidebar is pure placeholder geometry." The platform HAS a real dashboard — a real screenshot (2×, correct aspect) would be both more honest and more impressive. The floating "+12 طالباً" badge is an invented number next to real claims.
- **Fix sketch:** replace mockup body with a real product screenshot (student dashboard) in the same frame; keep badges only if labeled illustrative.

### P2-4 — No engineered energy curve or peak; identical entrance on all 39 elements
- **Where:** reveal choreography (`polish.css:583-601` one fade-up on everything), section order `LandingPage.tsx:325-883`.
- **What:** scroll-craft: one engineered peak with silence before it and the most scroll room. Here every section has the same volume and the same entrance; the only photographic beat (campus, 627px) sits quietly mid-page; the intended resolve (final CTA) is the broken P0. VLM across batches: "safe & boring", "wall of pastel", "flat".
- **Fix sketch:** pick the peak (campus photo or the Oasis chat band), give it full-bleed scale + a quiet section before it; demote competing sections; vary entrances (one wipe, one stagger, one static).

### P2-5 — Hero over-stacked + weak keyword contrast
- **Where:** `LandingPage.tsx:327-378` (scene illustration + eyebrow + title + subtitle + CTA row + meta row = 6 stacked blocks); `.landing-title em { color: var(--accent) }` → 3.65:1 at weight 400 (light).
- **What:** taste rule "more than four text elements in the hero"; the meta row («بإيميلك الجامعي · دعم RTL كامل · اعتماد رسمي») belongs below the fold. The accent word at 3.65:1 passes large-text AA but is the weakest-contrast element in the H1 (VLM flagged it as a "contrast failure").
- **Fix sketch:** move the meta row to just above the mockup; em-word → `--accent-strong` (10.29:1) with upright weight (pairs with P1-1 fix).

### P2-6 — No skip-link; keyboard users tab through 13 stops before main content
- **Where:** `LandingPage.tsx:204-325` — landing renders its own header; the app-shell `.skip-link` is not present on this surface.
- **Evidence:** interaction probe B (tab order: brand → nav trigger → 4 megamenu items → 2 nav links → 2 header CTAs → 3 hero CTAs → … before any main content).
- **Fix sketch:** first tabbable element = «تخطَّ إلى المحتوى» jumping to `#features`/main.

### P2-7 — Mobile menu feels cheap vs. the glass header
- **Where:** `landing.css:275-280` (`.landing-mobile-menu`: flat surface, border-top only), `LandingPage.tsx:312-322` (no Escape handling; centered links).
- **Evidence:** VLM on `a1-mobile-menu-open`: "raw div dumped on top… no shadow, no blur"; links read "unclickable".
- **Fix sketch:** add the header's glass treatment, start-align links, Escape closes + refocuses burger.

### P3-1 — Em dashes in visible Arabic copy (~14 instances)
- **Where:** `LandingPage.tsx:284, 346, 499, 514, 529, 546, 554, 570, 615, 625, 649` …
- **What:** scroll-craft hard rule bans em dashes anywhere visible. In Arabic copy the dash is a common separator, so this needs a glossary ruling rather than a blind sweep — but the rule exists because it's a machine-writing tell. Fix: «،» / «:» / parentheses per the platform glossary.

### P3-2 — Icon stroke-weight inconsistency between card grids
- **Where:** features grid icons `strokeWidth={1.8}` (`LandingPage.tsx:535-575`) vs roles/bento stickers default 2.0 (`:698-733`, `:750-780`).
- **What:** one consistent stroke/weight is the icon-system floor; the 1.8 vs 2.0 mix registers as "off" between adjacent sections (VLM called it filled-vs-outline inconsistency).
- **Fix sketch:** one strokeWidth constant for all landing stickers.

### P3-3 — Bento collapses to a 1-column "wall of pastel" from 641–920px
- **Where:** `landing.css:881` (`@media (max-width: 920px) { .landing-bento-grid { grid-template-columns: 1fr } }`).
- **Evidence:** VLM on `a1-m-06100` ("wall of pastel… settings menu"). A 2-col step at ≤920 with span normalization keeps the mosaic character on tablets/large phones.

### P3-4 — Footer link tap targets on mobile
- **Where:** `landing.css:1136-1143` (13px links, 12px row gap, no min-height).
- **What:** below the 44px touch floor; footer is link-dense. Fix: `min-block-size: 44px` + flex align at ≤920px.

### P3-5 — Hero chip carries three simultaneous effects
- **Where:** eyebrow chip: pulse dot (`landing.css:391`), shimmer sweep (polish.css:615-631), «جديد» badge glow sweep (polish.css:2387+). Three loops on one 30px chip = motion noise. Keep one.

### P3-6 — Mockup parallax/hover transform conflict
- **Where:** polish.css:527-547 (parallax `transform` + `transition: transform micro linear`) vs polish.css v12 hover tilt (`.landing-mockup:hover` overrides both transform and transition in the overrides layer).
- **What:** while hovered, the scroll parallax transform is fully replaced (jump on enter/leave) and the parallax now eases at `--t-slower` — subtle lag/jump. Also permanent `will-change: transform`. Fix: compose both in one transform chain or gate the tilt off while scrolling.

### P3-7 — Landmark/heading gaps
- Ministry strip is outside any landmark (axe: "content not contained by landmarks") — `LandingPage.tsx:213-218`; facts row (`:457-480`) has no heading or aria-label. Minor semantics polish.

### P3-8 — Dark-mode craft details
- Hero ambient reads "coffee stain" (wide soft radial) and the hero illustration sits as a hard-shadow "sticker" — VLM `a1-dark-00000`; hard cut between header ground and lavender band (`a1-dark-04500`); bento elevation uses black shadows on colored grounds (tint shadows to band hue per taste floor). No measured contrast failures in dark (all probed pairs ≥ 5:1 except the P0 pair).

## The scroll-craft scorecard

| Axis | Score | Rationale |
|---|---|---|
| Journey / beats | 5/10 | A sensible implicit arc exists (recognition → trust → place → capabilities → roles → proof → personas → commitment), but 13 sections with no tension/turn; the middle repeats itself three times. |
| Energy curve + peak | 2/10 | Flat. No engineered peak: same volume, same centered head, same fade-up entrance in all 13 sections. The campus photo (the only photographic beat) is mid-page and quiet; the close that should resolve is invisible (P0). |
| Hero depth | 4/10 | Real planes exist and move at different rates (ambient blob + masked dot grid + cursor spotlight + content + mockup with 3-rate parallax + floating badges) — but zero overlap/occlusion, no photographic ground, and stills read flat (VLM: "flatter than a sheet of paper"). Depth is engineered in the CSS and invisible in the experience. |
| Section variety | 3/10 | Device families present on paper (grid, split band, bento, stat rows, quote row) but the grid-of-identical-cards family dominates ×3 and Roles is literally the Features component again. |
| Signature move | 2/10 | Cursor spotlight + magnetic card glow + mockup parallax are Notion-kit moves, not a Madarek-specific move. The Oasis typing indicator is the most brand-specific moment and it's 40px tall. Nothing a visitor could describe to a friend. |
| Mobile as first-class | 5/10 | No overflow anywhere, badges/sidebar correctly hidden, CTAs bumped to 52px, title re-clamped — but the composition is collapsed desktop (no re-art-direction), bento is a pastel wall, menu is cheap, 14.08 viewports of scroll tax. |
| The close | 1/10 | Broken: invisible headline + invisible secondary CTA in both themes; the page's last feeling is an empty band with one floating copper word. The footer itself is fine. |
| Hard rules | 3/10 | ✅ no scroll cues, no 01/06 counters, real markup (no text-in-images), no invented headline stats. ❌ eyebrow on every section (9), em dashes (~14 visible), centered copy in every non-band section, no single peak, identical entrance ×39. |

## Top-10 quick wins (ranked)
1. **Fix the final CTA colors** (P0-1/P0-2): two one-line CSS changes restore the page's resolve in both themes.
2. **Kill serif-italic on Arabic em-words** (P1-1): upright + `--accent-strong` — removes the strongest "machine-made Arabic" tell from every heading.
3. **Re-scope `scroll-behavior: smooth` + patch snap scripts to instant** (P1-4): makes every subsequent VLM re-shoot in this campaign trustworthy.
4. **Differentiate Roles from Features** (P1-3): stop reusing `.landing-features*`; a persona rail or zigzag list.
5. **Harden reveals against flings** (P1-2): rootMargin lookahead or scrollend sweep.
6. **Delete 6–7 of the 9 eyebrows** (P2-1).
7. **Real logos or no logos strip** (P2-2): fixes both the 2.66:1 axe errors and the placeholder read.
8. **Real dashboard screenshot in the hero mockup** (P2-3).
9. **Add a skip-link** (P2-6) — cheapest a11y win on the page.
10. **Pick a peak and give it room** (P2-4): full-bleed the campus photo with a quiet section before it.

## Files to touch
- `frontend/src/styles/landing.css` — P0-1, P0-2, P1-1, P2-1, P2-2, P2-5, P3-3, P3-4, P3-5, P3-7
- `frontend/src/pages/LandingPage.tsx` — P1-3, P2-1, P2-3, P2-6, P2-7, P3-1, P3-2, P3-7
- `frontend/src/styles/polish.css` — P1-2 (reveal base), P1-4 (smooth-scroll), P2-4 (entrance variety), P3-5, P3-6, P3-8
- `frontend/src/hooks/useReveal.ts` — P1-2
- `frontend/src/styles/base.css` — P1-4
- `scripts/snap-scroll.mjs` / `snap-one.mjs` / `snap-mobile.mjs` / `snap-dark.mjs` — tooling fix (instant scroll + pre-scroll)
- NOT in scope but affected: `colleges.css` (popover styling), motion.css (universal focus ring — verified working)
