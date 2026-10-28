# R322 C3 — the map transplant · Reviewer 3 (rubric / a11y / copy)

Task `r322-c3-WP3r-R3` · merged main @ `78ce6ee` · served `frontend/dist` (vite preview
:4333) · probes: Playwright-core (chromium 1223) on the live build + code reads +
3 advisory VLM shots (`state-03-card-1440` · `state-05-room-768` · `state-06-closing-390`)
+ 1 extra VLM shot on my own dark-theme capture. Scope: a11y, copy honesty/Arabic, and
the four §3 categories the pixel reviewers cannot judge — Hierarchy, Density & restraint,
Consistency, Motion & scroll feel. Geometry/visual fidelity belong to R1/R2 (both REJECT;
their findings are referenced, not re-measured).

---

## 1 · Accessibility

### 1.1 Keyboard focus order — CLEAN (by construction)

`document.querySelectorAll` over every focusable selector inside `.jt` **and** inside
`#chapters`: **zero tab stops**. The map is fully non-interactive — plaques and the intro
card carry `pointer-events: none` (landing.css:5253, 5281, mobile 5565), the closing
column is TEXT, never a CTA (JourneyScene.tsx:599–613 — "the funnel is untouched"), and
the drawing is `role="img"`. Keyboard focus passes from the pains band's controls to the
product band's in one hop — no traps, no scroll-chained focusables, sane. ≥44px targets:
N/A — nothing interactive. Focus-visible: the landing sheet deliberately owns ZERO
`:focus-visible` rules (landing.css:191–193) — the universal ring comes from
motion.css/base.css (base.css:126 `:focus:not(:focus-visible){outline:none}` + the
motion.css `:where():focus-visible` ring) — correct for a section with no controls.

### 1.2 Landmark / heading structure — SANE

- Page outline (live dump): `h1` (hero) → `h2` per section → `h3` subsections. The map
  contributes **exactly ONE h2** — the closing title
  «المسطح اكتمل — والخطوة التالية لك: أنشئ حسابك وابدأ من أول محاضرة.»
  (JourneyScene.tsx:610) — preceded by the section head h2
  «الرحلة — أربعة فصول تتحرك أمامك» (LandingPage.tsx:1171). Flat, no skipped levels.
- The two statement plaques are `<p>` (JourneyScene.tsx:572–577), NOT headings — the
  correct downgrade of Heron's transient h1s: two more headings that appear/disappear
  with scroll would have polluted the outline. **One headline per state contract holds**:
  states 1/2 = plaque 1/2 (visibility-gated, one voice), states 3–5 = no headline
  (intro head «مقدمة» is a 12-char-style label `<p>`, matching map.md's own ruling that
  it is "a 12-char label, not a headline"), state 6 = the closing h2.
- The drawing: `role="img"` + a full, correct Arabic `aria-label`
  (LearningPlanDrawing.tsx:343) — the right pattern for a complex decorative drawing;
  every internal layer group is `aria-hidden="true"` (belt-and-suspenders under role=img).
- The `[nn/05]` counter rows are `aria-hidden="true"` (JourneyScene.tsx:561) — chrome,
  not content. Correct.
- `<aside aria-label="مقدمة">` → a *named* complementary landmark (JourneyScene.tsx:586).
  Acceptable; nit: the label duplicates the visible head `<p>مقدمة</p>` so a landmark
  navigation announces «مقدمة» twice — the site's own WordReveal uses the same
  aria-label-duplicates-visible-text pattern, so this is consistent practice, not a defect.

### 1.3 Contrast — computed WCAG ratios from live computed styles

≥992 (1440×900, light) — 3 states, from the actual backgrounds:

| spot | state | fg | bg | ratio |
|---|---|---|---|---|
| `.jt-card1` statement over the plan paper | 1 | #282828 | #F6F6EE (pl-sheet) | **13.57** ✓ |
| `.jt-idx` `[01/05]` counter (chip ground `--bg`) | 1/3 | #62625F | #F6F6EE | **5.63** ✓ |
| `.jt-intro-head` «مقدمة» dark chip | 3 | #F6F6EE | #282828 | **13.57** ✓ |
| `.jt-intro-finding` body on paper card | 3 | #414140 | #F6F6EE | **9.41** ✓ |
| `.jt-close-chip` / `.jt-close-title` | 5 | #282828 | #F6F6EE | **13.57** ✓ |
| `.jt-close-copy` | 5 | #414140 | #F6F6EE | **9.41** ✓ |
| plan `.pl-name` (washed + quiet) | 5 | #282828 / #414140 | paper | 13.57 / 9.41 ✓ |
| plan `.bp-micro` areas/dims | 5 | #62625F | paper | **5.63** ✓ |
| quiet station `[01]`…`[04]` | 5 | #C72E00 | paper | **5.06** ✓ |
| **active station `[05]` on its chip** | 5 | #FFFFFF | #FA3600 | **3.76** ⚠ (see D4) |

