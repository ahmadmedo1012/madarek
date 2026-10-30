# 5-A7 — Teacher + Owner surfaces at the 9+ bar

Campaign 5 «الحرفة الختامية» · AUDIT-ONLY (zero source edits, zero git ops).
Agent scope: `frontend/src/pages/teacher/**`, `frontend/src/pages/owner/**`, teacher-related styles.
Method: full live walk (72 cells) + deep workflow probes + code pass + VLM ×12 images with every claim re-measured in DOM.
Probes: `/tmp/a7-probes/` (walk1/walk2/realtime/obflip/grading/tdeep×3/odeep/dark/final/vlm-recheck×2), shots `/tmp/madarek-shots/a7/` (mine are the `t-*`/`o-*`/`td-*`/`od-*`/`dk-*`/`g-*`/`rt-*`/`ob-*` files; a prior interrupted run left `teacher-*`/`light-*`/`dark-*` files there).

## Environment
BE :4000 + FE :5173 + PG :5433 live for the whole audit. Playwright = **global 1.63** (`/home/z/.npm-global/lib/node_modules/playwright`) — repo-root 1.60 still cannot launch (chromium-1223 missing). Theme switch in probes = zustand persist key `madarek-theme` (`{"state":{"mode":"dark"},"version":2}`).

---

## 1. Per-route verdict table

### Teacher (21 routes walked at 1440 + 390)

| Route | Score | Verdict |
|---|---|---|
| /teacher/dashboard | **9.0** | Flagship. Trend honest-empty floor + sr-table in the empty branch, countAr **with** zero guard, honest KPI deltas («لا تقييمات بعد»), shape-matched skeleton, ChartFrame. Only blemishes: feed CTA 404 (P1-1, backend), 12px «الكل» pill (P3-4). |
| /teacher/intelligence | **8.5** | Offerings grid + per-card counts; offering cards render countAr zero as «0 محاضرة» (P2-4). |
| /teacher/intelligence/:id | **8.5** | Honest tri-state incl. real 404, risk-filter authored moment, tabs. Authoring tab: raw counted nouns (P2-4), no reordering (P2-3). |
| /teacher/schedule | **8.5** | Honest empty, «اليوم» anchor, bdi time ranges, counted nouns. |
| /teacher/attendance | **9.0** | Roll-call aria-pressed toggles ×4 statuses, local-day date honesty (15-h), inline validation, live counts. |
| /teacher/grades | **8.5** | tbl-stack + data-labels, shared gradeBand chip, honest «قيد التطوير» note. |
| /teacher/materials | **8.0** | Table + tbl-stack; relative dates lack the datetime title hint (P3-2). |
| /teacher/assignments | **7.5** | **Weakest teacher surface.** Queue subtitle zero-case (P2-1), blind grading modal (P1-2), no Enter-submit (P2-2), no next-submission flow. Everything else (states, late chip, discard guard, FormField a11y) is right. |
| /teacher/exams | **8.5** | Bank + builder + publish gate (APPROVED-only, author-only, irreversible confirm), 16px search, honest filter-empties, shared filter-bar tokens. |
| /teacher/exams/:templateId | **8.5** | Attempts + moderation + GradeAttemptModal (form ✓ Enter, toast, double-submit guard, client-mirror validation). Zero attempts in seed → empty branch live. |
| /teacher/research | **9.0** | Full loop: grade modal + «قراءة وكتابة ملاحظات» document link, KPI error-masking («—» on API-down), discard guard, annotations. |
| /teacher/students | **8.5** | tbl-stack at 390 (stacked, data-labels ✓), gradeBand chip parity. |
| /teacher/performance | **8.0** | Shared gradeBand distribution + aria per bar + honest zero-dim; **double «0%0%»** in bar labels (P2-6). |
| /teacher/messages | **7.5** | Functional but orphan route (A4 P1-3 open) + subtitle «0 رسالة» zero-case (P2-1). |
| /teacher/live | **8.5** | Honest zeros + explanations, all 10 icon-only buttons aria-labelled, session form with discard guard. |
| /teacher/labs | **8.5** | Honest CTA «معاينة كطالب» (C4 fix verified live). |
| /teacher/library | shared | A6 scope — 16px inputs verified. |
| /teacher/ai | shared | A6 scope; 21 buttons, prompt suggestions. |
| /teacher/alerts | shared | AlertsPage, fine. |
| /teacher/profile | **8.5** | No sub-16px inputs; clean. |
| /teacher/community | shared | C4 wave 22-c 8.5. |

