# Audit 4-A7 — Owner Console (لوحة التحكم — 10 routes)

Campaign 4 «سيادة المظهر» · Wave 19 audit-only · Task 4-A7
Scope: `frontend/src/pages/owner/*.tsx` (10 pages + barrel), `frontend/src/styles/owner.css`, `frontend/src/components/owner/{ConfirmDialog,ToggleSwitch}.tsx`
Evidence: 20 screenshots (`/tmp/madarek-shots/a7-*.png`, prefix a7-) + 9 VLM critique calls + 5 DOM/geometry probes + API ground-truth + computed WCAG ratios. All shots re-taken with the auto-start onboarding overlay dismissed (`/me/onboarding/complete` blocked — DB untouched; see "Methodology notes").

## Runtime ground truth (seeded, 2026-09-25)

`/owner/stats` → 5 users / 6 courses / 6 enrollments / 4 audit logs. `/owner/realtime` → all four counters 0. `/owner/education` → `byFaculty` = 8 rows: كلية تقنية المعلومات (6) + **كلية الآداب ×2, كلية الاقتصاد ×2, كلية التربية ×2 (all 0 — duplicate names)**. `/owner/governance` → `weeklyGrowth` = 1 week only (count 5). `/owner/login-analytics` → 156✓/0✗ (grows with each probe login). `/owner/ai-metrics` → all zeros. `/owner/alerts`, `/owner/feature-flags`, `/owner/settings` → empty arrays. Faculty table itself has 25 rows with duplicated names (كلية التربية ×4, العلوم ×2, …) — root of the education-chart defect.

## Scores per surface (VLM /10 + code review)

| Surface | Route | Score | One-line verdict |
|---|---|---|---|
| Dashboard | /owner/dashboard | **7.0** | Honest-state discipline is exemplary; 6 identical KPI tiles flatten hierarchy, events table breaks on mobile |
| Users | /owner/users | **7.5** | Best-in-console: server-side filters, bounded RTL pagination, per-row busy states, confirm dialog |
| Activity | /owner/activity | **7.0** | Solid timeline anatomy; spine nearly invisible, unknown-action fallback leaks without bdi |
| Content | /owner/content | **6.0** | Honest "not built yet" page, but it's a directory of elsewhere — sparse and thin for a console slot |
| System | /owner/system | **6.0** | Raw English severity/category leakage, click-only div expander, un-migrated tables |
| Education | /owner/education | **6.0** | Meters + tables good; bar chart renders duplicated faculty categories and 7 empty rows |
| Realtime | /owner/realtime | **7.0** | Great live-region + freshness honesty; all-amber zero-activity dots cry wolf |
| AI | /owner/ai | **6.0** | Empty data collapses the whole page to one EmptyState — no KPI strip, no CTA |
| Alerts | /owner/alerts | **7.0** | Empty state with a real exit link; KPI trio renders three identical green zeros |
| Governance | /owner/governance | **6.0** | Decimal y-ticks (4.75→5.25 step 0.05) + single-point line = broken-looking chart |
| Mobile (dash/users/realtime) | 390px | **8.0 / 8.5 / 6.5** | No horizontal overflow anywhere; 2×2 realtime tile squeeze risk |
| Dark (dashboard/realtime) | 1280px | **6.5 / 7.0** (VLM) → **7.5 / 7.5** (verified) | Token math clears AA on every flagged pair; VLM contrast claims mostly false |

**Audit Health (console-wide, audit.md 5 dimensions):** A11y 3/4 · Performance 4/4 · Theming 4/4 · Responsive 2/4 · Integrity 3/4 → **16/20 (Good)**. Strongest dimensions: performance (memoized chart props, themeKey remounts, debounced search, server-side pagination) and theming (token-clean owner.css, chart re-resolution on theme flip, verified dark). Weakest: responsive (two tables overflow at 390px) and integrity edges (duplicate faculty data, raw English on system page).

**Counts: P0 0 · P1 5 · P2 9 · P3 9.**

---

## P1 — Major (fix before release)

