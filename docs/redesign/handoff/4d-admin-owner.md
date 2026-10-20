# 4D — Admin & Owner redesign handoff (rounds r250–r259)

> Agent 4D owns `pages/admin/`, `pages/owner/`, `components/owner/`,
> `styles/owner.css`, `styles/admin.css`. Branch: `redesign/4d-admin-owner`
> (from origin/main @ r198 merge). Never pushes main. This file is the
> living work record — newest section at the bottom, per team protocol.

## Route map — primary user goal + mobile recomposition (2 lines each)

### Admin (`/admin/*`)

| Route | Primary user goal | Mobile recomposition |
|---|---|---|
| `/admin/dashboard` | «ماذا يحتاج انتباهي اليوم؟» — action strip first, then the 4-fact stat line, then distribution charts | Stat strip stacks 2×2; charts keep their data-table fallback; action rows stay full-width 44px targets |
| `/admin/students` | Find a student and manage his enrollments (search + faculty filter + enrollment modal) | Columns fold to identity + status (compact band ≤1024 already); actions stay in-row; modal becomes full-width sheet |
| `/admin/teachers` | Pick a teacher, verify him, manage his position/permissions | List/detail SplitView collapses to list-then-detail navigation; verify CTA stays pinned in the detail header |
| `/admin/permissions/:id` | Understand what this user CAN do, and adjust exceptions deliberately (grouped matrix) | Matrix groups stack; each capability row keeps its action button inline; stat line wraps |
| `/admin/sync` | Check freshness of university data and trigger a re-sync | Run history collapses to per-run cards (tbl-stack); category accordion already mobile-native |
| `/admin/faculties` | Browse the 25-faculty directory, drill into departments, add faculty/department | Directory rows keep inline dept expansion; toolbar stacks; create buttons stay ≥44px |
| `/admin/courses` | Manage the course catalogue + offerings (create course, open offering) | Column diet folds meta into rows (compact band); create actions ride the toolbar |
| `/admin/reports` | Read research lifecycle output and drill into the papers register | KPI strip 2×2; trend table view is the mobile default candidate; register rows keep status pills |
| `/admin/digital` | Gauge adoption of digital components (exams, labs, live…) | Stat strip stacks; adoption table becomes stacked rows via tbl-stack |
| `/admin/settings` | Confirm the service is healthy and find related consoles | 2-col card grid stacks; health rows keep dot+value inline |
| `/admin/analysis` | (redirect shim → `/admin/reports?trend=table`) — no UI work, kept nav-deliberate | — |
| `/admin/community` · `/admin/alerts` | 4E files (CommunityPage / AlertsPage) — consumed, NOT edited by 4D | — |

### Owner (`/owner/*`)

| Route | Primary user goal | Mobile recomposition |
|---|---|---|
| `/owner/dashboard` | «هل المنصة سليمة؟» — live-status band, attention strip, 4 facts, role mix chart, last events | Status band + strip stack; events table → tbl-stack cards; quick actions become a 2×2 grid |
| `/owner/users` | Find any account, change role / suspend with named consequences | 7-col table folds to identity+role; role select + status button stay in-row ≥44px; confirm dialog unchanged |
| `/owner/institutions` | See both institutions' health, create one, provision/suspend admins | Table folds to institution cards; nested admins list keeps revoke ≥44px; create form stacks |
| `/owner/institutions/:slug` | Set up ONE institution's academia (faculties→departments→courses→offerings) | Faculty card wall → grouped/collapsed rollup (the 25× empty-card wall dies); 4 modals become sheets |
| `/owner/activity` | Audit trail: who did what, when — filterable timeline | Timeline is already mobile-native; filter tabs wrap; metadata expansion stays |
| `/owner/content` | Honest map of official content surfaces + brand tokens | Cards stack; swatch grid wraps |
| `/owner/system` | Ops truth: storage durability, sync runs, feature flags, settings | Health list stacks; flags keep toggle+confirm per row; kv editor stays single-column |
| `/owner/education` | Academic scale: courses per faculty, attendance trend, workload meters | Charts keep table fallbacks; workload meters stack; top-courses table → tbl-stack |
| `/owner/realtime` | Right-now platform counters with honest staleness | KPI strip stacks; summary table → stacked rows (r151b contract) |
| `/owner/ai` | AI usage honesty (local engine vs provider), tokens, latency | Charts keep fallbacks; share meters stack; honesty badge stays in header |
| `/owner/alerts` | Resolve operational alerts deliberately (confirm names the consequence) | Alert cards stack; resolve button stays in-card ≥44px |
| `/owner/governance` | Read-only governance analytics: permission/role change volume, login analytics | Stat strip 2×2; charts keep fallbacks; failure-reasons table → stacked |
| `/owner/notifications` | 4E file (AlertsPage dup) — consumed, NOT edited by 4D | — |