**Teacher average ≈ 8.5.** Zero overflow on all 42 cells, zero page errors, all h1 40px, dark contrast sweep: 0 failing samples on 4 pages.

### Owner (10 routes walked at 1440 + 390 + 768)

| Route | Score | Verdict |
|---|---|---|
| /owner/dashboard | **9.0** | Honest tri-state status band (never "normal" unless alerts answered), ChartFrame + sr-table, 22-b dedupe verified (4 KPIs + health list), degraded band with retry. |
| /owner/users | **8.0** | Search input **13px** (P2-5, A5 P1-3 open — measured live at all 3 viewports). Everything else 9+: tbl-stack, row stagger (--row-i, capped), quiet row actions with (hover:none) persistence, bounded pagination + gap chip, honest filter-empty, Arabic role enums with bdi fallback. |
| /owner/activity | **9.0** | Arabic enum mapping incl. ENROLLMENT_/ROLE_/STATUS_ (C4 verified), eventsCountLabel has a real zero case («لا أحداث»), shape-matched TimelineSkeleton, expandable rows. |
| /owner/content | **8.5** | 4 distinct cards, honest stats. |
| /owner/system | **8.5** | Sync log (tbl-stack), flags, alerts, settings; formatDateTimeAr cells. |
| /owner/education | **9.0** | C4 dedupe verified (4 distinct cards), workload meters, 2 ChartFrame charts, honest empty branches. |
| /owner/realtime | **9.0** | **C4 hand-off resolved** (see §2). Honest band, aria-live grid, keyed remount values, dataUpdatedAt stamp (no lying clock), quiet-campus neutral dots with sr text, RM belt + specific off-switches, 44px floors. |
| /owner/ai | **9.0** | Honest-zeros KPI convention (22-b), per-card empties with «فتح إعدادات النظام» CTA, ChartFrame + tables when data, bidi Latin units. |
| /owner/alerts | **8.5** | Honest empty («لا توجد تنبيهات مفتوحة»), 1px severity hairlines (wave 3-c ruling), resolve-error rows. |
| /owner/governance | **9.0** | Integer y-axis (precision 0, beginAtZero), one-week honesty (title drops the 8-week claim, larger lone point), legend counts, doughnut center label, per-section pending/error. |

**Owner average ≈ 8.8.** Zero overflow on all 30 cells (incl. 768), zero console errors.

---

## 2. C4 hand-off verification (the two open items)

1. **"/owner/realtime never directly shot (onboarding modal intercepted)"** — RESOLVED. Live-verified: onboarding no longer auto-starts on /owner/realtime (wave-21 role-home gate + seeded owner has `onboardingCompletedAt`). The realtime surface was shot clean at 1440/390/768, light + dark (`rt-*`, `dk-o-realtime`). Replay via the sidebar tour trigger still works (frame 3 reachable, `data-frame="3"`).
2. **"Onboarding CTA flipping filled→ghost between themes"** — NOT REPRODUCED; measured both frames × both themes:
   - frame 1 light: bg `rgb(25,25,24)` / fg `#FBFAF9` (ink filled). frame 1 dark: bg `rgb(242,234,216)` / fg `#191918` (sand filled).
   - frame 3 (role) light: bg `color-mix(accent 30%, #191918)` ≈ `rgb(50,52,55)`. frame 3 dark: bg `color-mix(accent 30%, #F2EAD8)` ≈ `rgb(217,214,204)`.
   - Both are **filled** primaries following the platform's inverted-primary convention; both ≥ ~11.7:1. What likely read as "ghost" is that the dark-theme primary is a light-sand button. The dark illustration halo renders with the dark-theme accent (`#A0A6B0` for owner) at 12% — fine. Residue: the inline contrast-math comment is stale (P3-1).

