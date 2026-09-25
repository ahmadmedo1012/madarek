# 4-A6 — Teacher Surfaces Audit (Campaign 4 «سيادة المظهر»)

**Scope:** all 20 teacher routes (`frontend/src/pages/teacher/*.tsx` + shared pages mounted under `/teacher/*`).
**Method:** 21 desktop shoots (1440×900), 6 mobile shoots (390×844@2x), 2 dark shoots, 5 Playwright click-through probes (exam hub tabs → builder modal → question form; template detail hover/focus; grades/students/messages/attendance/research; mobile overflow sweep ×8 routes; touch-target sweep), 8 VLM critique batches (55 images). Login: `teacher@zu.edu.ly`. Evidence prefix `/tmp/madarek-shots/a6-*`.
**Runtime notes:** BE+FE healthy; `teacher@` = pure author (tabs: قوالب اختباراتي / بنك الأسئلة only — «مراجعة الجودة» needs EXAMS_MODERATE, out of this account's reach). No page errors, no console exceptions (only an axe "content not contained by landmarks" warning, owner: A2/A9). No horizontal overflow at 390px on any probed route. ⚠️ First full shoot round was discarded: the auto-start onboarding overlay (`أهلاً بك في مدارك`) covered every page until server-side completion — all shots re-taken clean (see X-1).

## Scores per surface (VLM × code review)

| # | Route | Score | One-line verdict |
|---|-------|-------|------------------|
| 1 | /teacher/dashboard | 7.0 | Strong feed + compact-KPI strip + filter pills; the 6-week trend chart renders **one floating dot** (5/6 weeks null) and reads as broken |
| 2 | /teacher/schedule | 7.5 | Clean day-grouped list rows, correct `<bdi>` time ranges; weekday headers lack a "today" anchor |
| 3 | /teacher/attendance | 8.0 | Best-in-class roll-call: att-toggle grammar, aria-pressed, 44px targets, inline error/success; save action lives far from the data on mobile |
| 4 | /teacher/grades | 6.5 | Sparse single-record table inside heavy chrome; «قيد التطوير» notice card; grade taxonomy disagrees with sister pages |
| 5 | /teacher/materials | 7.5 | Honest table with real views/downloads; the "قيد التطوير" upload zone is styled like a live dropzone |
| 6 | /teacher/research | 8.0 | Dual tabs, KPIs, rich review modal (scan-bar, annotations, discard guard); the strongest teacher workflow |
| 7 | /teacher/students | 6.5 | Same sparse-table pattern as grades + a *different* student-status taxonomy (متفوّق/متوسّط vs ممتاز/جيد) |
| 8 | /teacher/performance | 6.5 | Filter-card-before-content; four 0% progress bars look like a rendering bug |
| 9 | /teacher/assignments | 7.0 | Needs-review card + grading modal with discard guard are excellent; empty-state contrast flagged by VLM |
| 10 | /teacher/exams (hub) | 7.5 | Capability-gated tabs, honest status badges, countAr everywhere; badge density in rows is the cost |
| 11 | /teacher/exams/:templateId | 7.5 | Honest answer keys, attempts section, moderation panel; very long H1 + key/value lines without rhythm |
| 12 | /teacher/messages | 5.5 | Read-only list — **no compose/reply affordance exists anywhere in the FE**; generic empty state |
| 13 | /teacher/ai | 7.0 | Shared AiAssistantPage — teacher-context OK; deep defects belong to A4/A5 |
| 14 | /teacher/library | 7.5 | Shared LibraryPage — rich but toolbar-bloated; belongs to A3 |
| 15 | /teacher/alerts | 5.0 | Shared AlertsPage — generic unhelpful zero state («لا توجد إشعارات بعد» full-viewport); belongs to A5 |
| 16 | /teacher/intelligence | 7.5 | Risk panel + offering track-cards; the AI-suggestion area is a large void before first generation |
| 17 | /teacher/intelligence/:offeringId | 8.0 | Tinted hero band, risk-filter dimming (authored moment), curriculum AI + authoring tabs |
| 18 | /teacher/profile | 7.5 | Rich sections, inline edit with inline save feedback; edit CTA weight vs hero balance |
| 19 | /teacher/live | 7.0 | Full lifecycle + inline retry; honest 0/0/0 metrics read as a "zero wall" |
| 20 | /teacher/labs | 6.5 | Cards look good, but **the only per-card CTA («معاينة كطالب») is dead for every teacher** (P1) |

**GPA ≈ 7.1/10** — the deepest, most consistent craft in the app so far (states discipline is exemplary); the losses are concentrated in: dead/mislinked actions, single-point/zero data visual honesty, one systemic taxonomy inconsistency, and LTR date inputs.

## Findings

### P0 — none
No crash, no blocked workflow, no RTL direction leakage, no overflow at 390px, no console exception on any of the 20 routes.

### P1 (1)

**[P1] «معاينة كطالب» on every lab card bounces teachers back to their dashboard**
- Location: `frontend/src/pages/teacher/TeacherLabsPage.tsx:212` (`<Link to="/student/labs">`) vs guard `frontend/src/App.tsx:200` (`<ProtectedRoute allow={['STUDENT']}>` around `/student/labs`, App.tsx:213) + redirect `frontend/src/components/layout/AppShell.tsx:315-323`.
- Evidence: live probe (a6 probe5): clicked «معاينة كطالب» on /teacher/labs → URL silently becomes `/teacher/dashboard`. 3 lab cards, each with this as the *only* action.
- Impact: the page's single per-card interaction is a no-op for 100% of its audience; teachers cannot preview what they are told to curate.
- Fix sketch: either mount the student LabsPage at a role-permissive route (e.g. `/labs` under the any-authenticated block at App.tsx:315) and link there, or render an in-page lab preview drawer. Do not link into a STUDENT-only route from a TEACHER page.

### P2 (7)

**[P2] Dashboard trend chart renders a lone dot when ≤1 week has data**
- Location: `frontend/src/pages/teacher/TeacherDashboardPage.tsx:176-207` (+ `trendChartData` 259-290, `spanGaps: true`).
- Evidence: API `/teacher/dashboard` returns 6 weeks, 5 with `avgGradePct/attendancePct: null`, week 6 = 100. VLM flagged the same "broken/empty chart" on desktop, mobile AND dark shots (a6-dashboard, a6-m-dashboard, a6-d-dashboard).
- Impact: the highest-emphasis element on the teacher's home page reads as a rendering error, not as "not enough data yet".
- Fix sketch: when a dataset has < 2 non-null points, render the ChartFrame with an honest inline state («لا تتوفّر بيانات كافية بعد — أسبوع واحد مسجَّل») instead of the canvas grid; keep the sr-only table.

**[P2] Native datetime inputs show LTR `mm/dd/yyyy` placeholders inside Arabic RTL forms**
- Location: `frontend/src/pages/teacher/ExamAuthorPages.tsx:1326-1343` (builder: يفتح في / يغلق في, `dir="ltr"` + `type="datetime-local"`); `frontend/src/pages/teacher/TeacherLivePage.tsx:200-206` (موعد الجلسة); `frontend/src/pages/teacher/TeacherPages.tsx:224-233` (`type="date"` تاريخ الجلسة).
- Evidence: VLM flagged `mm/dd/yyyy` twice (a6-probe-builder, a6-probe-builder-2) even with browser locale `ar-LY` — Chromium renders datetime-local in en-US format regardless.
- Impact: dates are the teacher's most safety-critical input (exam windows, session times); an untranslated US-format placeholder in an otherwise fully-Arabic modal breaks trust and invites day/month swaps.
- Fix sketch: pair each datetime field with an Arabic hint under the label («الصيغة: يوم/شهر/سنة — ساعة:دقيقة») and/or adopt a themed Arabic date-time picker; at minimum keep the value rendering localized via `formatDateTimeAr` beside the input after selection.

**[P2] Three different student-grade taxonomies across adjacent teacher pages**
- Location: `TeacherPages.tsx:385-389` (Grades: ممتاز ≥85 / جيّد جدّاً ≥75 / جيّد ≥65 / مقبول ≥50 / ضعيف) vs `TeacherPages.tsx:549-550` (Students: متفوّق ≥80 / متوسّط ≥60 / بحاجة دعم) vs `TeacherPages.tsx:585-592` (Performance distribution: ممتاز 85+ / جيّد جدّاً 75-84 / جيّد ومقبول 60-74 / أقلّ من 60).
- Evidence: same student renders «جيّد جدّاً» on /grades, «متفوّق» on /students, «جيّد ومقبول» on /performance.
- Impact: a teacher cannot carry a chip's meaning across pages; the platform's counted-noun discipline (مقرّر/كلّيّة/اختبار) is undermined by three private grading vocabularies.
- Fix sketch: extract one `gradeBand(avg)` helper (labels + colors + thresholds) into `lib/courseMeta.ts` (or format.ts) and consume it in all three pages + ResearchReview's /20 scale separately.

**[P2] Teacher messages surface has no compose/reply action at all**
- Location: `frontend/src/pages/teacher/TeacherPages.tsx:1009-1096` (MessagesPage = list + pagination only); repo-wide grep finds zero `sendMessage`/«رسالة جديدة» consumers in `src/pages` or `src/components`.
- Evidence: probe5 — compose-ish button count on /teacher/messages = 0; VLM: empty state offers no next action.
- Impact: messaging is one-directional for teachers (they can read but never answer) — the page subtitle «محادثاتك المباشرة عبر المنصّة» over-promises.
- Fix sketch: add a compose modal (recipient = students of my offerings) + reply affordance on each row, or retitle the page honestly («الرسائل الواردة») until the backend write path ships. Cross-ref A5 (student side).

**[P2] Exam-authoring filter rows use inline magic-number widths instead of a shared filter-bar pattern**
- Location: `ExamAuthorPages.tsx:604,616,628,640` (maxWidth 280/200/160/140) and `ExamAuthorPages.tsx:1453,1465,1477,1489` (220/150/130/120).
- Evidence: a6-probe-bank / a6-probe-bank-newq — four controls + search in one wrapped row; widths differ between the two nearly-identical filter rows on the same feature.
- Impact: two sibling surfaces drift apart; on tablet widths the selects truncate labels; the `topbar-search` class is reused outside the topbar.
- Fix sketch: one `.filter-bar` layout class (flex-wrap + token gaps + input width tokens `--w-input-filter`), consumed by both QuestionBankSection and QuestionPicker.

**[P2] Zero-value metric rows look broken rather than empty**
- Location: `TeacherPages.tsx:297-306` (attendance stats: 4 ProgressBars, 3 at 0%) and `TeacherPages.tsx:664-669` (performance distribution bars at 0%); `TeacherLivePage.tsx:159-163` (0/0/0 KPI wall).
- Evidence: VLM on a6-attendance / a6-performance / a6-live: "barely visible grey … looks like a rendering bug", "Zero Wall", "depressing".
- Impact: honest zeros presented in full-weight chrome read as malfunction; the success story (100% حضور) drowns.
- Fix sketch: when a distribution bar's value is 0, dim the row (opacity token) or collapse to a single summary line «لا تغيّب/تأخّر مسجَّل»; for KPI strips keep the numbers but add a one-word context trend («لا جلسات بعد») — the Live page already does this well for values, extend to labels.

**[P2] First-run onboarding overlay covers every teacher page until completed (cross-surface)**
- Location: `frontend/src/components/layout/AppShell.tsx` (auto-start via `useOnboardingState`, `shouldAutoStart` from `User.onboardingCompletedAt`), overlay blocks pointer events app-wide.
- Evidence: probe-modal — a `modal-overlay` intercepted all clicks on /teacher/exams for a not-yet-onboarded account; it re-appears on **every fresh session/page load** (fresh localStorage) until skip/finish persists server-side. My entire first shoot round was contaminated by it.
- Impact: any teacher on a new device gets a full-screen interrupt on top of *whatever* page they deep-linked; Escape dismisses (and completes) it, but nothing communicates that before they try.
- Owner: A9/A13 (onboarding). Fix sketch from the teacher-scope view: auto-start only on the dashboard route (its intended mount point), not on deep links.

### P3 (10)

**[P3] One-select «المقرّر» card pattern wastes the first fold on 3 pages**
- `TeacherPages.tsx:342-356` (grades), `:507-521` (students), `:604-618` (performance). A full titled Card wrapping a single `<select>`; VLM called it the page's heaviest element. Fix: promote the select into the page header actions (like Attendance's save button) or a shared `CoursePickerToolbar`; also dedupe the triple `effectiveOfferingId` logic into one hook.