### P1-1 · Raw English severity + category strings in the Arabic UI (system page)
- **Where:** `frontend/src/pages/owner/OwnerSystemPage.tsx:226-231` — `<Badge …>{alert.severity}</Badge>` and `:237` — `<strong>الفئة:</strong> {alert.category}`
- **Evidence:** API `/owner/system` returns `severity:"warning"`, `category:"infrastructure"`-style enums; the system page renders them verbatim. OwnerAlertsPage translates the exact same enums via `SEVERITY_LABELS` / `CATEGORY_LABELS` (`OwnerAlertsPage.tsx:14-36`, added 17-a2 for 15-a P1-6) — the system page missed that fix. When an operational alert fires, the ops surface shows "warning · <title>" in Latin inside an Arabic RTL sentence.
- **Impact:** English enum leakage on the page an operator reads *during* an incident; inconsistent with the alerts page vocabulary (حرج/خطأ/تحذير/معلومة).
- **Fix sketch:** export the two label maps from a shared module (or import from a `lib/ownerLabels.ts`) and use `SEVERITY_LABELS[alert.severity] ?? <bdi>{alert.severity}</bdi>` + same for category.

### P1-2 · Expandable alert row is a click-only `<div>` (keyboard-inaccessible)
- **Where:** `frontend/src/pages/owner/OwnerSystemPage.tsx:220-223` — `<div className="owner-error-entry-head" onClick={…}>` (cursor:pointer via `owner.css:301-307`)
- **Evidence:** DOM probe + code: no `role`, no `tabIndex`, no `aria-expanded`, no key handler. The activity page solves the identical disclosure with a real `<button>` + `aria-expanded` + rotating chevron (`OwnerActivityPage.tsx:267-276`, `owner.css:881-913`).
- **Impact:** WCAG 2.1.1 failure — keyboard/screen-reader users cannot open alert details (metadata, message, stack) on the ops page.
- **Fix sketch:** swap to `<button type="button" className="owner-error-entry-head" aria-expanded={…}>`, reuse the `.owner-detail-toggle` motion language.

### P1-3 · Education chart plots duplicated faculty categories (misleading governance data)
- **Where:** BE `backend/src/http/routes/owner.routes.ts:442` (`/owner/education` `byFaculty` aggregation) + FE renders as-is (`frontend/src/pages/owner/OwnerEducationPage.tsx:54-64, 175-187`); seed: Faculty table holds 25 rows with duplicate names (كلية التربية ×4, كلية الآداب ×2, كلية الاقتصاد ×2, كلية العلوم ×2 — verified via psql probe).
- **Evidence:** API returns `byFaculty` = 8 rows of which 5 are duplicate names with count 0; the horizontal bar chart (crop `a7-crop-edu-bar.png`) renders 1 real bar + 7 empty rows, with three labels appearing twice. VLM: "7 of 8 faculties with zero data… visually unbalanced and confusing."
- **Impact:** The owner reads the chart as a university census; duplicated/empty faculties misstate the institution's structure on a decision surface.
- **Fix sketch:** dedupe/merge same-name faculties in the aggregation (or fix the seed), then drop zero-count rows (or collapse to "أخرى") so the chart shows signal, not census padding.

### P1-4 · Governance growth chart: fractional y-ticks + single data point = broken-looking chart
- **Where:** `frontend/src/pages/owner/OwnerGovernancePage.tsx:80-83` (`growthOptions = cartesianOptions()` — no y-scale config) + `lib/chartTheme.ts:563-589` (`cartesianOptions` sets no `ticks.precision`, no `beginAtZero`)
- **Evidence:** crop `a7-crop-gov-line.png` — y-axis ticks **4.75, 4.80, … 5.25 (step 0.05)** around a single point at 5.00; card titled «نموّ المستخدمين (8 أسابيع)» with one visible week (API `weeklyGrowth` = 1 entry). VLM: "looks broken or like a loading state… decimals add cognitive load."
- **Impact:** A count metric rendered with hundredths precision signals false accuracy; a one-point "trend" line undermines trust in every other chart on the page.
- **Fix sketch:** for integer count series: `scales.y = { beginAtZero: true, ticks: { precision: 0 } }` (extend `cartesianOptions` with a `integerY` opt); when `weeklyGrowth.length === 1`, render the point+label or a "أسبوع واحد من البيانات" note instead of a line.