## 3. C4 wave-22ab survival checks — ALL VERIFIED LIVE

labs CTA honest («معاينة كطالب») · trend honest-empty («لا تتوفّر بيانات كافية بعد لرسم الاتجاه» + sr-table) · shared gradeBand taxonomy (grades/students/performance all `gradeBand()` from courseMeta.ts:123) · Arabic enums (activity ACTION_LABEL, ROLE_LABELS, ATTEMPT_STATUS_LABEL) · edu dedupe (4 distinct cards) · governance ticks (legend counts + center label) · tbl-stack (teacher grades/materials/students + owner users/system/education/ai/governance/dashboard; stacked at ≤640, data-labels present) · realtime semantics («النظام يعمل بشكل طبيعيّ» only after alerts answer; quiet ≠ warning).

---

## 4. Findings

### P0 — none.

### P1 (2)

**P1-1 · Teacher dashboard feed CTAs are dead links (A4 P1-1 — STILL OPEN, live-verified today).**
Evidence: feed renders `<Link to={item.actionTo}>` (TeacherDashboardPage.tsx:408); backend writes raw `/grades` `/research` `/attendance` (backend/src/http/routes/teacher-dashboard.routes.ts:133, 457, 468). Live: the only feed row's «مراجعة البحث» → `/research` → **404 page** («خطأ 404. هذه الصفحة تغيّبت عن الحضور»), HTTP 200 route-render. The three CTAs are the dashboard's primary actions.
Fix: prefix all three with `/teacher/` in `actionTo`; consider a shared `TEACHER_ROUTE` map + a unit test asserting every actionTo starts with `/teacher/`.

**P1-2 · Assignment grading is blind — the teacher grades without ever seeing the submission.**
Evidence: `Submission` has `fileUrl String?` + `textAnswer String?` (backend/prisma/schema.prisma:546-547), but the feed select omits both (teacher-dashboard.routes.ts:94-137 — `PendingSubmissionFeedRow` carries only student/assignment/meta) and `GradeSubmissionModal` (TeacherPages.tsx:959-1100) renders title + name + score + feedback — no content, no file link. Contrast: the research flow shows the work («قراءة وكتابة ملاحظات» → `/document/` viewer, ResearchReviewPage.tsx:194-204). A teacher literally cannot review what they are grading.
Fix: add `fileUrl`/`textAnswer` to the feed row (or a `useSubmission(id)` detail query on modal open); render `textAnswer` in a `pre-wrap` surface-2 block (the PendingAnswerCard grammar, ExamAuthorPages.tsx:1998-2012) + an «فتح الملف» button using the research `/document/` link pattern. FE-mostly (one backend select field + projection).

### P2 (6)

**P2-1 · countAr zero-case renders broken Arabic («0 تسليماً بانتظار درجتك»).**
Evidence (all live-measured): assignments queue subtitle `«0 تسليماً بانتظار درجتك»` (TeacherPages.tsx:912) while the EmptyState right below correctly says «لا توجد تسليمات بانتظار التقييم»; messages `«0 رسالة»` (TeacherPages.tsx:1136); exams attempts `countAr(awaiting, …)` can hit 0 with non-zero attempts (ExamAuthorPages.tsx:1864); students card title `countAr(students.length,…)` (TeacherPages.tsx:614); offering cards «0 محاضرة / 0 واجباً» (TeacherIntelligencePage.tsx:199). `countAr(0, forms)` falls through to the many-form (lib/format.ts:22-27). The dashboard already guards (`visible.length === 0 ? 'لا عناصر…'`, TeacherDashboardPage.tsx:173-175) — the pattern exists in-repo.
Fix: guard `n === 0` at each call site with its own «لا …» copy (zero copy is context-specific); optionally add an optional 5th zero-form to countAr's signature.

