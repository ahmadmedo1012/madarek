# R322 C3 — the map transplant · Reviewer 1 (independent visual review)

Task `r322-c3-WP3r-R1` · repo main @ `78ce6ee` · `frontend/dist` built from it.
Method: side-by-side VLM comparisons (`z-ai vision`, Heron shot = image 1, Madarek shot
= image 2) — **advisory only**. The task asked for 15 (6 states @1440 + states 1/3/6 @768
and @390 — literal count is 12); I ran **all 18 state×bp pairs** so every reading of "15"
is covered. Every checkable VLM claim was re-measured with (a) playwright-core DOM probes
against `vite preview` (127.0.0.1:4331, all six states @1440 and @768 + states 1/3/6 @390;
servers killed after, port verified free), (b) pixel analysis (PIL/numpy: orange mask,
ink density, row-band profiles, content extents), and (c) source grep of
`JourneyScene.tsx` / `LearningPlanDrawing.tsx` / `landing.css` for every string the VLM
"read". VLM text readings were hallucination-heavy (see §1a) — none scored as defects
without measurement.

---

## 1 · The VLM comparison summaries (18)

| # | state / bp | VLM score | VLM verdict → verification |
|---|---|---|---|
| 1 | 01 statement 1440 | 4 | "Wrong scroll-state"; statement collides with linework; clutter → state FALSE (probe: stage 0, card1 op 1, base-only — matches STAGES.md); collision half-verified (ground 5–8% ink vs Heron 0%, D3); "sidebar" strings hallucinated. |
| 2 | 02 plan 1440 | 6 | Text-on-linework noise; heavy strokes; boxed-in → verified: pure-paper beat ink 8.12% vs Heron 0.00%; s05 plan-region ink 23.3% vs 7.8% (D3, D8). |
| 3 | 03 card 1440 | 5 | Intro card "floating center-left", void beneath → verified: card bottom y675 vs Heron y871, 225px above viewport bottom (D4). "Main title missing" — reference's own state 3 has no statement either. |
| 4 | 04 findings 1440 | 6 | Orange "extremely aggressive" → verified: 3.33% of frame vs Heron 0.27% (D1); top-left void = quiet closing panel (D2). "#FF4500" misread (#FA3600). |
| 5 | 05 room 1440 | 5 | Plan shoved right, "massive void left", orange too saturated → verified: left zone 0.86% ink vs Heron 4.36% (D2); orange 3.37% vs 0.48% (D1). Cookie/tab = chrome on both sites. |
| 6 | 06 closing 1440 | 6 | Headline light; text "unmoored" → weight w600 = documented owner-brief deviation (D9); column content ends y583 vs Heron ~860 (D7). |
| 7 | 01 statement 768 | 4 | Headline overlaps grid; void middle-bottom → overlap verified in essence (D3); void verified (content ends y568 of 1024, D6). "[01/05] CAD artifact" = designed counter grammar. |
| 8 | 02 plan 768 | 6 | Statement "too faint (ghost)" → TRUE but shared: card1 at 17% mid-fade ≈ Heron's own state 2 (card2 at 0.12) — the transient pure-paper beat, not a defect. "مقارنة bar" hallucinated. |
| 9 | 03 card 768 | 4 | "Orange overly saturated and harsh" → verified, worst case: orange = **20.2% of viewport** vs Heron 0.58% (D1). "Text in orange invisible" overstated (#282828 on #FA3600 ≈ 4:1). |
| 10 | 04 findings 768 | 4* | "Orange plan clipped at top/bottom, beyond viewport" → **FALSE**: probe svg y65–511, x32–736, fully inside 768×1024 (camera crop misread as clipping). Orange aggression verified (D1). |
| 11 | 05 room 768 | 6 | Plan "pushed too far top, ~30% void at bottom" → verified: content bottom y614.5, void ≈336px ≈ 33% of viewport (D6); orange wash verified (D1). "Site of the Day tab missing" false (EdgeTab present, honest label by design). |
| 12 | 06 closing 768 | 6 | Large gap plan→closing; body light; footer clutter → gap partially real (stacked track tail + margins); footer = consent banner on both; weight deliberate (D9). |
| 13 | 01 statement 390 | 4 | "Massive void lower 60%", monochrome → void real but ~37% and the reference's own phone state 1 is also sparse — but centered (y316–527) vs ours top-anchored (D6); monochrome verified: 0.00% orange vs Heron 1.60% (D5). |
| 14 | 02 plan 390 | — | (score text truncated by CLI; defects listed = "void lower half", ghost text over lines) → same as #7/#8: D3 + D6, shared transient beat. "مقاسات button" hallucinated. |
| 15 | 03 card 390 | 3 | "Garish solid orange rectangle… missing image placeholder", top-heavy → verified: 9.3% of viewport orange; the y105–211 band is **51.8% solid orange** (D1); top-heavy verified (D6). |
| 16 | 04 findings 390 | 4 | "Plan severely clipped left/right edges" → FALSE as geometry (probe: window x32–358 inside 390; camera crop by design, R312 crop family, no letterbox); void below card verified (D6); orange harsh verified (D1). |
| 17 | 05 room 390 | 5 | Same "clipped" misread (camera crop) + "orange = raw highlighter mark" → D1 verified; "Site of the Day tab missing" false. |
| 18 | 06 closing 390 | 5 | Void between map and text (137px, probe-verified, minor); "centered/floating" claim unverified; "button" = consent banner (both sites). |

\* row 10's verdict text was cut off mid-sentence by the CLI output limit; score estimated
from its opening line ("significant visual failure"); its one checkable claim (clipping)
measured FALSE.

**VLM mean ≈ 4.7** — but the VLM misread Arabic strings wholesale, invented chrome
("Site of the Day", "HERON CHAT WIDGET", "WHY US", "W. tab"), and called the correct
state "wrong". Its **directional** calls (orange too big, left void, floating card, phone
void, lighter type, top-heavy mobile) were the ones that measured true.

### 1a · Hallucinated / discounted VLM claims (checked, not defects)
- Strings "مقصفة/مقصف/الخارطة/مقارنة/البرنامج معماري/مكتب الدار/مكتب الجامعة/يسعدنا/موقع اليوم/تقدم/أقفال/متابعة/مقاسات/قاعة الفنون/الرؤية/الرسم المسودي" — **none exist** in the landing sources (grep). Misreads of «مقدمة», «الخلاصة», `[01/05]`, the EdgeTab label «منصّة مستقلّة · مدارك», the consent banner («موافق»/«أرفض»), and plan labels («قاعة المحاضرات», «غرفة الإتقان», «المكتبة والبحوث»).
- Cookie/consent banner "intrusive" — present on **both** sites (Heron's own banner visible in its shots, ~8% orange in its bottom band). Site chrome, out of transplant scope.
- "Left sidebar / vertical tab" — the EdgeTab is designed furniture (R314 V12 / R322 §1 V7), RTL-mirrored; its "Site of the Day" reading is exactly the award claim the component deliberately refuses.
- "Clipped text / clipped plan" — svg-collisions gate 0 FAIL at 390/768/1440 × light/dark (foreman-verified); my probes put every plan box fully inside its viewport. The "clipping" is the phone/tablet camera crop (by design).

---

## 2 · Measured baseline used by this review (probe + pixels)

- **1440×900**: plan column x569–1365 (796px) + closing column x81–545 (464px, full
  height). Plan window 796×504 (y198–702), vertically centered. Heron: plan stack
  **963×853** in a 1427×887 frame — our plan = **49% of the reference's plan area**.
  Closing column measures 0.86% ink through states 2–5 (hairline + «الخلاصة» chip)
  where Heron draws 4.36% ink in the same zone.
- **Orange coverage** (of viewport): Heron 0.27%→0.48%→1.67% (states 1–6 @1440); ours
  0.01%→**3.59%**→3.37% (states 2–6). @768 state 3: **20.2% vs 0.58%**. @390 state 3:
  **9.3% vs 1.6%** (one band >50% orange). Zone rects are whole rooms (lecture
  358×307 = 12.1% of the 1200×760 sheet).
- **Ink density** (plan region, s05): ours 23.3% vs Heron 7.8%; pure-paper beat (s02
  window): 8.12% vs **0.00%**; behind the statement (s01 center): 7.85% vs 2.66%.
- **768×1024**: plan 704×445.9 at y65 (fits, no clip); sticky content ends y568–614 →
  void ≈ 336px ≈ 33% of viewport.
- **390×844**: plan 326×206.5 at y65 + intro card in flow below; sticky content ends
  y328–426 → single void ≈ 310px ≈ 37% of viewport; Heron's content centered y316–527.

---

## 3 · The §3 rubric

| # | category | score | one-line justification |
|---|---|---|---|
| 1 | Hierarchy | 7 | Clear statement→card→closing narration and a real type ladder, but the plan — the section's hero — renders at half the reference's area and the closing panel co-competes from stage 0. |
| 2 | Grid & alignment | 7 | Every seat is a measured Heron number (3.2rem insets, 28.01rem card, 464px column, 39.84rem offset) and nothing shifts; but baselines drift vs the reference — intro card bottom 675 vs 871, closing copy bottom 583 vs plan foot 702. |
| 3 | Spacing rhythm | 6 | A 464px quiet panel holds for ~90% of the story where the reference runs full-bleed plan; tablet/phone carry one 33–37% void; 137px gap before the stacked closing. |
| 4 | Typography | 7 | Coherent D1→D2→body chain, balanced 3-line statements, mono counters; w600 (owner cap) costs the reference's w700 punch — documented, deliberate. |
| 5 | Material & colour | 5 | Paper/ink/hairline language is right, but the orange calibration is inverted: 0% accents while the reference shows furniture-scale orange from state 1, then a full-room solid slab at 7–20× the reference's measured orange. |
| 6 | Density & restraint | 6 | Base layer (grid + dimension strings + door markers) is on from frame one — 8% ink at the reference's 0% pure-paper beat; linework ~2–3× the reference's weight; the wash is unrestrained. |
| 7 | Consistency | 8 | Tokens, chips, counter grammar, RTL mirroring and the stacked ≤991 architecture are internally consistent and match both Heron's architecture and the site's established sheet language. |
| 8 | Motion & scroll feel | 8 | From stills + machine + trace: opacity-only crossfades, discrete flips, entrance descent, phone camera crops, closing reveal at scrub end; CLS 0.01, p95 33.4ms @4×CPU (perf-baseline §8). Uncertainty noted — stills cannot prove feel; the lost 0→464 width flip makes the ending calmer but less cinematic. |
| 9 | Polish | 6 | Registration marks, halo rules and chrome are careful, but the orange slab, floating intro card, quiet panel and mobile voids read as unresolved composition against the reference. |
| 10 | Responsiveness | 6 | No clipping at any bp (gate green + my probes), card readable in flow below the plan — good calls; but the 20% orange slab @768, the top-heavy 33–37% voids @768/390, and a 446/206px-tall plan vs Heron's near-full-screen mobile window miss the reference's presence. |

**Mean = 6.6** · min = 5 (Material & colour) → **REJECT** (bar: mean ≥ 9, no category < 8).

---

## 4 · Numbered defects

1. **The room wash is 7–20× the reference's orange presence — one full-room solid slab.**
   Where: `.pl-zone { fill: var(--accent) (#FA3600); fill-opacity: 1 }` —
   `frontend/src/styles/landing.css:5134–5150`; whole-room rects
   `frontend/src/components/landing/LearningPlanDrawing.tsx:451/484/506/533/575`
   (lecture 358×307 = 12.1% of sheet). Measured: 3.4% of frame @1440 states 3–6 vs Heron
   0.27–0.48%; **20.2% of viewport @768 state 3**; 9.3% @390 (band y105–211 = 51.8%
   orange). Heron's own extraction caps orange at 0.5% of frame mid-story — the r318
   "solid #F15534 room" reading is contradicted by the reference shots. Severity:
   **high**. VLM-claimed (rows 4, 5, 9, 10, 11, 15, 16, 17) and pixel-verified.
2. **The plan lost its monument: 49% of the reference's plan area + a persistent 464px quiet left panel.**
   Where: `.jt-close` reserved from stage 0 (`landing.css:5359–5368`) + the window's
   1.5789 landscape cap (`landing.css:4977`). Probe: plan 796×504 vs Heron 963×853; left
   zone x81–545 at 0.86% ink through states 2–5 vs Heron 4.36%. Documented deviation #1
   (the CLS trade) — the CLS win is real (0.246→0.01) but the composition pays at every
   pre-close state. Severity: **high**. VLM-claimed (rows 5, 6) and probe+pixel-verified.
3. **The statement era's paper is never quiet.** Base layer (frame + envelope + grid +
   dimension strings + door markers) is visible from stage 0 — 8.12% ink in the plan
   window at the state-02 pure-paper beat vs Heron's **0.00%**; 7.85% behind the
   statement at state 1 vs 2.66%. Where: `landing.css:5022–5045` (`[data-xl]` base +
   `.pl-l-annot .pl-station { opacity: 1 }`). Severity: **medium-high**. VLM-claimed
   (rows 1, 2, 7, 8, 14) and pixel-verified.
4. **The INTRODUCTION card anchors to the plan window's bottom, not the frame's bottom.**
   Probe: card chip y546–587, card bottom y675 — 225px above the viewport bottom, 157px
   higher than Heron's (chip y703, content to y871); the bottom-inline corner the
   reference grounds is left bare. Where: `.jt-intro` absolute inside `.jt-map-in`
   (`landing.css:5273–5283`) whose box is the 504px centered window. Severity:
   **medium**. VLM-claimed (row 3) and probe-verified.
5. **No orange at all until the wash flips — the reference carries small orange furniture accents from state 1.** Measured: 0.01% vs 0.27% @1440 s01; 0.00% vs 1.60% @390 s01; 0.02% vs 0.58% @768 s01. The statement era reads flat/monochrome next to the reference. Severity: **medium**. VLM-claimed (row 13) and pixel-verified.
6. **Mobile/tablet composition is top-anchored with a single 33–37% void.** Probe: @390
   sticky content ends y328–426 of 844; @768 ends y568–614 of 1024; void to the consent
   banner ≈ 310–336px. Heron's phone content is centered (y316–527) with symmetric
   ~210px voids. The plan itself is 206px tall @390 / 446px @768 vs Heron's
   near-full-screen mobile window (374×788 @390). Severity: **medium**. VLM-claimed
   (overstated as "60%"; rows 11, 13, 15, 16) and probe-verified with correction.
7. **Closing column content ends at y583 of 900 — bottom third empty; copy baseline floats 119px above the plan's foot (702).** Heron's column content (label + 612px title-wrap + 213px cms) runs to the frame foot. Severity: **low-medium**. VLM-claimed (row 6) and probe-verified.
8. **Linework weight ~2–3× the reference.** Plan-region ink 23.3% vs 7.8% @s05; the drawing reads heavier/blacker than Heron's delicate sheet. Severity: **low-medium**. VLM-claimed (rows 2, 5) and pixel-verified.
9. **Display weight w600 vs Heron w700** — deliberate owner-brief cap (STAGES.md deviation #2), costs closing-headline punch. Severity: **low (accepted deviation, listed for the record)**. Code-verified.
10. **State-3 moment shows the drawing already begun + lecture wash on, where Heron's state 3 is still pure paper** (our t=2.84s at the p=0.45 pick → layer 1 at 90%; Heron's state 3 @46% scrub has layer 1 OFF). Compounds defect 1 on phone/tablet. Severity: **low**. Probe + Heron state table.

---

## 5 · Final

**Mean 6.6 / 10 · REJECT** (bar: mean ≥ 9, no category < 8; min category 5).

What must change for ACCEPT (priority order):

1. **Re-calibrate the orange to the reference's measured scale**: furniture-scale orange
   accents present from state 1 (~0.3–0.5% of frame, Heron's 9 small shapes), and the
   active room as a bounded highlight at ≤ ~1% of frame — tint or low fill-opacity, never
   a full-room solid. The 768 state-3 20% slab must die.
2. **Give the plan back its monument**: plan window filling ≥ ~90% of frame height
   (Heron 853/887) through the story — either re-seat the closing column so the plan
   column keeps ≥ ~960px at 1440 (overlay/paper panel that doesn't shrink the plan), or
   prove a CLS-free clip-path flip for the 0→464 opening.
3. **Quiet the statement-era ground**: defer grid/dimension strings/door markers to the
   drawing era so the pure-paper beat measures ~0% ink like the reference's.
4. **Re-anchor the INTRODUCTION card to the frame's bottom-inline corner** (frame seat,
   not the centered window's seat) and fill the closing column's bottom third (or pull
   its content down to the plan's foot).
5. **Mobile/tablet**: enlarge the plan window / rebalance the sticky window so content
   covers ≥ ~70% of viewport height and the composition centers like the reference's.

Strengths to keep: the six-state machine, opacity-only scrub with discrete flips
(CLS 0.01 / p95 33.4ms), the stacked ≤991 architecture with the card in flow below the
plan, the measured seat numbers, and the honest own-words Arabic copy.

— Reviewer 1 (visual), 2026-10-29. Probe artifacts kept outside the repo at
`/home/z/r322-r1-vlm/` (probe-out.json, probe768-out.json, pix.py / pix2.py outputs,
18 VLM JSONs). One report file written (this one); no commits made; both preview servers
killed (port 4331 verified free).
