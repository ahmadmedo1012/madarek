# R322 C3 — the map transplant · Reviewer 2 (independent geometry/regression review)

Task `r322-c3-WP3r-R2` · merged main @ `78ce6ee` · `frontend/dist` built from it (mtime
2025-10-28 22:27). Served: `node node_modules/vite/bin/vite.js preview --outDir=frontend/dist
--port=4332 --strictPort --host=127.0.0.1` (killed at review end). Probes:
`playwright-core@1.60.0` (bundled chromium) against the LIVE preview — every number below is
measured on that server, never read from the author's evidence. Probe scripts + 20 viewport
screenshots kept at `/home/z/r322-r2/` (`p1-ladder` `p2-states` `p2b-bp1024` `p3-labels`
`p3b-fullcam` `p4b/p4c-funnel` `p5-rm-console`, JSON outputs + `shots/state-nn-slug-bp.png`).
Orange pixel-share measured with a purpose-built PNG decoder (`png.mjs`, zlib+unfilter) on
full-viewport lossless PNGs — mask `r≥170 ∧ g≤120 ∧ b≤100 ∧ (r−g)≥110` (#FA3600 family);
byte-diffs are raw differing bytes between consecutive lossless PNGs (noise baseline =
two shots 120 ms apart at the same state: **0 bytes at every state, every bp**).

---

## 1 · docH ladder (no-RM) + band heights

| bp | docH measured | target | Δ | verdict |
|---|---|---|---|---|
| 320×568 | 9278 | pin 9308 | −0.32% | **PASS** (≤ pin) |
| 360×800 | 10697 | band 10684 | +0.12% | **PASS** (±1.5%) |
| 390×844 | 11301 | band 11441 | −1.22% | **PASS** |
| 430×932 | 11794 | pin 12411 | −4.97% | **PASS** (≤ pin) |
| 480×800 | 12475 | pin 12675 | −1.58% | **PASS** |
| 600×800 | 14348 | pin 14774 | −2.88% | **PASS** |
| 768×1024 | 12461 | band 12577 | −0.92% | **PASS** |
| 820×1180 | 13706 | pin 13808 | −0.74% | **PASS** |
| 1024×768 | 10029 | band 9938 | +0.92% | **PASS** |
| 1180×800 | 10795 | pin 10937 | −1.30% | **PASS** |
| 1440×900 | 12373 | band 12355 | +0.15% | **PASS** |

**11/11 green** — all five band bps inside ±1.5%, all six never-raise pins held below.
`.chapters`/`.jt` @1440×900: **`.chapters` = 6191px** (vs Heron map section 6300 → **−1.73%**,
a hair outside a ±1.5% lens; the governing docH band is green), **`.jt` = 5841px = 649dvh
exactly** (vs the 6300px section-track −7.3% — our 350px section head eats the budget; the
docH band absorbs it). Track rungs measured: 450dvh → 4608px @768×1024 · 425dvh → 3587px
@390×844 · 380dvh @480/600 (3040px) — the ≤991 ladder lands as authored.

## 2 · The 6-state machine (pin-fraction hops + frame-change proof)

Hops per the spec: ≥992 `target = .jt rect.top+scrollY + p·(rect.height−vh)`; ≤991 the
column clock (`.jt-map-col` + `.jt-map-in` sticky, computed `position: sticky; top: 65px`).
Every hop landed its fraction exactly (`pLand = p` to 4 decimals).

| state | p | @1440 scroll → stage | @768 scroll → stage | @390 scroll → stage | data-finding / wash / open |
|---|---|---|---|---|---|
| 01 statement | 0.02 | 2665 → **0** | 3248 → **0** | 3123 → **0** | 1 / none / off |
| 02 plan | 0.16 | 3357 → **0** | 3823 → **0** | 3588 → **0** | 1 / none / off |
| 03 card | 0.45 | 4790 → **2** | 5014 → **2** | 4552 → **2** | 1 / lecture / off |
| 04 findings | 0.66 | 5827 → **3** | 5845 → **3** | 5186 → **3** | 3 / exam / off |
| 05 room | 0.90 | 7013 → **4** | 6819 → **4** | 5960 → **4** | 5 / mastery / off |
| 06 closing | 1.00 | 7507 → **5** | 7225 → **5** | 6283 → **5** | done / mastery / **on** |

Stage ladder 0/0/2/3/4/5 is the designed machine (stage 1 lives at p∈[0.20,0.39], between
the two hop points); the landed scroll values reproduce STAGES.md's recorded table
**exactly** (18/18). @1024×768 (the ≥992 boundary, `.jt-map-in` relative, desktop frame):
stages 0/0/2/3/4/5, frame diffs 29268/38732/39827/46686/62906 — the machine holds at the
breakpoint. Layer crossfade measured mid-ramp (opacity 0.898/0.986/0.691 at the hops) —
the six `[data-xl]` groups scrub as authored; ≤991 camera pans recorded per state
(`640 92 560 355` → `329 76 560 355` → `0 29 858 544` → `0 0 1200 760`).

**Visual frame actually changes at every hop** — consecutive-state PNG byte-diffs
(noise 0):

| bp | s1→s2 | s2→s3 | s3→s4 | s4→s5 | s5→s6 |
|---|---|---|---|---|---|
| 1440 | 39757 | 53398 | 56609 | 71428 | 91373 |
| 768 | 35822 | 42673 | 42702 | 44126 | 83959 |
| 390 | 22805 | 28232 | 28243 | 29233 | 46326 |

**PASS** — no dead state, no dead bp.

## 3 · Label safety (mid-map, state 4) + SVG `<text>` collisions

| bp | visible text elements counted | horizontal violations (x∉[0,vw]) | far-below (bottom>vh+2000) | text×text (>0.5px²) | text×geom (>4px²) |
|---|---|---|---|---|---|
| 1440×900 | 35 | **0** | **0** | **0** (18 texts, 405 geoms) | **0** |
| 768×1024 | 19 | **0** | 1 | **0** (2 texts, 51 geoms) | **0** |
| 390×844 | 27 | **0** | 1 | **0** (2 texts, 43 geoms) | **0** |

The one far-below hit per phone bp is `.wy-stage-verb` («شاهد» @768 bottom 3037 vs band
3024; «اختبر» @390 bottom 2858 vs band 2844) — the NEXT section's first label sitting
2013–2014px under the fold, 13–14px past the probe window's edge; a probe-band artifact,
not a map defect. @1440 the 5 partially-above-fold elements are the fixed header's roll
labels (top −18px) — header furniture. Camera-crop honesty: the ≤991 passes were re-run
with the viewBox resolved to the full plan (the r320 gate's second pass) — 18/21 texts on
canvas, **still 0/0 collisions**. **PASS** (both sub-checks).

## 4 · Funnel freeze (register CTAs)

Counted with reveal-gated content actually revealed (targeted scroll per CTA + mobile menu
open; DOM anchors matching `/auth/register` + the `#cta` product anchor):

| bp | count | inventory |
|---|---|---|
| 1440×900 | **5** | header «ابدأ الآن» · hero «أنشئ حسابك الجامعي» · product sheet «أنشئ حسابك لتجربتها حيّة» (#cta) · vision CTA «أنشئ حسابك الجامعي» · footer «إنشاء حساب جامعي» |
| 390×844 | **5** | hero · product sheet (#cta) · vision CTA · footer · mobile-menu «ابدأ الآن» (header CTA hidden ≤991) |

**PASS — exactly 5, not more.** The transplant added zero CTAs: the closing column is
text-only (its h2 mentions «أنشئ حسابك» but carries no link — verified in the DOM inventory).

## 5 · Killed strings (innerText sweep, top + bottom of page)

| string | @1440 | @390 |
|---|---|---|
| `R313` | 0 | 0 |
| `MDRK ·` | 0 | 0 |
| `SCALE 1` | **1** — «SHEET 05 · SCALE 1:100» | 0 |
| `UNITS` | 0 | 0 |
| `· LIVE` | 0 | 0 |
| `[01-04]` | 0 | 0 |
| `ERR [500]` | 0 | 0 |

The single `SCALE 1` hit is `PlatformCanvas.tsx:51` — the platform band's designed toolbar
label, **pre-existing since R318** (`57fb836`, ≥992-only, aria-hidden furniture), not the
map's killed title block («MDRK · LEARNING FLOOR · PLAN / SCALE 1:150 · UNITS M» — absent
from innerText AND from every SVG's textContent). **PASS for the map** (the literal-match
elsewhere is reported, not a C3 regression).

## 6 · RM belt (reducedMotion: reduce)

| probe | @1440 | @390 |
|---|---|---|
| `data-rm` | **on** | **on** |
| `data-finding` | all | all |
| `.jt-close[data-open]` | **on** (title/copy opacity 1/1) | **on** |
| six `[data-xl]` layer groups | opacity **[1,1,1,1,1,1]** | **[1,1,1,1,1,1]** |
| intro findings readable | **5/5 at opacity 1** | **5/5** |
| window transform | identity | identity |
| viewBox (no camera) | `0 0 1200 760` | `0 0 1200 760` |
| stage through hops p 0→0.5→1→0.3 | stays **4** (fully static) | stays **4** |
| rAF gaps during scroll (61 frames) | median 16.7 · p95 **17.4ms** · max 26ms | median 16.7 · p95 **17.2ms** · max 23.8ms |
| console errors | **0** | **0** |

**PASS** — the complete static sheet stands, no scroll-listener jank, zero console errors.

## 7 · Console + network (normal RM, landing)

| bp | console errors | failed requests | HTTP ≥400 | mid-map machine |
|---|---|---|---|---|
| 1440×900 | **0** | **0** | **0** | stage 2 at p=0.45 ✓ |
| 390×844 | **0** | **0** | **0** | stage 2 at p=0.45 ✓ |

**PASS.**

## 8 · Intro card geometry (`.jt-intro`, state 3)

| | 1440 | 768 | 390 |
|---|---|---|---|
| rect | 596.0, 544.6 → **233.4×130.8** | 32, 522.9 → **704×91.6** | 32, 283.5 → **326×142.6** |
| width vs 28.01rem-scaled | **233.4 vs 233.4 — exact** | 704 vs 257.9 (flow, full column) | 326 vs 278.1 (flow) |
| bottom→frame edge | **224.6px** (Heron ≈26.7) | n/a (in flow, 2440px of track left) | n/a |
| left→frame edge | **562.7px** (Heron ≈26.7) | 8px (column padding) | 8px |
| bottom/left→its stack seat | **26.6 / 26.7px = 3.2rem exact** | 12px below the plan (sp-3) | 12px below the plan |

**Mixed.** The width and the 3.2rem insets are Heron-exact against the card's containing
seat, and it grows upward layout-free (bottom fixed at 675.4 while h goes 44.8→130.8); but
Heron anchors the card to the **frame's** bottom-left corner — ours floats 224.6px above
the frame bottom and 562.7px inboard of the frame's left edge, because the plan box is
vertically centered (198px margins) and the closing column reserves the frame's left half
from stage 0. At ≤991 the card is a full-width flow row below the plan (the author's
documented deviation — an over-the-plan overlay would cover ~80% of a 206px-tall drawing).

## 9 · Plan box geometry (`.jt-window` @1440, state 1)

| | measured | Heron | Δ |
|---|---|---|---|
| `.jt-window` = `.bp-svg` rect | **796.0 × 504.1** (x 569.3, y 197.9) | 962.95 × 853.34 | w **−17.4%** · h **−40.9%** |
| area | 401,264px² | 821,724px² | **48.8%** |
| map column / closing column | 796px / **464px exact** (gap 24) | 1427→963 / 0→464 | reserved-from-0 deviation |

**FAIL vs the reference proportion** — the section's hero drawing renders at **49% of
Heron's plan area**. Chain: frame 1380px inner − 464px reserved closing − 24px gap → 796px
column; the window caps at `min(100%, (100dvh−32)·1.5789)` → the landscape sheet
(1200×760) fills the column width, 504px tall. Heron's plan box is 963×853 because its
closing column is 0-width until the end-of-story flip. Same story down-tier: the plan is
704×446 @768 / **326×206.5 @390 vs Heron's 374×689 (26% of the reference's mobile area)**.

## 10 · Orange area (#FA3600 pixel share of the viewport)

| bp | state 3 (card) | state 5 (room) | state 6 (closing) | Heron cap |
|---|---|---|---|---|
| 1440×900 | **3.543%** | **3.294%** | 3.301% | 0.3–0.5% (s1–5) · ≤1.7% closing |
| 768×1024 | **20.086%** | **8.289%** | 4.374% | same |
| 390×844 | **9.025%** | **4.215%** | 2.186% | same |
| (states 1–2) | 0.018–0.034% | — | — | Heron carries 0.3–0.5% furniture orange |

**FAIL — 7.1× / 40.2× / 18.1× the cap at state 3** (@1440/@768/@390), 6.6×/16.6×/8.4× at
state 5, 1.9×/2.6×/1.3× at closing. Band attribution @768 state 3: the plan band
(y65–511) is **45.96% solid orange** (the camera-zoomed lecture zone fills the drawing);
@390 plan band 36.66%; @1440 plan band 6.30%. DOM cross-check: `.pl-zone[data-zone=lecture]`
= 358×307 of the 1200×760 viewBox = **12.05% of the sheet** at `fill-opacity: 1`
(`landing.css:5134–5150`); @≤991 the camera crop (560 units into a 704px window, ×1.257)
blows the same rect to ~22% of the viewport. The wash is a whole-room solid slab, and at
rest (states 1–2) the sheet carries ~0.02% orange where Heron carries furniture-scale
orange — the calibration is inverted at both ends.

---

## Numbered defects

1. **[HIGH] The room wash's area is 7–40× Heron's measured orange cap — a full-room solid
   slab, camera-amplified at ≤991.** What/where: `.pl-zone` rects are whole rooms (lecture
   358×307 = 12.05% of the sheet; exam 329×307 = 11.07%; mastery 335×307 = 11.28%) lit at
   `fill-opacity: 1` — `frontend/src/styles/landing.css:5134–5150` + the zone rects in
   `LearningPlanDrawing.tsx:451–575`. Measured: 3.543% of viewport @1440 · **20.086% @768** ·
   9.025% @390 at state 3 vs Heron 0.3–0.5%; the plan band itself is 45.96% orange @768.
   Severity: high (colour geometry; reviewer-1 measured the same independently).
2. **[HIGH] The plan stack — the section's hero — renders at 48.8% of Heron's plan area.**
   What/where: `.jt-window` 796×504.1 @1440 state 1 vs 962.95×853.34 (w −17.4%, h −40.9%);
   `landing.css:4974–4983` (max-inline-size `(100dvh−32)·1.5789` inside a 796px column after
   the 464px reserved closing column, `landing.css:5359–5368`). Down-tier: 326×206.5 @390 vs
   Heron 374×689 (26% of the reference's mobile plan area). The "narrative center of
   gravity" the transplant set out to seat is half-size at every tier.
3. **[MED] The INTRODUCTION card is not anchored to the frame's bottom-left.** @1440 state 3:
   card bottom 224.6px above the frame bottom and 562.7px from the frame's left edge (Heron:
   26.7px both) — `landing.css:5273–5283` anchors it to the vertically-centered stack seat
   instead of `.jt-pin`. Width and 3.2rem seat-insets are exact; the anchoring seat is not.
   At ≤991 the card is a full-width flow row (704/326px vs 258/278px = 28.01rem) — documented
   deviation, reported as measured.
4. **[MED] Mobile mid-map dead band: 40–50% of the viewport is empty below the sticky
   content.** @768 state 3: sticky content ends y614.1 of 1024 (**409.9px = 40.0%**); @390:
   ends y426.1 of 844 (**417.9px = 49.5%**). Heron's phone state 3 centers content
   (y316–527) with a near-full-screen 374×788 plan window. Consequence of defect 2's short
   landscape plan on portrait phones.
5. **[LOW] `.chapters` @1440 = 6191px vs Heron 6300 (−1.73%)** — just outside a ±1.5% lens on
   the section's own height (the governing docH band is +0.15% green; `.jt` = 5841 = 649dvh
   exact). Record-level, not gating.
6. **[LOW] The literal `SCALE 1` survives in innerText @1440** — «SHEET 05 · SCALE 1:100»,
   `PlatformCanvas.tsx:51`, pre-existing R318 platform furniture (≥992-only), not the map's
   killed title block. Filed for sweep hygiene, not a C3 regression.
7. **[INFO] The ≤991 column clock's pin geometry shifts ±31px as the flow intro card opens.**
   The card inside the sticky `.jt-map-in` grows 44.8→142.6px, moving the same pin
   fraction's scroll target (p=0.66 @768: 5876px fresh-load vs 5845px sequential). The
   driver re-derives geometry on settle; states land correctly — hop-math drift only.

**Non-defects verified green:** docH ladder 11/11 · state machine exact at 4 bps with
frame-change proof (byte-diff 22.8k–91.4k, noise 0) · label safety 0 horizontal violations,
0 SVG collisions (natural + full-viewBox passes) · funnel exactly 5/5 register CTAs, zero
added by the transplant · the map's killed strings 0/7 · RM complete static sheet with
p95 17.4ms scroll frames · console/network 0/0/0 at both bps · closing column geometry
reserved from stage 0 (x/w identical at states 1 and 3 — zero layout animation, the CLS
pin honored) · 464px closing column exact.

---

## The 10-category rubric (geometry side)

| # | category | score | justification (my numbers) |
|---|---|---|---|
| 1 | Grid & alignment | **8** | Measured seats are exact where transplanted: 464px column, 233.4px card width (28.01rem to 0.1px), 3.2rem seat insets; 0 horizontal text overflow, 0 collisions; but the card's frame anchoring lands 562.7/224.6px off Heron's frame edges. |
| 2 | Spacing rhythm | **7** | docH band green at all 5 bps + 6 pins; 39.84rem closing offset kept; but chapters −1.73% vs 6300 and the phone tiers carry 40–50% dead bands below the sticky content. |
| 3 | Proportion & scale | **5** | docH +0.15% @1440 is exact — yet the plan itself is 48.8% of the reference's area, the mobile plan 26%, and the orange wash 7–40× its measured cap: the section's visual mass is mis-calibrated in both directions. |
| 4 | Plan composition (the drawing's box) | **4** | 796×504 vs 962.95×853.34; the landscape 1.5789 sheet inside a 796px column can never seat the reference's near-square 963×853 stack — the hero of the story is the smallest thing in the frame. |
| 5 | State-machine fidelity | **9** | Pin hops land to the exact recorded scrolls (18/18 + 1024 boundary), stage ladder 0/0/2/3/4/5 as designed, every hop provably repaints the frame, camera pans verified per state. |
| 6 | Label safety & collisions | **9** | 0 horizontal violations at 3 bps mid-map; 0 text×text / 0 text×geometry inside `.jt` in both natural-crop and full-plan passes. |
| 7 | Responsive architecture | **8** | The ≤991 column clock is exact (sticky 65px, rungs 450/380/425dvh land the ladder); the ≥992/≤991 machine is coherent at the 1024 boundary; cost: the sticky window is short on portrait phones (defect 4). |
| 8 | Consistency | **8** | One machine at every bp, reserved closing geometry constant through all states (zero layout animation), counter/wash/stage discrete flips, deterministic rebuild (scroll values reproduce STAGES.md exactly). |
| 9 | Polish | **5** | The orange slab (45.96% of the drawing band @768), the floating intro card, the quiet 464px panel beside a half-size plan, and the mobile voids read as unresolved composition against the extraction this transplant claims to follow. |
| 10 | Reduced-motion & determinism | **9** | Complete static sheet (all layers 1, 5/5 findings, closing open, cam full), stage frozen through scroll hops, rAF p95 17.4ms, zero console errors. |

**Mean = 7.2** · min = 4 (Plan composition). My bar for ACCEPT on the geometry side: mean
≥ 8.5 with no category below 7 — three categories sit below it (Proportion 5 · Plan
composition 4 · Polish 5).

## Verdict — **REJECT (geometry side)**

The scroll **architecture** is genuinely excellent and fully green (ladder, clock, pinning,
label safety, RM, funnel, cleanliness — checks 1–7 all PASS). The rejection is driven by
the **box geometry** the architecture seats: the plan — the section's hero — at 49% of the
reference's area (check 9 FAIL), the orange wash at 7–40× the reference's measured cap
(check 10 FAIL), and the intro card's frame anchoring off by ~200–560px (check 8 partial).
All three are fixable without touching the green machine: shrink the wash to
Heron's furniture-scale (~0.4% of frame), give the plan the reference's area budget
(963×853 @1440 — e.g. drop the reserved closing seat or re-aspect the window), and anchor
the card to the frame's corner. Until the plan reads at the reference's scale, the
transplant's own contract ("every number measured from the extraction, never re-invented")
is not met on the geometry it most visibly owns.

— Reviewer 2 · probes at `/home/z/r322-r2/` · server on :4332 killed after this report.
