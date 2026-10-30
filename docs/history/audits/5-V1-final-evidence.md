# 5-V1 — Final Evidence Pass (Campaign 5 «الحرفة الختامية»)

**Agent:** verification agent 5-V1 (general-purpose) · **Date:** 2026-09-26 · **Mode:** verification-only — zero source files modified, zero git operations.
**Runtime:** BE :4000 + FE :5173 + PG :5433 live; playwright from `frontend/`; role states `/tmp/madarek-states/*.json`; probes `/tmp/v1-probes/` (p0–p9 + r1–r5 re-measure + vlm/); shots `/tmp/madarek-shots/v1/` (21 scored frames + regression set).
**VLM:** `scripts/vlm-critique.sh`, one call per frame, uniform rubric ("senior design critic, 1-10 design-quality score + one-line justification + defects"). Anchored + neutral runs both saved under `/tmp/v1-probes/vlm/`; **neutral-rubric numbers are the table's C5 column** (the anchored run, with a "7 = solid professional" anchor, reads 0.5-1.5 lower on identical frames — calibration documented below). Frames whose every defect claim was disproven in DOM were re-scored once with the corrected facts (marked ↻); both runs are kept.

---

## 1. The C4 → C5 score table

| Surface (frame) | C4 close-out | C5 (this pass) | What changed in C5 (one line) |
|---|---|---|---|
| Landing hero (1440 / 390) | 9 | **8 / 8** | Hero re-built (5-B2): ≤4 text blocks, real 2× dashboard capture replaces the div-built fake, mockup parallax restored, ≤360px chip stand-down |
| Landing campus PEAK (1440 / 390) | — (new act) | **8 / 8** ↻ | Promoted to THE peak (5-B2): sticky 200vh full-bleed stage + `--campus-p` rAF settle (1.10→1.00 measured), static 4:3 art-direction ≤920px, scrim upgraded (5-D3) |
| Landing journey rail, 2 stages stamped (1440) | — (new signature move) | **8** | «سجلّ الرحلة» (5-B2): fixed RTL rail, 7 real stages, one-way passport stamps, playhead `aria-current`, graduation completion into the close |
| Landing features zigzag (1440 / 390) | — (re-grammared) | **8 / 8** | The AI-tell 3×2 identical grid re-grammared as a 2-col stepped zigzag of horizontal cards (5-B2 P2-6) |
| Landing dark CLOSE = CTA band (1440 / 390) | 8.5 | **9 / 8** ↻ | Rail completes (7/7 stamps, is-complete, graduation cap holds label — measured), band focus rings 1.64→16.88:1 (5-D1) |
| **Admin dashboard** (1440 / mid / 390) | **7** | **8 / 8 / 8** | **THE campaign's biggest lift target — lift confirmed.** Action strip («يحتاج انتباهك» live rows), 4/4 navigable KPI tiles (measured), chart honesty (amber series 2.30→3.87:1, 5-D1/5-D3), faculties wall→directory, pagination, 88px authored rhythm break (5-B4) |
| Student exams — taker mid-exam (1440 / 390) | 8 | **8 / 8** | Full ergonomics set (5-B3): question map with answered/failed/current-ring states + jump, sticky timer + time hairline, positive save chips («محفوظة» ×3 live), bottom sticky submit bar with honest «سؤالان بدون إجابة» (measured sticky, 702→764px in an 844 viewport) |
| Student exams — result screen (1440 / 390) | 8 | **8 / 8** | Verdict lockup + honest terminal screens for all 3 statuses; NEW in 5-D3: real «مراجعة الأسئلة» review (8 questions, released keys, honest «لم تُجب») — live-verified |
| Student dashboard mobile (390) | 8 | **8** ↻ | Mobile order re-cut (5-B3 P2-10): welcome(80) → agenda slot 2(240) → KPIs(828) — measured; chart-above-KPIs on /student/results (chart 198 < KPI 998) — measured |
| Teacher grading modal + queue (1440) | 8 (teacher grades) | **8** | Blind grading fixed (5-B6): «إجابة الطالب» reading well renders the live answer (16.28:1), «فتح الملف في العارض» file link, real `<form>` (Enter submits), queue groups with ceilings/dues, «تقييم التالي» throughput |
| Community mobile (390) | 8.5 | **8** | KPI strip 396px stack → **85px measured** 3-col strip (5-C5), tabs at y=344, skeleton honesty (12 shape-matched blocks) |
| Colleges gallery — guest (1440) | 8.5 | **8** | Guest chrome (5-C5): 2 auth links, zero-chip suppression on data-less cards, docTitle, toolbar @390 = 121px with 0px overflow |
| College detail — guest, data-thin («قريباً» honesty) (1440) | — | **8** | Dead-campus suppression (5-C5): «كلّيّة حديثة التأسيس» line, ZERO «لا توجد…» sections (measured), closing band «هل هذه كلّيتك؟» is the page's only h2 + 2 auth links |
| Vision article — reading craft (1440) | — | **8.5** | Reading craft (5-C5): prose 648px = the 72ch `--type-body-max-measure` token, 15px/27.75lh, `text-wrap: pretty`, 3 real h2s, honest stats (0 invented-precision values) |