**[P3] `متوسط الدرجات` rendered without unit while sisters show `%`**
- `TeacherPages.tsx:394` (`{s.avgGrade}`) and `:556` vs attendance `%` at `:555`. Wrap as `<bdi>{n}%</bdi>` or state the scale (out of 100) once in the header.

**[P3] Stale tooltip on the publish button**
- `ExamAuthorPages.tsx:544` — `title="النشر متاح بعد اعتماد الجودة"` renders on an **APPROVED** template where publishing is already available. Copy should describe the consequence: «النشر يعرض الاختبار للطلاب حسب نطاقه ولا يمكن التراجع عنه».

**[P3] Scope label drift: row «عام» vs detail «عام — كل الكلّيّات»**
- `ExamAuthorPages.tsx:470` vs `:1661`/`:1709`. Pick one label for the general scope.

**[P3] Template detail: very long H1 + rhythm-less key/value card**
- `ExamAuthorPages.tsx:1652` (title has `title` attr but no clamp/`text-wrap: balance`) and `DetailLine` `:1768-1774` (flex label/value pairs without separators). VLM: H1 pushes content down; pairs hard to scan. Fix: 2-line clamp + dotted leader or zebra hairlines between DetailLines.

**[P3] Latin «AI» badge without isolation**
- `TeacherIntelligencePage.tsx:79` — `<Badge color="amber"><Icon …/> AI</Badge>`; everywhere else Latin runs are `<bdi>`-wrapped (ResearchReviewPage.tsx:184 does it right). Use `<bdi>AI</bdi>` or the Arabic «ذكاء اصطناعي» per glossary.

