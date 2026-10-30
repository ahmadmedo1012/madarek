# 4-A8 — Admin · Quality · Public College/Vision Surfaces Audit (سيادة المظهر · Campaign 4, Wave 19)

**Agent:** 4-A8 · **Scope:** `pages/admin/{AdminPages,AdminGovernancePages,AdminExtraPages,AdminSyncPage}.tsx`, `pages/quality/QualityPages.tsx` (+ `/quality/exam-moderation` → `pages/exams/OnlineExamsPages.tsx:829-1005`, `/quality/community` + `/admin/alerts` shared mounts), `pages/colleges/CollegePages.tsx`, `pages/vision/VisionPages.tsx`, `styles/colleges.css` (+ the `components.css`/`polish.css` blocks the pages render through).
**Routes:** admin ×10 (+permissions/:id, digital click-throughs) · quality ×7 · public ×4 (colleges, leaderboard, :id, vision + vision article).

**Method:** 39 own screenshots (`/tmp/madarek-shots/a8-*`, desktop 1440×900 fullPage · mobile 390×844@2x · dark 1280×900; storage-state auth, instant scroll + 350/450ms settle), 8 interaction/DOM-measurement probes (search/filter/pagination, moderation review panel, vision notify CTA network trace, in-page contrast-ratio math both themes, mobile table-stacking measurement, permissions click-through + tab order, API-abort error paths), 10 VLM critique batches (30 images) with every claim re-measured — **~60% of VLM claims disproven** (documented inline: dark "invisible gray" 5.58:1 ✗, "ragged grid" equal-per-row ✗, fabricated settings typo list ✗, Latin-numerals claim = correct ar-LY locale ✗). Audit-only — zero source edits, zero git ops.
⚠️ 8 stale `a8-*` shots (`a8-admin-community`, `a8-college-detail-admin/guest`, `a8-colleges-guest`, `a8-leaderboard-admin/guest`, `a8-quality-alerts/reports`, `a8-vision-admin`, `a8-vision-detail-admin`) are from a dead earlier A8 attempt; not cited.

**Sibling cross-refs (not duplicated):** A14 P1 guest-401 leaderboard/college-detail + P2-1 generic titles («الإشعارات» on /admin/alerts) + P2-3 no back-link on CollegeDetail; A10 P1 15px inputs→iOS zoom (`admin-students-input` 36px/sm, cross-ref) + P2 sub-44 targets (gallery chips 36px); A12 dark elevation languages, `--focus-ring` dual spelling (colleges.css ×3), raw-px sizes (colleges.css 48/56px), DB `avatarColor` text-shadow axe noise; A2 mobile drawer/footer; A13 onboarding-modal shot interception; A5 community-page internals; A9 ConfirmDialog primitive; A7 P1-5 owner-table no-collapse (the P1-1 below is the same class on quality pages).

## Scores per surface