### P1-5 · Mobile: dashboard events table + system sync table overflow their box (no collapse strategy)
- **Where:** `frontend/src/pages/owner/OwnerDashboardPage.tsx:324` and `OwnerSystemPage.tsx:140` — both render bare `className="owner-table"` (4 columns) with no `.table .tbl-stack` + `.table-wrap` migration
- **Evidence:** 390px probe: `.owner-table` on dashboard `overflow:true` (scrollWidth > clientWidth, w=316) and same on system sync table; users/education/governance tables (`.table.tbl-stack`) all fit. Document-level overflow is 0 (content clips inside the card instead of scrolling).
- **Impact:** 4-column tables crammed into 390px clip/overlap text on the two most-visited console pages.
- **Fix sketch:** migrate both to `div.table-wrap > table.table.tbl-stack` with `data-label` cells (the pattern already used in this console — `OwnerUsersPage.tsx:323-334`), or hide the lowest-priority column under 640px.

---

## P2 — Minor (fix in next pass)

### P2-1 · Traffic-light misuse: amber dots for zero activity (quiet ≠ warning)
- **Where:** `frontend/src/pages/owner/OwnerRealtimePage.tsx:115, 123, 131, 139` (`${data.X > 0 ? 'green' : 'amber'}`) + `OwnerDashboardPage.tsx:284, 291` (same for بثّ مباشر / اختبارات جارية)
- **Evidence:** all four realtime counters are 0 → all four summary rows render amber; the page's own status band simultaneously says «النظام يعمل بشكل طبيعيّ» (green). VLM: "yellow for every row implies system-wide warning… unnecessary alarm."
- **Fix sketch:** zero = neutral/success dot (a quiet university at night is healthy, not degraded); reserve amber for real thresholds (e.g. >N queued failures).

### P2-2 · Amber status dot fails WCAG 1.4.11 non-text contrast in light theme
- **Where:** `frontend/src/styles/owner.css:441` — `.owner-health-dot.amber { background: var(--warning) }` → `#D6A330` on white card
- **Evidence:** computed ratio **2.30:1** (< 3:1 required for meaningful graphics); green dot 3.00:1 (borderline), danger 3.19:1, dark-theme variants all pass (7.18:1+). Dots carry meaning (P2-1 semantics), so they're in scope of 1.4.11.
- **Fix sketch:** light-theme amber dot uses `--warning-ink`-adjacent deep tone (e.g. `#6B4C0B` family) or add a 1px darker ring.

### P2-3 · KPI monotony: every page leads with an undifferentiated identical-tile strip
- **Where:** all 10 pages — `MetricCard` grids (`grid-4` ×6 pages, `grid-3` ×2, dashboard stacks grid-4 **plus** grid-2 = 6 tiles; `OwnerDashboardPage.tsx:222-248`)
- **Evidence:** VLM flagged on every scored surface ("identical white rectangles… no differentiation… zero-state metrics blend with primary"); MetricCard renders the same icon+label+value anatomy regardless of importance (`components/primitives/index.tsx:77-105`).
- **Impact:** Craft-floor "same-size cards as page structure" scaffold; the console's command-center role wants a primary metric with weight.
- **Fix sketch:** one emphasized metric per page (bigger value, trend context), demote the rest to a compact stat strip; not a primitive change — an owner-pages usage change (coordinate with 4-A9).

### P2-4 · Platform-settings save: parallel fire-and-forget mutations, zero feedback
- **Where:** `frontend/src/pages/owner/OwnerSystemPage.tsx:62-67` — `Object.entries(editedSettings).forEach(… updateSetting.mutate(…)); setEditedSettings({})`
- **Evidence:** local edits are cleared immediately while N parallel mutations fly; a single shared `useMutation` state can't attribute failures per key; no success/error surface (compare AlertsPage resolve → toast, `OwnerAlertsPage.tsx:80-83`).
- **Fix sketch:** `Promise.allSettled` over `mutateAsync`, toast success/failure, keep edits on failure, per-row error chip.