## Layout decisions (Superlist direction, one line per page)

- **dashboard (admin/owner)**: attention ledger above the stat line; stat line is typographic (no icon boxes); one chart section breathes after it.
- **management lists (students/courses/faculties/teachers/users)**: dense rows with inline expansion + a detail surface (SplitView when the shell pattern lands); bulk actions contextual.
- **permissions matrix**: grouped by domain under section headers; row = name + state badge + one verb button; immediate mutation + one-shot pulse + live-region announcement.
- **audit log (activity)**: filterable timeline of rows — Mono ONLY for IDs/emails/metadata JSON; Arabic action labels lead.
- **alerts**: rows/cards with severity + category + named consequence on resolve (ConfirmDialog).
- **feature flags**: toggle rows with change confirmation (ConfirmDialog names the honest no-runtime-consumer caveat); failure keeps last saved state.
- **realtime**: preserve the honest staleness contract exactly (is-pending / has-alerts / is-degraded, dataUpdatedAt stamp).
- **institutions detail**: the 25× empty-card wall becomes a grouped rollup with duplicate annotation.
- **sync**: run-history table + category accordion stay; stat line reads freshness first.
- **settings/content**: static honest consoles — re-skinned, no fake controls.

## Verified environment (local)

- PG via `tools/boot-pg.sh` on :5433 (`postgresql://madarek@localhost:5433/madarek`), migrate + `MADAREK_SEED_FORCE=1` seed done.
- Backend `npm run dev` :4000, frontend `npm run dev:web` :5173.
- Demo logins verified: `admin@demo.madarek.ly` / `owner@demo.madarek.ly` (seed password, local only).

## Work log

### r250 — Phase A batch 1 (no shell-pattern deps)
- Handoff file created; route goals + mobile recompositions written (this file).
- Permissions matrix grouped into 6 domains (`.govx-*` in admin.css; the
  `.perm-row` anatomy stays consumed from components.css) + polite
  live-region announcing every successful grant/revoke/reset.
- ConfirmDialogs naming consequences added to: teacher verify
  (privilege change), feature-flag toggle (OwnerSystemPage — the
  r176e error/retry pins kept verbatim), operational-alert resolve
  (OwnerAlertsPage).
- Audit timeline (OwnerActivityPage): `resourceId` renders as a mono
  chip (`.owner-timeline-id`, 14-char ellipsis + full id in title);
  metadata JSON block already mono (owner.css).
- Verified in browser as admin + owner (dark 360/1280): matrix groups,
  flag confirm flip end-to-end, resolve confirm end-to-end (2→1 cards),
  mono ID chips in the timeline.

### r251 — shell patterns merged + teachers SplitView + audit log + owner dashboard
- Merged origin/redesign/shell (r210 contract, then r211/r212 shell reskin).
- AdminTeachersPage: PageFrame + patterns PageHeader (breadcrumbs) +
  StatLine + FilterBar + **SplitView** (listWidth narrow; selection via a
  stretched `<button>` in the RowItem title slot — `.govx-row-select`
  plate in admin.css, `:has([aria-pressed])` row highlight; mobile
  detail = full-screen Sheet via the pattern).
- OwnerActivityPage: PageFrame + patterns PageHeader + StatLine +
  **FilterBar(sticky)** carrying the filter Tabs above the timeline.