**[P3] Materials "dropzone" is a permanent stub styled as a live drop target**
- `TeacherPages.tsx:432-442` — dashed dropzone visual with «واجهة الرفع المباشر قيد التطوير». Honest copy, dishonest shape: users will drag files onto it. Restyle as a notice (icon + text, no dashed drop area) until upload ships.

**[P3] Messages page: title redundancy + generic zero state**
- `TeacherPages.tsx:1025-1026` — page title «الرسائل» + card title «الرسائل الأخيرة»; empty state offers no guidance. Merge headers; add a next-action («راسل طلابك من صفحة الطلاب» once compose exists).

**[P3] Schedule lacks a "today" anchor**
- `TeacherPages.tsx:89-114` — day groups have no indicator for اليوم; a teacher scanning Wednesday must read all headers. Add a brand dot / «اليوم» chip on the current weekday.

**[P3] Attendance save CTA is one scroll away from the data it commits**
- `TeacherPages.tsx:199-208` — save lives in the page header; on a 30-student roster at 390px the last toggle and the button never co-occur. Consider a sticky summary bar (counts + save) at the bottom on mobile, mirroring the `.att-toggle` grammar.

### Cross-refs (owned elsewhere, observed from teacher scope)
- **X-1** Onboarding overlay behavior → A9/A13 (also P2 above).
- **X-2** Shell touch targets: `theme-toggle-option` 30×28px, `sidebar-logout` 26×26px (probe3, all sampled routes) → A2/A10.
- **X-3** axe "content not contained by landmarks" console warning on teacher pages → A2/A9.
- **X-4** /teacher/ai (AiAssistantPage), /teacher/library (LibraryPage), /teacher/alerts (AlertsPage), /teacher/community (CommunityPage) are student-shared mounts → A3/A4/A5 own their deep audit; teacher-context rendering itself is fine.
- **X-5** «مراجعة الجودة» tab + TemplateModerationPanel unreachable for teacher@ (needs EXAMS_MODERATE) — verified gated correctly; quality-role audit belongs to A8.