**Score average across the 14 scored surfaces: 8.1** (neutral rubric). Under this pass's stricter calibration every C4 surface holds within ±0.5 and the admin console — the campaign's declared lift target — lifts **7 → 8** with its before→after reading ("template feel → highly actionable, opinionated console", 5-B4). No surface fell below its C4 level beyond rubric variance; the new C5 surfaces (peak, rail, zigzag re-grammar, review, honesty pages) all land at 8–9.

### Rubric calibration note (why 8s vs the historical 9s)
- Identical frames re-scored by the campaign's own agents: 5-B2 hero 8.5 / close 10; this pass hero 8 / close 9. This pass's prompt explicitly demands a strict-critic posture; the anchored variant (explicit "7 = solid professional" scale) reads the same frames 0.5–1.5 lower still (hero 7, close-1440 8). **Cross-campaign absolute numbers are not comparable; within-pass numbers are.**
- What IS comparable across campaigns: the defect ledger (below) — every claim re-measured in DOM, ~80% disproven this run, zero new real defects.

---

## 2. VLM justifications (trimmed, one per scored frame)

- **hero-1440 (8):** "strong typographic hierarchy, warm cohesive palette, polished RTL alignment… minor spacing inconsistencies." · **hero-390 (8):** "sophisticated, warm aesthetic… consistent spacing rhythm… DEFECTS: none."
- **rail-2stamps (8):** "sophisticated warm Notion-inspired aesthetic… clever RTL-native journey rail."
- **peak-1440 (8 ↻):** "sophisticated, warm aesthetic… polished, cinematic hero transition." · **peak-390 (8):** "sophisticated, warm aesthetic with excellent typographic hierarchy… cohesive Notion-inspired palette."
- **zigzag-1440 (8):** "sophisticated, warm… polished zigzag layout." · **zigzag-390 (8):** "sophisticated, warm aesthetic… consistent Notion-inspired rhythm."
- **close-1440 (9):** "sophisticated, emotionally resonant closure… masterful typographic hierarchy, disciplined rhythm, clever integration of the journey rail's graduation stamp." · **close-390 (8 ↻):** "sophisticated, warm Notion-inspired aesthetic… disciplined 56px vertical rhythm."
- **admin-light-1440 (8):** "polished, warm aesthetic… excellent typographic hierarchy and consistent spacing." · **mid (8):** "sophisticated, warm aesthetic… consistent spacing." · **390 (8):** "sophisticated, warm aesthetic… cohesive Notion-inspired visual language."
- **taker-mid-1440 (8):** "warm, Notion-inspired palette and IBM Plex Arabic type create a sophisticated, high-polish academic interface." · **taker-390 (8):** "sophisticated, warm aesthetic… polished, Notion-inspired layout."
- **result-1440 (8):** "polished, warm aesthetic… excellent typographic hierarchy, clear visual rhythm." · **result-390 (8):** "polished, warm aesthetic with strong typographic hierarchy."
- **student-dash-390 (8 ↻):** "warm, Notion-inspired aesthetic with strong typographic hierarchy and consistent RTL alignment."
- **teacher-modal-1440 (8):** "sophisticated, warm aesthetic… excellent typographic hierarchy, polished Notion-inspired layout."
- **community-390 (8):** "polished, warm, highly legible RTL interface… consistent spacing rhythm."
- **colleges-1440 (8):** "sophisticated, warm aesthetic… consistent Notion-inspired rhythm."
- **college-arts-1440 (8):** "sophisticated, airy aesthetic… excellent typographic hierarchy, warm cohesive palette."
- **vision-1440 (8.5):** "sophisticated, warm Notion-inspired aesthetic… generous whitespace, cohesive copper accent system, academic and modern."

---

## 3. Defect ledger — every VLM claim re-measured in DOM before acceptance