| Surface | Route | Score /10 | One-line verdict |
|---|---|---|---|
| Admin dashboard | /admin/dashboard | **7.5** | Real KPIs, a11y'd charts (ChartFrame tables), honest empties; thin seed makes the bar/line charts read as placeholders. |
| Admin students | /admin/students | **7.0** | Search+filter+pagination+shape-matched skeleton all wired; empty-search state forgets the reset affordance its teachers twin has. |
| Admin teachers | /admin/teachers | **7.5** | Best-in-scope master–detail: server-side search/pagination, verify flow, identity-keyed draft forms. |
| Admin permissions | /admin/permissions/:id | **8.5** | State-tinted capability cards, one-shot confirm pulse, inline retry, back-link first in tab order — reference page. |
| Admin faculties | /admin/faculties | **7.0** | Dense but scannable faculty+dept cards; `font-mono` wrongly wraps Arabic counted phrases. |
| Admin courses | /admin/courses | **7.5** | aria-pressed filter pills, tbl-stack table, empty state with reset action. |
| Admin analysis | /admin/analysis | **6.5** | Third re-arrangement of the same /admin/reports bundle — adds a trend table the reports page already charts. |
| Admin reports | /admin/reports | **7.0** | Hand-rolled trend bars + legend + top-courses table; overlaps dashboard & analysis. |
| Admin settings | /admin/settings | **6.0** | Honest "قيد التطوير" copy, but hardcoded «متصلة/آمنة» pills and a wrong DB vendor label are static claims. |
| Admin alerts | /admin/alerts | **7.0** | Shared AlertsPage — states discipline solid; generic title (A14 cross-ref). |
| Admin sync | /admin/sync | **7.5** | Full run-state machine (running/success/partial/failed), inline trigger retry, category accordion; «0.0 ث» + raw `static-markdown` slug. |
| Admin digital | /admin/digital | **8.0** | Live metrics, stagger rows, no dead ends. |
| Quality dashboard | /quality/dashboard | **8.0** | CountIn KPIs, estimated-curve honesty flag, «وصول قراءة فقط» badge; alerts card error path has no retry. |
| Quality courses | /quality/courses | **6.0** | 7-col table with **no mobile collapse** (P1) + invented «الجودة %» score paints zero-content offerings danger-red. |
| Quality professors | /quality/professors | **6.5** | 8-col roster, compliance bar+badge good; same no-collapse P1 (524px sideways at 390). |
| Quality engagement | /quality/engagement | **7.5** | Honest KPIs (NaN-guarded), chart + progress bars, page chrome held in every state. |
| Quality curriculum | /quality/curriculum | **8.0** | One heatmap language (matrix cells), dim-not-hide filtering, legend + counted pills. |
| Quality exam-moderation | /quality/exam-moderation | **7.5** | Honest KPIs (…/—), note panel, per-row error retry; **reject is one click with no confirm**. |
| Quality community | /quality/community | **7.0** | Shared CommunityPage (A5 owns internals); fine as a quality mount. |
| Colleges gallery | /colleges | **7.5** | URL-state filters, live region, gallery skeleton, 1px accent stripes; **active chip count fails AA (4.22:1)**. |
| Colleges leaderboard | /colleges/leaderboard | **6.0** | 720px-min table sideways-scrolls 398px at 390; emoji medals; medals+bold on all-zero ties; guest 401 (A14). |
| College detail | /colleges/:id | **7.0** | Rich, per-card empty states, gated accent; **eyebrow letter-spacing breaks Arabic cursive joins**; no back-link (A14). |
| Vision gallery | /vision | **8.0** | Clean status-grouped cards, count-from-data headline. |
| Vision article | /vision/:slug | **7.5** | Good hero/metrics/steps; **notify CTA promises an email no code can send**. |

**Audit Health (impeccable rubric, scope-wide):** A11y **3** (one AA fail on a default-active public control; aria-pressed/expanded/aria-live used well) · Performance **3** (lazy routes, placeholderData keeps rosters, chart themeKey remounts) · Responsive **2** (two quality rosters + leaderboard have no mobile collapse) · Theming **4** (token-clean, dark verified live, charts re-resolve on flip) · Integrity **3** (fake notify promise, static settings claims, invented quality score) → **15/20 (Good — address weak dimensions: responsive + integrity).**

**RTL/bidi verdict:** No P0 RTL leakage in scope. Every Latin run is `<bdi>`-wrapped or `dir`-scoped (emails, course codes, terms `2024-2025`, sources, MOOC, capability keys, zu.edu.ly). One typography-adjacent RTL defect: letter-spacing on an Arabic eyebrow (P2-3). Tables/`admin-table-num` use logical properties; pagination chevrons RTL-correct (السابق→ChevronRight).

**Counts: P0 ×0 · P1 ×2 · P2 ×6 · P3 ×9.**

---

## P1 — Major (fix before release)