**P2-2 · Grading throughput: no Enter-to-submit and no next-submission flow in the assignment modal.**
Evidence: `GradeSubmissionModal` has **no `<form>`** (TeacherPages.tsx:1009-1098 — the only grading/authoring modal without one; GradeAttemptModal wraps in `<form onSubmit>` at ExamAuthorPages.tsx:2138, the curriculum modals too), so Enter in the score field does nothing; after save the teacher must click «إغلاق», then locate and click the next «تقييم» row. Grading 30 submissions = 30 × (open → type → save → close → hunt). Also no toast on success (exam modal has one, ExamAuthorPages.tsx:2108).
Fix: wrap the two fields in `<form onSubmit={onSubmit} noValidate>` (parity + free keyboard submit); in the `done` state add «تقييم التالي» that closes and opens the next pending row (the queue array is already in the parent); return focus to the next row's button on plain close.

**P2-3 · Authoring reordering is a text field — and chapters can't be reordered at all.**
Evidence: the only reorder mechanism for lectures is the «الترتيب (اختياري)» numeric field inside the edit modal (LectureAuthoring.tsx:131-133); chapter ordinals are auto-assigned by the API and never editable (ChapterBuilder.tsx:10); zero reorder controls measured live (`reorderControls: 0` in the authoring panel). Reordering lecture 3 → 1 means: open edit, type a number, save, re-sort mentally, repeat.
Fix (cheap, no drag lib): «↑/↓» buttons per lecture row that swap ordinals with the neighbor (two PATCHes via the existing `useUpdateLecture`), disabled at the ends, `aria-label`s «انقل المحاضرة لأعلى/أسفل». Keep the ordinal field as the power path. Chapters: same treatment needs a backend ordinal PATCH (defer if backend-frozen).

**P2-4 · Raw counted nouns in the curriculum surfaces (countAr exists and is used everywhere else).**
Evidence (live): authoring subtitle `«3 محاضرة · 9 فصل · 4 سؤال تفاعلي»` (CurriculumAuthoringPanel.tsx:52); lecture rows `{…} فصل` / `{…} سؤال` (LectureAuthoring.tsx:227-228); intelligence offering cards «0 محاضرة» (TeacherIntelligencePage.tsx:199). Should read «3 محاضرات · 9 فصول · 4 أسئلة تفاعلية» etc.
Fix: swap to `countAr` with the established form tuples; the file already imports format helpers nearby.

**P2-5 · Owner users search input is 13px — the iOS focus-zoom trigger (A5 P1-3, still open).**
Evidence: `.owner-search-bar input { font-size: var(--fs-sm) }` (owner.css:448-458, `--fs-sm: 13px` tokens.css:66); measured live at 1440/390/768 — the only sub-16px input on any teacher/owner surface (swept all 30 owner + 42 teacher cells).
Fix: `font-size: max(16px, var(--fs-sm));` — the exact recipe already shipped for `.topbar-search input` (components.css:710-720, comment cites A10 P1-2). One line.

**P2-6 · Performance distribution renders the percentage twice («0%0%»).**
Evidence (live DOM text): «ممتاز (85 فأعلى) · 0%**0%**» — the label node includes `· {pct}%` (TeacherPages.tsx:764) AND `ProgressBar` renders its own value (`showValue` defaults true). Every bar, every breakpoint.
Fix: pass `showValue={false}` (label already carries it) — or drop the pct from the label markup. One prop.

### P3 (6)