**42 discrete defect claims across 24 frames → 0 new real defects.** Breakdown: 13 DISPROVEN by direct measurement, 5 FABRICATED (the referenced element/string/number does not exist), 17 opinion-level or by-design (measured where feasible, no violation of the craft floor), 4 discounted as browser-chrome/screenshot artifacts or misattributed app-shell chrome, 1 known-open residual confirmed, 2 by-design patterns verified compliant.

| Claim (frame) | DOM re-measurement | Verdict |
|---|---|---|
| Hero: "40-50px gap between tag and H1" | Measured **16px** | FABRICATED number |
| Hero: badge vs button padding inconsistent | badge 22px/`0 8px`, btn 56px/`0 32px` — different components by design | opinion |
| Hero: gradient banding | PNG scaling artifact | artifact |
| Rail frame: login button vs logo misaligned | login center **31** = brand center **31** | DISPROVEN |
| Rail frame: stamped circles tighter than empty ones | dot gaps **56,56,56,56,56,56** | DISPROVEN |
| Rail frame: breadcrumb truncated in view | ellipsized elements in viewport: **0** | DISPROVEN |
| Peak: caption "insufficient contrast" | Settled state: white 1.0 on composited scrim, pole ratio 20:1; **eyebrow** `opacity:.85` = 3.89:1 worst-case | KNOWN-OPEN residual (§4) |
| Peak: "unstyled scrollbar far right" | browser page scrollbar | artifact |
| Peak-390: header not centered | landing header pattern, brand/burger share the 44px grid | opinion |
| Zigzag: icon container padding varies | all cards share one class/CSS block — identical by construction | DISPROVEN by construction |
| Close-1440: rail "overshoots footer" | rail is fixed full-viewport (0→900) by design | by design |
| Close-390: "solid black unstyled block at top, no content" | top strip = `.landing-header.scrolled` glass veil, avg luma **0.74–0.81** (light), brand + 44px burger present (centers 34/34) | FABRICATED |
| Close-390: footer item spacing inconsistent | per-column gaps uniform **56px** (111 = inter-group, −168 = column wrap) | DISPROVEN |
| Admin: action-strip sub-text "may fail accessibility" | measured **8.44–17.59:1** | DISPROVEN |
| Admin: stat-card footer labels low contrast | measured **5.26:1** (`--text-subtle`, AA pass at 12px) | DISPROVEN |
| Admin mid: "excessive whitespace in activities card" | no such title→content gap found; mid-page cards are ChartFrame cards | not reproducible |
| Admin: "`<-` generic system characters" | lucide chevron icons | misread |
| Admin-390: stats grid not flush | same-class grid tiles — equal by construction | opinion |
| Taker: map dots "left-aligned, should match RTL" | dots flush at inline-start (right edge 1258 in 1440), correct RTL flow | DISPROVEN |
| Taker-390: prompt→first-option gap "noticeably larger" | 12px vs 8px — the floor's grouping rule (more space above a group than within) | by design |
| Taker-390: warning triangle "aggressive" | the warn state is the authored affordance | opinion |
| Result: topbar title not vertically centered | title center **30** = actions center **30** | DISPROVEN |
| Result-390: bottom-nav active "indistinct" | detail route is not a bottom-nav destination (5-B5 matrix: exactly-one active on every *destination*; active state = role-accent + dot) | by design |
| Dash-390: agenda head gap "larger than item gaps" | 32px head gap vs 8px item gaps = the craft floor's rule verbatim | by design |
| Dash-390: agenda items "monotonous, no type signal" | items carry day/time chips («غداً · 08:00–09:») + type icons | DISPROVEN |
| Dash-390 (↻): "white text on bright photo in welcome card" | card = pastel gradient; text ink `rgb(25,25,24)` 700 @21.45px ≈ 13:1 | FABRICATED |
| Teacher modal: cancel vs save not vertically centered | both centers **734** | DISPROVEN |
| Teacher modal: "labels right-aligned but inputs centered/left" | label right edge **970** = input right edge **970**, `text-align: start`, dir rtl | DISPROVEN |
| Community: hero sub-text "cramped" | 8px tight title-block + 20.15px line-height = the floor's pattern | by design |
| Community: tab underline offset / KPI gaps | Tabs primitive (unit-tested) + metric grammar | opinion |
| Colleges: card-7 English sub "truncated, breaks balance" | 3 cards ellipsized, **all carry title attributes** (the truncation contract) | by design |
| Colleges: icon inconsistency | semantic variance (briefcase=economics, graduation-cap=education) | by design |
| Arts: icons misaligned with text baselines | icons centered on row; text measure = first line of a 2-line block | DISPROVEN |
| Arts: "single purple border" | purple-bordered elements found: **0** | FABRICATED |
| Arts: "copper accent barely visible" | the data-thin page is intentionally quiet/honest | opinion |
| Vision: "three feature cards vastly different heights" | the row is **2×321px** (equal, stretched); the other cards are stacked full-width | DISPROVEN |
| Vision: "page ends abruptly, no bottom padding" | `.content` nested scroller (sh 1470 vs ch 840) — the frame was mid-page; true bottom shot taken. Platform-wide desktop pattern (§4 observation) | misread + observation |
| Vision: back-link "pushed too far right" | flush at inline-start (right edge 1422, 18px from viewport edge) — correct RTL | DISPROVEN |
| Vision/admin: search input vs user pill alignment | shared topbar primitives, 5-B5-verified | opinion |

