# 5-A8 — Admin · Quality · Public surfaces at the 9+ bar (الحرفة الختامية · Campaign 5)

**Agent:** 5-A8 · **Scope:** `pages/admin/**` (12 routes + `/admin/permissions/:id`), `pages/quality/**` (8 routes incl. the `/quality/exam-moderation` mount in `pages/exams/OnlineExamsPages.tsx:845-1052` and the shared `/quality/community` mount), public funnel: `pages/vision/**`, `pages/colleges/**` (guest + authed), `pages/competitions/**`, shared `/admin/community` mount — + the `components.css`/`polish.css`/`colleges.css` blocks they render through.

**Method:** code pass over all 9 scope files (7,310 lines) · **live probes 1-19** (`/tmp/a8-probes/`, data JSONs `data-*.json`) with global playwright 1.63/chromium-1243 (repo-root 1.60 still cannot launch — A6/A7 note holds) · 97 screenshots at 1440/768/390 (full-height via the `.content` scroll-container neutralization — **`fullPage: true` does NOT work in this app**: the app scrolls inside `div.content`, so naive fullPage shots silently crop at 900px; probe `pw2.mjs` documents the fix) · dark shots via the `madarek-theme` persist key with a **fresh `modeUpdatedAt`** (0 lets the authed server profile override — documented in `p13-dark.mjs`) · in-page WCAG math both themes × 30 selectors · 9 API-abort error paths + 3 delayed skeletons · interaction probes (gallery filters, leaderboard sort, students empty-search, moderation reject-confirm, teachers master-detail) · 3 VLM batches with every claim re-measured (ledger below). AUDIT-ONLY — zero source edits, zero git ops.

**Sibling cross-refs (not duplicated):** A5 P1-1 colleges-toolbar overflow @390 (re-verified still open, `174px`) · A5 P1-2 topbar-title clip · A4 P1-2 teacher-feed dead CTAs · A6 student/library internals (library scored 9 there — no public library route exists; see scope note) · A1 P2-8 em-dash platform ruling · A7 owner-console reference patterns (honesty stack, bounded pagination).

**Scope reality note (for the orchestrator):** the brief names "exams public listing, library/research public" — there are **no public exams/library/research routes** (`App.tsx:233-357`: exams live under `/student/*`, library under `/student|/teacher/library`, all ProtectedRoute). The genuinely public surfaces are `/colleges*` (world-readable, `CollegesLayout`); `/vision*` and `/competitions*` are any-authenticated-role. This audit covers all of them; the student library/exams surfaces are A6's filed scope.

---

## 1. Per-route verdict table

### Admin (C4 score 7 — the campaign's lowest surface)

