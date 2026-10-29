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

---

## Re-review (f111d51) — Task r322-c3-WP3r-R1b, 2026-10-29

Repo @ `f111d51` (the fix round), `frontend/dist` freshly built from it. Same method:
12 side-by-side VLM comparisons (6 states @1440 + states 1/3/5 @768 + @390) — **advisory
only** — plus playwright-core DOM probes against `vite preview` (127.0.0.1:4331; killed,
port verified free), PIL/numpy pixel measurement of the re-shot state shots, source diff
reading (`landing.css`, `JourneyScene.tsx`, `LearningPlanDrawing.tsx`), and the updated
`perf.json`/`STAGES.md §9`. Every fix claim was measured, not trusted.

### A · Defect-by-defect verification (round-1 numbered defects + R2/R3 items)

| prev defect | status | measurement (this tree) |
|---|---|---|
| R1#1 orange wash 7–20× Heron's cap | **DEAD** | `.pl-zone` active = `fill-opacity: 0.035` + `stroke-width: 1.5` (probe). Orange share of viewport — @1440: s03 **0.16%** (h 0.27) · s05 **0.24%** (h 0.48); @768: s03 **0.34%** (h 0.58) · s05 **0.20%** (h 0.84); @390: s03 **0.01%** · s05 **0.03%** (h 1.60/1.74). In register — now slightly *under* Heron. The 20.2% tablet slab is dead. Tint verified present in the zone (warm-tint 1.28% of the mastery zone @s05). |
| R1#2 plan at 49% of Heron's area | **DEAD** | `.jt-window` **1284×813.2** @1440 (was 796×504) = 127% of Heron's 963×853 plan stack; plan column runs full frame width (x81.3–1365.3). The closing column is an absolute overlay: `opacity 0 / visibility hidden` through states 1–5 (probe), revealed at s6 by opacity + 10px rise — **CLS still 0.01** (`perf.json` s2clean: 0.01 total). |
| R1#3 statement-era ground 8.12% ink | **DEAD** | Plan-window ink @s01: **1.21% vs Heron 0.92%** (same-size regions); s02 pure-paper beat **0.59%**. Envelope moved to layer 1 (`data-xl="1"` — source-verified), the unconditional station/frame-text overrides deleted. (The faint lettered grid bubbles remain in the frame layer — ink parity measured; the VLM amplifies them, see §B.) |
| R1#4 intro card floating 157px above the corner | **DEAD** | Card bottom **y873.3** = 26.7px from the frame bottom (= 3.2rem on the 8.34px fluid root) and 26.6px from the plan column's inline-start edge (physical right in RTL) — the mirrored corner, opposite the overlay; no overlap with the overlay (x1105–1338 vs x81–545). Heron's own card content ends y871 — parity. Grows upward at s3 (y742.6, bottom fixed 873.3). |
| R1#5 no statement-era orange (0.00–0.02% vs h 0.27–1.60%) | **HALF-DEAD** | The rail spot `.jt-pin::after` (10×10 #FA3600) verified in the 1440 shot (97 orange px @s03) — but total share is still **0.02% vs 0.27%** @1440, and on ≤991 the spot anchors at the stacked pin's 50% (≈4.6k px down) → off-screen @390, drifting through the viewport @768 (new defect N1). Mobile statement era remains ~0.00%. |
| R1#6 mobile top-anchored void / dead band | **DEAD** | `.jt-map-in` = full viewport height sticky (768: y57 h967; 390: y57 h787) with the plan+card stack centered: margins **symmetric** — @768 209/209, @390 152.5/152.5. The 33–37% dead band is dead by construction. |
| R1#7 closing column bottom third empty | **ALIVE (minor)** | Unchanged by the fix round: chip y13–58, title y390–522, copy y538–583 — content ends **y583 of 900** (the 39.84rem chip→title gap + 132px title + 45px copy). Heron's column (label 62 + title-wrap 612 + cms 213 ≈ 887) composes to its foot. |
| R1#8 linework 2–3× heavier | **DEAD** | Box-to-box @s05: our plan box **7.50% ink vs Heron's plan box 7.29%** (the earlier 23.3%-vs-7.8% was a region artifact — my old measurement compared our dense sub-region against Heron's wider zone). |
| R1#9 display w600 vs Heron w700 | **ALIVE (accepted deviation)** | Owner-brief cap, unchanged; costs the closing headline's presence (132px vs Heron's 612px title-wrap). |
| R1#10 state-3 beat early | **ALIVE (minor)** | Probe: s3 `wash=lecture`, layer 1 ≈90% (t=2.84s in the [2.5,3.0] window); Heron's state 3 (46% scrub) has layer 1 OFF. Our s03 ink 5.39% vs h 2.04%. |
| R3#1 dark-theme plaques 1.02:1 | **DEAD** | `.jt-card` color pinned **#282828** (probe in dark: rgb(40,40,40)) on the pinned sheet **#F6F6EE** (both themes) → **13.6:1**. Dark screenshot: dark text on paper, window ink 1.04%, dark-text pixels present in the statement band. |
| R2#2 mobile plan 26% of area | **DEAD (measured)** | Plan element **326×425 @390** (portrait 460/600 aspect, crop zoom 2.27× Heron's whole-sheet view) = 47% of Heron's 374×788 element area (was 23%); content span y209–691 vs Heron's y316–527 — ours now covers *more* viewport than the reference's own phone state. |
| R2#4 mid-map dead band 40–50% | **DEAD** | Same measurement as R1#6. |