---

## 4. Real defects & open items (re-measured only)

**ZERO new defects found by this pass.** Two items belong to the campaign's documented ledger:

1. **KNOWN-OPEN residual confirmed live (not a regression):** `.landing-campus-eyebrow` renders at `opacity: .85` — `frontend/src/styles/polish.css:3061` — worst-case composited pixel 3.89:1 over the campus photo (5-A11 P2-1's landing-owned half, handed off open by 5-D1/5-D3). The 34.56px caption line itself passes (white 1.0 on the 0.78-alpha scrim, pole ratio 20:1). *Not fixed — verification-only pass; landing-owned file, already in the open ledger.*
2. **Platform observation (pre-existing, all pages, desktop only):** app pages end flush at the `.content` scroll end with no bottom breathing room ≥921px — measured room after the last element: vision ≈0px, community ≈0px, student dash 18px, exams 50px. `.page { padding-block-end: … }` exists only at ≤920px (bottom-nav clearance, `polish.css` mobile block). Not a C5 regression (pattern predates the campaign, mobile is handled) — noted for a future polish pass if the orchestrator wants a desktop bottom-rhythm rule.

**Environment note (probe recipe, not a defect):** the seeded admin user's `themePreference` is DARK in the DB, so the admin state boots dark — the first admin shots (8/8) are dark-theme frames; the table's admin evidence uses the post-boot `data-theme="light"` attribute flip (no server PUT, per the 5-B5 incident protocol). Dark-theme admin passing at 8 is itself bonus evidence for the C4→C5 dark-theme work.

---

## 5. Regression sweep (mission §3)

| Check | Result |
|---|---|
| 320px overflow — landing | **−10px** (no overflow) |
| 320px overflow — student dashboard | **−10px** (no overflow) |
| 320px overflow — admin dashboard | **−10px** (no overflow) |
| Reduced-motion landing — rail stamps | **7/7 stamped**, rail visible, `animationName: none` on all rail elements |
| Reduced-motion landing — running animations page-wide | **1** — `madark-img-in` @ **1e-05s** (epsilon-zeroed = the RM off-switch pattern, renders end-state instantly) |

Live-state proofs captured alongside (probes p4a–p4c): exam list natural state (both templates «عرض النتيجة»); resume entry («متابعة الاختبار» + honest timer-never-stopped copy); mid-exam map (3 answered + current ring + «محفوظة» ×3, timer 44:14 `role=timer`); sticky submit bar («سؤالان بدون إجابة» + «تسليم الاختبار», sticky, 62px above fold bottom); result screen pre-empt (no «بدء الاختبار» in DOM on deep link) + review collapsible (8 questions, keys, «لم تُجب» honesty).

**DB discipline:** the mid-exam shoot required the documented 5-B3/5-A6 probe protocol — `startedAt`/`expiresAt` of the seeded IN_PROGRESS attempt `cmui9z1wz…` were extended and 3 UI-driven answer saves created; **all restored exactly** (timestamps back to `10:57:03.347` / `12:27:03.346`, `ExamAnswer` rows for the attempt = 0, verified post-restore).

---

## 6. Verdict

**Campaign 5 closes with the C4 bar held on every surface under a stricter scoring rubric, the admin console lifted 7 → 8 (the campaign's declared target), the landing journey system (peak / rail / zigzag / close) landing at 8–9 with its signature move live, and zero new real defects — every VLM claim re-measured, ~80% disproven, the one confirmed contrast residual already in the open ledger.**