### P1-1 · Quality rosters have no mobile collapse — 7/8-column tables sideways-scroll at 390px
- **Where:** `frontend/src/pages/quality/QualityPages.tsx:470` (courses: `<table className="table">`) and `:549` (professors: `<table className="table">`) — neither carries `tbl-stack`, unlike every admin table in scope (`AdminExtraPages.tsx:137`, `AdminPages.tsx:427/536`, `AdminSyncPage.tsx:253`).
- **Evidence:** 390px probe: `/quality/courses` wrap scrolls **202px** horizontally (7 cols, 0 `data-label` cells); `/quality/professors` wrap scrolls **524px** (8 cols — more than a full extra screenful), rows wrap to **130px** tall with the avatar cell buckling. Admin students at the same width stacks to labeled cards (`tbl-stack: true`, 7/7 `data-label`s, 0px document overflow). Same defect class as A7 P1-5 (owner tables) — the house pattern exists and these two pages predate/skipped it.
- **Impact:** the quality office's two core rosters are the worst mobile reads in the authed app; column meaning is invisible while swiping (no per-cell labels).
- **Fix sketch:** wrap both in `div.table-wrap > table.table.tbl-stack` and add `data-label` per cell (copy the `OwnerUsersPage.tsx:323-334` reference implementation); for professors, consider collapsing «الملفات المرفوعة» into the meta line under 640px.

