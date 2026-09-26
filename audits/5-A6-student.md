# 5-A6 — Student surfaces at the 9+ bar («الحرفة الختامية» — أسطح الطالب)

Campaign 5 · audit-only (no source edits, no git operations).
**Scope:** `frontend/src/pages/student/**` (19 files) + `pages/exams/OnlineExamsPages.tsx` (student half) + `pages/community/CommunityPages.tsx` (student view) + `styles/student.css` — 31 student routes + `/community` + `/training` family.
**Method:** 20 playwright probes (`/tmp/a6-probes/*.cjs`, global playwright 1.63 @ chromium-1243, storageState student) — full route walk ×{1440, 768, 390} (28 routes, 69 screenshots + deep-dive shots, `/tmp/madarek-shots/a6/`), a **complete live exam flow** (list → resume entry → taker → sticky-timer scroll matrix → answer + save-lock → confirm dialog → submit → result → taken-state list → retake deep-link), dashboard rhythm/eyebrow/numeral measurements at 1440+390, contrast sweeps (light ×24 routes, dark ×22), heading-order pass, error-state forcing (500 via route fulfilment) ×6, skeleton capture ×7, and **4 VLM calls on 11 screenshots with every claim re-measured in DOM** (ledger below — 8 of 11 VLM claims were wrong or hallucinated; the 3 survivors are filed with measured numbers).

## Verdict in one line