@390 (2 spots): `.jt-intro-finding` **9.41** @15.88px ✓ · `.jt-close-copy` **9.41**
@15.88px ✓ (state 6 landed: `data-stage=5`, `data-open=on`, card in flow below the
plan — the ≤991 V10 overlap class is dead by construction).

**Dark theme (`[data-theme="dark"]`, live-verified + screenshot + VLM):**

| spot | fg | bg | ratio |
|---|---|---|---|
| `.jt-card1` statement over the plan paper | #F6F8FA | #F6F6EE | **1.02 — INVISIBLE** ✗ |
| counters | #B4B4B0 | #282828 chip | 7.09 ✓ |
| intro head (inverted chip) | #282828 | #F6F8FA | 13.85 ✓ |
| closing title/copy | #F6F8FA / #C9C9C5 | #282828 page | 13.85 ✓ |

The plan is a deliberate paper artifact in both themes (pinned `#F6F6EE` pigment,
LearningPlanDrawing.tsx:99–101), but `.jt-card { color: var(--text) }`
(landing.css:5252) rides the theme token — in dark, near-white on near-white. VLM on my
capture (`reviewer-3-dark-plaque-1440.png`): *"the main statement text is effectively
invisible because it is white on a light background."* → **Defect D1 (HIGH)**. The
hero's art got its dark overrides (landing.css:835, 3689); the map's plaque ink did not
follow the transplant's own paper-artifact register.

### 1.4 Hidden-content discipline (a11y tree) — the one structural weakness

- Plaques: `writeCard` sets `visibility:hidden` at opacity 0 (JourneyScene.tsx:338) —
  proper autoAlpha parity, "never a hidden third voice" ✓.
- BUT `.jt-intro-body { display: none }` (landing.css:5306–5315) exists only at
  `data-stage` 2/3/4 — and the closing title/copy sit at `opacity: 0` (still IN the a11y
  tree) from stage 0. Net effect at scroll 0 (live-verified): an SR user traversing the
  page linearly hears the svg label + «مقدمة» (empty body) + the full closing column —
  and **never the five findings**, because they are `display:none` outside stages 2–4
  and the driver only ticks on scroll. The findings are the section's capability ledger —
  and they are the **sole landing carriers of the r168b pins** «شروحات مخصَّصة» /
  «خطط مراجعة حسب أدائك الفعلي» (grep-verified: JourneyScene.tsx:148 is the only hit in
  `frontend/src`). Mitigation: the equivalent capability copy lives in flow in WhyScene
  (WhyScene.tsx:46–75, nearly identical texts), and under RM the static sheet opens the
  card with all findings (verified: `data-finding=all`, 5/5 opacity 1). → **Defect D2
  (MEDIUM)**.

### 1.5 prefers-reduced-motion — complete (sanity-read + live)

Live @1440 with `reducedMotion:'reduce'`: all six layer groups opacity **1**, all five
findings visible, all five counter rows visible, `intro-body` display block, closing
title/copy opacity 1, `window` transform identity, `data-rm=on`, and — after a mid-track
scroll hop — the state stays frozen (`stage=4, finding=all`, layers still 1). The CSS
belt (landing.css:5682–5718) covers the no-JS case for layers/text/zone/findings/closing
and the driver writes the same state idempotently. One theoretical gap: the belt gives
`.jt-idx > span` only `transition:none`, not `opacity:1` — a no-JS RM visitor would see
only `[01/05]` — but the app is an SPA with no prerender, so the no-JS state is
unreachable; **informational only** (nit N2).

### 1.6 Misc verified

- No `letter-spacing` on any Arabic element in the map (computed `normal` on all 6 seats;
  the 0.04em tracking sits only on the Latin mono counters — site grammar, 5 other uses).
- Counters: Latin-only, `dir="ltr"`, complete `[01/05]…[05/05]`, `white-space:nowrap`,
  not clipped (scrollWidth check). Mono SVG furniture: 28 micro texts, all Latin
  (A–H, 1–4, areas, dims, `[01]–[05]`), zero Arabic in mono ✓.

---

## 2 · Copy honesty + Arabic quality

### 2.1 Honesty — every checkable claim verified against the product