**P3-1 · Stale contrast-math comment on the onboarding role-CTA.** components.css:3699-3710 claims «light text on the mixed ground … ≥9:1 in dark»; the actual dark rendering is dark ink on a light sand mix (≈12:1) because `--neutral-900/50` flip together. Rendered result is correct — comment describes a different mechanism. Fix the comment when touching the block.
**P3-2 · Relative timestamps lack the full-date hint on 3 teacher surfaces.** Exam attempts have `title={formatDateTimeAr(…)}` (ExamAuthorPages.tsx:1925); materials rows (TeacherPages.tsx:577), queue rows (940) and the grade modal header (1027), messages rows (1166) show bare `formatRelativeArShort`. Add the same title attr — pure parity.
**P3-3 · Realtime summary table is the last legacy `.owner-table`** (OwnerRealtimePage.tsx:102) — every other owner data table rides `.table.tbl-stack` with data-labels. At 390 it fits (3 narrow cols, no overflow measured) but gets no stacking semantics. Align opportunistically.
**P3-4 · 12px interactive text.** «الكل» filter pills (dashboard/exams/users), «حاضر» roll-call chips (attendance), «عرض»/«تقييم» row buttons — 12px/12.5px (`--type-label-size` floor is 12.5 for links like «اسأل AI»). Not an iOS-zoom trigger (buttons don't open the keyboard), but a legibility nit on the smallest chips. Consider a 13px floor for interactive chips only.
**P3-5 · Separator inconsistency in backend feed copy.** Research/attendance feed titles use «—» (teacher-dashboard.routes.ts:450, 466: «لم يُفحص بعد — بانتظار فحص الانتحال») while every FE row uses «·». Pick one visible separator convention.
**P3-6 · Teacher IA orphans (cross-ref A4 P1-3, still open).** /teacher/performance + /teacher/messages have zero inbound links; /teacher/students is bottom-nav-only (unreachable on desktop); alerts has no desktop marker for any role. Affects teacher surface completeness; the nav.ts curation pass A4 proposed covers it.

### Verified-good (no action)
Realtime console honesty stack (band tri-state, aria-live, keyed value remounts, `dataUpdatedAt` stamp, quiet-campus neutral dots + sr text); every chart on both roles inside ChartFrame with sr-tables + Arabic aria-labels + themeKey remounts; every data area has pending/error/empty with shape-matched skeletons (TimelineSkeleton, TableSkeleton, KpiSkeleton, ChartSkeleton, GovKpiSkeleton, Kpi3Skeleton); discard guards on every long-form modal (grade ×3, curriculum ×3, research, live); roll-call a11y; users-table quiet actions with `(hover:none)` persistence + bounded pagination; publish gate (APPROVED + author + irreversible confirm); exam attempt grading client-mirror validation + double-submit lock; owner activity Arabic enums incl. the ENROLLMENT_/ROLE_ branches; dark-theme contrast sweep 0 fails on 6 key pages; RM coverage (global belt + owner.css off-switches); tbl-stack data-labels everywhere it stacks; 16px inputs everywhere except P2-5.

---

## 5. VLM claim ledger (12 images, 3 batches — every claim re-measured)

| VLM claim | Re-measure | Verdict |
|---|---|---|
| dash "cramped mid-section / insufficient card separation" | gaps 80/60/60/60px between page sections | **wrong** (generous, correct heading-first rhythm) |
| dash "empty state floats without container" | state inside Card, pad 32/24 — platform grammar | **wrong** |
| exams "title centered / add button misaligned for RTL" | title `text-align:start`, x=1275 (right); button at inline-end (left) = correct RTL actions slot | **wrong** |
| exams "filter bar nested in card = discipline breach" | true by design (Card > .filter-bar, shared token widths) | **not a defect** |
| performance "all bars invisible / 0 students / logical paradox" | 1 student, 5 bars (1×100%), KPIs «0 من 1» honest | **wrong** (but exposed the real double-% P2-6) |
| realtime "excessive title→band gap vs tight band→cards" | 80 vs 76 vs 60 | **wrong** |
| realtime "numerals not tabular" | `IBM Plex Sans Arabic` + `tabular-nums` | **wrong** |
| users-390 "search icon on wrong side for RTL" | icon at visual-right = inline-start | **wrong** |
| users-390 "active pill outweighs the numbers" | pill 12px/600 vs metric 30px/700 | **wrong** |
| gov-390 "massive gutters / headers same weight as values" | gaps 40-60px; th 700 vs td 400 | **wrong** |
| gov-390 "raw 0s without microcopy" | honest-zero is the console's documented convention (OwnerAiPage comment) | **opinion, keep** |
| queue-390 batch-4 response | described a desktop sidebar not present in the image | **hallucinated image** |
| edu "X-axis numerals left-aligned for RTL" | chart.js screen coords; consistent platform-wide; rtl:true on legends/tooltips (chartTheme.ts:545,619) | **known platform convention** |
| builder "no focus rings" / queue "no focus rings" | global v22 focus-visible system; not statically falsifiable, no evidence of absence | **unverified, no finding** |
| onboarding "illustration too large / dots padding" | 280×200 svg in 510×200 container, platform contract | **opinion, no action** |
| dark-realtime "0s massive and bold draw the eye" | true — the honest-zero KPI convention | **by design** |

Net: ~4/16 claims partially real; the one actionable residue (double %) was found by DOM, not VLM — consistent with C4's "half of VLM claims wrong".

---

## 6. Plan: teacher grading 8 → 9+

Ordered, all FE except where noted:
1. **P1-2** — surface the submission in GradeSubmissionModal (textAnswer block + file link). Needs one backend select field (fileUrl/textAnswer in the feed row) or a submission-detail endpoint. This is the single biggest credibility gap: grading without seeing the work.
2. **P2-2** — `<form>` wrap (Enter submits) + «تقييم التالي» in the done state + focus return to the next row. Turns 30 submissions from ~150 clicks into ~60.
3. **P2-1** — zero-guard the queue subtitle («لا توجد تسليمات بانتظار درجتك»).
4. Queue scale: group pending by assignment (assignment header + per-assignment maxScore chip + count), so 30 pending reads as 4 groups not 30 rows. FE-only (group the existing array).
5. **P2-6** — kill the double percentage (one prop).
6. Optional 9.5 material (backend-first, defer): rubric rows per assignment; autosave is unnecessary for a 2-field modal — the discard guard + pending lock already cover conflict/dirty handling honestly.
7. **P1-1** rides the same wave: `/teacher/` prefix on the three actionTo values (backend, 3 lines + test).

## 7. Plan: owner console 8.8 → 9+

The console (realtime + ai + governance + activity + dashboard) is already at the bar; remaining lift is consistency, not craft:
1. **P2-5** — users search 16px floor (one line, closes A5 P1-3, the last failing cell in A5's 201-cell matrix).
2. **P3-3** — migrate the realtime summary table to `.table.tbl-stack` (aligns the last legacy table; keeps the neutral dots).
3. **P3-1** — correct the stale CTA contrast comment (dark renders inverted ground, still ≥12:1).
4. Optional polish: sparkline/mini-trend per realtime tile needs a backend series — defer to a product wave.
5. Keep the honest-zero KPI convention as-is (VLM flagged it; it is the documented 22-b decision and it is right).

## 8. Hand-offs / notes for the orchestrator

- **Seed gaps** (from this audit, for the fix wave): teacher has **0 pending submissions** and **0 exam attempts** — the assignment modal and attempt grading can't be verified end-to-end without seed additions (consider seeding 2-3 SUBMITTED submissions with textAnswer + one SUBMITTED exam attempt with a pending essay answer). Do NOT consume them in verification like A6's exam attempt.
- SE301 (`cmuhjyy7i001xhcpxnxumjgul`) is the only offering with lectures (3) — use it for any authoring UI verification; the other 5 offerings are empty.
- The prior interrupted 5-A7 run left screenshots in `/tmp/madarek-shots/a7/` (`teacher-*`, `light-*`, `dark-*` prefixes) — superseded by this run's `t-*`/`o-*`/`td-*`/`od-*` files.
- P1-1 is a backend file (teacher-dashboard.routes.ts) — needs a backend-touched wave or an orchestrator exception; the FE renders `actionTo` verbatim by design.
- A4's IA orphans (P3-6 here) overlap this scope's completeness; one nav.ts pass fixes teacher + alerts parity together.
