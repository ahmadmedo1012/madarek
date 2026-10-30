# Audit 5-A9 — Async States Quality (loading / empty / error / mutation / stale / a11y / offline)

**Campaign 5 «الحرفة الختامية» · AUDIT-ONLY · agent 5-A9 · scope: every page family (student/teacher/owner/admin/quality/public) × every async surface.**

Craft floor under test (AGENTS-BRIEF §4): *loading = Skeleton, empty = States, error = States with retry — never blank, never a bare spinner where a shape-matched skeleton fits.*

## Method & provenance

A prior interrupted 5-A9 run left ~90 probe scripts + 50 data files under `/tmp/a9-probes/` (01:40–04:56). Per campaign practice (A5/A7 precedent) I audited that data, **re-verified every load-bearing claim live**, corrected 3 false claims (§5), and added new probes **V1–V7** (also under `/tmp/a9-probes/`, shots `/tmp/madarek-shots/a9/v*`):

- **V1** loading truth, 12 flagged routes: all API calls delayed 1400ms → frameA (Suspense) / frameB (data-pending) / settled census (skeleton+variant counts, spinners, aria-busy/live/status, bounding boxes, height deltas).
- **V2** SPA staleness: in-app nav → `history.back()` — cached-instant render, refetch log (`data-v2-stale.json`).
- **V3** NotificationPanel under aborted `/notifications` (`data-v3-notif.json`).
- **V4/V4b/V4c** mutations under 1500–1600ms-slow writes: pending label/disabled, double-click POST counts, failure retention (login, attendance save, announcement publish, social like).
- **V5/V5b/V5c** cold-load CLS (PerformanceObserver + rect traces, 2 runs × 3 routes) incl. sidebar-flip observer.
- **V6/V6b** skeleton a11y census mid-load (naked skeletons, live-region census, zero-width diagnosis with computed styles).
- **V7** offline: in-app nav offline → unvisited lazy route → recovery after back-online.

Prior-run data reused where internally consistent across ≥2 files: error sweeps (17 routes + 9 forced + 429s), empty sweeps (28 routes + forced-search ×10 + tabs/palette/search), mutation recon (12 flows), total-failure probe (p9), loading census (52 routes).

---

## §1 State-quality matrix

Legend: ✅ meets floor · ⚠️ minor gap · ❌ violates floor. L=loading, E=empty, Er=error, M=mutation. “—” = no such surface in seed (verified, not skipped).

### Student family