### P2-5 · System page uses generic spinner `LoadingState` where the console standard is shape-matched skeletons
- **Where:** `OwnerSystemPage.tsx:127, 178, 203, 256` (sync table / flags / alerts / settings all `LoadingState`)
- **Evidence:** every other owner page ships shape-matched skeletons (`TimelineSkeleton`, `AlertListSkeleton`, `TableSkeleton` + `ChartSkeleton` — see `OwnerActivityPage.tsx:119-134`, `OwnerAlertsPage.tsx:51-71`, `OwnerEducationPage.tsx:97-113`). Craft floor: "never a bare spinner where the shape is known."
- **Fix sketch:** `TableSkeleton rows={4} cols={4}` for sync, `ListSkeleton` for flags/alerts/settings rows.

### P2-6 · AI page empty state collapses the whole surface — no KPI strip, no exit
- **Where:** `frontend/src/pages/owner/OwnerAiPage.tsx:106-111` — `data.totalRequests === 0` short-circuits to a single `EmptyState` (no `action` prop)
- **Evidence:** VLM: "very sparse… lacks a CTA to navigate away from the dead-end." Other pages pair their empty states with actions (`OwnerAlertsPage.tsx:134-139` links to activity; users page offers filter-clear).
- **Fix sketch:** keep the KPI row (zeros are honest under this console's own convention), render the two chart cards as empty states with a "كيف تُفعَّل خدمات الذكاء الاصطناعيّ؟" link.

### P2-7 · Activity feed: unknown-action fallback renders without bidi isolation
- **Where:** `frontend/src/pages/owner/OwnerActivityPage.tsx:55` (`classifyAction` returns raw `action` as label) + `:159` (`ACTION_LABEL[e.action] ?? fallback` — no `<bdi>`)
- **Evidence:** dashboard's twin helper wraps the same case: `ACTION_LABEL[action] ?? <bdi>{action}</bdi>` (`OwnerDashboardPage.tsx:74-76`). Any new backend enum (e.g. a future `EXPORT_RUN`) renders as a raw Latin run inside the RTL title line.
- **Fix sketch:** mirror the dashboard's `<bdi>` fallback.

### P2-8 · Alert-count badge in page title renders raw Latin digits, off-convention
- **Where:** `frontend/src/pages/owner/OwnerSystemPage.tsx:89-92` — `<span className="owner-badge-counter">{sysData.alerts.openCount}</span>`
- **Evidence:** every other numeric display on the console uses `toLocaleString('ar-LY')` inside `<bdi>`; this one interpolates the raw integer.
- **Fix sketch:** `<bdi>{sysData.alerts.openCount.toLocaleString('ar-LY')}</bdi>`.

### P2-9 · Empty-flags copy points to a dead end
- **Where:** `frontend/src/pages/owner/OwnerSystemPage.tsx:180-183` — "يمكن إضافتها من إعدادات النظام"
- **Evidence:** the settings section on the same page has no add-flag affordance (`/owner/settings` returns `[]`; settings editor only edits existing keys).
- **Fix sketch:** reword to honest state ("لم تُعرَّف أعلام بعد — تُدار من قاعدة البيانات حالياً") or link the real creation path once one exists.

---

## P3 — Polish

- **P3-1 · Timeline spine nearly invisible:** `owner.css:15-25` — spine `var(--border)` = #E9E7E2 on white card = **1.24:1**; VLM read the timeline as "a standard list" (probe proves the 2px spine renders). Bump to `--border-strong` or a tinted accent hairline. (Activity page.)
- **P3-2 · Education bars carry no value labels:** `OwnerEducationPage.tsx:54-64` — VLM: "no numerical labels at the end of the bars… user has to trace the axis." Tooltips exist on hover; consider bar-end value labels for the top series or a visible count on the single non-zero row.
- **P3-3 · Arabic prose in the mono stack:** `owner.css:450-455` — `.owner-health-value { font-family: var(--font-mono) }` but values include Arabic words ('سليمة', 'تعذّر الجلب', counted plurals like «تنبيه مفتوح واحد»); IBM Plex Mono has no Arabic glyphs → per-glyph system fallback, uneven rhythm. Apply mono to numeric `<bdi>` runs only.
- **P3-4 · Generic confirm verb on destructive actions:** `ConfirmDialog.tsx:32` (`confirmLabel='تأكيد'`) + `OwnerUsersPage.tsx:174-183, 186-199` never passes `confirmLabel` — disabling an account confirms with a neutral "تأكيد". Pass action-named labels («تعطيل الحساب», «تغيير الدور»).
- **P3-5 · ConfirmDialog heading skips a level:** `ConfirmDialog.tsx:51` — `<h3>` directly under the page `<h1>` context (dialog has no `<h2>`); cosmetic heading-order nit inside a modal (role=dialog limits the damage).
- **P3-6 · Governance doughnut legend reads small vs the chart:** `OwnerGovernancePage.tsx:100-105` + `radialOptions({legend:true})` — legend font 12px under a ~180px ring with a big center figure (crop `a7-crop-gov-doughnut.png`, VLM: "text is very small relative to the header"). Consider moving success/fail counts into the legend labels («ناجحة · 156»).
- **P3-7 · System page still carries inline styles the CSS was written to replace:** `OwnerSystemPage.tsx:154, 165-166, 177, 202, 236, 241, 255, 275` — `style={{fontFamily:'var(--font-mono)'}}` etc. while `owner.css:1013-1027` provides `.owner-num`/`.owner-cell-muted` exactly for this (audit 0-e P2-118 comment says the pages opted in — system page didn't).
- **P3-8 · ToggleSwitch label is a click-only div, not a `<label>`:** `ToggleSwitch.tsx:47` — works (switch itself is the a11y contract with role=switch/tabIndex/Enter/Space), but the label div duplicates the toggle via onClick with no semantic association; a native `<label htmlFor>` (or moving the description inside the switch's aria) would be cleaner.
- **P3-9 · Mobile realtime 2×2 tile squeeze:** `owner.css:624-628` — at 390px each live tile is ~171px wide; VLM: "labels lack breathing room… a slightly longer label would wrap awkwardly." Verify with the longest live label at 320px, consider 1-col under 360px.

---

## Verified FALSE (VLM claims rejected with evidence)

1. **"Doughnut chart severely cropped at the bottom"** (light + dark dashboard) — geometry probe: canvas 699×236 inside frame 260px (padding-correct); dedicated crop re-review: "fully visible", craft 8/10. Full-page-screenshot misread.
2. **"Dark timestamp extremely low contrast"** — `.owner-live-meta` = dark `--text-muted` #9A968A on surface #1F1F1E = **5.58:1**, AA pass (small text needs 4.5).
3. **"Inactive tabs lack contrast / look disabled"** — #6E6C65 on white = **5.26:1**, AA pass.
4. **"Should use Arabic-Indic numerals (٥, ٦)"** — `ar-LY` (Libya) legitimately resolves to Latin digits in CLDR; `toLocaleString('ar-LY')` producing "5" is correct localization, not a defect.
5. **"Doughnut missing ~4% failure segment"** — failureCount is genuinely 0 (API); a full green ring is honest, not a rendering bug.
6. **"Missing timeline spine"** — spine renders (probe: 2px, positioned); the *real* defect is its 1.24:1 faintness (P3-1).

## Positive findings (keep + replicate)

- **Honest-state discipline** is the console's signature: pending → neutral/`…`, error → degraded band with retry, never a fake zero or a false "all normal" (`OwnerDashboardPage.tsx:126-206` comments document ruling #14 enforcement). The status band's `is-pending/is-degraded/has-alerts` state machine (`owner.css:658-705`) is a model for the platform.
- **Chart accessibility:** every chart sits in `ChartFrame` with Arabic aria-label + prose summary + a visually-hidden data table (dashboard, education ×2, ai ×2, governance ×2) — WCAG 1.1.1 done properly.
- **Counted Arabic plurals everywhere** (`countAr`, `usersCountLabel`, `teachersCountLabel`, `eventsCountLabel`, `facultiesCountLabel`) — no "3 تعليقات" machine-translation tone.
- **Realtime freshness honesty:** "آخر تحديث" stamped from `dataUpdatedAt` (0-e P2-41) + keyed value remount settle + `aria-live="polite"` region — the live-surface pattern is thoughtful.
- **Users page engineering:** server-side role filter, windowed pagination with RTL-correct chevrons + `aria-current`, per-row mutation busy states, inline retry, `.tbl-stack` mobile collapse — the console's reference table page.
- **bdi discipline:** emails (`dir="ltr"`), course codes, hex swatches, unknown enums all isolated.
- **Reduced-motion off-switches** per keyframe with delay-ladder reasoning (`owner.css:983-995, 1224-1234`).

## Top-10 quick wins (≈ half-day total)

1. **P1-1** Share + apply `SEVERITY_LABELS`/`CATEGORY_LABELS` on the system page (10 min).
2. **P1-2** Button-ize the system alert expander with `aria-expanded` (15 min).
3. **P2-1** Neutral/green dots for zero-activity rows (realtime + dashboard health list) (20 min).
4. **P1-4** `beginAtZero + precision:0` y-ticks for count charts + single-point guard (30 min, coordinate 4-A9 for `chartTheme.ts`).
5. **P1-5** Migrate dashboard events + system sync tables to `.table.tbl-stack` (45 min).
6. **P2-7** bdi-wrap the activity fallback label (5 min).
7. **P2-2** Light-theme amber dot contrast (token or ring, 15 min).
8. **P2-4** Settings-save feedback via `Promise.allSettled` + toast (45 min).
9. **P2-6** AI empty state: keep KPI strip + add CTA link (20 min).
10. **P3-1 + P2-8** Spine contrast bump + badge-counter ar-LY digits (10 min).

## Files to touch

**Owner-owned (this scope):**
- `frontend/src/pages/owner/OwnerSystemPage.tsx` (P1-1, P1-2, P1-5, P2-4, P2-5, P2-8, P2-9, P3-7)
- `frontend/src/pages/owner/OwnerRealtimePage.tsx` (P2-1, P3-9)
- `frontend/src/pages/owner/OwnerDashboardPage.tsx` (P1-5, P2-1, P2-3)
- `frontend/src/pages/owner/OwnerGovernancePage.tsx` (P1-4, P3-6)
- `frontend/src/pages/owner/OwnerActivityPage.tsx` (P2-7, P3-1)
- `frontend/src/pages/owner/OwnerAiPage.tsx` (P2-6)
- `frontend/src/pages/owner/OwnerEducationPage.tsx` (P1-3 FE-side, P3-2)
- `frontend/src/styles/owner.css` (P2-2, P3-1, P3-3, P3-9)
- `frontend/src/components/owner/ConfirmDialog.tsx` (P3-4, P3-5) + `OwnerUsersPage.tsx` (pass `confirmLabel`)
- `frontend/src/components/owner/ToggleSwitch.tsx` (P3-8)

**Cross-wave (other agents own — coordinate, don't duplicate):**
- `frontend/src/lib/chartTheme.ts` — `cartesianOptions` integer-tick option (4-A9 charts)
- `backend/src/http/routes/owner.routes.ts` — `/owner/education` faculty dedup (BE wave)
- seed data — duplicate Faculty rows (BE wave)
- MetricCard primitive hierarchy (4-A9), onboarding overlay auto-start on console routes (4-A13), topbar 26px icon buttons seen on every mobile probe (4-A2/4-A10), `.owner-table` vs `.table` consolidation (4-A9 note)

## Methodology notes

- First shoot round was **contaminated**: the auto-start onboarding modal (`AppShell.tsx:218-224` — fires whenever `me.onboardingCompletedAt` is null) covered every owner surface; the seeded owner hasn't completed onboarding. Re-shot all 15 images with `.agents/tmp/snap-owner.mjs`, which dismisses the overlay while **blocking** `POST /me/onboarding/complete` (route-abort) so the DB stayed untouched for parallel agents (4-A13 may still need the auto-start state).
- VLM prompts were calibrated per surface; every alarming claim was re-verified with a DOM/geometry probe, a dedicated crop re-review, or token-math contrast computation — six claims were rejected as hallucinations (list above).
- Sequential runs only; prefix `a7-`; 20 shots in `/tmp/madarek-shots/`.
