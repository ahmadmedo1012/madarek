# R322 · C1 INDEPENDENT VISUAL REVIEW — Task 1-r

**Reviewer:** independent (did not author any C1 change) · **Date:** 2026-10-28
**Subject:** merged main `b3cefadb` (post-C1 quick kills), served at http://localhost:5173/
**Method:** agent-browser session `reviewer`, 1440×900 + 390×844, 22 screenshots (this dir), VLM critique per section (glm-5v, ADVISORY only — every written defect below was confirmed with DOM geometry via `eval`), computed-style sweeps, whole-doc text-leaf intersection sweeps.
**docH:** 12,523 @1440 · 11,319 @390 (both in the ±1.5% band, both ≤ baseline). Console errors: none. Horizontal text overflow @390: none (scrollWidth = 390).

---

## 0. Verdicts the board asked for

### V1 — debug/revision/coordinate text: **PASS on the killed families; the deferred list is NOT complete**
Killed-family sweep (`document.body.innerText`, both breakpoints): `R313]` · `[0,` · `UNITS` · `· LIVE` · `live ·` · `MDRK ·` · `checkpoints` → **zero hits at 1440 AND 390.** Confirmed.

Deferred offenders present as scheduled (all ≥992-only, invisible at 390):
| String | Selector | Where (1440) |
|---|---|---|
| `[LIVE]` | `.fo-mono` inside hero disclosure link | x642 y832, 47×21 (C2) |
| `SHEET 05 · SCALE 1:100` | `.pr-bar-label` | x1186 y8875 (C4) |
| `VIEW-A · 1280×800` | `.prf-viewtag` | x956 y8700 (C4) |
| `VIEW-B · 1280×800` | `.prf-viewtag` | x364 y8700 (C4 — a second tag the deferral list didn't name) |
| `real-ui` | `.prf-caption-tag` | platform ×2 (x957 y9100, x365 y9067) **+ why-section ×4 DOM copies** (x405 y9841, identical rects — see D11); visible ×1 at 390 (x295 y7678) |

**NEW leftovers found by this review (not on any list):**
1. **`[SECTION A-A · 1:200]`** — `.fo-mono`, rotated, at **x=−40** (67px wide) → **40px of the label is clipped off the left viewport edge** at 1440, plan top state (doc y≈2698). Violates "never truncated" and V7's "no element over the edge". Kill or complete it in C3.
2. `[CTA · RESOLVE]` (`.fo-cta-sketch-coord.fo-mono`, x44 y11175) and `[09] · REGISTRY` (`.cg-strip-label.fo-mono`, x33 y11391) — kept by WP-1a as "inner-sheet labels", but the VLM (fresh eyes) read both as debug artifacts. English jargon; flag for a C4 keep/kill decision against Heron's title-bar grammar.
3. `[06]` embedded in ledger *content*: «القدرات: [06] تعمل اليوم» (CTA ledger, y11269) — an index inside a content row reads as a broken template.
4. Latin **"RTL"** in the ledger copy «اللغة: عربية أولًا · RTL» (y11227).
5. `.jt-side-note` — a **375px-tall rotated (vertical) 13px Arabic sentence** at x57 w24 on the plan's left edge — reads as leftover annotation; near-illegible rotated body text.
6. English dimension strings on the plan (`240 M2`, `150 M2`, `96 M2`, `36 M2`, `84 M2`, `11.6M`, `11.3M`, `12.3M`, `20.6M`, `44M` in hero) — architect notation, borderline legitimate; verify against Heron's map when C3 extracts it.

### V7 — edge tab vs text: **PASS at both widths (geometry-proven)**
- 1440: visible rail `.et-rail` = x[7, 24.3], y[369, 532] (fixed). Whole-document text-leaf sweep (`x<51 ∧ right>7`): the only unclipped leaves in the band zone start at **x=33** (`[02]` statement index, `[09] · REGISTRY`, x44 `[CTA · RESOLVE]`) → **min clearance 8.7px from the rail; no visible overlap**; ≥4.7px even at the +4px hover nudge. The 44px transparent touch floor covers a 20px sliver of the hero «اكتشف المزيد» link box (x31–51) and ~7px slivers of two mono labels — invisible, sanctioned by §12 (≥44px targets).
- 390: `.et-mark` = **x=0, y=415, 15×14, fill #FA3600** (fixed orange square). Glyph sweep: no text leaf intersects it (hero H1 glyphs start at x=109; sections pad 16–24px). **No overlap** — but see D10: the mark itself reads as a stray artifact.

### V4 — voids: **CONFIRMED OPEN, worse than the ticket in two places**
Inter-content gaps at 1440 (content-bottom → next content-top, opacity-agnostic):
| Boundary | Gap | >1.5×pad (48px)? |
|---|---|---|
| hero → statement | 113px | yes, mild |
| **statement → pains** | **275px** | **VOID** |
| **pains → chapters** | **260px** | **VOID** |
| **chapters → product** | **809px** | **VOID at pin release** — map-end state leaves ~490px of the 900px viewport empty (plan pinned high, nothing below; screenshot map-end-1440.jpg) |
| product → why | 114px | borderline |
| why → roles | 120px | borderline |
| **roles → CTA** | **269px** (231px in-section slack) | **VOID — the ticket's «≈250px under role cards» is real** |
| CTA → footer | 148px | borderline |

At 390: hero bottom blank **194px** (V10), why **174px**, CTA **153px** (the brief's «≈160px before CTA» holds); map→product is tight (21px — the phone band after the map is fixed).

### V5 baseline (pre-migration record, so the board can measure 1-d's delta)
- **@1440 — six display sizes, Alexandria, w700 ×5 + w600 ×1:** 60px (statement/pains/map-H2/why/roles/cta H2s) · 48.96px (map full-width statement) · 46.67px (hero H1) · 40px (map station + why stage verbs) · 33.33px (pains + roles card titles) · 26.67px w600 (product H2 — the odd one out). Leading 1.28 on the 60px H2s, 1.15 on CTA, 1.25 on card titles.
- **@390 — four sizes, all w700:** 32.8px hero (3 lines) · 28.9px (six seats) · **71.45px `.chapters-title` → 5 lines / 457px tall, effectively one-word lines («الرحلة / — / أربعة / فصول / تتحرك أمامك»)** · **47.63px `.jt-station-verb` ×4** (the two escaped ≤767 re-pins — independently confirmed). Product H2 **flips weight 600→700** between 1440 and 390.
- **Body @1440 = 13–13.33px** (statement lines, pains cards, captions) — *below* the 15–17px band; @390 = 15.88–17.86px (in/above band). Desktop body is smaller than phone body.
- Statement `.st-line span` = **772px line length at 13.33px ≈ 90+ chars** (Arabic guideline 35–65).

---

## 1. Per-section rubric (0–10 per category; mean; every sub-9 score is defended in §2)

| Section | hier. | grid | rhythm | typo | material | density | consist. | motion | polish | respons. | **Mean** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hero | 6 | 7 | 5 | 5 | 7 | 6 | 6 | 6 | 6 | 5 | **5.9** |
| Statement | 7 | 7 | 4 | 5 | 7 | 6 | 6 | 6 | 6 | 7 | **6.1** |
| Live/pains | 6 | 5 | 5 | 5 | 7 | 6 | 6 | 6 | 6 | 7 | **5.9** |
| Chapters/map | 4 | 4 | 4 | 3 | 6 | 4 | 5 | 5 | 3 | 4 | **4.2** |
| Product/platform | 5 | 5 | 6 | 6 | 6 | 2 | 4 | 5 | 4 | 6 | **4.9** |
| Why | 6 | 6 | 4 | 5 | 6 | 4 | 5 | 5 | 5 | 6 | **5.2** |
| Roles | 6 | 6 | 3 | 5 | 6 | 4 | 6 | 5 | 5 | 6 | **5.2** |
| Vision/CTA | 6 | 6 | 5 | 5 | 6 | 4 | 6 | 5 | 5 | 6 | **5.4** |
| Footer | 8 | 8 | 7 | 7 | 8 | 7 | 7 | 6 | 7 | 7 | **7.2** |

**Overall landing beauty: 5.5 / 10.** C1 did its narrow job (V1/V7 verified clean, zero regressions found), but the page as a composition is still far from the ≥9 bar: V2/V3/V4/V5/V6/V8 all remain open, exactly as scheduled for C2–C4.

---

## 2. Defect list (numbered, selector + geometry; VLM claims verified before writing)

**D1 · V2 — map intro duplicate headlines (1440).** `.chapters-head h2` «الرحلة — أربعة فصول تتحرك أمامك» 60px w700 @ x632 y2523 w782 AND the full-width statement «الرحلة مرسومة على مسطح واحد» 48.96px @ x33 y2716 **w1380 h900** (spans the whole grid, sits ON the plan's grid lines), plus a 13.33px lede «مرّر لترى الرحلة تُبنى…» at x33 y2653 w558 — three typographic events, no single statement per state.

**D2 · V3 — «مقدمة» intro card (map).** Ink slab at x81 (300px wide), paper-on-ink 13px body at 86% alpha; title-only at intro progress; still on screen near the story's end (viewport y372 @ scroll 7950). At 1440 it sits in the left free margin (plan starts x565) — better than the ticket claimed — but the dark slab + ghost text + the 375px vertical `.jt-side-note` next to it read as unfinished annotation.

**D3 · V4 — void under role cards (1440).** `.rl-section` content bottom y10700 vs section bottom y10931 → **231px in-section slack; 269px to the CTA's first content.** Cause: the 8-card 4×2 grid (brief demands a hairline ledger) plus min-height padding.

**D4 · V4 — other voids.** statement→pains **275px**, pains→chapters **260px**, chapters→product **809px** (pin-release dead band: map-end state = plan pinned at viewport y[−96, 411], then ~490px of empty paper before product content at viewport y703), CTA→footer 148px; @390 hero **194px**, why **174px**, CTA **153px**. All exceed the 1.5×32px padding rule.

**D5 · V5 — display type (see §0 V5 baseline).** Six ad-hoc sizes @1440, all-black weights, 1.28 leading on 60px H2s; phone 71.45px/5-line one-word headline + 47.63px verbs; body 13.33px @1440 (under band); product H2 26.67px/600 breaks the section ladder and flips to 700 on phone.

**D6 · V6 — platform clutter.** Two raster screenshots (1280×800 sources rendered at 573×358 and 441×276 → **0.45× scale, micro-text ≈8–10px, unreadable**) carrying **11 meta labels**: VIEW-A/B · 1280×800 ×2, `.prf-card-note` «عرض توضيحي» ×4, `real-ui` ×2, «بيانات العرض التجريبية» ×2, `SHEET 05 · SCALE 1:100`. The brief demands ONE crisp designed product frame.

**D7 · V8 — pains head row off-grid (1440).** `.pm-lede` = **217px-wide** 13.33px paragraph at x33, while the H2 starts at x290 — the head row's edges align to neither the cards' grid (cards span 33–1413, pitch 349/50px gutter, themselves aligned ✓) nor each other; the orphan lede column is the brief's V8, confirmed.

**D8 · NEW — `[SECTION A-A · 1:200]` clipped (1440).** Rotated `.fo-mono` at **x=−40** w67 → 40px cut off the left viewport edge at the plan's top state. (Also listed under V1 above.)

**D9 · V1-family — CTA/colophon jargon.** `[CTA · RESOLVE]` (x44 y11175), `[09] · REGISTRY` (x33 y11391), `[06]` inside ledger content, Latin "RTL" in «عربية أولًا · RTL». Fresh-eye VLM read all of these as debug text.

**D10 · V10 — phone hero art + stray orange square.** `.bp-svg` = **210×105 at x90 y96 inside a 390px viewport** (54% width, ~200px blank paper below before the content strip) — the tiny-art defect is intact. Fixed `.et-mark` **15×14 #FA3600 square at x=0 y=415** floats at the screen edge through the entire phone page (VLM flagged it in 4/4 phone screenshots as "dev-tool overlay"). «شاهد» card clipping NOT reproduced at sampled states (verbs x41–349 inside 342px cards).

**D11 · duplication.** `.wy-section` contains **4 identical stacked `.prf-stage` DOM instances** (AI-assistant card, all at x33 y9530 483×303) each with its own `real-ui` chip at x405 y9841 — either a stacking bug or an animation stack; at rest it is 4× paint for one card and 4 identical chips in the DOM. Disclosure strings duplicated: «عرض توضيحي» ×4, «بيانات العرض التجريبية» ×2 (one component each, per §C.3).

**D12 · consistency.** Product H2 26.67px/600 vs all other section H2s 60px/700; roles card titles «لطالب/لأستاذ» vs statement's «للطالب/للأستاذ» (copy drift); desktop body smaller than phone body (13.33 vs 15.88px).

**D13 · line length.** Statement `.st-line span` 772px @13.33px ≈ 90+ chars/line (Arabic band 35–65).

**D14 · hero H1 flush to frame (1440).** H1 x763 w670 → right edge 1433 = the sheet-frame line exactly, 0px breathing; combined with the 46.67px w700 Alexandria it reads cramped (VLM: "black weight crushes the line art").

Non-defects verified clean: no console/page errors; no horizontal text overflow at 390 (whole-doc range sweep); no text under the ≥992 rail; footer legal row unclipped at both widths; killed-string families zero at both widths.

---

## 3. The ONE biggest problem per section (plain words, for the owner)

1. **Hero:** on the phone the beautiful elevation is a 210px stamp floating in ~200px of dead paper — on desktop the black 46.7px headline is squeezed flush against the frame in a cramped bottom strip.
2. **Statement:** the section ends in 275px of nothing after the university ticker — the statement is said, then the page just… stops.
3. **Live/pains:** a skinny 217px orphan paragraph is pinned to the far margin beside a 60px headline that starts at x290 — the head row is not on the cards' grid.
4. **Chapters/map:** the intro shows TWO giant headlines plus an orphan paragraph over an empty plan, and the whole story dies in a ~490px blank band before the product section.
5. **Product/platform:** two shrunken blurry screenshots drowning under eleven pasted labels (VIEW-A/B, real-ui, عرض توضيحي ×4, SHEET 05…) instead of one crisp designed frame.
6. **Why:** a repeat of the same card-grid grammar (plus the platform's cluttered screenshot card with real-ui imported into it) ending in a 174px phone void.
7. **Roles:** a 231–269px dead void under an 8-box card grid where the brief demands a single hairline ledger.
8. **Vision/CTA:** the "honest ledger" still reads as a data dump ([06], "RTL") and the decorative sketch grid reads as an unfinished wireframe with [CTA · RESOLVE] stuck on its corner.
9. **Footer:** the best section on the page — the outlined wordmark and ink strip genuinely work; its only sins are the English mono caption and a second-hero 895px height.

---

## 4. Evidence index (this directory)

hero-1440/390 · statement-1440/390 · live-pains-1440/390 · chapters-map-1440/390 · map-state1..4-1440 · map-mid/end-390 · product-platform-1440/390 · why-1440/390 · roles-1440/390 · vision-cta-1440/390 · footer-1440/390 (22 JPGs) + this REPORT.md.

**Reviewer's bottom line for the board:** C1's quick kills are real and verified (V1 families zero, V7 geometry-proven, docH in band, zero regressions) — but nothing else moved visually, and the honest score is **5.5/10**: the page is still the "pile of correct-sized boxes" the owner rejected, now with the revision tags peeled off. The C2–C4 transplants (hero, statement, problem, map, platform, roles, CTA) carry the entire distance to 9.