The C4 lift **holds**: dashboards, courses, library, community, training all present as honest, rhythm-competent, RTL-clean surfaces with shape-matched skeletons and instructive empties — **but the exam-taking core (the briefed weakest surface) is a 7.5 wrapped in 8.5 chrome**: the taker deep-links a *finished* exam with a false «بدء الاختبار», has no question map, no persistent submit, no positive save signal, and no per-question review; and the grades chart ships with **no accessible name and no data table** (the one surface where the platform's own ChartFrame pattern was skipped).

## Per-route verdict table

Scores are against the taste.md floor. `ovX` = document horizontal overflow (−10 = scrollbar gutter only, clean everywhere).

| Route | 1440 | 390 | Score | Notes |
|---|---|---|---|---|
| `/student/dashboard` | ✓ | ✓ | **9.0** | KPI count-ups settle on real values; hero pair eyebrow misalignment (25 vs 49px); mobile order buries the agenda (P2-7/8) |
| `/student/courses` | ✓ | ✓ | **9.0** | Counted filters («الكل 6»), progress-in-card, submit modal; clean |
| `/student/courses/:id` | ✓ | ✓ | **8.5** | Reveal stagger, counted nouns, tbl-stack table; no prerequisites surface in the data model (gap, not bug) |
| `/student/lectures/:id` | ✓ | ✓ | **8.5** | Native controls, chapter states + seek, checkpoint Modal (focus-trapped), watch-progress marks, resume-seek; no notes feature, no captions (documented data gap) |
| `/student/exams` (analysis) | ✓ | ✓ | **8.0** | Honest entry-points page; **«%88» bidi flip** on the headline number (P2-1) |
| `/student/online-exams` (list) | ✓ | ✓ | **8.5** | Windowed/closed/taken states all honest, counted nouns, shape-matched skeleton; emoji icon vs lucide on courses (P3-3) |
| `/student/online-exams/:id` (taker → result) | ✓ | ✓ | **7.5** | The weak core — see findings P1-1, P2-2/3/4/5 + plan below |
| `/student/results` (grades) | ✓ | ✓ | **8.0** | Chart has **no accessible name/table** (P1-2); mobile order pushes the chart below 3 KPI cards (P2-9) |
| `/student/schedule` | ✓ | ✓ | **8.5** | Today-first rotation + «اليوم» badge verified; inline first/last radius (P3-2) |
| `/student/alerts` | ✓ | ✓ | **8.5** | Shape-matched alert skeleton, honest «الكلّ مقروء», tone-mapped icons |
| `/student/social` | ✓ | ✓ | **8.5** | Honest likes (server-truth seeded), composer error-keeps-draft, start-aligned trend rail |
| `/community` | ✓ | ✓ | **8.5** | C4 rebuild intact (pinned tint, meta flex-wrap, 70ch measure); tabs + instructive empties |
| `/student/library` | ✓ | ✓ | **8.5** | Filter Sheet + tabs + PDF entry via research papers; book tiles are actionless (P3-4) |
| `/student/research` | ✓ | ✓ | **8.5** | Scan states honest (sweep, no fake numbers), upload modal, paper rows → `/document/:file` viewer |
| `/training` | ✓ | ✓ | **9.0** | C4 KPI skeleton count fix verified (4 tiles/4 cols → 4/4) |
| `/training/:slug` | ✓ | ✓ | **8.5** | «2 / 5 دروس مكتملة 40%», lesson rows with states |
| `/training/:slug/lesson/:id` | ✓ | ✓ | **8.5** | «تم الإكمال» + «الدرس التالي» flow verified |
| `/achievements` | ✓ | ✓ | **8.5** | Rarity label dark contrast marginal (P3-6) |
| `/student/labs` | ✓ | ✓ | **8.5** | C4 terminal fix intact; runner flow present |
| `/student/ar` | ✓ | ✓ | **8.0** | Honest (dead CTA removed) but 3 equal static cards, no action (P3-5) |
| `/student/profile` | ✓ | ✓ | **8.0** | Two measured contrast fails (P2-6/7); tabs + links validation fine |
| `/student/ai` | ✓ | ✓ | **8.5** | Concept-gap suggestions from real matrix data + quick prompts |
| `/student/matrix` | ✓ | ✓ | **8.5** | — |
| `/student/mooc` | ✓ | ✓ | **8.5** | C4 orphan-tile fix intact |
| `/student/jobs` | ✓ | ✓ | **8.5** | — |
| `/student/webinars` | ✓ | ✓ | **8.0** | Instructive empty state; h1→h3 heading skip (P3-1) |
| `/student/live` | ✓ | ✓ | **8.5** | C4 single-empty fix intact («لا توجد بثوث بعد») |
| `/student/payment` | ✓ | ✓ | **8.5** | — |
| `/student/map` | ✓ | ✓ | **8.0** | Physical-left CSS is justified here (map); dense but clean |
| `/student/downloads` | ✓ | ✓ | **8.5** | — |
| `/student/university` | ✓ | ✓ | **7.5** | Accreditation chip 3.06:1 at 11px + inline styles (P2-8) |
| `/student/gamification` | ✓ | ✓ | **8.5** | — |
| `/student/skills` | ✓ | ✓ | **8.5** | — |

Zero horizontal overflow on every walked route × viewport (the `/colleges` toolbar and 320px-topbar-title problems live outside this scope — 5-A5 P1-1/P1-2). Zero page errors; one transient 401 (token refresh mid-walk, self-healed).

## Findings

### P1 — experience-breaking (2)

**P1-1 · Exam taker deep-links a finished exam with a false «بدء الاختبار».**
`OnlineExamsPages.tsx:629-660` (initial state) + `:379-380` (`listedExam` only consulted for `IN_PROGRESS`).
Live: after the attempt is GRADED, `GET /student/online-exams/:id` renders «هل أنت مستعد للبدء؟ … بمجرد الضغط على "بدء الاختبار" سيبدأ المؤقت ولا يمكنك إيقافه» + a working-looking **بدء الاختبار** button (screenshot `exam-entry-after-taken-1440.png`). Only clicking it (server round-trip) reveals «لقد أكملت هذا الاختبار مسبقاً». The exams list *already* carries `myAttempt.status` — the page has the truth and doesn't use it. This is a C4-honesty regression class (an action offered that the server will refuse), same family the window-guards fix (15-h P1-5) eliminated on the list.
*Fix sketch:* derive `hasFinishedAttempt = listedExam?.myAttempt && listedExam.myAttempt.status !== 'IN_PROGRESS'` beside `hasLiveAttempt`; when true, render the already-done screen immediately (the block at :576-626 already handles the pending-list case).

**P1-2 · The grades chart has no accessible name and no data-table alternative.**
`MorePages.tsx:611-643` — the Results bar chart renders a raw `<Bar>`; measured: canvas `role="img"` with **no aria-label**, 0 `<table>` elements on the page. The platform's own `ChartFrame` (used 40 lines away in spirit on the dashboard, `DashboardPage.tsx:304-331`) exists precisely for this: `ariaLabel` + `summary` + visually-hidden data table. Every other chart surface in student scope (dashboard doughnut) has it. A screen reader meets an unnamed image on the page whose entire purpose is the chart.
*Fix sketch:* wrap the `<Bar>` in `<ChartFrame ariaLabel="درجاتك حسب المقرّر بالنسبة المئوية" summary={…} table={{caption, columns:['المقرّر','الدرجة'], rows}}>` (import from `components/charts`); costs ~10 lines.

### P2 — craft-floor violations, measured (10)

**P2-1 · «%88» — the percent sign flips on the exam-analysis headline.**
`ExamsPage.tsx:87` — `<span className="exam-grade-value"><bdi>{avg}</bdi>%</span>`.
Measured on the render: digits at left 793/811px, `%` at **775px** → visual «%88». Every other percent on the platform renders «60%» (dash-doughnut-center, dash-term-pct, KPI cards — all measured `visual: "60%"`) because the plain `NN%` string forms one bidi number-run. The `bdi` isolates the digits so the `%` falls out into RTL context and flips. Same-page-family result screen (`OnlineExamsPages.tsx:688`) uses `<bdi>{score} / {max}</bdi>` (correctly — no trailing sign). This is the C4 close-out «exams % container» nitpick, now root-caused.
*Fix:* move the `%` inside the `bdi`: `<bdi>{avg}%</bdi>` — matches the app-wide convention.

**P2-2 · Exam taker: no question map, no persistent submit, unanswered count hidden until the dialog.**
`OnlineExamsPages.tsx:754-820` + `components.css:2611` (`.exam-submit-bar` is a plain end-aligned block, not sticky).
Measured live (5-question exam, scrollH 1804px in a 784px viewport): the sticky `.exam-bar` carries only title + question count + timer (timer verified visible at scroll 0/400/1200/2400 — sticky mechanics are excellent, bar parks at topbar bottom 60px). The submit control exists **only** at the very bottom of the question list; the unanswered count («لديك 4 سؤال بدون إجابة») surfaces **only inside** the confirm dialog. On a 60-question final, a student cannot see what's unanswered, cannot jump, and must scroll the whole paper to submit. (5-A5 sibling evidence: bar wraps to 110px @320 — the wrap slot exists for a map row.)
*Fix sketch:* question-map strip inside `.exam-bar` (numbered dots: answered=filled, save-failed=warning, current=ring; click/keyboard jump with `aria-label="السؤال n من m"`); a compact «تسليم» affordance in the bar on ≤768px (or make `.exam-submit-bar` bottom-sticky above the bottom-nav); surface «أُجيب عن X من Y» in the bar subline.

**P2-3 · Exam taker: autosave is silent on success — only failures speak.**
`OnlineExamsPages.tsx:527-550` — `runAnswerSave` drives the lock (`savingQids`) and the failure chip (`failedQids`), but a successful save renders nothing. Answer-state persistence visibility (the brief's question) is half-built: the student must *trust* the copy «الأسئلة تُسجَّل تلقائياً عند تغيير الإجابة» from the entry screen. My save-lock probe confirmed the selected state + `.exam-choice.selected` render correctly (checked=true, selected class, no re-fire).
*Fix sketch:* per-question «✓ محفوظة» micro-label (12px, success-ink, opacity fade via `--motion-duration-micro`) at the question card footer when its save resolves; cleared when re-answered. Pairs with the existing failure chip.

**P2-4 · Exam result screen: no per-question review.**
`OnlineExamsPages.tsx:662-707` — result = icon + headline + `exam-grade` + verdict badge + manual-grading note. Score reveal itself is good (the one-shot rise + ring, verified), and the three-way verdict (ناجح / لم يجتز / بانتظار التصحيح اليدوي) is honest — but the student cannot see *which* questions they missed. `GET /exams/templates/:id/attempts` exposes per-attempt data but student-side answer review needs the `canSeeAnswers` gate — if no student endpoint exists, ship an honest «مراجعة الأسئلة غير متاحة بعد» note rather than nothing (C4 honesty idiom).
*Fix sketch:* collapsible review list under the grade (prompt, your answer, correct answer when `canSeeAnswers`, points); needs a backend check first — file as FE+BE coordination.

**P2-5 · Profile: completeness % in `--warning` on white — 2.3:1 at 12px.**
`ProfilePage.tsx:210-212` — measured `rgb(214,163,48)` on `#fff`, 12px mono semibold = **2.3:1** (needs 4.5). The same line's `--success`/`--accent` variants pass; only the <60% branch (the one that matters most — incomplete profile) fails.
*Fix:* `var(--warning-ink)` (text-grade token) for the value; keep `--warning` for the ProgressBar fill (graphic-grade, 3:1 floor).

**P2-6 · Profile: support email `--accent` on surface-2 — 3.52:1 at 11px.**
`ProfilePage.tsx:307` — `info@zu.edu.ly` in `var(--accent)` on `--surface-2`. 11px mono bdi.
*Fix:* `var(--accent-ink)`.

**P2-7 · University page: accreditation chip 3.06:1 at 11px + raw inline styles.**
`MorePages.tsx:1296-1302` — `text-xxs text-subtle` overridden by inline `color: var(--accent)` on `background: var(--accent-soft)` — measured 3.06:1. Text-on-pastel must use the `-deep`/ink rung (guardrail #3); the inline style also bypasses the class system.
*Fix:* a small `.uni-accredit` class in student.css with `color: var(--accent-strong)` (or `--accent-ink`); drop the inline styles.

**P2-8 · Dashboard: the paired hero cards' eyebrows start 24px apart.**
`components.css:944-1032` — measured at 1440: GPA eyebrow 25px from card top, progress eyebrow **49px** (its text block centers against the 168px doughnut). The two cards are one visual pair (`.dash-hero-row`, 1.4fr/1fr) but their first lines don't share a baseline — the C4 close-out «GPA card rhythm» nitpick, measured. Card heights match (218px), padding matches (24px) — it's purely the internal anchoring.
*Fix:* top-anchor the progress card's text block (`align-items: flex-start` on `.dash-progress-card .dash-progress-body` at the ≥Npx row layout, or a matching 25px pad-top on the text column) so both eyebrows sit on one line.

**P2-9 · Results mobile: the primary chart lands below three stacked KPI cards.**
`MorePages.tsx:583-645` — measured at 390: KPI `grid-3` tops at 198 (3 full-width cards, 460px tall together), chart card top **658** in a 784px viewport — the page's one data visualization starts at the fold. Desktop order (KPIs → chart → detail) is right; mobile inverts the value.
*Fix:* at ≤640px pull the chart card above the KPI grid (CSS `order` on the page's flex/grid, or a mobile-only grid rearrangement); optionally compact the KPI row to a 3-across mini strip on phone.

**P2-10 · Dashboard mobile: the agenda (next classes + deadlines) is the last section of five.**
`DashboardPage.tsx:384-412` — measured at 390: welcome(80) → KPI 2×2(240) → GPA(556) → progress(712) → term(1074) → **agenda(1244 of 1771)**. For a real morning («what does a student need first?»), today's classes and the nearest deadlines are the answer — they sit 2.2 screens down, below the term-progress bar (the least urgent fact on the page). No collision with the bottom-nav (last item clears it by 241px, 80px scroll padding verified) — the issue is order, not overflow.
*Fix:* at ≤640px, move `.dash-agenda` to slot 2 (right after the welcome header) via `order` on the page column; the desktop order is fine.

### P3 — polish and consistency (9)

**P3-1 · Webinars: h1 → h3 heading skip.** `WebinarsPage.tsx:127-143` — destination link-cards use `<h3 class="webinar-dest-title">` with no h2 on the page (axe-flagged, heading-order pass). Use h2.
**P3-2 · Schedule: per-index inline border-radius.** `MorePages.tsx:504-512` — first/last row rounding computed inline per item; move to `.list-row:first-child/:last-child` in CSS (the `Card flush` wrapper already provides the clip context).
**P3-3 · Course icon families split across sibling surfaces.** `OnlineExamsPages.tsx:265` renders the exam card's course icon as `EmojiIcon(exam.courseIcon ?? '📝')` while `CoursesPage.tsx:185` renders the *same course* through the lucide `courseIcon()` map; training/community also emoji. Allowlisted, seeded-data-driven — but the exams grid and the courses grid disagree on iconography for one concept. Consider resolving `courseIcon → lucide` for exam cards too (emoji stays for training/community flavor).
**P3-4 · Library book tiles are actionless.** `LibraryPage.tsx:397-431` — thumb-card (title/author/rating/availability) with no open/borrow/detail action; research papers *do* link to `/document/:file`. Honest (no dead button), but at 9+ a book tile should open a detail Sheet (availability, borrow action when the loans API has one) — or say so.
**P3-5 · AR page: three equal static cards.** `MorePages.tsx:719-739` — the honest dead-CTA removal was right, but the result is the closest thing in student scope to the 3-equal-feature-card tell, with no next action. A single line under each card («يتطلب نظارة VR — المتوفرة في معمل الواقع الافتراضي») would make the cards informational rather than dead-end.
**P3-6 · Dark-theme marginal contrast on gamification numerals.** training.css:775 `.tier-orb` (18.24px bold level number, misses the large-text exemption by 0.4px, measured <4.5 on dark ground) and :619 `.badge-tile-rarity` («شائع», 11px). Both need one -ink rung up in dark.
**P3-7 · Library research-tab zero-value KPIs read as data.** VLM-suggested, partially verified: zero counts render at full metric weight («استعارات نشطة 0») — the C4 honesty register is satisfied (real zeros) but a muted treatment for 0 (like the leaderboard `.is-dead` idiom) would read truer.
**P3-8 · Lecture player product gaps (hand-offs, not craft bugs).** No captions (data-model gap already documented at `LecturePlayerPage.tsx:282-285`) and no notes feature anywhere on the player — the brief's «notes» expectation has no surface to audit. Both are backend-first.
**P3-9 · Alerts page is read-only.** `MorePages.tsx:342-411` — no mark-read/filter on the page itself (the topbar NotificationPanel owns actions); consider exposing «تحديد الكل كمقروء» here when the API allows.

### VLM claim ledger (every claim re-measured — 11 claims, 8 wrong/hallucinated, 3 survived)

| VLM claim | Re-measurement | Verdict |
|---|---|---|
| Dash: GPA number smaller than stat numbers | GPA 44px/700 vs metric 30px/700 | **WRONG** |
| Dash mobile: hero = 20% of viewport | welcome card 96px / 844 = 11% | **WRONG** |
| Dash: progress card wider (66/33) than GPA | GPA 679px (1.4fr) vs progress 485px | **WRONG** (inverted) |
| Community: header→stats gap too tight | measured 80px (generous) | **WRONG** |
| Library: confusing list/grid toggle | no such control in DOM | **HALLUCINATED** |
| Results: «منحنى الأداء» link looks disabled | no such link exists in DOM | **HALLUCINATED** |
| Lecture: code + title same size | title 18px/700 vs badge 11px/600 | **WRONG** |
| Lecture: «Next Lecture» button disconnected | no next-lecture control exists | **HALLUCINATED** |
| Schedule: time same weight as title | meta 12px/400 muted vs title 13px/600 | **WRONG** |
| Exams: percent alignment reads wrong for RTL | measured «%88» flip + app-wide «60%» inconsistency | **CONFIRMED → P2-1** |
| Exams taker: no persistent submit affordance | submit only at list bottom (non-sticky) | **CONFIRMED → P2-2** |
| Exams result: verdict badge secondary to score | design judgment; score-primary is defensible | **NOTED → plan item 9** |

## Exams to 9+ — concrete plan (ordered)

1. **P1-1** pre-empt the already-done state from `examsQ` (30 lines, no backend).
2. **P2-2** question map in the sticky bar + compact submit on ≤768 + «أُجيب عن X من Y» subline (the bar already wraps at 320 — the second row exists).
3. **P2-3** positive save micro-state per question (pairs with the failure chip).
4. **P2-1** `%` inside the bdi (one-character fix).
5. **P2-4** per-question review *after* the backend gate check; honest note if gated.
6. Timer: keep the documented no-pulse decision; add a 2px time-consumed hairline under the exam-bar (tension without anxiety).
7. Result verdict lockup: tighten icon→score→badge spacing (measured gaps are generous) and step the verdict badge up one rung for the fail case.
8. **P3-3** lucide course icons on exam cards.
9. Re-run the full flow probe (list → take → result) after the wave — note the seeded student's only exam is now GRADED (this audit consumed it — see worklog); orchestrator should re-seed `ExamAttempt` to IN_PROGRESS or add a second template before fix-wave verification.

## Student-mobile to 9.5 — concrete plan (ordered)

1. **P2-10** morning-first order: agenda to slot 2 at ≤640px (CSS `order`, zero TSX change).
2. **P2-9** results: chart above the KPI stack at ≤640px.
3. **P2-8** hero eyebrow alignment (also improves the desktop pair).
4. Optional: compact KPI row (4-across mini strip at 390) to pull the GPA/progress pair above the fold (currently top 556/712 in a 784 viewport).
5. Verified already at bar: bottom-nav zero collision (241px clearance + 80px scroll padding), all topbar actions 44×44, bottom-nav 5 items ≥44px, no iOS-zoom inputs, tables re-stack.

## Verified-good (measured, keep)

- Sticky exam-bar parks at topbar bottom (60px) at every scroll position; timer visible at 0/400/1200/2400; wall-clock countdown + visibilitychange re-read; urgent chip at <2min; one-shot SR announcement.
- Exam window honesty end-to-end: available/unavailable/taken triage, «يغلق…»/«يفتح…» badges, Arabic window-guard errors with real dates, resume copy that states the timer never stopped.
- Submit path: flushes in-flight saves (bounded 10s), one-shot auto-submit at 00:00, three-way verdict incl. neutral «بانتظار التصحيح اليدوي», per-question failure chip naming exact question numbers.
- ar-LY numerals are CLDR-correct (GPA «3,40» decimal-comma and XP «2.340» dot-grouping are the locale's latn conventions — verified against code points, **not** a bug).
- Error states: every forced-500 page rendered a state-error with working retry (results/library/social/schedule verified live); no blank areas.
- Skeletons shape-matched on all 7 captured surfaces; dark theme clean on 22 routes (2 marginal P3-6 numerals only).
- Zero horizontal overflow across 69 walked cells; zero page errors; touch floors hold.

*Probe artifacts: `/tmp/a6-probes/*.cjs` (20 scripts) + `/tmp/a6-probes/walk-results.json`; screenshots `/tmp/madarek-shots/a6/` (my run's files are the `-w1440/-w390/-w768` + named ones; the `-d/-m/-t` files in that directory predate this task — a prior interrupted run).*