| claim (map copy) | verification | verdict |
|---|---|---|
| «بنك أسئلة بأربعة أنواع» | `QTYPE_LABEL` = exactly 4 kinds (MCQ / TRUE_FALSE / SHORT / ESSAY) — OnlineExamsPages.tsx:1626–1631; same claim already in WhyScene.tsx:65 | **true** ✓ |
| «تصحيح تلقائي للأسئلة الموضوعية» | objective kinds are the auto-gradable set; phrase correctly scoped to الموضوعية | ✓ |
| «حضور يُحتسب تلقائيًا عند الإكمال» | backend implements it: learning.routes.ts:324 "Smart auto-attendance: when a recorded lecture transitions into…" (+ seed/tests) | **true** ✓ |
| «درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب» | MatrixPage ("خريطة معرفيّة… درجة إتقانك"); identical sentence in WhyScene.tsx:72 | ✓ |
| «يعمل الآن داخل المنصّة» (assistant) | live feature: AiAssistantPage (student tree) | ✓ |
| «كل غرفة في هذا المسطح ميزة تعمل اليوم… لا وعدًا قادمًا» | each narrated room maps to a live capability; consistent with the landing's honest-ledger voice | ✓ |
| «أكمل التمرير لتصل إلى إنشاء الحساب في نهاية الصفحة» | register row is the page's closing band; funnel untouched (R2: exactly 5/5 register CTAs, zero added) | ✓ |
| areas/dims `240/36/150/96/84 M2`, `11.6/11.3/12.3/20.6M` | drawing furniture, not product metrics — and internally consistent (606 m² of zones inside a 35.2×20.6 m footprint ≈ 725 m² minus corridor/reception/walls) | ✓ no disclosure needed |
| r168b pins | «شروحات مخصَّصة» + «خطط مراجعة حسب أدائك الفعلي» ride finding 5 **verbatim** (JourneyScene.tsx:148, live innerText match) | ✓ |

No invented metrics, no fabricated product claims, no numbers presented as product
performance. The only unverifiable-from-frontend claim (auto-attendance) is
backend-verified. **Copy honesty: clean.**

### 2.2 Arabic quality — clean

- Statements/closing: zero tashkeel ✓. Body texts carry selective shadda
  («مسجَّلة», «تُثبِّت», «مخصَّصة») — the site's established register (the r168b pin
  strings themselves carry shadda; WhyScene identical).
- «لكل فصل غرفته وبابها» — «بابها» reads as the *room's* door (iltifāṣ to the nearer
  feminine noun); coherent, deliberate, no error. «المسطح اكتمل — والخطوة التالية لك:…»
  — the em-dash + colon matches the sheet's display punctuation («الرحلة — …»,
  «لا وعود — …»).
- Punctuation sane (Arabic «،», no stray Latin commas); no letter-spacing on Arabic
  (computed); `dir="ltr"` on all Latin mono.

### 2.3 One term per concept

- Inside the map: **«مسطح» is the exclusive term** — statement 1, closing title, closing
  copy, svg aria-label («مسطح معماري لطابق التعلّم»), section id `#chapters` copy.
  Zero occurrences of «خريطة»/«مخطط» in `.jt` (live textContent probe). ✓
- Cross-surface drift (both **pre-existing**, not C3-introduced; the map followed the
  landing's own established terms): landing «**نقاط الفحص**» (LandingPage.tsx:134,
  WhyScene.tsx:51, map ×2) vs the student app's «**نقاط التفاعل**»
  (LecturePlayerPage.tsx:855, MatrixPage, DashboardPage) for the same feature;
  «**المساعد الأكاديمي**» (map, legal pages) vs «**المساعد الذكيّ**» (AiAssistantPage:387).
  → filed as D6 (LOW, ledger for the C4/copy sweep).
- Nit: 'M2' not 'M²' in the area labels; the svg aria-label says «بأسهم عند كل باب»
  while the drawing carries door swing arcs + one path arrowhead (loose description,
  decorative content).

---

## 3 · The §3 rubric (my four categories)