### B · The 12 VLM comparisons (score → verification)

| state/bp | score | VLM's lead complaints → verification |
|---|---|---|
| 01 1440 | 5 | "Intrusive A–H/1–4 grid", "heavy frame" → grid measured at **ink parity** (1.21% vs 0.92% window; #B3B3AF dashed hairlines at 55% opacity); VLM amplifies thin grids. Banner/EdgeTab chrome on both sites — discounted. |
| 02 1440 | 6 | Same grid + "colder starker white" → **disproven**: paper median 249,249,241 vs Heron 245,246,238 — parity within JPEG variance. |
| 03 1440 | 7.5 | "Faint central text over wall lines" → the transient card2 mid-fade (op 0.102 ≈ Heron's own state-3 card2 at 0.12) — shared beat, discounted. "Card bottom-right vs reference bottom-left" → deliberate RTL mirror (inline-start) — correct for RTL, discounted. |
| 04 1440 | 5 | "Plan scaled too large, minimal breathing room" → real observation (N4: 84% of frame vs Heron's 65%); "excessive red accents" → **disproven** by pixel (s03/s05 orange 0.16/0.24% vs 0.27/0.48%). |
| 05 1440 | 6 | "Harsh solid red outline, no tint" → outline is 1.6px #FA3600 (brand copper — hue reads redder than Heron's #F15534; established token, discounted); tint measured present. "Markers overlapping lines" → svg-collisions gate 0 FAIL. |
| 06 1440 | 4 | "Text floats in a void / panel effect missing" → the panel IS paper+hairline (bg #F6F6EE-family, 1px border) — but the quiet bottom third is real (R1#7). "Vertical red bar left edge" = the EdgeTab (standing page chrome, both sites). |
| 01 768 | 5 | Grid + banner + "orphaned orange square" → the standing EdgeTab square (y505–518, both sites' class of chrome); the *drifting* rail spot appears only mid-story (N1). |
| 03 768 | 4 | "Map small and floating, excessive whitespace" → plan element 446px tall in the 967px window (N3, the tablet aspect note); measured content span y266–815 vs Heron's own y384–640 — ours covers more. |
| 05 768 | 4 | "Massive void on right" → **disproven**: content cols x1–735, center-of-mass 401 (center 384). "Pale wash fails to pop" → the calibrated in-register treatment (0.20% vs 0.84%). |
| 01 390 | 4 | "Headline too small/thin" → D1 phone floor 31.74px (Heron's own phone measure) + w600 cap. Grid/banner chrome discounted. |
| 03 390 | 4 | "Plan too heavy, pinkish fill distracting" → the portrait crop's 2.27× zoom densifies the viewport (ink 9.57% vs h 6.18%) — the honest trade of readable zoom; noted, not scored. |
| 05 390 | 4 | "Plan pushed right, void left" → **disproven**: content x56–357, COM 206 vs Heron's COM 224 (both slightly right-weighted — RTL-natural). |

VLM mean **4.9** — but the VLM's checkable claims measured false more often than true this
round (4 disproven outright: paper warmth, 768 void, 390 push, "excessive red"), while
its true calls were the ones already in my probe list. Advisory weight accordingly.

### C · Rubric re-scored

| # | category | score | justification |
|---|---|---|---|
| 1 | Hierarchy | 9 | The plan is the monument again (1284×813, full frame); statement→card→closing narration clean; the overlay no longer co-competes pre-flip (hidden states 1–5). |
| 2 | Grid & alignment | 8.5 | Every seat re-measured at Heron's own numbers (26.7px card corner = 3.2rem fluid; 28.01rem card; 464px overlay; 39.84rem title offset); intro corner at parity (873 vs 871); the closing copy's early end and the tablet margins keep it off 9. |
| 3 | Spacing rhythm | 8 | Mobile dead band dead (symmetric margins 209/209 @768, 152/152 @390); desktop plan full-frame; the closing panel's quiet foot (content ends y583/900) remains. |
| 4 | Typography | 8 | Coherent rungs, Arabic-safe shaping, dark-theme ink pinned; the w600 owner cap plus the closing title at 132px vs Heron's 612px title-wrap keep the final column's type below the reference's presence. |
| 5 | Material & colour | 8 | Paper parity measured (RGB within ~2 units); mid-story wash in register (0.16–0.34% vs 0.27–0.84%); dark plaque 13.6:1; but the statement era still reads ~0.02% orange vs 0.27% and the closing state 0.03% vs 1.67% (N2). |
| 6 | Density & restraint | 8.5 | Statement ground at parity (1.21% vs 0.92%); plan box-to-box 7.50% vs 7.29% — the old 2–3× weight gap was a measurement artifact; the faint lettered grid in the quiet era is the one restraint note. |
| 7 | Consistency | 8.5 | Tokens and architecture consistent; the overlay speaks the site's paper-panel language; the rail spot's different mobile behavior (N1) is the one wrinkle. |
| 8 | Motion & scroll feel | 8.5 | CLS 0.01 held with the overlay (perf.json s2clean); transform+opacity reveal; discrete flips; two camera families; state-3 beat early (R1#10) + the standing stills-only uncertainty. |
| 9 | Polish | 8 | Slab, floating card, voids, dark plaques — all dead; remaining: the closing panel's foot, the closing state's accents, the drifting square, mobile statement-era flatness. |
| 10 | Responsiveness | 8 | Zero clipping at every bp (probes + gate); full-height windows; portrait crops readable at 2.27× zoom; the tablet plan's 446px height in a 967px window (N3) and the rail drift keep it off 9. |

**Mean = 8.5** · min = 8 → **REJECT** (bar: mean ≥ 9, no category < 8) — a near-miss: the
min-category bar is now met; the mean is 0.5 short on a short, specific list.

### D · NEW defects introduced/remaining (all measured)

1. **N1 (low) — the rail spot's mobile anchor.** `.jt-pin::after` uses
   `inset-block-start: calc(50% - 5px)` (`landing.css:4957` area) — on ≤991 the pin is the
   ~4.6k px stacked block, so the 10px orange square sits mid-track: it drifts *through*
   the viewport mid-story (verified in the 768 s03 shot at y832–841; absent at s01/s05)
   and is off-x/off-screen at 390. A detached mark that appears and disappears.
2. **N2 (low-medium) — the closing state lost its orange.** Our s06 orange = **0.03%
   @1440 / 0.08% @768 / 0.02% @390** vs Heron's **1.67 / 1.89 / 3.82%**. Heron's finished
   plan carries a solid orange room at the close (~2.45% of its plan side above the
   banner, x477–700); ours hides the washed mastery room *under* the overlay and the
   finished plan's rooms are ink-only — the final state reads accent-less.
3. **N3 (low) — tablet keeps the landscape sheet family.** @768–991 the plan element is
   445.9px tall in the 967px full-height window (46%) vs Heron's 753×972 portrait window;
   phones got the portrait crop family, tablets did not.
4. **N4 (observation, not scored) — the monument overshot.** The plan now fills 84% of
   the frame vs Heron's 65% (its 232px side margins); the VLM flagged "minimal breathing
   room" (s04). The honest consequence of a landscape sheet at full height — the R1/R2
   mandate's direction — noted as a taste wash, not a defect.

### E · Final (re-review)

**Mean 8.5 / 10 · REJECT** — every round-1 headline defect is measurably dead (wash in
register, monument restored at 127% of Heron's plan area, statement ground at parity,
card at the mirrored corner, mobile dead band dead, dark plaques 13.6:1, box-to-box
linework parity, CLS 0.01 held). What still separates it from the reference:

1. **Give the closing state its orange** — finished-plan room accents at Heron's scale
   and/or re-seat the overlay so the active washed room survives beside it (target
   ≥ ~1% of frame at s06; currently 0.03% vs 1.67%).
2. **Compose the closing panel to its foot** — content should end ≥ ~y820 like Heron's
   column (bigger title presence within the w600 cap, or pull chip/title/copy down the
   measured 39.84rem offset); currently it ends at y583 of 900.
3. **Statement-era orange furniture on all bps** (~0.3% of frame) — and fix the rail
   spot's ≤991 anchor (seat it on the sticky window, not the stacked pin) so it stops
   drifting (N1).
4. **Tablet**: a taller plan seat or crop family for 768–991 (N3).
5. Optional: start layer 1 / the wash one beat later so state 3 matches Heron's
   pure-paper card beat (R1#10).

Note for the owners: the w600 display cap (STAGES.md deviation #2) pins Typography at 8
by construction — with every fix above done, the ceiling is ≈8.9 unless the cap is
either blessed as Madarek's own display voice (re-anchoring that category) or lifted to
w700 at the map's two display seats.

— Reviewer 1 (visual), re-review of f111d51, 2026-10-29. Probe artifacts at
`/home/z/r322-r1b-vlm/` (probe-out.json, probe2-out.json, pix.py outputs, 12 VLM JSONs,
dark-state1/state6 PNGs). No commits; preview server killed (port 4331 verified free).

---

## Final pass (086b166) — Task r322-c3-WP3r-R1c, 2026-10-29

Repo @ `086b166` (round-2 fixes), `frontend/dist` freshly built. Method: round-2 claims
verified **measured** (DOM probes on `vite preview` @1440/768/390 — servers killed, ports
4331/4332 verified free; PIL/numpy on the re-shot state shots; source grep), then 5 fresh
`z-ai vision` side-by-side comparisons on the states the fixes touched (s3+s6 @1440,
s5 @768, s1+s6 @390) — advisory only, each claim re-checked.

### A · Round-2 claim verification

| claim | verdict | measurement |
|---|---|---|
| closing orange ≈1.4% @1440 s6 (mastery 0.15 tint) | **FAILS at 1440 — renders 0.03%** | DOM: mastery zone `fill-opacity: 0.15` at stage 5 ✓. But the mastery room (user x78–413 → **px x165–523**) sits **entirely under the 464px closing overlay (x81.3–545.3)** — an opaque paper panel. Pixel: s06@1440 whole-frame orange **0.03%** (unchanged from f111d51) vs Heron **1.67%**; mastery-zone region shows 0.00% orange/warm (ink 3.57% = the panel's own text); plan-side above banner 0.03% (the rail spot only). The tint DOES render on mobile where no overlay exists: warm blush **4.09%** @768 / **2.06%** @390. The claim's 1.4% arithmetic is right for an uncovered room; the chosen room is covered. |
| `.jt-close` composes to its foot ([05/05] terminus + note) | **DEAD** | Foot row `[05/05]` mono **y836.8–858.2**, scope note to **y887** (column ends y887 of 900 + padding); foot-band ink y820–900 = **9.37%** (was 0); overlay content rows y26–896 (was y26–583). String verified in source («المسطح رسم أصلي لمدارك؛ الغرف تتّسع مع كل فصل جديد.»). |
| rail spot desktop-only + 8px phone tick on the sticky window | **DEAD** | `.jt-pin::after` computed `display: none` @768/390; no drifting square in the shots (only the standing EdgeTab at y505–518, both sites' chrome); `.jt-map-in::after` 8×8 #FA3600 present at the window's top inline-start (physical right): **61–64 orange px** in every 390/768 shot. No collision with the `[01/05]` chip (150px vertical separation). |
| wash absent at the card beat, starts with layer 1 | **DEAD (the wash half)** | DOM s3: `wash='none'`, `stage=2`; pixel s03 orange **0.02%** vs h 0.27%. Wash first fires at t=3.0 (s4 pick shows checkpoint@0.035, one room behind the layer builds). **But the layer-1 build itself still lands t2.5–3.0** — at the s3 pick layer 1 is ≈90%: s03 viewport ink 5.32% vs Heron 2.04% (≈6.6% vs 3.6% of plan box) — the drawing still begins under the card era. |
| re-shots exist | **DEAD** | all 18 `state-*.jpg` re-shot Oct 29 00:30–31 on this tree. |
| (context) CLS 0.01 | unchanged by construction | perf.json (f111d51 build) s2clean CLS 0.01; round-2 adds only pseudo-elements + a static foot row inside the `contain: layout paint` overlay revealed by opacity — no layout animation introduced. |

### B · The 5 comparisons (score → verification)

| state/bp | VLM | lead complaints → verification |
|---|---|---|
| 03 1440 | 6 | "Card shoved bottom-right, cramped"; "central text blends into lines" → the bottom-**right** seat is the deliberate RTL mirror of Heron's bottom-left (correct); the faint central text is the card2 mid-fade transient (op 0.10 ≈ Heron's own state-3 card2 at 0.12) — shared beat. "Bottom nav" = consent banner, both sites. Discounted; the measurable residue is the layer-1 density (A, last row). |
| 06 1440 | **9** | "High-fidelity… paper panel and plan well-proportioned; the monospaced `[05/05]` terminus perfectly placed at the panel's foot; no clipping, no voids; polished and intentional." Matches the probe (content y26–896, foot ink present, zero collisions). |
| 05 768 | 7 | "Flat, lacks paper grain" → paper parity measured (249,249,241 vs 245,246,238 — JPEG variance; both flat fills); "info panel misaligned with map edge" → both at x32, disproven; "orange highlight on the active room is good" → the calibrated tint+outline. Weight = w600 cap (owner question). |
| 01 390 | 5 | "Text shifted left, void on right" → **disproven**: statement COM **197** vs viewport centre 195 (Heron's own COM 220 — we centre better than the reference); "too much space above" = the documented centered full-height window. Banner/tick chrome discounted. |
| 06 390 | 3 | "Massive void above and below the central map; placeholder" → **verified in essence**: at the release moment the CAM_FULL meet-letterbox centers a 326×206 plan in the 787px full-height window (~580px of paper), and the stacked closing column sits below the fold (starts y883; shot bands y0–338 ≈ 0–0.3% ink). Heron's phone close composes plan+closing densely in one view. The weakest shot of the set. (Headline reading "ساعدنا…" = hallucination — not our copy.) |

VLM mean 6.0 — its two 9-level calls (s6@1440) and its two harshest (s1/s6@390) both
reduce to measurable facts above; hallucinated strings and chrome complaints discounted
as before.

### C · Final rubric (scored on the current tree; N3 tablet + w600 treated as documented, noted not blocked)

| # | category | score | justification |
|---|---|---|---|
| 1 | Hierarchy | 9 | The plan is the hero at full frame through the story; the card owns its beat wash-clean; the closing panel owns the terminal state chip→title→copy→foot — the s6@1440 VLM verdict (9, "polished and intentional") matches the probe. |
| 2 | Grid & alignment | 9 | Every seat at Heron's measured numbers (card 26.7px corner; foot y887/900; overlay 464px; phone statement COM 197/195 — better centred than the reference's 220). The one VLM "misalignment" claim measured false. |
| 3 | Spacing rhythm | 8.5 | Mobile symmetric margins hold; desktop full-frame; the column now composes to its foot. The phone release moment leaves ~580px of paper around the 206px overview (B, row 5) — calm or void by taste; measured sparse. |
| 4 | Typography | 8.5 | Scored on how well w600 works: it works — the VLM twice praised the display unprompted ("excellent weight and scale, matching the impact"); the foot mono closes the counter family's grammar. Phone display reads slightly light vs the reference; the owner question stays open (documented). |
| 5 | Material & colour | 8 | Mid-story in register (0.15–0.34% vs 0.27–0.84%); paper parity; dark plaques 13.6:1; the orange furniture family coherent (spot/tick/markers/chip). **But the terminal state @1440 measures 0.03% orange vs Heron's 1.67%** — the round-2 tint is fully occluded by the overlay (A, row 1). The one measurable colour gap left. |
| 6 | Density & restraint | 8.5 | Statement ground parity (1.21% vs 0.92%); box-to-box 7.50% vs 7.29%; wash furniture-scale. The card beat still carries the layer-1 build (6.6% vs 3.6% of box) — documented design, slightly denser than Heron's pure-paper beat. |
| 7 | Consistency | 9 | One material language end-to-end; the tick/rail swap is bp-appropriate furniture; the mastery tint keys only to stage 5; the foot extends the counter family. |
| 8 | Motion & scroll feel | 8.5 | CLS 0.01 (f111d51 measurement, mechanism unchanged); discrete flips; the wash now rides the drawing era; two camera families; overlay reveal transform+opacity. Stills-only uncertainty at the release moments. |
| 9 | Polish | 8.5 | The foot row, corner tick, mirrored card and terminus land (VLM: "polished and intentional"). Deducted for the occluded closing tint — a fix that does not render at the primary bp — and the phone release-moment sparseness. |
| 10 | Responsiveness | 8.5 | Zero clipping at every bp (probes + gate); full-height windows; portrait crops at 2.27× zoom; tablet documented compromise (landscape artwork); the phone s6 release shot is the weak frame. |

**Mean = 8.6** (9+9+8.5+8.5+8+8.5+9+8.5+8.5+8.5) · min = 8 (Material & colour)
→ **REJECT** (bar: mean ≥ 9, no category < 8 — the min-category bar is met; the mean is 0.4 short).

### D · Remaining defects (new, concrete, measurable — not the documented items)

1. **The closing-orange fix is occluded at 1440** (the round-2 claim fails verification).
   The mastery zone (px x165–523, y127–455) lies entirely under the closing overlay
   (x81.3–545.3, opaque `--bg` panel) → measured visible orange at the terminal state
   @1440 = **0.03% vs Heron's 1.67%** (their solid tinted room at the close); the claimed
   ≈1.4% renders as zero. Where: `.jt[data-stage='5'] .pl-zone[data-zone='mastery']`
   (`landing.css:5188–5195`) vs the overlay seat (`.jt-close`, `landing.css:5447+`).
   Fix: carry the stage-5 tint on a room that stays exposed at the close (exam straddles
   the overlay edge at px x535+; library px x596–1076; lecture px x899–1282 all fully
   exposed), or bias the overlay to expose the mastery wing. Severity: medium — the
   terminal state of the whole story reads accent-less on desktop while carrying a 4.1%
   blush on tablet/phone (an inconsistency in itself).
2. **The phone release-moment composition (s6@390) is sparse**: the CAM_FULL
   meet-letterbox centers a 326×206 plan in the 787px full-height window (~580px paper)
   and the stacked closing column starts below the fold (y883; the shot's bands y0–338
   measure 0–0.3% ink) — VLM 3/10 ("placeholder"). Where: `.jt-window .bp-svg`
   `aspect-ratio 460/600` + `CAM_KEYS_PHONE[5.52, CAM_FULL]` (`JourneyScene.tsx:252+`).
   Fix: a terminal portrait crop key (the completed plan zoomed to the window's own
   aspect), or pull the stacked closing's reveal up so the release beat composes both.
   Severity: low-medium, phone-only, one beat.
3. **Half of R1#10 remains**: the wash is deferred ✓, but layer 1 (envelope + lecture
   walls) still builds at t2.5–3.0 — at the s3 pick the card beat carries ≈6.6%-of-box
   ink vs Heron's pure-paper 3.6%. Documented as design in STAGES.md §10 ("the paper
   stays quiet around it" — the drawing nonetheless begins). Severity: low.

### E · Final verdict

**Mean 8.6 / 10 · REJECT** — closer than round 2 (8.5 → 8.6, with the min-category bar
now met and the s6@1440 state at reference quality), but the mean bar is not reached and
defect D1 is the failed verification of this round's own headline claim: the closing
orange was brought back where it cannot be seen. For ACCEPT: (1) make the stage-5 tint
visible at 1440 (exposed room or overlay bias) and keep the mobile blush calibrated to
Heron's terminal presence (≈1.4–1.7%); (2) compose the phone release beat (terminal crop
key or earlier closing reveal). D3 is optional polish. With those two, every category
scores ≥8.5 and Material & colour can reach 9 — mean ≈8.9, at the bar's edge with the
w600 owner question the remaining half-point of judgment.

— Reviewer 1 (visual), final pass on 086b166, 2026-10-29. Artifacts at
`/home/z/r322-r1c-vlm/` (probe-out.json, vb.mjs output, pix.py outputs, 5 VLM JSONs).
No commits; preview servers killed (ports 4331/4332 verified free).