### P1-2 · Active campus-chip count fails WCAG AA on the public gallery (default state, both themes)
- **Where:** `frontend/src/styles/colleges.css:498-502` (`.gallery-chip-count { color: var(--text-muted) }`) with no on-state override against `colleges.css:491-496` (`.gallery-chip-on { background: var(--accent-soft) }`).
- **Evidence:** measured live: count «25» inside the default-active «الكل» chip = **4.22:1** (light, #6E6C65 on #F4E4D2, 12px) / **≈4.47:1** (dark, rgb(154,150,138) on rgb(61,45,27)) — below 4.5:1 body-text floor; the app's own axe run flags it on every /colleges load («insufficient color contrast of 4.22 … font size 9.0pt»). Chip label itself passes (10.29:1, A12).
- **Impact:** AA violation on a primary public filter control in its *default* state, in both themes.
- **Fix sketch:** `.gallery-chip-on .gallery-chip-count, .gallery-chip[aria-selected="true"] .gallery-chip-count { color: color-mix(in srgb, var(--accent-strong) 70%, var(--text)); }` (one rule; keep tabular-nums).

---

## P2 — Minor (fix in next pass)

### P2-1 · College hero eyebrow: letter-spacing breaks Arabic cursive joins (and violates the platform's own eyebrow ban)
- **Where:** `frontend/src/styles/colleges.css:653-659` (`.college-hero-eyebrow { letter-spacing: 0.05em; text-transform: uppercase }`) rendering Arabic «جامعة الزاوية · {city}» (`CollegePages.tsx:483`).
- **Evidence:** computed letter-spacing 0.05em on connected Arabic script (كسر وصل الحروف); `text-transform` is a Latin-only concept. The codebase already ruled this out: `VisionPages.tsx:18-19` — «The eyebrow/kicker is removed per ruling #2 (app-internal page) — its letter-spacing also broke Arabic cursive joins.» Craft-floor bans eyebrows outright.
- **Fix sketch:** delete the eyebrow (ruling #2) or, if kept as a campus line, drop `letter-spacing`/`text-transform` and set `color: var(--text-muted)`.

### P2-2 · Vision «نبّهني عند الإطلاق» CTA promises an email that no code sends
- **Where:** `frontend/src/pages/vision/VisionPages.tsx:268-276` (local `useState` toggle only).
- **Evidence:** interaction probe with network capture: click «تفعيل التنبيه» → **0 API calls**; reload → state resets to «تفعيل التنبيه». Yet the card asserts «سنُعلمك على بريدك الجامعي فور توفّر النسخة التجريبية» — an unsatisfiable claim on a public page (craft-floor: claims come from supplied truth).
- **Fix sketch:** wire a real subscription endpoint (or reuse the notifications system), or replace with an honest passive state («قيد التطوير — تابع صفحة الرؤية») that doesn't claim an action.

### P2-3 · Exam-moderation «رفض» is a single unconfirmed click that removes the template from the queue
- **Where:** `frontend/src/pages/exams/OnlineExamsPages.tsx:943-952` (reject button calls `runModeration(item.id, false)` directly).
- **Evidence:** probe: panel opens, «رفض» fires the mutation immediately; the moderated item leaves the queue (`/quality/exam-moderation` KPI drops 1→0) with no undo. The platform owns a ConfirmDialog primitive (A9) used for lesser destructive actions elsewhere; the optional note textarea is easy to bypass.
- **Fix sketch:** confirm dialog on reject (approve may stay instant), or an undo-toast window after the decision; keep the inline per-row error retry as is.

### P2-4 · «الجودة %» is an invented composite that paints empty courses danger-red
- **Where:** `frontend/src/pages/quality/QualityPages.tsx:484-485` — `score = min(100, lectures×20 + materials×5 + assignments×10)`; `color = score ≥ 80 ? 'green' : score ≥ 50 ? 'amber' : 'red'`.
- **Evidence:** live page: rows with zero content render **red «0%» badges** — the danger register is spent on «no data yet», so a genuinely weak course is indistinguishable from an empty one; the weights (20/5/10) are arbitrary and the column is labeled «الجودة» as if it were a measured metric.
- **Fix sketch:** for score 0 render a neutral badge («لا محتوى بعد») or an em-dash; rename the column «اكتمال المحتوى» and surface the weights in the header tooltip (mirrors the curriculum page's honest completion language at QualityPages.tsx:722-732).

### P2-5 · Leaderboard table is min-width 720px — 398px of sideways scroll on a phone
- **Where:** `frontend/src/pages/colleges/CollegePages.tsx:753` + `frontend/src/styles/colleges.css:1144-1148` (`.leaderboard-table { min-width: 720px }`).
- **Evidence:** 390px probe (authed): wrap scrolls **398px**, 25 rows; guest at the same width hits the A14 P1 401 error instead.
- **Fix sketch:** rank + totalXp + one hero metric visible at ≤640px with the remaining metrics stacked under the college cell (the leaderboard-card pattern), or `tbl-stack`.

### P2-6 · Admin settings: hardcoded status pills and a wrong DB vendor label
- **Where:** `frontend/src/pages/admin/AdminExtraPages.tsx:475` (`<span className="pill on">متصلة</span>`), `:482` («آمنة»), `:473` («Postgres (Neon Serverless)»).
- **Evidence:** code-only values — no endpoint backs them; the running deployment is local Postgres 16 on :5433, so the vendor line is factually wrong here; the «متصلة/آمنة» pills are unfalsifiable decoration next to honest «قيد التطوير» copy.
- **Fix sketch:** drive from a lightweight health endpoint (the sync page already models status honesty), or drop the two pills and the vendor string and keep the factual rows (token TTL, rate limits).

---

## P3 — Polish

### P3-1 · Leaderboard medals are raw emoji, not the icon system
- **Where:** `frontend/src/pages/colleges/CollegePages.tsx:720-725` (`rankMedal` → 🥇🥈🥉) + `colleges.css:1226-1228` (`.leaderboard-medal { font-size: 14px }`).
- **Evidence:** craft-floor bans emoji standing in for an icon system; the platform's own language is lucide (Trophy/Medal are already imported on this page) with EmojiIcon reserved for *data* emojis. 14px emoji also renders differently per-OS.
- **Fix sketch:** lucide `Medal` at 14px tinted gold/silver/bronze, keep `aria-label="الترتيب N"`.

### P3-2 · Rank-1 bold + medal land on all-zero ties
- **Where:** `frontend/src/pages/colleges/CollegePages.tsx:768-795` (sort by totalXp; every `c.ranks[m.key] ≤ 3` gets a medal; `.leaderboard-cell.rank-1 .leaderboard-value` bold via `colleges.css:1218-1222`).
- **Evidence:** seeded data: most metric columns are all-zero → several colleges tie at rank 1 and display 🥇 next to «0» — a "winner" of nothing (VLM: «صحراء الأصفار», verified against live cells).
- **Fix sketch:** suppress rank styling/medal when the column's max value is 0; optionally mute zero columns.

### P3-3 · `font-mono` wraps Arabic counted phrases and faculty names
- **Where:** `frontend/src/pages/admin/AdminPages.tsx:228` (`admin-stat-value` font-mono on «أكبر كلّيّة» value — a full Arabic name), `:300-303` (font-mono on «قسم واحد / مقرّران / طالبان…»).
- **Evidence:** IBM Plex Mono carries no Arabic → digits render mono, the Arabic words silently fall back to the sans face — mixed texture inside one meta line; mono-as-costume per craft-floor. Elsewhere the platform reserves `font-mono` for codes/emails/numbers.
- **Fix sketch:** drop `font-mono` from Arabic phrase spans; keep it on pure-numeric values (already tabular-nums via tokens).

### P3-4 · Admin students: empty-search state has no reset affordance (its teachers twin has one)
- **Where:** `frontend/src/pages/admin/AdminExtraPages.tsx:151` (EmptyState without `action`) vs `AdminGovernancePages.tsx:312-317` (teachers: «مسح البحث»).
- **Evidence:** probe: search «zzzzqqqq» → «لا توجد نتائج» with **0** buttons; the user must manually clear the input.
- **Fix sketch:** add `action={<button …>مسح البحث</button>}` mirroring the teachers page.

### P3-5 · Quality dashboard: alerts card error path tells the user to reload instead of retrying
- **Where:** `frontend/src/pages/quality/QualityPages.tsx:411-416`.
- **Evidence:** API-abort probe: card renders «تعذّر تحميل التنبيهات · حدّث الصفحة أو راجع صفحة تنبيهات الجودة» — no in-place retry, no link (cross-ref A14 P2-4 error-as-empty family).
- **Fix sketch:** `onRetry={al.refetch}` + a `/quality/alerts` link in the same EmptyState.

### P3-6 · Moderation panel: Escape doesn't close, open isn't announced
- **Where:** `frontend/src/pages/exams/OnlineExamsPages.tsx:908-917`.
- **Evidence:** probe: Esc after opening → panel stays; `aria-expanded` is present (good) but no `aria-controls`/region announcement for the disclosure.
- **Fix sketch:** Esc handler + focus return; `aria-controls` + `role="region"`.

### P3-7 · Sync page formats: «0.0 ث» durations and a raw `static-markdown` source slug
- **Where:** `frontend/src/pages/admin/AdminSyncPage.tsx:213` (`(durationMs/1000).toFixed(1)`), `:220/278-280` (source shown verbatim).
- **Evidence:** live: KPI change «0.0 ث», run-history rows «…static-markdown 0 0 0.0 ث» — sub-second precision reads as broken data, and the Latin slug sits un-mapped in the Arabic KPI line (the page already maps categories via `CATEGORY_LABEL`).
- **Fix sketch:** `<0.1 ث` under a second (or integer «أقل من ثانية»); add `SOURCE_LABEL` beside `CATEGORY_LABEL`.

### P3-8 · Admin analysis is the third arrangement of the same reports bundle
- **Where:** `frontend/src/pages/admin/AdminExtraPages.tsx:366-424` (analysis) vs `AdminPages.tsx:169-219` (dashboard «نشاط الإنتاج العلميّ») vs `AdminPages.tsx:371-415` (reports «حركة البحوث») — all three consume `GET /admin/reports` (headline + paperTrend + topCourses).
- **Evidence:** identical KPI cards re-labeled (إجمالي الأوراق/البحوث…) and the same trend series as table vs bars vs line; owner console filed its analogue as a P1 (A7 «edu chart dupes»).
- **Fix sketch:** differentiate analysis (per-faculty / per-teacher drill-down needs a new endpoint) or fold it into reports as a view toggle.

### P3-9 · KPI rows stack 1-column at 390px — four full-width cards before any content
- **Where:** shared `.grid-4` responsive rules (components.css) as consumed by admin/quality dashboards.
- **Evidence:** 390px probe (admin dashboard): `cols: 1`, four 340px cards stacked; quality dashboard same (VLM: «vertical stacking fatigue», confirmed by grid measurement).
- **Fix sketch:** 2×2 at ≤480px for metric-only rows (A10 owns the cross-cut; filed here as the dashboards' composition note).

---

## VLM claims disproven (measurement wins — do not action)
- «Dark college-card stats gray-600 invisible» → measured **5.58:1** (label) / **13.78:1** (value) — passes.
- «Ragged card grid / unequal heights» → per-row heights equal (223×4, 260×2) — grid stretch works.
- «Latin numerals break Arabic UI» → ar-LY locale uses Western digits by design.
- «Settings has typos: منصة التعلم الإلكتروني / الإعدادات الفنية / نوع قاعدة البيانات» → no such strings exist in `AdminSettingsPage.tsx` (fabricated).
- «Teachers page empty state / طلب الانضمام KPI» → page has 1 teacher + «نظام التوثيق» KPI; misread of the profile-pane placeholder.
- «Charts have no grid» → `madarekFadingAxisPlugin` fades gridlines at edges (chartTheme.ts:341).
- «Revoke/منح buttons look identical» → `btn primary` vs `btn ghost` (code + screenshot).
- «Mobile college-card stat chips < 44px touch targets» → chips aren't interactive; the whole card is the target.
- «Sync claims daily but is manual-only» → backend `scheduler.ts` runs zu-sync every 24h — claim is true.

## Positive findings (replicate)
- **Permissions editor** (`AdminGovernancePages.tsx:861-1036`): state-tinted capability cards, one-shot confirm pulse, inline retry of the *last attempt*, scope card keyed by user id, back-link first in tab order — the authed-app reference page.
- **State honesty discipline**: KPIs degrade to «…»/«—» (never fake zeros) on teachers/moderation; sync distinguishes error vs never-run; curriculum pills disable at count 0; sync subtitle's daily claim is backend-true.
- **Colleges gallery plumbing**: URL-synced filters (`useUrlQueryState`), polite live region («5 نتائج»), gallery-shaped skeleton, no-result state with reset, 1px accent stripes per orchestrator ruling #4.
- **Chart accessibility**: every chart ships a `ChartFrame` sr-only data table + summary; canvases remount on theme flip (`useChartThemeKey`).
- **Arabic copy**: counted plurals everywhere (`countAr`), role/rank/degree enums fully mapped to Arabic — no raw enum leakage in scope (the A7 owner bug did not recur here).

## Top-10 quick wins
1. **[P1-1]** Add `tbl-stack` + `data-label`s to the two quality tables (~45min, copy OwnerUsersPage pattern).
2. **[P1-2]** One CSS rule: on-state color for `.gallery-chip-count` (5min).
3. **[P2-1]** Delete eyebrow letter-spacing/uppercase on `.college-hero-eyebrow` (5min).
4. **[P2-3]** Confirm dialog on moderation «رفض» (30min, ConfirmDialog exists).
5. **[P2-4]** Neutral badge for quality-score 0 + rename column «اكتمال المحتوى» (20min).
6. **[P2-2]** Make the vision notify CTA honest — wire it or reword (30min).
7. **[P2-6]** Drop or health-drive the settings status pills + fix DB vendor line (20min).
8. **[P3-1/2]** lucide medals + suppress rank styling on all-zero columns (30min).
9. **[P3-4]** «مسح البحث» action in admin-students empty state (10min).
10. **[P3-7]** Sync duration «<0.1 ث» + `SOURCE_LABEL` map (15min).

## Files to touch
- `frontend/src/pages/quality/QualityPages.tsx` — P1-1, P2-4, P3-5
- `frontend/src/styles/colleges.css` — P1-2, P2-1, P2-5 (leaderboard min-width), P3-1 (medal style)
- `frontend/src/pages/colleges/CollegePages.tsx` — P2-5, P3-1, P3-2
- `frontend/src/pages/vision/VisionPages.tsx` — P2-2
- `frontend/src/pages/exams/OnlineExamsPages.tsx` — P2-3, P3-6 ⚠️ shared with A4/A6 scopes — claim in a disjoint wave
- `frontend/src/pages/admin/AdminExtraPages.tsx` — P2-6, P3-4, P3-8
- `frontend/src/pages/admin/AdminPages.tsx` — P3-3, P3-8
- `frontend/src/pages/admin/AdminSyncPage.tsx` — P3-7
- `frontend/src/styles/components.css` — P3-9 (grid-4 ≤480px 2×2) ⚠️ shared sheet — coordinate