| # | category | score | justification |
|---|---|---|---|
| 1 | **Hierarchy** | **7** | The voice machine is right: one statement per state (plaques visibility-gated), one h2 in the whole map, findings rotate one at a time in a constant-height card, closing owns state 6 (VLM @390: headline is the clear focal). BUT state 3's *intended* focal — the INTRODUCTION card — loses to the already-lit lecture wash + 90% layer 1 at the recorded pick (VLM @1440: "the dominant focal point is the bright orange-highlighted room; the card is a strong secondary"); on desktop the reserved 464px panel co-exists from stage 0 (R1's defect 2) so the closing reveal reads calm rather than promoted. |
| 2 | **Density & restraint** | **6** | Nothing decorative-without-function: every plan mark is drafting semantics, the '+' marks are the site's own registration grammar (11 uses across sheets), no debug/jargon text (the MDRK·SCALE title block is killed — verified: 28 micro texts, none debug), zero duplicate strings in the map DOM (probe). What costs the score is *restraint of the accent*: the wash runs 7–20× the reference's measured orange cap (R1/R2's pixel measurements — a restraint failure by my judgment), the paper is never quiet at the pure-paper beat (base layer 8% ink vs Heron 0.00%), and the micro-label tier renders at ~8px @1440 (12px viewBox font × 0.663 scale) — at the floor of legibility for the dims/areas. |
| 3 | **Consistency** | **8** | The furniture matches the site's grammar exactly: counters reuse `.fo-mono` + `dir=ltr` + the 0.04em Latin tracking (5 other seats), chips use the display font at the D3 rung like their siblings, tokens everywhere except the allow-commented pinned plan pigment, display ladder D1/D2 respected (w600 owner cap — documented), RM matches the r306 site contract, heading discipline matches the sheet. Minus: the transplant's own "paper artifact in BOTH themes" rule is not carried through to the plaque ink (D1 — an internal inconsistency, not just a contrast bug), and the two pre-existing term drifts (D6) sit at the landing's edge. |
| 4 | **Motion & scroll feel** | **9** | Read the driver end-to-end: the windows are Heron's exact trigger table re-derived in pin units (entrance −0.167→0 vs measured −0.164→0; sequence −0.082→0.952 *exact*; layer windows [2.5,3.0]…[5.02,5.52] *exact* to the 0.02s); every tween eases `p2o` (power2.out — the reference's sampled curve); the card OUT recipe is exact (fade + −2.5px + ×0.96; the 24px IN-rise is an authoring liberty within map.md's unspecified "fade-in + settle"); discrete flips are 200/500ms (≤700 ✓) with the chip snapping (the D4 white-on-salmon mid-state kill — sound reasoning); **no per-element transitions during scroll** (computed: window/cards/layer groups all `0s`; only the discrete seats carry t-fast/t-slow); writes are idempotent and cached (`setSheetVar` last-value skip, `writeAttrs` dataset compare, `writeCamBox` attr compare — verified in sheetConductor.ts:138–152); the ≤991 camera writes quantized, change-gated viewBox rects (zero layout); RM is the complete static sheet, live-verified including scroll-hop stability. Minus: the monotonic closing flip and the mobile camera replacing Heron's @768 curtain-drop are authored deviations (both documented, both defensible). |

**Mean = (7+6+8+9)/4 = 7.5**

---

## 4 · Numbered defects (my scope)

1. **[HIGH · a11y/contrast] The two statement plaques are invisible in dark theme —
   1.02:1.** What/where: `.jt-card { color: var(--text) }` (landing.css:5239–5258)
   rendered over the plan's pinned light paper (`PLAN_INK_CSS` pins `.pl-sheet`/`.pl-paper`
   to #F6F6EE in BOTH themes — LearningPlanDrawing.tsx:99–101); `[data-theme="dark"]`
   resolves `--text` to #F6F8FA. Live-computed at state 1 @1440 dark: ratio **1.02**;
   VLM on the capture: "effectively invisible." No dark override exists for `.jt-card`
   (the hero art got one — landing.css:835/3689). The landing is a two-theme public
   surface with a header theme toggle, so this is reachable in one click. Fix: pin the
   plaque ink to the paper-artifact register (#282828) like the drawing's own pigment,
   or add the `[data-theme="dark"]` override. Evidence:
   `audits/evidence/r322/review-c3/reviewer-3-dark-plaque-1440.png`.
2. **[MEDIUM · a11y] The map's five findings — the capability ledger and the ONLY
   landing carriers of the r168b pins — are `display:none` for assistive tech outside
   scroll stages 2–4.** What/where: `.jt-intro-body { display: none }`, displayed only
   under `[data-stage='2'/'3'/'4']` (landing.css:5306–5315); the driver only ticks on
   scroll (useSheetScroll), so a screen-reader user reading linearly from the top (page
   at stage 0) never meets them; the closing column's title/copy, by contrast, stay in
   the a11y tree at `opacity:0` from stage 0 (inconsistent hidden-content discipline —
   benign direction, but the asymmetry is unplanned). Mitigations: WhyScene carries the
   equivalent capability sentences in flow; RM opens the card with all five. Fix
   candidate: keep the body in the tree (height/clip the box instead of display:none) or
   duplicate the ledger as visually-hidden text.
3. **[MEDIUM · hierarchy] State 3's focal point is the lecture wash, not the
   INTRODUCTION card.** At the recorded state-03 pick the wash is already `lecture` and
   layer 1 ≈90% (`t≈2.84s` vs Heron's pure-paper state 3 @46% scrub — compounding R1's
   defect 10). VLM @1440: the orange room dominates, the card is secondary. The card
   beat — the spec's own "state 03 = card" — never owns the frame.
4. **[LOW · a11y/visual] The active station chip text renders at ~8px and 3.76:1.**
   `[05]`-style mono on the #FA3600 chip: white-on-orange 3.76:1 (below the 4.5 text AA
   floor) at a computed ~8px rendered size (bp-micro 12px × 0.663 viewBox scale @1440;
   smaller still on the ≤991 camera crops). The seats are `aria-hidden` decorative
   furniture and the project's documented register bar is ≥3:1 — it passes *that* bar,
   and the D4 snap avoids the mid-transition smear (sound), but this is the least
   legible text on the sheet; VLM flagged it unprompted ("slightly low-contrast").
5. **[LOW · consistency, pre-existing] Landing/app term drift at the map's edges:**
   «نقاط الفحص» (landing, incl. the map ×2) vs «نقاط التفاعل» (student app) for the same
   lecture-checkpoint feature; «المساعد الأكاديمي» (map + legal) vs «المساعد الذكيّ»
   (AI page). The map followed the landing's own established terms — not introduced by
   C3, filed for the copy sweep.
6. **[NIT] 'M2' instead of 'M²'** in the five area labels; the svg `aria-label` says
   «بأسهم عند كل باب» where the drawing carries swing arcs + one path arrowhead; the
   aside's `aria-label="مقدمة"` duplicates its visible head (site-consistent pattern).
7. **[NIT · unreachable] RM no-JS counters:** the RM belt (landing.css:5697–5700) gives
   `.jt-idx > span` `transition:none` but not `opacity:1` — a no-JS RM page would show
   only `[01/05]`. The SPA has no prerender, so this state cannot occur; recorded for
   the belt's own "counter rows stand complete" comment vs code accuracy.

**Defect the others likely missed:** D1 (dark-theme plaque invisibility — a code/token
interaction invisible to light-theme pixel comparison and to geometry probes) and D2
(a11y-tree gating of the findings — invisible to every pixel-level method). D4's 8px
rendered size is also unmeasured by the pixel reviewers (they measured color share, not
type size).

---

## 5 · Non-defects verified green (my scope)

- Focus order/tab stops: 0 in the map, 0 in `#chapters` — pass-through, no traps.
- Heading outline: one h2 in the map; flat, sane page outline; plaques correctly demoted
  to `<p>`; intro head correctly a label, not a heading.
- Contrast: 13 measured seats pass AA in light @1440 and @390; dark passes everywhere
  except D1.
- RM: complete static sheet, live-verified incl. scroll-hop stability; belt sanity-read.
- Copy: every factual claim product- or backend-verified (4 question types; smart
  auto-attendance; live assistant; mastery matrix); no fake metrics; r168b pins verbatim;
  «مسطح» term-exclusive inside the map; mono Latin-only, complete, untruncated; no
  duplicate/debug text in the map DOM.
- Motion machinery: exact Heron windows/eases/stagger; zero per-element transitions
  during scroll (computed); idempotent cached writes; ≤700ms discrete flips.

---

## 6 · Verdict (my scope)

**REJECT** — mean of my four categories **7.5 / 10** (bar: ≥ 8.5 AND no HIGH a11y
defect; both fail: 7.5 < 8.5, and D1 is a HIGH accessibility defect).

The transplant's *machinery* — the clock, the a11y discipline of the plaques, the RM
contract, the copy honesty, and the term consistency inside the map — is genuinely
strong (Motion 9, Consistency 8). The rejection in my scope is driven by (1) the
dark-theme plaque invisibility, a one-line fix that nonetheless ships an unreadable
headline pair on a public two-theme surface, (2) the scroll-gated findings excluding AT
users (and the sole r168b pin carriers) from the section's content, and (3) the
hierarchy/restraint costs already measured by R1/R2 (wash 7–20× cap, never-quiet paper)
which I independently judge as category-level failures. Third consecutive REJECT
(R1 6.6 visual · R2 7.2 geometry · R3 7.5 rubric/a11y/copy).

**Priority fixes for my scope:** D1 (pin the plaque ink to the paper register) →
D2 (keep the findings in the a11y tree) → D3 (delay the first wash to the findings era,
t ≥ 3.0) → D4 (raise `bp-micro` one viewBox step or thicken the active chip label).