## Positive findings (keep and replicate)
- **State discipline:** every async surface has a shape-matched skeleton (LiveSkeleton, LabsSkeleton, Kpi3Skeleton, TrackGridSkeleton, compact-KPI skeleton, paper-row skeleton, DetailSkeleton) — never a fake 0 while loading (explicit ruling comments at TeacherLivePage.tsx:138-139, ResearchReviewPage.tsx:65-66).
- **Draft safety:** all four long-form modals (grade submission, research review, template builder, question creator, attempt grading) route close through the shared `useDiscardGuard` — no silent data loss.
- **RTL numerics:** `<bdi>` isolation applied consistently to codes, university IDs, fractions (`{submissions} / {enrolled}`), percentages and date ranges; pagination chevrons correctly mirrored (TeacherPages.tsx:1070-1087).
- **countAr pluralization** everywhere (قالب واحد/قالبان/قوالب/قالباً …) — the Arabic voice is native, not machine-translated; glossary terms مقرّر/كلّيّة/اختبار used correctly.
- **Honest permission surfaces:** capability-gated tabs, never-rendered dead buttons (PublishButton returns null when the gate can't pass), real 404 states for unknown offering IDs (TeacherIntelligencePage.tsx:259-278).
- **Focus + touch:** visible focus ring on list rows (probe shot a6-probe-detail-focus), att-toggle hits 44px on touch (probe4: 51×44 at 390px).

## Top-10 quick wins (fix-wave ready)
1. **Re-link «معاينة كطالب»** to a role-permissive labs route (P1, TeacherLabsPage.tsx:212 + App.tsx) — one-line route move + link.
2. **Single-dot trend guard** in ChartFrame/Line rendering (P2, TeacherDashboardPage.tsx:195-205).
3. **Arabic hint beside every datetime-local** (P2, 3 files, 3 inputs) — copy-only fix.
4. **One `gradeBand()` helper** consumed by grades/students/performance (P2, TeacherPages.tsx ×3 sites).
5. **Dim/collapse zero bars** in attendance + performance stats (P2, TeacherPages.tsx:297-306, 664-669).
6. **`.filter-bar` shared class** replacing inline maxWidths in the two exam filter rows (P2, ExamAuthorPages.tsx ×8 sites).
7. **Honest retitle of /teacher/messages** («الرسائل الواردة») until compose exists (P2 copy).
8. **Publish tooltip rewrite** (P3, ExamAuthorPages.tsx:544).
9. **`<bdi>AI</bdi>`** in the intelligence badge (P3, TeacherIntelligencePage.tsx:79).
10. **Materials stub restyle** from dropzone to notice (P3, TeacherPages.tsx:432-442).

## Files to touch (fix wave)
- `frontend/src/pages/teacher/TeacherLabsPage.tsx` (P1 link)
- `frontend/src/App.tsx` (labs route placement — coordinate with A2/A10 for route-table ownership)
- `frontend/src/pages/teacher/TeacherDashboardPage.tsx` (trend guard)
- `frontend/src/pages/teacher/TeacherPages.tsx` (grade taxonomy, zero bars, datetime hints, messages retitle, materials stub, course-picker card, attendance CTA)
- `frontend/src/pages/teacher/ExamAuthorPages.tsx` (filter-bar, tooltip, scope label, H1 clamp, DetailLine rhythm, datetime hints)
- `frontend/src/pages/teacher/TeacherLivePage.tsx` (datetime hint, KPI zero context)
- `frontend/src/pages/teacher/TeacherIntelligencePage.tsx` (bdi AI badge)
- `frontend/src/pages/teacher/TeacherProfilePage.tsx` (none blocking — clean)
- `frontend/src/pages/teacher/ResearchReviewPage.tsx` (none blocking — clean)
- Shared: `frontend/src/lib/courseMeta.ts` (gradeBand helper home), `frontend/src/components/charts/*` (empty-data guard), `frontend/src/styles/components.css` (.filter-bar, zero-dim token) — coordinate with A9 (primitives/charts owner).

## Summary counts
- **P0: 0 · P1: 1 · P2: 7 · P3: 10 · Cross-refs: 5**
- Audit health (impeccable 5-dimension, teacher scope): A11y 3/4 · Performance 3/4 · Theming 3.5/4 · Responsive 3.5/4 · Implementation integrity 3.5/4 → **16.5/20 (Good — address the weak dimension: interaction honesty)**
