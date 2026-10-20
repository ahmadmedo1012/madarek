# Handoff — Agent 4A (student learning surfaces) — FINAL

> Branch **`redesign/4a-student`** · final SHA: see `git log origin/redesign/4a-student -1`
> (rounds r220–r225, rebased on nothing — merged `origin/redesign/shell` @ r210 once it landed).
> Superlist direction on every student learning route this family owns; all values ride the
> r197 token ladder; numbers through `utils/numbers.ts`; honest copy throughout.

## Routes completed (layout decision, one line each)

| Route | Layout decision |
|---|---|
| `/student/dashboard` | **One TodayList**: continue-learning item pinned first (56px momentum ring in the leading slot), today's commitments (classes/assignments/live), then every still-actable exam; a «فجوات يُنصح بسدّها» section (top-3 gaps, one-click سدّ الفجوة); momentum as a compact **StatLine** (5 facts, tones only on values) — the icon-box KPI strip and the standalone ring hero are gone; week ledger keeps day-anchored non-exam rows. |
| `/student/courses` | **Row list, not card grid**: FilterBar (status pills w/ counts) → RowList of course rows (tinted icon well, title = link, meta = code·teacher·lecture-count, trailing = progress + visual chip); upcoming assignments became rows with due-status badge + تسليم action. |
| `/student/courses/:offeringId` | **Breadcrumbs → h1 course name**; the ONE next action rides a tinted **continue strip** (progress + «التالي: المحاضرة N» + the honest pending/note); the four KPI cards became a **StatLine**; lectures/materials/schedule/assignments render as flat sections (SectionHeader + rows); per-lecture badges (مكتملة / نقاط تفاعل متبقية / تابع من هنا) stay on the r164d anchor rows — pinned contract preserved. |
| `/student/lectures/:lectureId` | **Video-first** with a unified **side panel** («داخل المحاضرة», sticky ≥1024px, below-player sheet ≤1024px): نقاط التفاعل rows (time chip + question + answered state; answered rows seek, open rows open the quiz) + فصول المحاضرة + materials. Heading outline: h1 lecture / h2 panel / h3 sections. |
| `/student/matrix` | **Legible dense grid**: status word + tabular % in EVERY cell (never hue alone), wider cells (150px min) so long Arabic names don't clip, keyboard-legible (non-link cells focusable with the system focus ring + aria-labels); **≤640px the same data recomposes into a concept list** (one row per concept, status+% inline); gap rows keep the سدّ الفجوة contract. |
| `/student/gamification` | Pattern header + **StatLine** (points / self-development level / cohort rank) above the two system panels (tier orb + XP bar + achievements; leaderboard) — gold stays achievements-only. |
| Long tail (`schedule`, `results`, `calendar`, `profile`, `catalog`, `labs`, `live`, `mooc`, `jobs`, `payment`, `map`, `webinars`, `messages`, `social`, `ar`, `downloads`, `university`, `skills`) | Verified at 360/390/768/1440 light+dark: zero horizontal scroll, no console errors, states intact. These pages keep their current compositions (already list-first / chart-first with honest states); header migration to the pattern PageHeader for them is **not done** (below). |

## Files changed

- `frontend/src/pages/student/DashboardPage.tsx` (patterns composition; helpers/exports untouched)
- `frontend/src/pages/student/CoursesPage.tsx` (row list)
- `frontend/src/pages/student/CourseDetailPage.tsx` (patterns + continue strip)
- `frontend/src/pages/student/LecturePlayerPage.tsx` (panel)
- `frontend/src/pages/student/MatrixPage.tsx` (grid legibility + mobile list)
- `frontend/src/pages/student/MorePages.tsx` (GamificationPage only)
- `frontend/src/styles/student.css` (r220–r223 sections; dead selector removals)
- `frontend/src/components/primitives/index.tsx` — **one-line cross-family exception, flagged to 4E**: the r197 JSX note in `ProgressBar`'s showValue head was a TEXT child (`formatPct1(v)% /* r197 §7… */`) and shipped the literal comment string on every showValue surface (visible on courses rows). Moved into a real JSX comment. No API/visual change beyond removing the junk text.
- Tests re-pinned (my pages, deliberate invalidations): `loading-closure.test.tsx` §1 (pending mirror = pf anatomy), `r168a-shell-grid-a11y.test.tsx` (player heading outline + dashboard h1 pin), `CoursesPage-summary.test.tsx` (header/pending re-pin), `LecturePlayerPage.test.tsx` (answered-count now renders twice → getAllByText).

## Routes × sizes × themes verified (real browser, light + dark)

- Dashboard 360/390/768/1440 light+dark — no h-scroll (scrollWidth−clientWidth ≤ 0 at every width), no clipped text, focus ring visible, Western digits, RTL arrows correct.
- Courses 360/390/1440 both themes; Course detail 390/1440 both themes; Matrix 390/1440 both themes (mobile concept list verified); Player 390/1440 both themes; Gamification 1440 light.
- Loading/empty/error states exercised: dashboard pending mirror (pinned test), gaps pending/error/empty rows, courses pending/list skeletons, matrix pending skeletons + empty, player empty-chapters note + failed-report retry, exam-taker honest start screen.
- Reduced motion: no scroll-choreography on any 4A surface; entrance animations are the pre-existing capped-stagger grammar covered by the motion.css kill-switch (gate green); all new CSS uses `--t-*`/`--motion-*` tokens only.

