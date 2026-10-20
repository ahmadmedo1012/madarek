# Handoff — Agent 4C (teacher & quality surfaces)

Branch: `redesign/4c-teacher-quality` (from origin/main @ r198)
Round range: **r240–r249**
Final SHA: _pending final push_

## Route map → primary user goal → mobile recomposition

Owned routes verified in `frontend/src/App.tsx` @ r198. Layout decision noted per page as it lands.

### Teacher family (`pages/teacher/`, plus the shared exams file)

| Route | Component (file) | Primary user goal | Mobile recomposition |
|---|---|---|---|
| `/teacher/dashboard` | TeacherDashboardPage | «ماذا يحتاج تدخّلي الآن؟» — grading queue first, today's lectures, at-risk shortcuts | StatStrip wraps 2×2; queue rows full-width single column; chart moves below the queue |
| `/teacher/schedule` | TeacherSchedulePage (TeacherPages.tsx) | «أين أُدرّس هذا الأسبوع؟» | weekly grid → day-accordion list |
| `/teacher/attendance` | AttendancePage (TeacherPages.tsx) | «سجّل حضور هذه المحاضرة بسرعة» | one-tap student rows, sticky session header |
| `/teacher/grades` | GradesPage (TeacherPages.tsx) | «رصد درجات الفصل للشعبة» | table → row-cards with inline number inputs |
| `/teacher/materials` | MaterialsPage (TeacherPages.tsx) | «أرفق وحدّث مراجع المقرر» | rows with trailing actions |
| `/teacher/students` | StudentsListPage (TeacherPages.tsx) | «مَن طلاب شعبتي وما حالهم؟» | table → row-cards, risk badge leading |
| `/teacher/performance` | PerformancePage (TeacherPages.tsx) | «كيف يؤدّي شعاعي هذا الفصل؟» | StatLine + charts stacked full-width |
| `/teacher/assignments` | AssignmentsPage (TeacherPages.tsx) | «الواجبات + طابور التصحيح» | queue-first single column |
| `/teacher/messages` | MessagesPage (TeacherPages.tsx wrapper) | inbox (shared MessagesInbox 4E) | untouched wrapper; inbox is 4E's |
| `/teacher/intelligence` | TeacherIntelligencePage | «مَن في خطر وأين؟» — offering risk analysis | risk rows; picker becomes full-width select |
| `/teacher/intelligence/:offeringId` | TeacherOfferingDetailPage | deep-dive one offering | stacked sections |
| `/teacher/profile` | TeacherProfilePage | «حسابي وبياناتي المهنية» | single column |
| `/teacher/live` | TeacherLivePage | «جلسات مباشرة» | rows |
| `/teacher/labs` | TeacherLabsPage | «مختبرات شعاعي» | rows |
| `/teacher/exams` | ExamAuthoringPage (ExamAuthorPages.tsx) | «بنك الأسئلة وقوالب الاختبارات» — list-plus-editor | SplitView list→detail stack; question bank searchable rows |
| `/teacher/exams/:templateId` | ExamTemplateDetailPage (ExamAuthorPages.tsx) | «تحرير قالب + محاولاته» | stacked detail; attempts list |
| `/teacher/research` | ResearchPage = thin wrapper over 4B's ResearchReviewPage | (4B's surface) | not redesigned here — wrapper line only |

### Exams (`pages/exams/OnlineExamsPages.tsx` — single owner)

| Route | Component | Primary user goal | Mobile recomposition |
|---|---|---|---|
| `/student/online-exams` | OnlineExamsPage | «ما الاختبارات المتاحة لي وحالتها؟» | list rows, status chip leading |
| `/student/online-exams/:id` | ExamTakerPage | «أجرِ الاختبار بأمان» | one-question focus, sticky timer |
| `/quality/exam-moderation` | ExamModerationPage | «راجع أسئلة الاختبارات» | moderation rows; question cards stack |

### Quality (`pages/quality/QualityPages.tsx` — read-only oversight)

