# Handoff — R305-A5 (student workspace, Heron design language) — FINAL

> Branch **`redesign/r305-heron-student`** · baseline `1b766512` (== `redesign/r305-heron-shell` == main; the common R305 baseline) · final SHA: see `git log origin/redesign/r305-heron-student -1`.
> Heron translation shipped as a **scoped layer over the r197/r303 token canon** — zero token changes, zero shared-system edits, one foundation sheet + four family sheets, all gate-scanned.
> Workstream split: 2-a dashboard · 2-b courses+player · 2-c schedule+matrix+results+exams · 2-d supplemental (17 long-tail routes) · 5 RTL/mobile/a11y audit · 6 independent product & regression review. Parent owned the foundation, integration, browser QA, and review fixes.

## The Heron vocabulary (what "Heron" means on this tree)

`frontend/src/styles/r305-student.css` (foundation, parent-owned) + `r305-student-{dashboard,courses,schedule,supplemental}.css` (family sheets):
- **Micro-labels**: `.r305s-eyebrow` (13px semibold muted, leading tick) classifies every section as content/status/metadata/action.
- **Thin technical dividers**: `.r305s-rule(--strong/-v/-labeled)` — hairlines carry the layout instead of box walls; the labeled rule stamps the label INTO the line.
- **Dark/light section contrast**: `.r305s-band--deep` — ink ground in light theme, paper ground in dark (the neutral scale auto-inverts); secondary ink re-derives by mixing the band's own poles (theme-proof by construction; unified at 85/15 in the review round).
- **Surface geometry per task**: chips `.r305s-chip` (r-full), wells r-sm, panels r-lg, rows r-md — no global card recipe.
- **Numerals**: `.r305s-metric` mono tabular (IDs/metrics only — the r197 mono contract).
- **One action per region**: `.r305s-next` copper rail + `.btn.accent` — exactly one emphasized CTA per view region.
- **Restrained warm signal**: the live copper accent family (#B57438 light / #E0A067 dark) IS the Heron accent; gold stays achievements-only (Gamification/Achievements).

## Routes completed (30 assigned — layout decision, one line each)

| Route | Decision |
|---|---|
| /student/dashboard | Deep-band continue hero (eyebrow + ONE copper CTA + quiet progress), TodayList, gap rows, momentum StatLine with hairline dividers + labeled rule, day-anchored week ledger; band-safe pending mirrors. |
| /student/courses | RowList with meta-row separators (code bidi-mono · teacher · counted lectures), progress as tabular % + hairline track, due chips with tone dots, FilterBar counts preserved. |
| /student/catalog | Eyebrow+rule editorial header, honest read-only door anatomy moved out of inline styles. |
| /student/courses/:offeringId | Breadcrumbs → h1; continue strip = the copper rail with honest dynamic eyebrow (الخطوة التالية / اكتمل المنهج) and exactly one CTA; StatLine; flat kicker-headed sections; r164d badges preserved. |
| /student/lectures/:lectureId | Video-first untouched; now-playing meta = the family's ONE deep band; panel kicker hairlines; framed time chips; answered cp-rows quiet. |
| /student/calendar | Legend as chip register; weekend numerals quiet (`:not([data-today])` keeps today's accent ink on Fri/Sat). |
| /student/matrix | Chip register for level statuses; working gap-icon ink (dead scoped class fixed); cell semantics (status word + tabular %) and ≤640px concept list untouched. |
| /student/schedule | Day sections with counted meta slot-labels; meta-row discipline. |
| /student/results | Summary = the page's ONE deep band; token-scope recipe feeds the unlayered StatLine owner (the cascade note in the sheet is the house pattern); pending mirror rides the same band anatomy. |
| /student/online-exams | Window-state chips with tone dots; mono `bdi` score register; kicker micro-labels. |
| /student/online-exams/:id | Question header eyebrow (aria id kept); attempt lifecycle byte-identical. |
| /student/profile | Identity header = deep band with meter column (band-safe progress rails); facts stay role-true. |
| /student/messages | Thin shell over the shared r171a inbox — sheet imports + docs only (forking would break parity). |
| /student/mooc, /student/jobs, /student/labs, /student/live, /student/payment, /student/map, /student/webinars | Kicker/eyebrow registers, hairline rhythm, chip statuses, honest states on each; labs catalog = ONE kicker section wrapping the four states. |
| /training, /training/:slug, /training/:slug/lesson/:lessonId | Same register across the training trio; achievements strip = deep band (gold stays on the achievement anatomy). |
| /achievements | Deep-band KPI strip; gold discipline held (orb/xp/+XP chips only). |
| /student/gamification | Level statement = the ONE deep band (tier orb + xp track + honest error/empty inside the band); achievements/leaderboard = kicker sections. |
| /student/skills, /student/alerts, /student/ar, /student/social, /student/downloads, /student/university | De-boxed registers; alerts ROLE-NEUTRAL (also serves teacher/admin/quality/owner — markup generic, no role copy); university facts ride the band-safe fact grid. |

## Files changed (28, +3,410/−307 on `1b766512..HEAD`)

- Pages: `pages/student/DashboardPage.tsx` (+119/−74), `CoursesPage.tsx`, `CatalogPage.tsx`, `CourseDetailPage.tsx`, `LecturePlayerPage.tsx`, `CalendarPage.tsx`, `MatrixPage.tsx`, `MorePages.tsx` (9 sections + import blocks; **SchedulePage/ResultsPage by 2-c, the other 7 by 2-d; ExamModerationPage NOT in this file**), `TrainingPages.tsx`, `ProfilePage.tsx`, `MessagesPage.tsx`, `MoocPage.tsx`, `JobsPage.tsx`, `LabsPage.tsx`, `LivePage.tsx`, `PaymentPage.tsx`, `CampusMapPage.tsx`, `WebinarsPage.tsx`; `pages/exams/OnlineExamsPages.tsx` (OnlineExamsPage+ExamTakerPage only; **ExamModerationPage: zero diff hunks — verified independently**).
- Styles: NEW `styles/r305-student.css` (foundation) + NEW `styles/r305-student-{dashboard,courses,schedule,supplemental}.css`.
- Tests: NEW `tests/unit/R305-{dashboard,courses,schedule,supplemental}-heron.test.tsx` (12+12+14+19 = **57 pins**). One re-pin in the supplemental suite (kicker titles h3→h2, the N4 heading fix — same assertion, correct tag). No pre-existing test file touched.

## Verification (real browser, mock-transport fixtures — no production data)

- 302 screenshots: every assigned route × {320,360,390,768,1440} × {light,dark} — **zero horizontal overflow** (scrollWidth−clientWidth ≤ 0 at every width), zero error boundaries, zero near-empty renders.
- axe color-contrast, settled state, 28 routes × 2 themes: **zero violations**.
- Transient (load-frame) contrast: deep-band pending mirrors initially flashed the shared skeleton's near-white shimmer under band-mixed ink → fixed at the foundation (band-safe static bones, §9); post-fix sweep = clean. One residual first-frame catch: `.topbar-user-trigger > .avatar` ink-vs-tint ≈4.49:1 rounding (dark) — **pre-existing on baseline** (reproduced at `1b766512`), shared primitive, reported below.
- Keyboard: skip-link first, visible 2px #9A5F25 focus ring on every stop, logical order; player opens on video controls. RTL probe: 0 findings. Reduced motion: only the pre-existing one-shot topbar entrance; skeletons static.
- 302-capture corpus + per-capture summaries were produced by throwaway probe scripts (not committed); the mock harness (`AUDIT_API_MOCK=1`, `tests/e2e/fixtures/mock-transport.ts`) is the sanctioned reproduction path.

## Gate results (final tree)

| Gate | Result |
|---|---|
| lint | 0 errors / 15 pre-existing documented warnings |
| typecheck | 4/4 projects clean |
| tests | **2138 frontend** (baseline `1b766512` = 2081; +57 new R305 pins — 12 dashboard, 12 courses, 14 schedule, 19 supplemental; final tree 2138/2138) + **1783 backend**, 0 fail/skip |
| colors / raw-css / icons / motion | strict green (0 findings, 0 new allows) |
| CSP hash | pinned OK |
| parity export | **FAIL 76/190 — PRE-EXISTING**: reproduced identically at baseline `1b766512` (neither tokens.css nor unified-parity.css is in this branch's diff). Owned by the shell/design-tokens workstream; documented, not weakened. |
| frontend build | green |

## Backend-dependent blockers & shared-owner proposals

1. **parity export 76/190 pre-existing at baseline** — coordinate with the r305 shell/design-tokens owner; the export pair and tokens.css disagree on 114 checks on the R305 baseline itself.
2. **Avatar ink rounding** (`components/primitives/index.tsx` `avatarInk`): the max-pick ink can land a token pair at ≈4.49:1 (fails axe's 4.5 by rounding) — proposal: escalate to the pure pair when the token max < 4.55, or clamp the tint palette to AA-safe tokens. Shared file (4E) — not edited here.
3. **`ListSkeleton` optional `aria-label`** (patterns, frozen): ArVrPage previously passed one (dropped by 2-d's finisher for tsc safety) — a sanctioned optional prop would let list loaders self-describe.
4. **`SectionHeader` counted-note slot** (patterns): the hand-rolled kicker+counted-metric collapse into the pattern if it grows a `note` slot (2-b proposal).
5. **`patterns.css` is unlayered while family sheets ride `@layer pages`** — any `.pf-*` property override from a layer silently loses. The results-summary token-scope recipe (schedule sheet §4) is the sanctioned workaround; a one-line note in `CONTRACT.md` would save the next workstream the archaeology.

## Integration notes for Agent Z / the shell owner

- `MorePages.tsx` carries the two labeled import blocks (`r305-c`/`r305-d` markers) — the merge protocol that let 2-c/2-d work the file in parallel; collapse the duplicate `import '../../styles/r305-student.css'` (N1, legal JS, Vite dedupes) when the markers retire.
- Student sheets import per-page (`import '../../styles/r305-student*.css'` inside each page module) — nothing added to main.tsx; frozen sheets (student.css, player.css, training.css, patterns.css, tokens.css, motion.css, components.css, polish.css, layout.css) untouched.
- The deep-band secondary-ink recipe is unified at **85/15** (foundation + supplemental); the results-summary band keeps its own documented 62/55 derivation pinned by the schedule suite's cascade notes.