## Gate results (final run)

| Gate | Result |
|---|---|
| lint | 0 errors / 19 documented warnings |
| typecheck | ✅ both workspaces |
| tests | ✅ **1971 frontend + 1783 backend**, 0 fail/skip |
| parity export | ✅ 190/190 |
| icons / motion / colors / raw-css | ✅ (0 TSX spacing findings across 133 files) |
| CSP hash | ✅ pinned |
| colleges | ✅ 25/25 |
| bundle | ✅ **637.5 / 650 KB gz** (entry 71.1/80, pdf 95.7/110) |

## Selectors made obsolete (for Agent Z)

Removed from `student.css` (my family's sheet) in r220–r223:

- `.student-dashboard .momentum.dash-resume-pending` (resume row became a TodayList row; pending mirror = pattern anatomy)
- `.student-dashboard .dash-resume-error .ledger-what a` / `.student-dashboard .dash-resume-error .ledger-tail` (error row recomposed)
- `.ledger-group-label` (exams group label — TodayList carries them flat)
- `.student-dashboard .stat-strip` overrides (StatLine replaced the strip on the dashboard)
- `.courses-grid` entrance family still has ONE live consumer class (`courses-grid > .thumb-card { animation: none }` etc.) — **not removed** because `.thumb-card` is shared (Library/Mooc/Catalog/Labs consume it); only the CoursesPage grid consumer is gone. Agent Z may retire `.courses-grid*` rules when the other grids migrate.

## Sheet import lines that may conflict

- `student.css` — appended two clearly-marked sections (`r220 (4A redesign …)`) at the file's end inside `@layer pages`; append-only style preserved. Merge conflicts with 4B/4C/4E edits land at the tail — take both sides.
- `MorePages.tsx` — added `import { PageFrame, PageHeader as PatternPageHeader, StatLine } from '../../components/patterns';` (aliased to avoid the primitives' PageHeader binding used by other pages in the file).
- `main.tsx` — untouched by me (S's `patterns.css` import already merged cleanly).

## Requests for tokens / primitives / patterns

1. `TodayItem.title` is `string` — agenda rows with bidi-sensitive mixed runs must push codes into `meta`; if a later contract revision allows `ReactNode` titles, the dashboard's nodeText projection can go.
2. `RowItem` has no `to` — pages needing the whole-row-as-link (matrix cells, course lecture rows with `closest('a')` pins) keep custom anchors. A `to` prop (or a documented anchor-child pattern) would complete the migration.
3. `StatLineItem.hint` is `string` — the dashboard's cohort-rank hint lost its `bdi` isolation (digits mid-Arabic string render correctly; flag if a regression appears).
4. 4E: `ProgressBar` fix (above) — please adopt/own; any re-skin of primitives should keep the comment OUT of the text child.

## Exam UX issues to propose (4C owns `OnlineExamsPages.tsx` — not edited)

1. During an attempt the shell's BottomNav stays live on mobile — the sticky «تسليم الاختبار» bar stacks above it; two competing bars + accidental navigation away from a timed attempt. Propose: suppress BottomNav on the attempt route (or a navigation guard like the authoring modals').
2. The timer chip (29:58) could escalate (signal tone) under 5 minutes; currently static.
3. The question navigator chips carry no answered/flagged state — the count line «أنجزت من 0» is the only progress scent.

## Anything incomplete, with reason

- **Header migration for the long-tail pages** (`schedule`, `results`, `calendar`, `profile`, `catalog`, `labs`, `live`, …): NOT done. Reason: each carries its own r164–r183 pinned header/test contracts and honest compositions; the visual delta of swapping `primitives/PageHeader` → `patterns/PageHeader` is small vs the pin-renegotiation cost, and time went to the six core learning surfaces. Agent Z's migration wave can take them mechanically (the courses/summary test diff in this branch is the template).
- **SkillsPage / ResultsPage composition swaps**: same reason — both are already chart+list-first with AA-checked primitives; only their headers remain pre-pattern.
- **E-exam attempt redesign**: owned by 4C per BLUEPRINT §1 (correction row for 4A); issues logged above instead of edited.
- **Training/games** (`/training*`, `/achievements`): owned by 4E per BLUEPRINT §1 (it wins over the prompt's family list); 4A's gamification surface above covers the student-facing points/level view.

## Addendum (r227) — post-final integration of shell r211

- Merged `origin/redesign/shell` @ r211 (`4ff866c`, chrome re-skin: BottomNav 4 destinations + «المزيد», layout.css row rhythm, notifications.css) into `redesign/4a-student` — merge commit `97bed9b`, pushed. Zero conflicts; no 4A file touched by the shell delta.
- Gates re-run on the merged state: lint 0 errors / 19 warnings · typecheck ×4 ✅ · frontend **1971** + backend **1783** tests ✅ · motion/icons/colors/raw-css/CSP/colleges ✅.
- Browser re-verification (real browser): dashboard/courses/matrix at 390px — no horizontal overflow, no console errors; dashboard 390+1440 light (verified via the app's own theme toggle — localStorage pinning overrides prefers-color-scheme) and dark; matrix 1440 light. The r211 BottomNav contract (4 links + more-drawer) and the re-skinned active-destination treatment compose cleanly with TodayList/StatLine/gap-rows on every owned surface.
- Final branch head after integration: **`97bed9b`** (merge of r211 on top of r226).