- OwnerDashboardPage: **StatLine** facts + **TodayList** attention rows
  (urgency now/soon/later replaces the ledger zone) + recent events as
  **RowList** rows; the pending mirror re-shaped (`.pf-statline`), and
  pending/error returns ride PageFrame so the handoff moves nothing.
- Pins re-pointed in MY pages' tests only (stat cells, urgency dots,
  pf-page frame).

### r252 — users directory inline expansion
- OwnerUsersPage: the 7-column table → **RowList rows with inline
  expansion** (identity + role/status trailing; memberships as meta
  chips — the «المؤسسات» column dies with the table; role picker +
  status toggle + joined date behind the per-row disclosure named
  «إجراءات {الاسم}»). FilterBar carries search + role pills; StatLine
  carries the facts. Same ConfirmDialog flow; tests re-pinned to
  expand-first.

### r253 — students roster + the 25× empty-card wall dies
- AdminStudentsPage: the 8-column table (with its ≤1024 column diet)
  → **RowList rows**: meta carries email · reg number (mono) · faculty;
  trailing carries GPA + status; the expansion carries department +
  year + level + the enrollments action. FilterBar carries search +
  faculty select.
- OwnerInstitutionDetailPage: content faculties render as cards; the
  empty seed tail collapses behind ONE honest rollup disclosure
  (`.owner-empty-rollup*` in owner.css) — count line + per-row
  add-department affordance. The 25-card wall is now 4 cards + 1 row.
- Fixed a double-digit countAr form bug the rollup exposed (the lib
  prefixes the digit itself).

### Selectors/files made obsolete (for Agent Z)
- `components.css`: `.permissions-grid` (no TSX consumer — the matrix
  is `.govx-matrix` in admin.css now).
- `components.css`: `.teacher-row` family (the list is RowList now;
  zero TSX consumers on my pages).
- `owner.css`: `.owner-user-cell`, `.owner-users-table` stagger block
  (`--row-i`), `.owner-search-bar` family (FilterBar owns search now) —
  still defined, zero consumers on my pages.
- `admin.css`: `.admin-students-toolbar/-search` still consumed by
  AdminFacultiesPage/AdminCoursesPage/OwnerInstitutionDetailPage (not
  obsolete); the students page stopped using them.
- `owner.css`: `.owner-action-bar` fine; LedgerPanel/LedgerRow remain
  for OTHER pages (admin dashboard) — not obsolete globally.
- OwnerUsersPage/events table: `.table-wrap` + `.tbl-stack` usage on
  the dashboard events card is gone (RowList), but both classes remain
  heavily used elsewhere — NOT obsolete.

### Sheet import lines that may conflict (for Agent Z)
- `OwnerPages.tsx` (my barrel) imports `../../styles/owner.css` once —
  unchanged. My pages import `patterns` (via components/patterns) which
  main.tsx loads globally — no new import lines added by me beyond
  admin.css/owner.css consumers that already existed.

### Requests (tokens/primitives/patterns)
- None blocking. If patterns grow a `RowItem onSelect`/`selected` prop
  later, my `.govx-row-select` stretched-button plates can retire.

### Incomplete / deferred (honest)
- AdminFacultiesPage / AdminCoursesPage / AdminReportsPage /
  AdminSyncPage / AdminDigitalPage / AdminSettingsPage /
  OwnerInstitutionsPage / OwnerContentPage / OwnerEducationPage /
  OwnerAiPage / OwnerGovernancePage / OwnerRealtimePage: NOT
  recomposed onto patterns this round (they keep their r189–r196
  layouts, which already follow the token/type/AA contract). Reason:
  round budget went to the mission's named surfaces (teachers/users/
  students/audit/dashboard/alerts/flags/institutions-detail) + the
  Phase A governance set. These pages consume admin.css/owner.css and
  inherit the 1A palette; Agent Z may assign a follow-up wave.
- The verify-teacher confirm was verified as admin2 (الأندلس, the only
  unverified teacher) — cancelled at the dialog (no write), so demo
  data stays as seeded.

(sections below appended per round)
