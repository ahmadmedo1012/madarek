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
- Permissions matrix grouped + keyboard/live-region hardening (see commit).

(sections below appended per round)