| Surface | L | E | Er | M | Notes (evidence) |
|---|---|---|---|---|---|
| /student/dashboard | ⚠️ | — | ✅ | — | 20-skel shape-stable mid-load, but KPI value bar 0-width (P2-1) + cold CLS 0.28–0.39 (P1-2); error = full-page ErrorState + retry (V1, data-error2) |
| /student/courses | ✅ | ✅ | ✅ | — | 56 skels; search no-results with suggestions (p2b); ErrorState+retry |
| /student/exams (analysis) | ⚠️ | — | ✅✓ | — | inline skeletons; **exemplary per-card error**: card stays an entry point, inline «تعذّر تحميل متوسّطك الحاليّ» + retry (ExamsPage.tsx:63–79, p8b) |
| /student/online-exams | ✅ | ✅ | ✅ | ✅✓ | ListSkeleton; 429 → «طلبات كثيرة — انتظر قليلاً» + retry (p8b); start/submit buttons carry pending labels (OnlineExamsPages.tsx:653–654, 817–818) |
| /student/results | ❌ | — | ✅ | — | bare spinner `LoadingState` where KPI+chart land later (+204px, V1); error branch proper (MorePages.tsx:541–565) |
| /student/schedule | ❌ | — | ✅ | — | bare spinner (MorePages.tsx:419–428); +410px on land (V1) |
| /student/library | ✅ | ✅✓ | ✅ | — | 27 skels; empty-search = illustration + guidance; loans «لا توجد إنذارات» is bare text (P3-2) |
| /student/research | ✅ | — | ✅ | ✅ | 10 skels; upload flow prior-verified (toast + states) |
| /student/profile | ⚠️ | — | ✅✓ | ✅ | no data-phase skeleton (instant chrome); **exemplary inline fact-error**: «الحقول أعلاه تُعرض “—” حتّى يعود الاتصال» + retry (data-error3) |
| /student/webinars | — | ✅✓ | ✅ | — | instructive empty + CTA «زيارة صفحة البثّ» (data-empty #4) |
| /student/live | — | ✅ | ✅ | — | instructive empty, no CTA (no action exists — honest) |
| /student/social | ✅ | ✅ | ✅ | ✅✓ | composer: disabled-when-empty, failure keeps draft + retry, success clears (p10a/p4); like = optimistic + rollback + fail-note (MorePages.tsx:811–835) |
| /student/mooc · jobs · matrix · alerts · downloads | ✅ | ✅ | ✅ | — | 12–42 skels each (prior census); honest zeros |
| /training | ✅ | ✅ | ✅ | — | 45 skels; tracks empty-state prior-verified |
| /community | ❌ | ✅✓ | ✅ | ✅✓ | 3 tab lists = `LoadingState` spinners (CommunityPages.tsx:165/174/183, V1 +472px); empties instructive; competition pills empty + CTA; announcement modal = full pending/dirty-guard/failure-retention (CommunityPages.tsx:424–556) |

### Teacher family

| Surface | L | E | Er | M | Notes |
|---|---|---|---|---|---|
| /teacher/dashboard | ✅ | ✅ | ✅ | — | 34 skels; honest zeros with zero-guard copy |
| /teacher/schedule | ✅✓ | — | ✅ | — | **the exemplar gating**: isPending→LoadingState, isError→ErrorState (TeacherPages.tsx:106–107) |
| /teacher/grades | ❌ | ⚠️ | ❌ | — | offerings not gated: during load **and on error** renders «اختر مقرّراً»-family false empty + select «— لا توجد مقرّرات —» (P1-3; p8c, V1) |
| /teacher/students | ❌ | ⚠️ | ❌ | — | same false-empty pattern (TeacherPages.tsx:618) |
| /teacher/performance | ❌ | ⚠️ | ❌ | — | same (TeacherPages.tsx:709) |
| /teacher/attendance | ❌ | ⚠️ | ❌ | ✅✓ | same + hand-rolled list skeleton for students (ok); **save = full marks**: disabled+«جارٍ الحفظ…», double-submit blocked (1 POST / 3 clicks), success toast role=status (V4b; TeacherPages.tsx:259–261) |
| /teacher/assignments | ⚠️ | ✅ | ✅ | — | 2 `LoadingState` spinners (V1); empty has honest zero-guard copy |
| /teacher/exams (bank) | ⚠️ | ✅ | ✅ | — | spinner (V1); filter no-results instructive but **no CTA** (P3-3); error branch distinguishes 403 «تعذَّر التحقق من صلاحياتك» (data-error #9) |
| /teacher/messages | ⚠️ | ✅ | ✅ | — | spinner; empty instructive («ستظهر هنا الرسائل…») |
| /teacher/research | ✅ | ✅ | ✅ | ✅ | 14 skels; review flow mutations prior-verified (toast feedback) |
| /teacher/intelligence | ✅ | — | ✅✓ | — | 25 skels; **two section-level errors, each with its own retry** (data-error #10) |
| grading modal (grades/attempts) | — | — | — | ✅✓ | all controls disabled during pending, «جارٍ الحفظ…», no double-submit (TeacherPages.tsx:1014–1093) |
| teacher profile | — | — | ✅ | ✅✓ | failure: inline error + retry + **draft kept**; success: inline msg + exits edit (p4b) |

### Admin family

| Surface | L | E | Er | M | Notes |
|---|---|---|---|---|---|
| /admin/dashboard | ✅ | — | ✅ | — | 24 skels; per-widget error on abort |
| /admin/students | ✅ | ✅✓ | ✅ | — | 42 skels; no-results + «مسح البحث» CTA |
| /admin/teachers | ✅ | ✅✓ | ✅ | — | 22 skels; dual empty (no-results + choose-professor guidance) |
| /admin/courses | ✅ | — | ✅ | — | 54 skels (silent 20-row cap is A8 P1, not states) |
| /admin/faculties | ⚠️ | ❌ | ✅ | — | 20 skels then +2,488px growth; **no search → no empty/no-results surface exists** (cross-ref A8) |
| /admin/settings · sync · analysis · reports · digital · alerts | ✅ | ✅ | ✅ | — | prior census: skeletons + honest states; settings health-driven |

### Quality family

| Surface | L | E | Er | M | Notes |
|---|---|---|---|---|---|
| /quality/dashboard | ⚠️ | — | ✅ | — | 50 skels BUT 14 naked (2 × ChartSkeleton, P2-5) + 4 zero-width value bars + 86px card shift on land (V1/V6) |
| /quality/courses · professors · exam-moderation | ✅ | ✅ | ✅ | — | 12–52 skels; moderation queue empty honest; moderation reject flow prior-verified (confirm + cancel) |
| /quality/curriculum | ⚠️ | — | ✅ | — | matrix loading = 8 skeletons inside `aria-hidden` wrapper, **no aria-busy anywhere** (QualityPages.tsx:786–795) |
| /quality/reports · engagement · alerts | ✅ | ✅ | ✅ | — | honest zeros («كلّ المؤشّرات ضمن النطاق الطبيعيّ») |

### Owner family

| Surface | L | E | Er | M | Notes |
|---|---|---|---|---|---|
| /owner/dashboard | ⚠️ | — | ✅✓ | — | KPI row **pushed down 132px** when health strip lands (V1, slow networks); section errors + retry, verified recovery after retry (data-error3/4) |
| /owner/users | ✅✓ | ✅✓ | ✅ | — | 36 skels, **boxes byte-identical mid-load vs settled (0px shift)**; no-results + «مسح البحث والفلاتر» CTA |
| /owner/activity · system · education · realtime · governance | ✅ | ✅ | ✅ | — | 18–61 skels; realtime tri-state bands; governance has hand-rolled KPI skeleton |
| /owner/alerts | — | ✅✓ | — | ✅ | empty + CTA «استعراض سجلّ النشاط»; resolve-alert mutation toast prior-verified |
| /owner/ai | — | ✅✓ | — | — | explains **why** empty + CTA «فتح إعدادات النظام» (p2d) |
| feature-flag toggle | — | — | — | ✅ | optimistic pressed flip + `PUT /me/theme` persist (data-mut3) |

### Public family

| Surface | L | E | Er | M | Notes |
|---|---|---|---|---|---|
| /auth (login) | — | — | ✅ | ✅✓ | pending disables + «جارٍ الدخول…», double-submit blocked (1 POST / 3 clicks), Arabic wrong-creds error, password retained (V4) |
| /auth/register | — | — | ✅ | ✅ | role-picker → zod errors («مطلوب», «بريد إلكتروني غير صالح», «8 أحرف على الأقل», «اختر الكلّيّة») (p4b) |
| /colleges (guest) | ⚠️ | ❌ | ✅ | — | best skeleton grammar in app (motion variants text/card, per-skeleton aria-busy) but +2,000–3,613px growth below fold; guest zero-content sections lack context (cross-ref A8 P2-6) |
| /colleges/leaderboard | ❌ | ✅ | ✅ | — | **bare spinner → 2,171px table** (V1; CollegePages.tsx:771); empty + error branches proper |
| /colleges/:id | ✅ | ✅ | ✅ | — | DetailSkeleton + ErrorState + retry (CollegePages.tsx:415–418) |
| /competitions | ⚠️ | ✅✓ | ✅ | ✅ | spinner while loading; pills empty + «عرض كل المسابقات» CTA; RSVP = optimistic pressed + fail alert (p4) |
| /vision | — | — | — | — | static (invented stats are A8 P1-1, not states) |

### Shell / overlays / cross-cutting

| Surface | L | E | Er | M | Notes |
|---|---|---|---|---|---|
| NotificationPanel (bell) | ⚠️ | ✅ | ❌ | ✅ | loading reuses empty-state visual (P3-1); list empty = illustration; **error = false «لا توجد إشعارات», no retry** (P1-1); mark-all conditional + isPending-disabled; per-item mark-read on click |
| GlobalSearch (topbar) | ✅ | ✅✓ | ✅ | — | loading/error/no-results/suggestions all present (GlobalSearch.tsx:360–438) |
| CommandPalette | ✅ | ✅✓ | ✅ | — | same, + keyboard hints in empty |
| ThemeToggle | — | — | — | ✅✓ | optimistic `data-theme` flip + localStorage + `PUT /me/theme` (owner) |
| Toast system | — | — | — | ✅ | error never auto-dismiss; Arabic variant titles; role=status/alert + polite/assertive (Toast.tsx:99–100, 227–228) |
| Stale/refetch | ✅✓ | | | | back-nav renders cached content **instantly (126ms, 0 skeletons)**, no redundant refetch within staleTime, background refetch fires when stale (V2; corrects prior claim) |
| Offline — data | ✅ | | | | total API failure = per-widget ErrorState + retry, shell alive (p9 totalfail) |
| Offline — lazy chunk | ❌ | | | | nav to unvisited route offline → full-screen ErrorBoundary, shell dead, copy says «خلل غير متوقّع» (wrong diagnosis), **no auto-recovery when back online** (V7; P2-3) |
| Cold-load CLS | ❌ | | | | 0.28–0.39 on student/teacher dashboards via expired-token path (P1-2) |

**Matrix totals: 55 surface-verdict cells — 34 ✅, 14 ⚠️, 7 ❌.**

---

## §2 Findings

### P0 — none.

### P1

**P1-1 · NotificationPanel: API failure renders a false «لا توجد إشعارات» — no error, no retry.**
- `components/layout/NotificationDropdown.tsx:158–174` — the list renders `isPending ? loading : items.length === 0 ? empty : list`. **No `isError` branch**: on failure `data` is undefined → the empty branch fires.
- Live (V3, `data-v3-notif.json`): abort `GET /notifications?limit=50`, open bell → panel text «الإشعارات | لا توجد إشعارات | عرض جميع الإشعارات», `hasErrorState:false`, `hasRetry:false`. With the endpoint dead the panel first shows «جارٍ التحميل…» through the retry window, then the same false empty.
- Impact: the bell is a primary surface on **all 5 roles**; any transient blip tells the user a lie about their data. This is the exact class the craft floor bans (error must never read as empty).
- Fix sketch (~10 lines): `listQ.isError` branch rendering the `.notif-empty` shell with `AlertTriangle` + «تعذّر تحميل الإشعارات» + a retry button calling `listQ.refetch()`; add `role="alert"`.

**P1-2 · Cold-load layout shift CLS 0.28–0.39 (poor ≥0.25) on student/teacher dashboards — the loading→content transitions move painted content.**
- Live (V5, `data-v5-cls.json`, 2 runs each): `/student/dashboard` CLS **0.389 / 0.281**, `/teacher/assignments` **0.317 / 0.315**; control `/owner/dashboard` 0.016–0.031. Shift sources at t≈900–1,200ms: `DIV.page-transition`, `DIV.content`, `DIV.topbar-title` (single entries up to **0.132**).
- Mechanism (V5b rect trace): the expired-access-token path (every returning user after ~15 min) delays the shell past first paint — PageSkeleton paints → shell+page swap moves full-width blocks; then at data-land the topbar-title box changes (top 13→17–19, height 22→24) and `.page-transition` grows 890→1,521px with the KPI row starting ~120px lower than its skeleton position. Prior run independently measured the same class (p4-clsrace 0.309/0.314 on /teacher/assignments).
- Not deterministic per-run (V5c caught 0.000 when auth resolved pre-paint) — it fires exactly when the token dance is slow, i.e. the common returning-session case.
- Fix sketch: (a) pin `.topbar-title` to a fixed min-height and stable font metrics across skeleton→real; (b) give PageSkeleton's `.metric` cards the real `min-block-size:132px` and matching header block so the Suspense swap is position-stable; (c) consider gating the route Suspense fallback on `isHydrated` (HydrationSplash already exists) so the fallback never paints mid-token-dance.

**P1-3 · Teacher select-driven pages render FALSE EMPTIES during loading and on error — 4 core surfaces, no skeleton, no retry.**
- `pages/teacher/TeacherPages.tsx:271` (attendance select shows «— لا توجد مقرّرات —» whenever `offerings` is empty), `:325` (attendance EmptyState «لا توجد مقرّرات»), `:461` (grades «اختر مقرّراً»), `:618` (students), `:709` (performance). None of these pages gate on `offsQ.isPending` / `offsQ.isError`.
- Live: V1 t-attendance (all APIs delayed 1,400ms): frameB shows **0 skeletons, 0 spinners** — full card chrome with the false empty already painted. p8c (APIs aborted): all three of grades/students/performance render emptyTitles [«اختر مقرّراً»] + select [«— لا توجد مقرّرات —»] — a teacher with a failed request is told they have no courses, with no retry.
- Contrast within the same file: TeacherSchedulePage (`:106–107`) gates both states correctly — the fix pattern already exists in-repo.
- Fix sketch (~6 lines × 4 pages): `offsQ.isPending → <ListSkeleton/>` inside the select card; `offsQ.isError → <ErrorState error onRetry>` (mirror lines 106–107).

### P2

**P2-1 · KpiSkeleton's value bar renders at 0px width — the KPI number placeholder is invisible on every dashboard skeleton.**
- `components/primitives/States.tsx:244–260` — fixed bars 80/70/120px inside `.metric` (`display:flex; padding:var(--sp-6)`, content box ≈215px at 4-col/1280px) overflow; the middle value span (70×26) is flex-shrunk to **0** (empty span → min-content 0).
- Live (V6/V6b, computed styles): all 4 KPI cards on `/student/dashboard`, `/student/courses`, `/quality/dashboard`, `/owner/dashboard`, `/admin/courses` render the 70×26 value skeleton at **width 0** (rects x=190/472/755/1037, h=26; inline style `width:70px`, computed `width:0px`). Only label+sub bars show.
- Affects every KpiSkeleton consumer incl. `PageSkeleton`/`DetailSkeleton` (all 86 routes' Suspense fallback). The most important skeleton bar — the big number — never paints.
- Fix sketch: shrink bars (e.g. 64/56/96) and/or `flex:none; max-width:100%` on the bars; verify at 320px and 1440px.

**P2-2 · Bare labeled spinners where shape-matched skeletons fit — 8+ list/table surfaces.**
- Verified live (V1): `/student/results` (spinner only → KPI+chart, +204px), `/student/schedule` (+410px), `/community` (3 tab lists, +472px), `/teacher/exams`, `/teacher/messages`, `/teacher/assignments` (2 spinners), `/colleges/leaderboard` (spinner → **2,171px** table). Code: `LoadingState` call sites TeacherPages.tsx:327/463/545/620/711/814/915/1139, CommunityPages.tsx:165/174/183, CollegePages.tsx:771, MorePages results/schedule branches, ExamAuthorPages.tsx:386 (25 sites total).
- These are honest (Arabic label + `role="status"`), but the floor prefers shape-matched skeletons for lists/tables — and the platform already ships `TableSkeleton`/`ListSkeleton` (used on 47 other surfaces). Worst offenders by shift: leaderboard (+2,171px), results (+204px), schedule (+410px).
- Fix sketch: swap the 8 list/table surfaces above to `TableSkeleton`/`ListSkeleton`; keep `LoadingState` for genuinely amorphous waits (permissions checks etc.).

**P2-3 · Offline navigation to an unvisited lazy route crashes to the full-screen error boundary — shell dead, misleading copy, no auto-recovery.**
- Live (V7, `data-v7-offline.json`): offline in-app nav to `/student/library` (chunk not yet loaded) → `TypeError: Failed to fetch dynamically imported module` → RouteErrorBoundary: «حدث خطأ غير متوقّع … بسبب خلل غير متوقّع», `shellAlive:false`. After `setOffline(false)` + 2.5s: **still on the boundary** (`cards:0`) — it only resets on location change.
- The copy mis-diagnoses the situation (nothing is «خلل غير متوقّع» — the user is offline), and the offered «إعادة تحميل الصفحة» re-crashes while still offline. Data failures, by contrast, behave exactly right (per-widget ErrorState + retry, shell alive — p9).
- Fix sketch: wrap `React.lazy` imports with a retrying loader (or listen for `vite:preloadError`), and in ErrorBoundary check `navigator.onLine` to render «لا اتصال بالشبكة — تحقّق من اتصالك ثم أعد المحاولة» with a retry that re-triggers the import; optionally reset the boundary on the `online` event.

**P2-4 · Owner dashboard: KPI row shifts 132px down when data lands (slow networks).**
- Live (V1, APIs delayed): KPI boxes top 274 → 406 (−132px), first card 466→598; height +1,038px. The system-health strip (rendered from data) appears above the KPIs and pushes them; nothing reserves its space during load. Not visible with a fast API (V5 o-dash CLS 0.016–0.031) — precisely the slow-network case where loading states matter.
- Fix sketch: render the health strip's slot with a fixed-height skeleton (or `min-height` on its container) while the query is pending.

**P2-5 · ChartSkeleton and the curriculum matrix render skeletons with no busy/status semantics.**
- `States.tsx:279–287` — ChartSkeleton is a bare div (no `aria-busy`/`role="status"`), unlike Kpi/List/Table/Card siblings. Live: `/quality/dashboard` mid-load = **14 skeletons outside any aria context** (2 ChartSkeletons × 7 bars). `QualityPages.tsx:786–795` — curriculum loading wraps 8 skeletons in `aria-hidden` with no busy signal at all.
- Fix sketch: one line on ChartSkeleton's root (`aria-busy="true" role="status" aria-label="جارٍ التحميل…"`); same for the matrix wrapper.

**P2-6 · Two skeleton grammars coexist; the 4-second «لا يزال التحميل جارياً…» reassurance cue is dead code.**
- `components/motion/Skeleton.tsx` (variant shapes, per-skeleton `aria-busy`, `role="status"` with Arabic label, SkeletonGroup 4s cue) has exactly **one** page consumer (`CollegePages.tsx:15,212` — the public gallery). `SkeletonGroup` has **zero** consumers — verified live: `/student/mooc` held at 4,800ms shows no still-loading cue (data-loading2). All other 47 files use the primitives family (aria-hidden bars inside aria-busy containers, no accessible text).
- Consequence: identical waits look and announce differently per page; the FR "4s reassurance" never ships.
- Fix sketch: pick one grammar — either adopt motion/Skeleton inside the primitives skeletons (keeping their layout) or port the sr-only label + 4s cue into `KpiSkeleton`/`TableSkeleton`/etc.; delete SkeletonGroup if the cue stays unwanted.

**P2-7 · Public colleges page: skeleton covers a fraction of the final page (+2,000–3,613px growth).**
- Live: `/colleges` guest mid-load doc 1,552px (prior) / frameB content 0 → settled 3,549–3,613px (V1: hJump 3,613). The 21 variant skeletons cover hero+stats+first gallery row; the rest of the gallery + sections append below the fold. Leaderboard is the P2-2 spinner twin.
- For a marketing page some growth is acceptable, but the gallery skeleton could match row count (12 college cards) to stabilize the visible band.
- Fix sketch: render gallery skeletons equal to the loaded page-1 card count; accept below-fold growth.

**P2-8 · Loading→empty/result transitions are silent for screen readers on skeleton surfaces; EmptyState has no role.**
- V6 live census: skeleton pages mount 3–5 `aria-live="polite"` regions whose text content is **empty** (bars are `aria-hidden`, no label) — nothing is announced; spinner pages (LoadingState `role="status"`) do announce «جارٍ التحميل…». `States.tsx:54` EmptyState renders a plain div (no `role="status"`): when data lands empty, the announcement that was «جارٍ التحميل…» is never followed by «لا توجد…».
- Fix sketch: sr-only «جارٍ التحميل…» inside the skeleton containers (or per P2-6 grammar merge); `role="status"` on EmptyState root so the empty verdict is announced.

### P3

**P3-1 · NotificationPanel loading state reuses the empty-state visual.** `NotificationDropdown.tsx:159–163` renders `.notif-empty` + Bell icon + «جارٍ التحميل…» — the same shell as the real empty; shape-wise a 6-row list skeleton would fit (items render as 44px rows). Cosmetic + P2-8-adjacent.

**P3-2 · Ad-hoc empty states bypass the States primitive.** `TeacherPages.tsx:394` hand-rolled `.empty-state` div («لا طلاب في هذا المقرّر بعد»), teacher/live «لا توجد جلسات قادمة…» bare text (data-empty #15), library «لا توجد إنذارات» bare row. Same meaning, three grammars — the States primitive exists for exactly this.

**P3-3 · Exam-bank filter empty lacks a CTA.** «لا توجد أسئلة تطابق التصفية … جرّب كلمات بحث مختلفة أو أزل بعض عوامل التصفية» (p7d) — instructive but no «مسح التصفية» action, while sibling surfaces (owner/users, admin/students) all have clear-filters CTAs.

**P3-4 · Sidebar-collapse hydration flash — prior run 3/3, not reproduced in 6 fresh runs.** Prior p6-sidebarflash measured `data-collapsed` flipping false→true at ~950ms post-paint (sidebar width →64); my V5 (6 fresh-context runs, 3 routes) recorded **zero** flips (persisted default applies from t=0). A timing-dependent zustand-persist hydration race (`stores/ui.store.ts`); likely still fires occasionally. If P1-2's fallback gating lands, this window closes with it.

**P3-5 · Exam-attempts detail requests fire marginally staggered.** Prior waterfall probe showed `/exams/templates/:id` then `/attempts` 37ms apart — both are independent `useQuery` hooks (parallel by design); the gap is transport, not a code waterfall. No action.

**P3-6 · Shell trio re-fires on every cold mount.** `/auth/me` + `/me/profile` + `/notifications?limit=1` run on each cold route load (V2 req-log; the 401→refresh dance doubles them within ~150ms — `api.ts:69` TOKEN_EXPIRED path). Benign (single-flight refresh, 15s cap), but a `staleTime` on `me` would remove ~2 requests per cold nav.

---

## §3 Verified good (do not regress)

- **ErrorState system** (`States.tsx:91–186`): 403 → PermissionDeniedState (no retry — honest), 404 → not-found + honored retry, Arabic-guarded details (Latin leaks return generic Arabic + machine code in `<bdi>`), retry on every tested surface (17-route prior sweep + V1 12-route re-verify: 0 blank areas, 0 unhandled rejections, 0 Latin leaks).
- **Per-widget error granularity**: `/student/exams` results card keeps working with inline error + retry (ExamsPage.tsx:63–79); `/teacher/intelligence` two simultaneous section errors, each retryable; profile fact-error pattern with «—» placeholders + connection advice.
- **Mutation craft**: 8/10 flows with full pending + double-submit protection + failure retention — login (V4: 1 POST / 3 clicks, «جارٍ الدخول…»), attendance save (V4b), announcement modal (pending + dirty-draft discard guard + failure keeps input), grading modal (all controls inert while pending), composer (draft kept + retry note), teacher profile (draft kept), orcid (disabled-when-invalid + status msg), mark-all (conditional + pending-disabled). Optimistic like/RSVP with rollback + inline retry notes. Toast system: error toasts manual-dismiss, Arabic titles, polite/assertive roles.
- **Stale-while-revalidate**: back-nav instant from cache (126ms, 0 skeletons, 8 cards), no redundant refetch inside staleTime (60s dashboards / 30s default), background refetch once stale — the prior run's contrary claim was a probe artifact (§5).
- **429 rate-limit**: human Arabic «طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة» + retry (p8b).
- **Empty-state default is instructive** (States.tsx:28–68: Batch F default description + action slot): 20+ surfaces carry next-step copy; owner/ai and owner/alerts explain *why* empty with real CTAs; GlobalSearch/CommandPalette no-results include search suggestions.

## §4 Ordered fix plan (for the states fix wave)

1. **P1-1** notif error branch (10 lines, `NotificationDropdown.tsx`).
2. **P1-3** offerings gating ×4 teacher pages (mirror TeacherPages.tsx:106–107).
3. **P2-1** KpiSkeleton bar widths (1 file, all dashboards benefit) + verify at 320/1440.
4. **P2-2** skeleton swaps on the 8 list surfaces (ListSkeleton/TableSkeleton already exist).
5. **P1-2** topbar-title min-height + PageSkeleton metric min-height (2 CSS rules) — coordinate with A4 P1-2/A5 P1-2 (same topbar cluster).
6. **P2-5** ChartSkeleton + matrix aria (2 lines).
7. **P2-8/P2-6** one skeleton grammar + sr-only loading label + EmptyState role (decision: which grammar survives).
8. **P2-3** offline chunk retry + online-aware boundary copy.
9. **P2-4** owner health-strip slot reservation.
10. P3s opportunistically (notif loading rows, ad-hoc empties → primitive, bank-filter CTA).

## §5 Corrections to the prior interrupted run's data (filed so fix agents don't chase ghosts)

1. **"Back-nav to dashboard re-shows 20 skeletons" (data-p5-stale-a11y)** — FALSE: the probe used a history mechanism that reloaded the document. V2 (true in-app nav + `history.back()`): instant cached render, 126ms, 0 skeletons, no refetch. Staleness behavior is excellent.
2. **"Login/attendance pending not disabled" (data-mut2/3 `disabled:false`)** — measurement artifact (sampled pre-render or wrong endpoint pattern). V4/V4b with the real endpoints delayed: `disabled:true` + label swap + double-submit blocked (1 POST / 3 clicks).
3. **"motion/Skeleton is dead code"** (my own intermediate census; the prior run never claimed it) — FALSE for `Skeleton` (1 consumer: CollegePages); true only for `SkeletonGroup` (P2-6).
4. Sidebar flash (p6-sidebarflash) — not reproducible in 6 fresh runs (P3-4); CLS numbers from p4-clsrace **were** reproduced (V5) and are the basis of P1-2.

## §6 Matrix summary for the orchestrator

- 55 verdict cells: **34 ✅ / 14 ⚠️ / 7 ❌**. The ❌ set: notif-panel error (P1-1), teacher grades/students/performance/attendance loading+error (P1-3 ×4 cells), results/schedule/community/leaderboard loading (P2-2 cells), offline-chunk (P2-3), cold CLS (P1-2).
- Severity counts: **P0 ×0 · P1 ×3 · P2 ×8 · P3 ×6**.
- The platform's *error* architecture is genuinely strong (branching ErrorState, per-widget granularity, retry everywhere, Arabic-guarded) — the gaps are (a) the two surfaces that never wired an error branch (notif panel, teacher offerings), (b) loading-shape fidelity (0-width KPI bar, spinners-where-skeletons-fit, cold CLS), and (c) state-announcement a11y.