| Route | Score | Verdict (measured) |
|---|---|---|
| /admin/dashboard | **7.0** | 4 identical KPI tiles (all **281×134**, same radius/icon slot), uniform 80/60/60 section rhythm, **1-bar chart** («توزّع الطلاب»: كلية تقنية المعلومات=1 in a 180px box), **0 links / 4 buttons** — everything is a terminal stat. Charts a11y'd (ChartFrame tables), honest empties. |
| /admin/students | **8.0** | Search+faculty filter+server pagination+`tbl-stack`+debounce+reset-in-empty — the roster craft template. |
| /admin/teachers | **8.5** | Best-in-scope master–detail: 2378px selected state, identity-keyed draft forms, verify flow, match-score suggestions, bounded page-list pagination. |
| /admin/permissions/:id | **8.5** | Unchanged reference page (state-tinted rows, one-shot pulse, inline retry, back-link first). |
| /admin/faculties | **6.5** | **3388px monolithic card** — 25 faculty rows + dept sub-rows, **1412 chars at 12px/400**, **zero retrieval affordances** (no search/filter/sort; every sibling roster has search), 24/25 rows display all-zero counts. |
| /admin/courses | **7.0** | Solid chrome (pills, tbl-stack, reset) **but** the fetch silently caps at 20 rows (P2-1). |
| /admin/analysis | **6.0** | Third arrangement of the same `/admin/reports` bundle — measured: the same 4 KPIs re-labeled (إجمالي الأوراق 5 / منشورة 3 / مستخدمين 5 / نشطون 1 = reports' numbers verbatim) + the same trend series as a table. |
| /admin/reports | **7.0** | Honest trend bars + top-courses table; overlaps dashboard's line chart of the identical series. |
| /admin/settings | **7.5** | C4 health-driven rows verified live («متصلة · زمن الاستجابة 1 مث»); disabled ops buttons honest. |
| /admin/alerts | **7.0** | Shared AlertsPage; states discipline solid (error→retry verified by abort probe). |
| /admin/sync | **8.0** | Full run-state machine, honest durations («أقل من ثانية»), SOURCE_LABEL mapped, category accordion with aria, 30s poll pinned foreground-only. |
| /admin/digital | **7.5** | Live metrics + stagger rows — but the third consecutive 4-identical-tiles page in the nav. |
| /admin/community | 7.5* | Shared mount (A5 owns internals). |

**Admin mean ≈ 7.3.** The 7 is structural, not cosmetic — see §4.

### Quality

| Route | Score | Verdict |
|---|---|---|
| /quality/dashboard | **7.5** | Honest KPIs + estimated-curve flag + alerts card with retry (C4 fix verified) — **but** the doughnut renders a **100/0/0 full ring** (measured: حضور=100، تأخير=0، غياب=0) and the weekly line renders the estimated **binary square wave [0,1,1,1,0,1,0]** as a smoothed curve (P2-4). |
| /quality/courses | **8.0** | C4 tbl-stack verified @390 (ovf −10px, 42 data-labels); «لا محتوى بعد» neutral badge; weights surfaced in the th tooltip. |
| /quality/professors | **8.0** | C4 fix verified @390 (stacked, dl=8, ovf 0) — **regressed band: 164px sideways scroll at 768** (P2-2). |
| /quality/engagement | **7.5** | NaN-guarded honest KPIs; same tile template; sr-tables present. |
| /quality/curriculum | **8.0** | One heatmap language, dim-not-hide filtering, pills disable at count 0, legend; «متأخر» tone P3-4. |
| /quality/reports | **7.0** | 4 identical link-cards + honest export placeholder («قيد التطوير»). |
| /quality/alerts | **7.5** | Severity-mapped AlertRows, honest zero-state, critical count badge in header. |
| /quality/exam-moderation | **8.0** | C4 confirm + 23-b Esc/focus-return verified live; per-row error retry; third KPI is static décor (P3-3). |

**Quality mean ≈ 7.8.**

### Public funnel

| Route | Score | Verdict |
|---|---|---|
| /colleges (guest) | **7.5** | URL-synced filters, live region, gallery skeleton, no-result reset, AA-clean chips (count **8.62:1** light / **10.1:1** dark — C4 fix holds). Open wound: toolbar **174px overflow + 317px-tall toolbar @390** (A5 P1-1, re-verified) and 24/25 cards show public zeros (P2-6). |
| /colleges/leaderboard (guest) | **8.0** | All C4 fixes live-verified: sort `aria-sort` flips + re-orders, **4 medals only on live columns**, 50 dead cells muted, tbl-stack @390 (175 labels, ovf −10). Mobile verbosity P3-1. |
| /colleges/:id (guest) | **7.0** | Anonymization verified («أحمد ز.» guest vs full name authed — C4 helper intact), eyebrow tracking fixed, gated accent. **But a data-less college renders 5 empty internal-workflow sections to guests** (measured on كلية الآداب: قيادة/أقسام/طلاب/إعلانات/بث all «لا توجد…بعد») + 4 zero KPIs (P1-2). Hero is emoji+eyebrow+title — the identity `heroImage`/`motif` paths are dormant by design, so the university's "front door" has no institutional presence. |
| /vision | **7.5** | Clean status-grouped cards, count-from-data headline (12), honest status badges — **but** every concept card leads to invented-precision metrics (P1-1) and the bottom card overpromises (P2-5). |
| /vision/:slug | **7.0** | Honest disabled notify CTA verified (C4 fix intact: «قريباً» disabled, no email promise); good hero/metrics/steps/prev-next grammar; ×3 invented metrics per page (P1-1). |
| /competitions | **8.0** | Honest KPI trio (3/0/0 with …/— degradation), filter pills, category+status cards with counted nouns; «0 مشترك» public hero meta on all 3 seeded rows. |
| /competitions/:id | **8.5** | Confirm dialogs (close/judge with unscored-count copy), discard guards, rank pulse, per-entry score input with inline retry + sr status — the most complete flow in scope. |

**Counts: P0 ×0 · P1 ×3 · P2 ×7 · P3 ×6.**

**Audit Health (impeccable rubric):** A11y **3** (one real finding: unlabeled nested canvas img-role; the axe "no h1/main" messages are transient skeleton-state scans — disproven) · Performance **4** (lazy routes, placeholderData, foreground-pinned polls) · Responsive **3** (390 clean everywhere except the A5 toolbar; one 768 regression) · Theming **4** (token-clean, dark verified live ×8, charts remount) · Integrity **2** (invented vision statistics ×30, overpromising disclaimer, public zeros story) → **16/20 Good; weakest: integrity.**

**RTL/bidi verdict:** clean. All Latin runs bdi-wrapped (codes, emails, terms, MOOC, zu.edu.ly, API); pagination chevrons RTL-correct; `dir="ltr"` only on genuinely LTR inputs (score, datetime, url). The `2.340`/`3,40` separators are the documented ar-LY CLDR convention (utils/numbers.ts header + pinned test) — **not** a finding.

---

## 2. P1 — Major

### P1-1 · Vision roadmap presents invented precision statistics as measured metrics (×30 instances, public-facing)
- **Where:** `frontend/src/lib/vision.ts` — :34 («تنبؤ بنسبة 89% دقة»), :50 («دقة النموذج 89%»), :67 («بنك أسئلة من 12,000 سؤال محكّم»), :81 («12K+»), :114 («دقة الكشف 94%»), :143-146 («4 دقائق»، «15»، «8 لغات»), :160 («دقة 92%»), :176, :189 («0.8 ثانية»), :207 («88%»), :251 («8 ملايين ورقة»), :291 («Unreal»), :330, :361, :391-393 («120+»، «40+») — rendered by `VisionPages.tsx:166-174` as unlabeled `metric-value`s.
- **Evidence:** backend grep finds **no** predictor model, no question bank beyond the seed (~16 questions), no external papers integration («8M+»), no Madarak SDK («120+ endpoints»). The same file's one honest metric («مباني ممسوحة **0 / 29**», digital-twin) proves the right pattern exists. Violates AGENTS-BRIEF §0 ("no fake statistics"), taste.md ("No invented statistics. Fake precision … is a legal and credibility liability"), and the page's own disclaimer (P2-5).
- **Impact:** any authenticated user (student, teacher, guest-of-university) reads «دقة النموذج 89%» as a measured property of a system that does not exist. Same bug class as C4's «الجودة %» and the fake vision-notify promise — but ~30 instances on one surface.
- **Fix sketch (copy-only, ~1h):** reframe as targets — «الهدف: دقة 89%» / «استهداف 12 ألف سؤال» — or drop the percentage metrics and keep the structural ones (سنوات، فصول، لغات، شبكة). Add one sentence to the disclaimer: «الأرقام أهداف تصميمية وليست نتائج مقيسة».

### P1-2 · Public college detail renders internal-workflow empty states to guests — the university's front door tells a dead-campus story
- **Where:** `frontend/src/pages/colleges/CollegePages.tsx:504-677` — leadership (:507-509 «لم يتمّ تعيين قيادة لهذه الكلّيّة بعد»), departments (:533-535 «لم تُضَف أقسام بعد»), top students (:558-560 «لا توجد بيانات طلّاب بعد»), announcements (:586-588 «لا توجد إعلانات حاليّاً»), live (:635-637), competitions (:657-659) — all render unconditionally with the same `.text-muted` internal copy.
- **Evidence (live, guest, كلية الآداب):** 5 of 7 content sections render «لا توجد…» copy + 4 KPI cards all reading 0 + competitions empty — measured `emptyCopy` array in `data-public`/p16 probe; 24 of 25 seeded colleges have 0 students (faculties API census). A guest's first (and likely only) college page is a wall of "nothing yet".
- **Impact:** the public funnel's narrative quality mandate fails on data-thin colleges: honest for an internal tool, broken-looking for a prospective student. (The landing gets 9; this page undoes it one click later.)
- **Fix sketch:** on the public mount, (a) **collapse** sections whose data is empty (keep them for authed roles), (b) lead with what exists — stats + departments render non-zero for most colleges (13 depts seeded across faculties), (c) when all four KPIs are 0, replace the strip with one institutional line («كلّيّة حديثة التأسيس — تُحدَّث بياناتها مع بدء التسجيل») instead of four zero tiles. ~2h, one file.

### P1-3 · (Deferred A8 P3-8, root cause) Every dashboard metric is a dead end — 93/93 measured non-clickable; the KPI primitive has no interactive form
- **Where:** `frontend/src/components/primitives/index.tsx:80-112` (`MetricCard` renders a plain `<div>` — no `as`/`href`/`onClick` contract) + every scope dashboard consumes it (`AdminPages.tsx:73-100`, `AdminExtraPages.tsx:280-291,373-378`, `QualityPages.tsx:308-319,563-567,688-693`, `AdminSyncPage.tsx:216-245`).
- **Evidence (p8 probe):** across `/admin/{dashboard,digital,analysis,reports,sync}` + `/quality/{dashboard,engagement}` — **93 metric/stat/chart nodes, 93 non-clickable, 0 KPI clicks navigate**. In their default state **12 of 13 admin pages render 0 in-page links** (the only exception is `/admin/settings`' four resource links; teachers' permissions link appears only after selecting a row) — page-to-page movement is exclusively the sidebar. The `/admin/analysis` page exists *because* the dashboard can't answer a follow-up question (P3-8's original framing) — the duplication is a symptom, this is the disease.
- **Impact:** an admin sees «الطلاب 1» and cannot get to the student; «بانتظار المراجعة 1» and cannot reach the queue; «حقول قديمة N» and cannot see them. Every number requires a sidebar trip.
- **Fix sketch:** add an optional `to?: string` (or `onClick`) to MetricCard rendering `<Link className="metric metric-link">` + the `.metric-link` hover/focus/chevron affordance in components.css; then wire the contract table in §5 (FE-only where a target route already exists — 6 of 12 rows need no backend).