| Route | Component | Primary user goal | Mobile recomposition |
|---|---|---|---|
| `/quality/dashboard` | QualityDashboardPage | «صحة المنصة التعليمية بنظرة» | StatStrip 2×2; boards stacked |
| `/quality/courses` | QualityCoursesPage | «حلّل المقررات بالحضور/الإكمال» | table → row-cards |
| `/quality/professors` | QualityProfessorsPage | «حلّل الأعضاء التدريسيين» | roster band → rows |
| `/quality/engagement` | QualityEngagementPage | «مستوى التفاعل العام» | charts stacked |
| `/quality/reports` | QualityReportsPage | «تقارير الجودة» | rows |
| `/quality/curriculum` | QualityCurriculumPage | «اكتمال المناهج» | curriculum rows |
| `/quality/alerts` | QualityAlertsPage | «التنبيهات التشغيلية» | rows |

Not mine (mount in teacher/quality shells but owned elsewhere): `/teacher/{ai,alerts,community,library,vision,colleges,competitions}`, `/quality/notifications` (AlertsPage 4E), `/quality/community` (4E), `pages/teacher/ResearchReviewPage.tsx` (4B).

## Shared-file rules honored
- NOT editing: tokens.css, unified-parity.css, parity script, fonts, 1B primitives, components/patterns (never create), components/layout/*, nav, polish.css, App.tsx, backend, admin.css/owner.css (consume only), anyone else's pages, audit baseline, CHANGELOG, DESIGN.md, index.html.
- `styles/admin.css`: consumed as-is (210 L; teacher family borrows nothing from it directly — verified).
- New family sheet: `styles/teacher-quality.css`, page-scoped (imported by lazy page modules, owner.css/pdf.css pattern), token-compliant under the raw-css/motion/colors gates.

## Layout decisions (Superlist direction)
_pending — filled per page as compositions land._

## Files changed
_pending._

## Obsolete selectors (for Agent Z)
_pending._

## Sheet import lines that may conflict
_pending._

## Requests
_pending._

## 4C-c (teacher operations)

Branch: `redesign/4c-teacher-quality` · Scope: `pages/teacher/TeacherPages.tsx` + NEW `styles/teacher-pages.css` (imported from TeacherPages.tsx line 50) + 4 pin updates in `tests/unit/TeacherPages.test.tsx`.

### Layout decisions (Superlist direction) — landed

| Page | Composition |
|---|---|
| `/teacher/assignments` | Flagship work-queue: Card «تسليمات بانتظار التقييم» (honest countAr subtitle) → `.tpg-queue` calm sections per assignment (hairline frame, header rule: title · course · يستحقّ {due} · ceiling chip · count chip) over full-height rows (avatar · name · «متأخر» chip · وصل {relative}) with ONE trailing ≥44px signal action **«تصحيح»** (renamed from «تقييم»; opens GradeSubmissionModal unchanged). Empty state: «لا تسليمات بانتظار التصحيح». Authored-assignments card rows keep the list-row grammar with `.tpg-asg-meta`/`.tpg-asg-side` (inline styles retired). |
| `/teacher/attendance` | Session-first: «الجلسة» card (44px inputs) → roster rows ≥56px (avatar + name + id) with the 4 status toggles as a ≥44px segmented group (full-width ≤640); sticky `.tpg-att-summary` strip (حاضر/متأخّر/غائب/بعذر, mono tabular) rides above the roster; stats card + ProgressBars unchanged (pinned labels). |
| `/teacher/grades` | Read table untouched; SemesterGradeEntry = `.table-wrap.sticky` scrollport (pinned header) + `.tpg-grade-table` (44px mono-tabular inputs, narrow ceiling 180px). Mobile row-cards = the shared `.tbl-stack` data-label ladder — ONE honest DOM approach, no per-row markup fork. |
| `/teacher/schedule` | `.tpg-sched` day columns (auto-fill 240px grid) — each `.tpg-day` a surface section: tinted header (day name + «اليوم» brand badge, accent border on today via `data-today`), lecture rows with mono-tabular `bdi` time ranges, room/enrolled `.list-row-sub` (unit pin kept byte-identical), course-code badge. ≤920px: day-by-day vertical list (same DOM). |
| `/teacher/materials` | 7-column table → `.tpg-mat-row` file rows: per-type Lucide icon well (`MATERIAL_TYPE_ICON` map), `<bdi>` title link, sub-line (course · type badge · «N مشاهدة» · «N تحميل»), trailing mono size + «حُدِّث {relative}» (full datetime on title). `ListSkeleton rows={5}` replaces TableSkeleton. Modal/upload/discard-guard untouched. |
| `/teacher/students` | Shared table DOM kept (columnheader «التقدير», risk-chip vocabulary, intelligence links all pinned) + `.tpg-students` calm scope: tabular numerals, risk chip trailing (text-align end). |
| `/teacher/performance` | StatStrip unchanged; distribution → `.tpg-dist` ledger rows (band label + range · trailing mono-tabular % · quiet ProgressBar underneath; per-band ariaLabel kept; honest dim for empty buckets kept). |
| `/teacher/messages` | Untouched — thin wrapper over 4E's MessagesInbox; compose shell byte-identical. |

### Files changed
- `frontend/src/pages/teacher/TeacherPages.tsx` (recompositions above; SectionTitle import retired, 5 Lucide icons added for the material-type map)
- `frontend/src/styles/teacher-pages.css` (NEW, ~315 L, `@layer pages`, all classes `tpg-` prefixed, zero raw literals — 4 gates pass)
- `frontend/tests/unit/TeacherPages.test.tsx` (4 role-pins «تقييم»→«تصحيح» in openGradeModal + the two count assertions + the grouping assertion; comment notes the rename)

### Test pins updated + why
- `{ name: 'تقييم' }` → `{ name: 'تصحيح' }` ×4 (queue-row action rename is the deliberate presentation change; the modal's «تقييم التالي» and dialog name «تقييم تسليم …» are untouched and stay pinned). No other pin invalidated: 80/80 TeacherPages-family tests, App-routes (20), route-titles (12), r166e (3) all green; lint 0 errors / 19 pre-existing warnings.

### Obsolete selectors (for Agent Z) — TeacherPages stopped consuming
- `SectionTitle` (component import) — last TeacherPages consumer gone (schedule recomposition); still used elsewhere repo-wide, do NOT delete from primitives.
- Page-local inline style blocks removed from TSX: the queue row title flex (`display:flex; gap: var(--sp-2)…`), the assignments-list meta/side flexes, the `flex gap-1` toggle-group wrapper. components.css selectors NO LONGER consumed by this file: `.list-row-meta` (schedule time now `.tpg-lecture-time`); `.tbl-strong` in the materials table (page has no materials table anymore; still used by grades/students tables here). `.queue-group*` classes remain consumed (kept deliberately — e2e teacher-grading.e2e.ts pins `.queue-group`).
- `Card` no longer wraps the schedule («الأسبوع» card retired) — `.tpg-sched` owns that surface now.

### Requests
- typecheck transient failures in siblings' in-flight files (OnlineExamsPages.tsx / QualityPages.tsx unused imports at time of writing) — not 4C-c's; TeacherPages.tsx is clean.
- Grade ledger could later adopt a real totals footer if the backend ever projects per-kind aggregates — deliberately NOT invented now (honest copy).

## 4C-b (quality sector)

Sub-agent 4C-b — the seven `/quality/*` surfaces (Superlist recomposition). Append-only section.

### Files changed (exclusive)
- `frontend/src/pages/quality/QualityPages.tsx` — recomposed in place; every data hook / gate / state contract kept.
- `frontend/src/styles/quality-pages.css` — NEW page-scoped sheet, `@layer pages { … }`, every class `qlt-`-prefixed, imported from QualityPages.tsx (`import '../../styles/quality-pages.css';`).

### Layout decisions (Superlist direction) — per page
- **QualityDashboardPage**: header keeps the «وصول قراءة فقط» gold badge; StatStrip stays the one compact signal line; below it a **board** (`qlt-board` 1.9fr/1fr, stacks ≤1024): main column = النشاط الأسبوعي (Line, ChartFrame + sr-only table kept) + مؤشرات الجودة الأساسية as a **KPI ledger** (`qlt-kpi-ledger`: hairline row separators, 13px labels, mono tabular values inline-end, thin 4px rails via `block-size: var(--sp-1)`); side rail = توزيع الحضور (doughnut / degenerate ProgressBar branch kept) + تنبيهات الجودة (top-3 AlertRows flattened to hairline rows inside the card + link). Pending skeleton mirrors the board shape (loading closure).
- **QualityCoursesPage**: header gains the muted read-only cue (`<Badge icon={Eye}>قراءة فقط</Badge>`); roster keeps the ONE shared DOM — `.table-wrap > table.table.tbl-stack` with data-labels — plus page-scoped `qlt-table` calm restyle (transparent thead fill, mono tabular `.tbl-num` metric columns, 13px badge floor, identity cell = name + bidi-isolated mono code). `?metric=` deep-link filter untouched (server q + meta.total count lines intact).
- **QualityProfessorsPage**: read-only cue on all three header variants (pending / error / resolved); compact-band logic (`useCompactRosterBand`) kept; roster stays the 8-column `.tbl-stack` table with `qlt-roster` calm restyle (mono tabular metrics, transparent header, 13px badge floor); «مصفّى» chip row moved to `.qlt-filter-note`; satisfaction cell keeps the exact pinned inline `var(--gold-ink, var(--c-yellow-deep))` ink.
- **QualityEngagementPage**: read-only cue; charts row rides `grid-2-1 qlt-section` (the `.qlt-section` rung = `margin-block-start: var(--sp-9)` replaces the inline margin); تحليل المشاهدة bars become a calm ledger list (`qlt-progress-list`); all payloads/aria labels unchanged.
- **QualityCurriculumPage**: the heatmap retires for **oversight rows** (`qlt-course-rows`/`qlt-course-row`): identity leading (name + mono code), the lecture/file/concept detail promoted from title-tooltip to visible meta text, mono tabular `formatPct1` percentage + semantic level chip (green/amber/red Badge) trailing, thin completion rail (ProgressBar `showValue={false}`, severity-mapped fill). Level filter pills + heat-legend + `q-dept-stat` kept; filtered-out rows dim in place (`qlt-course-row.is-dim`, opacity .38 — dim-not-disappear contract preserved). Pending skeleton is row-shaped.
- **QualityReportsPage**: the four `.alert.brand` link rows retire for a **link ledger** (`qlt-link-rows`/`qlt-link-row`): ≥44px rows, soft accent icon well, title 14px + one-line 13px desc, trailing chevron, hairline separators + quiet hover wash. Honest PDF/Excel-pending note kept (`.qlt-note`).
- **QualityAlertsPage**: oversight rows (`qlt-alert-row` + `qlt-sev-{critical,warning,info}`): leading **2px inline-start severity edge** (var(--danger) / var(--warning) / var(--success) + 5–6% color-mix washes), category icon muted, severity chip keeps semantic colors (`SEVERITY_TONE` red/amber/brand) with new Arabic labels (حرج/تحذير/معلومة), relative time via `formatRelativeArShort`. Header shows critical-count badge + read-only badge together (`qlt-header-badges`).

### Read-only identity
Every page header carries the muted cue (Eye + «قراءة فقط») — the dashboard keeps its gold «وصول قراءة فقط» badge. No edit affordance anywhere; drill-downs are links, filters/search/sort are view controls.

### Mobile table→row-cards technique
**Consumed the shared pattern**: components.css `@media (max-width: 640px) .tbl-stack` recipe (the admin-roster grammar — rows become cards, `td[data-label]::before` supplies the label). One DOM (semantic `<table>`), page-scoped polish only (identity cell becomes the card heading: label pseudo hidden, name 16px, code under it). **Deliberate deviation from the brief's "≤768px"**: kept the canonical ≤640 breakpoint rather than introducing a divergent second stack breakpoint repo-wide (the professors compact-band diet at ≤1024 already covers the tablet band; one mobile-table grammar for all rosters).

### Test pins
**No test pins needed updating** — the recomposition preserved every pinned contract (WS-F6 progressbar names/values, `.tbl-num` gold-ink satisfaction cell, `table.table.tbl-stack` + data-labels, «اكتمال المحتوى» header tooltip, neutral «لا محتوى بعد», `?metric=` drill + reset, «بحاجة لمتابعة» toggle, debounced q + meta.total count lines, r157 chrome-on-error pins). All 20 quality tests + App-routes (32) + Topbar/nav (24) green.

### Gate results (final tree state)
- `check-raw-css.sh` PASS (0 type/radius/spacing violations; TSX inline spacing 0 findings) · `check-colors.sh` OK · `check-motion-tokens.sh` OK · `check-icons.sh` OK.
- `npm run lint` 0 errors / 19 pre-existing warnings (none in quality files) · `npm run typecheck` — **quality files clean**; remaining errors are in `pages/teacher/ExamAuthorPages.tsx`, mid-edit by the concurrent 4C-a/exams sub-agent (not this task's scope).
- Vitest: QualityDashboard (5) + QualityPages-rosters (15) + App-routes + route-titles-coverage — **52/52 green**.

### Obsolete consumers (for Agent Z) — quality pages stopped consuming
- `.matrix-cells`, `.matrix-cell`, `.matrix-meta`, `.matrix-meta-pct`, `.lvl-strong/.lvl-weak/.lvl-poor`, `.is-dim` (student.css heatmap grammar) — **the student MatrixPage still owns/consumes these**; only `/quality/curriculum` dropped them. The pending-skeleton `.matrix-cells` wrapper went with it.
- `.alert.brand` as a **link-row** on QualityReportsPage (the `.alert` family stays live for AlertRow/notifications consumers).
- `.grid-2-1` on the quality dashboard (replaced by `.qlt-board`; engagement still consumes `.grid-2-1`).
- No sheet-level deletions required: every retired consumer lives in someone else's owned sheet.

### Deliberately not changed
- Charts data/options plumbing (`chartColors()`/`cartesianOptions()` resolve live CSS vars — verified, no lib/ change).
- All hooks (useOverview/useQualityCourses/useProfessors/useEngagement/useCurriculum/useQualityAlerts), debounce, envelope/meta.total handling, and the r157 chrome-on-error structure.
- StatStrip composition (cells/links/trends) on dashboard/professors/engagement; curriculum filter pills + legend; professors compliance `.q-compliance` cluster; the honest estimated-value copy.
- Professors "trailing link" from the brief: **omitted** — no per-professor detail surface exists; a dead link would be a fake affordance on a read-only sector.
- Reduced motion: all new transitions ride `var(--t-fast)` and are zeroed by the global belt; an explicit `@media (prefers-reduced-motion: reduce)` kill was added anyway.

### Requests
- Surface-drift: the 7 quality routes changed visuals; `tests/audit/surface-baseline.json` has no quality captures today (verified 0 hits) — nothing to re-promote, but note it if the 16-route baseline grows.
- Coordinator: `ExamAuthorPages.tsx` typecheck errors belong to the concurrent exams/teacher sub-agent's in-flight work — quality files are clean.

---

# FINAL HANDOFF (delivered)

Branch: `redesign/4c-teacher-quality` · final SHA: see `git log -1` (pushed; rounds r240–r243)
Base: origin/main @ r198 + merge of origin/redesign/shell @ r210 (patterns contract).

## Layout decisions per route (one line each)

- `/teacher/dashboard` — Superlist composition on the patterns: PageFrame+PageHeader → StatLine (one flat signal row, «بحاجة تقييم» links into the queue) → طابور التصحيح (SectionHeader+RowList) beside محاضرات اليوم (TodayList with urgency dots) → at-risk RowList → trend ChartFrame → feed behind FilterBar. Mobile: single column, StatLine wraps, everything rows.
- `/teacher/intelligence` (+`/:offeringId`) — catalog as `tq-rows` list (tinted icon well, code·term kicker, honest counts, chevron); detail keeps track-hero + StatStrip + shared Tabs + CurriculumAuthoringPanel; risk rows untouched grammar. Mobile: rows stack, picker full-width.
- `/teacher/profile` — courses grid → `tq-rows`; everything else kept (inline edit + discard guard + fact rows). Mobile: single column.
- `/teacher/live` — session rows kept (run-row grammar, live-dot authored moment); no structural change needed. Verified 44px actions.
- `/teacher/labs` — lab card grid → `tq-rows` (category·platform kicker, mono experiment count, معاينة action trailing).
- `/teacher/exams` (4C-a) — hub = SectionHead + tabs; templates as `exa-rows` sheet rows (chips + counts + trailing عرض/نشر with gated-disabled reason); question bank = FilterBar + `exa-bank-row` accordion (prompt/choices/answer-key/category/author inline, honest immutability note «الأسئلة المعتمدة ثابتة…»); moderation queue rows.
- `/teacher/exams/:templateId` (4C-a) — back-link, large-type title + status strip, main/aside split (questions + answer key | meta facts + moderation), attempts rows + GradeAttemptModal unchanged.
- `/teacher/{schedule,attendance,grades,materials,students,performance,assignments,messages}` (4C-c) — grading queue = calm queue sections with 44px «تصحيح» actions; attendance = 44px roster toggles + sticky tabular summary; grades = sticky ledger with 44px mono inputs → row-cards ≤640 via shared `.tbl-stack`; schedule day-list ≤920; materials = file rows with per-type icons; students = calm roster rows; performance kept StatStrip + ChartFrame.
- `/student/online-exams`, `/student/online-exams/:id`, `/quality/exam-moderation` (4C-d) — exam rows (oex-), taker with sticky attempt header + 44px option rows (attempt lifecycle logic verified untouched), moderation queue rows with note-cap behavior preserved.
- `/quality/{dashboard,courses,professors,engagement,curriculum,reports,alerts}` (4C-b) — dashboard = board (main chart + KPI ledger | side attendance + alerts); courses = dense calm table → `.tbl-stack` row-cards ≤640 (shared components.css recipe); curriculum oversight rows with formatPct1 + level chips; alerts with severity edges; every header wears a muted «قراءة فقط» badge (dashboard keeps its gold one); zero edit affordances.

## Files changed
- `frontend/src/pages/teacher/TeacherDashboardPage.tsx` (patterns composition; StatLine/TodayList/RowList/FilterBar; formatNum)
- `frontend/src/pages/teacher/TeacherIntelligencePage.tsx` (row catalog + formatNum)
- `frontend/src/pages/teacher/TeacherProfilePage.tsx` (row catalog)
- `frontend/src/pages/teacher/TeacherLabsPage.tsx` (row catalog + formatNum)
- `frontend/src/pages/teacher/TeacherPages.tsx` (4C-c recomposition)
- `frontend/src/pages/teacher/ExamAuthorPages.tsx` (4C-a recomposition)
- `frontend/src/pages/quality/QualityPages.tsx` (4C-b recomposition)
- `frontend/src/pages/exams/OnlineExamsPages.tsx` (4C-d recomposition)
- NEW sheets: `frontend/src/styles/teacher-quality.css` (tq-), `exam-author.css` (exa-), `online-exams.css` (oex-), `quality-pages.css` (qlt-), `teacher-pages.css` (tpg-) — each imported by its owning lazy page module (page-scoped, D11 pattern)
- Tests updated: `TeacherDashboard-queue-today.test.tsx` (count 3→4: the StatLine stat links into the queue; fixed latent invalid selector `aref="…"→a[href="…"]`), `TeacherPages.test.tsx` (action label تقييم→تصحيح ×4), `OnlineExamsPages.test.tsx` (presentation pins)
- NOT touched (ownership honored): ResearchReviewPage (4B), components/messages, AlertsPage/CommunityPage/AiAssistant mounts (4E), admin.css/owner.css/polish.css/tokens.css/App.tsx/backend, lib/chartTheme (charts styled only through page-level options; chartTheme resolves live tokens).

## Routes × sizes × themes verified (real browser, agent-browser)
1440/900, 768/1024, 390/844, 360/740 × light+dark on: teacher dashboard (all four sizes × both themes), teacher/exams hub + bank accordion, teacher/intelligence, teacher/schedule, teacher/attendance, teacher/grades, teacher/materials, teacher/performance, quality dashboard + all 6 sub-routes + exam-moderation, student/online-exams. Checks: no horizontal scroll (scrollWidth ≤ clientWidth verified), no console errors (only the pre-existing React Router future-flag warnings + fetchPriority, both not ours), tap targets ≥44 (dashboard sub44:0 after the family pill raise), Western digits (formatNum/formatPct1 everywhere), RTL chevrons correct (ChevronLeft = forward), loading/empty/error states present per surface. Reduced-motion: global motion.css belt (gate-enforced) yields the static result; no raw durations added. Screenshots in `/home/z/madarek/shots/`.

## Gate results (final tree)
lint 0 errors (19 known warnings) · typecheck clean (both + test configs) · npm test: frontend 1971/1971 + backend 1783/1783 · parity export 190/190 · colleges 25/25 · colors/raw-css/motion/icons gates PASS (raw-css TSX strict: 0 findings) · CSP hashes match · bundle 637.2/650 KB gz (entry 71.2/80, pdf 95.7/110) · no new dependencies.

## Selectors made obsolete (for Agent Z)
- `.feed-toolbar` + `.feed` + `.feed-item*` (feed-item-avatar/-body/-head/-author/-meta/-text/-time/-actions) — dashboard feed now RowList/RowItem (grep components.css/polish.css before deleting; other feeds may exist on 4A/4D surfaces — verify zero consumers first).
- `.track-grid`/`.track-card*` consumers GONE from 4C pages (intelligence, labs, profile) — still alive on 4E/training surfaces; do NOT delete the family yet.
- `.stat-strip`/`.stat-cell` hand-rolled skeleton walls on my pages replaced (StatStrip/StatLine carry their own) — `.stat-strip` itself still used by other families.
- LedgerPanel/LedgerRow usage gone from the dashboard (kept in app elsewhere — do not delete primitives).
- quality: `.matrix-cells/.matrix-cell/.lvl-*` no longer consumed by quality (still owned by student.css MatrixPage), `.alert.brand` link-rows on reports replaced.
- teacher-pages: `.list-row-meta` unconsumed in that file; materials table retired (`.tbl-strong` remains consumed by grades/students).
- exams: `.filter-bar` widths hook (`--w-input-filter-*`) unused by exa surfaces (FilterBar + exa-toolbar own it now).

## Sheet import lines that may conflict (Agent Z)
- `import '../../styles/teacher-quality.css';` in TeacherDashboardPage / TeacherIntelligencePage / TeacherProfilePage / TeacherLabsPage
- `import '../../styles/exam-author.css';` in ExamAuthorPages.tsx
- `import '../../styles/online-exams.css';` in OnlineExamsPages.tsx
- `import '../../styles/quality-pages.css';` in QualityPages.tsx
- `import '../../styles/teacher-pages.css';` in TeacherPages.tsx
All five are page-scoped (lazy chunk), `@layer pages`, disjoint prefixes (tq-/exa-/oex-/qlt-/tpg-) — no cascade conflicts expected; keep the lines when folding main.tsx-level imports.

## Requests for tokens/primitives/patterns
- None blocking. `.pf-filterbar .pill { min-block-size: 44px }` lives in teacher-quality.css — when 4E raises the shared pill floor, drop my override.
- patterns/RowItem `leading` is 24px-oriented; my queue rows pass mono counts/percent chips — works, but a documented "metric" slot would be cleaner long-term (no action needed).

## Incomplete / reasons
- ExamTakerPage deep-dive verified only at 1440+390 light/dark smoke (route needs an in-flight attempt; the attempt lifecycle itself is code-frozen and unit-pinned — 99 exam tests green).
- `/teacher/research` untouched (4B's surface; my file only carries the one-line wrapper).
- Surface-baseline re-promotion NOT done (audit baseline is forbidden to me) — Agent Z should re-promote after visual sign-off.