---

## 3. P2 — Minor

### P2-1 · /admin/courses silently caps at 20 rows — the third recurrence of the silent-cap bug class
- **Where:** `frontend/src/hooks/useResources.ts:568-573` (`useAdminCourses()` calls `/admin/courses` with **no params**) × `backend/src/http/routes/catalog.routes.ts:764-779` (`limit: z.coerce.number().int().positive().max(100).default(20)` + `res.json({ data, meta })`) × `AdminPages.tsx:491-535` (KPI «إجمالي المقرّرات = data.length`; client-side faculty pills count the subset; **no pagination UI**).
- **Evidence:** `unwrap` (`api.ts:82-85`) returns `res.data.data` and discards `meta.total`; at course #21 the KPI undercounts, the pills mis-count, and courses 21+ are unreachable on this page. Invisible at the 6-course seed — exactly like the teachers 200-cap (15-d P1-1) and owner-users cap before their fixes.
- **Fix sketch:** FE-only first step: pass `{ limit: 100 }` (schema max) + read `meta` for the KPI total; proper fix = server-side `facultyId`/`q` filter + the students-page pagination footer (both patterns already exist in `AdminStudentsPage`).

### P2-2 · Quality professors table sideways-scrolls 164px at 768 — tbl-stack only arms at ≤640px
- **Where:** `frontend/src/styles/polish.css:2224` (`@media (max-width: 640px) { .tbl-stack { display: block; … } }`) × `QualityPages.tsx:574-628` (8-column roster).
- **Evidence (p7):** @768 `display: table`, wrap overflow **+164px**; @390 stacked (C4 fix intact). The admin 7-col tables measured 0px at 768 — this 8-col roster is the only real tablet-band scroller, but the breakpoint is systemic.
- **Fix sketch:** raise the tbl-stack media query to 768px for ≥7-column tables (`table.tbl-stack.wide` opt-in class to avoid re-stacking narrow tables), or column-diet the roster («الملفات المرفوعة» folds into the meta line at ≤1024).

### P2-3 · Admin faculties: 3388px monolithic card, 25 faculties, zero retrieval affordances
- **Where:** `AdminPages.tsx:285-336` — one `Card` containing every faculty (`flex-col gap-3` of `.admin-faculty-card`).
- **Evidence:** measured card height 2881px (page 3388px); 1412 chars of 12px/400 meta; no search input, no faculty filter, no sort, no jump-index; 24/25 rows render four zero-counts each («قسم واحد · مقرّر واحد · طالب واحد…» for IT, zeros elsewhere). Every sibling roster (students, teachers, courses, owner users) has search.
- **Fix sketch:** hoist a search+city filter above the list (the `admin-students-toolbar` chrome exists), and collapse departments behind the row (details/summary or the sync-page accordion) — the page is a reference directory, not a wall.

### P2-4 · Degenerate chart forms mislead on the quality dashboard (full-ring donut; smoothed square wave)
- **Where:** `QualityPages.tsx:367-395` (Doughnut of `[presentRate, lateRate, absentRate]`) and :322-365 (Line of `weeklyActive`).
- **Evidence (measured):** attendance = **[100, 0, 0]** → a solid green ring carrying zero analytical signal; `weeklyActive` = **[0,1,1,1,0,1,0]** (the backend's deterministic fallback, correctly flagged «منحنى تقديري» in the subtitle) rendered as a `tension: 0.4` curve — a binary square wave drawn as a smooth trend line. VLM independently flagged both (batch 3) — the rare confirmed VLM pair.
- **Fix sketch:** donut → when one slice ≥ 97%, render a ProgressBar + label instead (the page already uses ProgressBar four rows below); line → when `weeklyActiveEstimated`, switch to dots-only (pointRadius, no line) or a bar chart so the interpolation stops inventing a shape.

### P2-5 · Vision disclaimer overpromises what the page never shows
- **Where:** `VisionPages.tsx:115-123` — «كل ابتكار له موارد مخصّصة، تواريخ إطلاق متوقّعة، ومؤشرات قياس واضحة. سنشاركها مع الجامعة كل ربع سنة.»
- **Evidence:** launch dates exist on 2 of 12 cards (digital-twin «2026», metaverse «2027»); no resource allocation is displayed anywhere; no quarterly-sharing surface exists. Same honesty class the C4 wave already fixed twice on this page (fake notify CTA → honest disabled button).
- **Fix sketch:** true claims only — «كل ابتكار يمرّ بحالات محدّدة: بحث ← تخطيط ← نموذج أوليّ ← إصدار تجريبي، وتُحدَّث حالته هنا.» (the status pipeline IS real and displayed).

### P2-6 · Public colleges gallery shows «0 طالب · 0 مقرّر» chips on 24 of 25 cards to guests
- **Where:** `CollegePages.tsx:344-349` (`CollegeStatChip` renders genuine 0s per FR-010) + `filter-colleges.ts`.
- **Evidence:** faculties API census — 24/25 colleges have `studentCount: 0` (seed); the gallery's first screen (13 الزاوية cards) is a grid of zero-student chips. FR-010's "render genuine 0" is right for internal surfaces; on the **public funnel** the aggregate reads as a dead campus (VLM batch 2 flagged it independently).
- **Fix sketch:** on the public mount, suppress the student/teacher chips when 0 (keep dept/course counts which are non-zero), or collapse to «كلّيّة حديثة التأسيس». Needs the same one-line policy ruling as P1-2 — same fix wave.

### P2-7 · Chart canvases carry `role="img"` with no accessible name (nested inside ChartFrame's labeled wrapper)
- **Where:** `frontend/src/components/charts/ChartFrame.tsx:70-101` (wrapper div carries `role="img" aria-label`) — but Chart.js stamps `role="img"` onto the raw `<canvas>` with **no** label (measured on admin + quality dashboards: `canvasOuter: <canvas role="img" …>` with `ariaLabel: null`).
- **Evidence:** this is the element the dev-mode axe run flags on every dashboard load («aria-label attribute does not exist or is empty» — captured in walk-1 console census); a real axe scan would file it on every chart page platform-wide (~20 charts).
- **Fix sketch (one line, verified feasible):** react-chartjs-2 5.2.0 spreads rest props onto `<canvas>` (`dist/index.js:80,152`) — so `ChartFrame` can `cloneElement(children, { 'aria-hidden': true })` (the wrapper + sr-table already carry the full a11y contract), or each chart passes `aria-label`. One-place fix in ChartFrame.

---

## 4. P3 — Polish

### P3-1 · Leaderboard mobile = 25 stacked cards × 7 labels = 10,307px of scrolling
- **Where:** `CollegePages.tsx:786` + `polish.css` tbl-stack; measured @390: 175 data-labels, page 10,307px.
- **Evidence:** each college card repeats all 6 metric rows; to compare rank 1 vs rank 10 a guest scrolls ~9 screens holding numbers in memory (VLM batch 2's "phone book" critique — confirmed by measurement).
- **Fix sketch:** at ≤640 render the row as rank + emoji + name + **the sorted metric's value only** (the column the user chose), full 6-metric card behind a `<details>`; or cap tbl-stack to the top-3 metric columns.

### P3-2 · Dashboard «مؤشرات سريعة» duplicates the reports/analysis KPI pair verbatim
- **Where:** `AdminPages.tsx:157-164` (أبحاث منشورة/إجمالي الأبحاث) = `AdminReportsPage` :369-370 and `AdminAnalysisPage` :374-375 (same `/admin/reports` headline).
- **Evidence:** the same two numbers appear on 3 routes; the dashboard's stat rows add no derived value (the ratio and top-faculty rows do).
- **Fix sketch:** keep the two derived rows (نسبة طالب/أستاذ، أكبر كلّيّة) + replace the papers pair with a link-out («حركة البحوث ← التقارير») once P1-3 lands.

### P3-3 · Exam-moderation third KPI is static decoration
- **Where:** `OnlineExamsPages.tsx:918-924` — «نموذج الجودة: رؤية 2024–2028 · معايير الجودة المحلية والدولية» — a MetricCard whose value never changes and links nowhere.
- **Fix sketch:** replace with a real third metric (اعتمادات هذا الشهر from the moderation history) or drop to a 2-card row.

### P3-4 · Curriculum «متأخر» cells render the palest pink in the scale
- **Where:** `polish.css` `.matrix-cell.lvl-poor` (measured bg `rgb(251,238,239)`) × `QualityPages.tsx:895`.
- **Evidence:** 0%-completion courses (CT301/IS301/NET301/SEC301/WEB301 measured) render nearly indistinguishable from surface — a quality office's "behind schedule" register reads as "no data". VLM batch 3 flagged the tone independently.
- **Fix sketch:** deepen lvl-poor one step (rose `-deep` family) or add a 1px rose border — keep the pastel system, raise urgency to ≥ the strong tier's presence.

### P3-5 · Em-dashes in visible copy (platform ruling needed — cross-ref 5-A1 P2-8)
- **Where:** 145 instances across the 8 scope source files; rendered census: admin dashboard 1, quality dashboard 3, vision 1, colleges 0.
- **Fix sketch:** await A1's glossary ruling; the admin/quality subtitles («نشاط الإنتاج العلميّ — آخر 6 أشهر») are the main visible carriers in scope.

### P3-6 · Dev-axe transient scans produce false "no h1 / one main landmark" noise during skeleton states
- **Where:** captured on `/admin/dashboard` loads (walk-1 console); settled DOM measured **1 `<main>`, 1 `<h1>`** on every scope page.
- **Fix sketch:** none (documented so future audits don't file it); the actionable chart finding is P2-7.

---

## 5. Drill-down endpoint + UI contract (the A8 P3-8 catalogue, measured)

**Dead-end metric census:** 93 nodes across 7 dashboards, 0 interactive (P1-3). Per-metric contract — "FE-only" rows need no backend work:

| # | Metric (route) | Today | Target route | Endpoint needed | FE-only? |
|---|---|---|---|---|---|
| 1 | «الطلاب» (/admin/dashboard) | dead | `/admin/students` | **exists** `GET /admin/students?page&limit&q&facultyId` | ✅ |
| 2 | «هيئة التدريس» (/admin/dashboard) | dead | `/admin/teachers` | **exists** `GET /admin/users?role=TEACHER&q` | ✅ |
| 3 | «الكلّيّات» (/admin/dashboard) | dead | `/admin/faculties` | **exists** `GET /admin/faculties` | ✅ |
| 4 | «المقرّرات» (/admin/dashboard) | dead | `/admin/courses` | exists but capped (P2-1) | ⚠️ P2-1 |
| 5 | chart «توزّع الطلاب حسب الكلّيّة» bars (/admin/dashboard) | dead | `/admin/students?facultyId=:id` | **exists** (param already supported) | ✅ |
| 6 | «مؤشرات سريعة» rows (/admin/dashboard) | dead | faculties/reports | **exists** | ✅ |
| 7 | KPI trio (/admin/digital) | dead | `/admin/reports` + `/admin/courses` | **exists** (adoption → users; exams → exams list is student-only → needs new) | ⚠️ partial |
| 8 | «إجمالي الأوراق/منشورة» (/admin/analysis, /admin/reports) | dead | `/teacher/research` (admin lacks a papers list) | **new** `GET /admin/papers?status=` (projection of existing research routes) | ❌ BE |
| 9 | trend rows (/admin/reports, /admin/analysis) | dead | — (month-keyed drill needs new) | **new** `GET /admin/reports?month=YYYY-MM` | ❌ BE |
| 10 | «حقول قديمة» (/admin/sync) | dead | `/admin/sync#category` + stale filter | **new** `?stale=true` on categories (data already in payload — FE can filter client-side) | ✅ (client) |
| 11 | «معدل الحضور/إكمال المحاضرات/التسجيل» (/quality/dashboard, /quality/engagement) | dead | `/quality/courses` (per-course) | **new** `GET /quality/courses?metric=attendance|completion` (currently **zero** params — `learning.routes.ts:1284-1296` fixed `take:50`) | ❌ BE |
| 12 | «بحاجة لمتابعة» (/quality/professors — compliance < 50 count) | dead | `/quality/professors?compliance=low` | **new** param (payload already computes `compliance` per row — FE could filter client-side today) | ✅ (client) |
| 13 | «بانتظار المراجعة» (/quality/exam-moderation) | dead | the queue below it (same page) | exists — needs an anchor scroll/first-row focus | ✅ |
| 14 | alerts card «عرض كل التنبيهات» (/quality/dashboard) | **wired** ✅ | `/quality/alerts` | — | — |

**Minimal backend ask (2 endpoints, both projections of existing queries):** `GET /admin/papers?status=` (research list for admins) and one filter param on `GET /quality/courses` (metric/level). Everything else in the table is FE-only. **Recommended landing craft:** targets must arrive **pre-filtered** (search box pre-filled, filter pill pressed) — the students page already accepts `?q`-equivalent state; add a `?facultyId` URL param consumption to `/admin/students` (small).

---

## 6. «Admin to 9» plan (the single lowest surface — ordered, est. effort)

**Diagnosis in one paragraph:** the admin console is a *stats viewer* built from one repeated template (page-header → 4 identical 281×134 KPI tiles → cards, 80/60/60 rhythm on every route), where every number is terminal (93/93), two pages are copies of a third, the densest page has no retrieval affordances, and nothing on the dashboard tells an admin *what to do next*. The craft floor (states, honesty, a11y, RTL, tables) is genuinely 8-9 — what's missing is **opinion**: hierarchy, actionability, and route identity.

1. **Action strip above the KPI row** (the single biggest lever): one «يحتاج انتباهك» card list built from data the backend already exposes — pending exam moderation (count exists), unverified teachers (roster field), zero-content offerings (quality courses query), faculties without deans (faculties query), sync stale fields. Each row links to its surface. Replaces nothing — sits between header and KPIs. (~1 day incl. one small aggregate hook reuse.)
2. **Kill the duplication** — fold `/admin/analysis` into `/admin/reports` as a view toggle (table ⇄ bars) and delete the route+nav item (A4 IA note: admin nav is 12 items; 11 after). (~½ day)
3. **Make the KPI strip navigable** — MetricCard `to` prop + §5 contract rows 1-6 (FE-only). Hover/focus affordance + chevron; the strip becomes the console's map. (~½ day)
4. **Route identity:** faculties gets search+city filter + collapsible departments (P2-3); digital folds its four 2-stat cards into one «تبنّي المكوّنات» table (one card instead of four single-row lists); reports' trend bars gain the month drill (§5 row 9, needs BE) or at minimum a «الفترة» subtitle carrying the range.
5. **Chart honesty at the edges:** dashboard's 1-bar chart degrades to a stat+link when `topByStudents.length ≤ 1` (today: one lonely bar in a 180px box); quality's P2-4 pair (donut→progress, square-wave→dots).
6. **Rhythm:** let one section per page breathe — dashboard's charts row deserves 88-96px above it vs the KPI strip's 60px (taste.md: contrast between tight and generous; measured uniform 80/60/60 today). One CSS rule per page, not a system change.
7. **P2-1 courses cap** (limit 100 + meta KPI + pagination footer) — trust repair before scale.
8. Optional garnish: P3-2 quick-metrics dedupe rides step 3.

Steps 1-3 + 5-7 ≈ 3 focused days and move the surface from "template" to "console"; 9 requires 1-4.

## 7. Public funnel polish list (landing is 9; these are 7.0-8.0)

1. **P1-2** college-detail empty-section strategy (collapse/lead-with-what-exists) — the front-door fix.
2. **P2-6** suppress public zero chips (same ruling as 1).
3. **A5 P1-1** colleges toolbar (174px overflow + 317px @390) — already isolated to the un-reset `flex-wrap` in colleges.css:447/585-600 + CollegePages.tsx:229; the public funnel's only hard responsive defect.
4. **P1-1 + P2-5** vision copy truth pass (~1h, pure copy).
5. **P3-1** leaderboard mobile condensation.
6. College hero presence: the identity `heroImage`/`motif` paths are dormant by design (CollegePages.tsx:455-475) — either commission 2-3 real photos for the flagship colleges or invest the hero with the gated accent (today it is emoji + eyebrow + title on a scene-paint band; the VLM read it as "unstyled fieldset").
7. Competitions hero meta «0 مشترك» on all three seeded rows — show «كونك أول المشاركين» CTA-adjacent copy instead of a zero count (the empty-state inside already does this).

## 8. VLM claim ledger (3 batches, 9 images; every claim re-measured)

| Claim | Verdict | Measurement |
|---|---|---|
| Admin: KPI strips are mathematically identical tiles across pages | **CONFIRMED** | all 281×132-134, same radius/icon slot (walk data) |
| Admin: title and KPI cards fight for weight / flat hierarchy | Partially confirmed | h1 18px/700 vs metric values 30px/700 — squint primary is the KPI row, not the title |
| Analysis table shows «projects أزرق/مهم/نوي with 0 tasks» | **DISPROVEN** (fabricated) | the table is the paper trend (months أبريل…سبتمبر, counts 0-2) |
| «مؤشرات سريعة lists 1st/6th Faculty Created» | **DISPROVEN** (misread) | rows are أكبر كلّيّة / أعلى مقرّرات / نسبة طالب-أستاذ / بحوث |
| «Icons left-aligned, RTL afterthought» | **DISPROVEN** | icons inline-start throughout; platform RTL-audited clean |
| «background #1e1e1e» (dark) | **DISPROVEN** | light cream #FBFAF9 shots |
| Faculties list has no filter/search | **CONFIRMED** → P2-3 | code + DOM (0 inputs on page) |
| No temporal context / no status indicators on admin | Confirmed (gap) | no dates, no health chip on dashboard — folded into §6 step 1 |
| Public gallery: «huge gap between header and filter chips» | **CONFIRMED** (A5 P1-1) | toolbar 317px tall @390, docOvf 174px |
| Public gallery shows «0 طلاب / 0 مقرر» | **CONFIRMED** → P2-6 | 24/25 colleges studentCount=0 |
| 25 stacked leaderboard cards = phone book | **CONFIRMED** → P3-1 | 10,307px, 175 labels |
| College detail «Announcements says لم يتم إضافة…» | Partially real | exact copy differs («لا توجد إعلانات حاليّاً») but the empty-sections-to-guests finding is real → P1-2 |
| «System sans-serif / naked HTML» | **DISPROVEN** | IBM Plex Sans Arabic self-hosted, token-driven |
| «Stats card repeats hero data» | Weak | departments card is per-dept, not the same totals |
| Donut shows 100% — wasted ring | **CONFIRMED** → P2-4 | attendance [100,0,0] measured |
| Weekly curve «looks like sine/heartbeat, not real data» | **CONFIRMED** (form) | [0,1,1,1,0,1,0] estimated fallback, tension 0.4 |
| Curriculum 0% cells «soft pink, tonally disjointed» | **CONFIRMED** → P3-4 | lvl-poor bg rgb(251,238,239) |
| «Pills above legend forces up/down correlation» | Discounted | subjective, one screen apart |
| Competitions image = «dark mode» | **DISPROVEN** | light-theme shot |
| «5,000 ريال» | **DISPROVEN** | «5,000 د.ل + فرصة تدريب» (Libyan dinars) |

**Score: ~9/21 claims fully confirmed — consistent with the C4/C5 base rate (~50-70% wrong); every filed finding carries DOM evidence.**

## 9. Verified-good (do not regress)

- **All C4 wave-22cd fixes survive and were live-verified this audit:** guest college funnel anonymization («أحمد ز.»), rosters tbl-stack @390 (−10px), moderation reject ConfirmDialog + Esc + focus return, honest «اكتمال المحتوى» + neutral «لا محتوى بعد» badge, vision honest disabled notify CTA, leaderboard sort/aria-sort/medals-on-live-columns-only/dead-cell muting, students empty-search reset, settings health-driven DB row, sync «أقل من ثانية» + SOURCE_LABEL.
- **State honesty discipline:** every KPI trio degrades …/— (competitions, moderation); every error path has working retry (9/9 abort probes); skeletons shape-match (24-42 bars, kinds match layout); sync poll pinned foreground-only.
- **Competitions detail flow craft:** close/judge confirms with unscored-count copy, discard guards on both modals, rank pulse with arm-and-clear timer, score input with Enter-blur save + sr-only success + inline retry.
- **Teachers master–detail:** identity-keyed draft forms (no clobber on invalidation), bounded page-list pagination, suggestion match-scores.
- **Colleges gallery plumbing:** URL-synced filters + polite live region + gallery-shaped skeleton + no-result reset.
- **Contrast:** 30 selector × theme pairs measured — all ≥ 4.5:1 body / 3:1 large (the C4 chip-count fix measures 8.62:1/10.1:1).
- **RTL/bidi:** clean across all 27 routes probed; numerals are the documented ar-LY convention.

## 10. Files to touch (fix wave)

- `frontend/src/lib/vision.ts` — P1-1, P2-5 (copy-only)
- `frontend/src/pages/colleges/CollegePages.tsx` — P1-2, P2-6, P3-1 (+A5 P1-1 toolbar)
- `frontend/src/components/primitives/index.tsx` + `styles/components.css` — P1-3 (metric-link), §5 FE rows
- `frontend/src/hooks/useResources.ts` + `pages/admin/AdminPages.tsx` — P2-1 (+ pagination footer)
- `frontend/src/styles/polish.css` — P2-2 (tbl-stack band), P3-4 (lvl-poor tone)
- `frontend/src/pages/quality/QualityPages.tsx` — P2-4 (chart forms), §5 rows 11-12 (client filters)
- `frontend/src/components/charts/ChartFrame.tsx` — P2-7 (one-line canvas aria)
- `frontend/src/pages/admin/AdminPages.tsx` / `AdminExtraPages.tsx` — §6 steps 1-3, P2-3, P3-2
- `frontend/src/pages/exams/OnlineExamsPages.tsx` — P3-3 ⚠️ shared with A6 scope — claim in a disjoint wave
- Backend (orchestrator-gated): `catalog.routes.ts` (courses filter/pagination params), `learning.routes.ts` (quality courses filter), one new `/admin/papers` projection — §5 table
