# W11 — Authenticated web: role dashboards grammar (R332)

Scope kept tight: the TOP page per role — `/student/dashboard`,
`/teacher/dashboard`, `/admin/dashboard`, `/owner/dashboard` — audited
against the landing's grammar at app density (type hierarchy on stat
surfaces · hairline cell discipline · `[nn]` indices · no raw technical
strings · loading/empty/error states render). NO rebuild, no other pages.

## Method (and what the backend-down caveat actually meant)

The backend is down (known). The repo's e2e mock seam
(`tests/e2e/fixtures/mock-transport.ts` + `api-fixtures.ts`, the
`AUDIT_API_MOCK` corpus) was **re-implemented at the transport layer by a
python-playwright probe** (`/home/z/evidence-r332/w11/probe.py`):
`context.route('**/api/**')` answers the real app's XHRs with the fixture
envelopes (`{data}` / `{error}`), auth boots via the `mdrk-auth` seed the
fixtures' `seedSession` writes. Real router, real hooks, real stores —
only the transport is fixed. Per role × per viewport (1440×900, 390×844)
× three variants:

- **happy** — every dashboard endpoint answers real-shaped payloads
  (student from the fixture corpus; teacher/admin/owner authored to the
  hooks' interfaces — the e2e corpus is student-led and has no
  teacher/admin/owner dashboard fixtures);
- **error** — the role's dashboard aggregate answers HTTP 500;
- **empty** — list-shaped endpoints answer `[]` (student
  enrollments/gaps; teacher queue/feed/offerings/risks; admin
  faculties/courses/sync/papers + zeroed paperTrend; owner
  alerts/activity/education-idle).

Each run captures a full-page screenshot, console errors, loud-501 lines
(unmocked endpoints — probe fixture gaps, not app bugs), a visible-text
scan for raw technical strings (`[A-Z_]{5,}` / `snake_case`), and
asserts the variant's content markers. Plus two probes with NO mock:
unauthenticated `/student/dashboard` (guard) and `/auth` with the real
backend down.

Also: a VLM (vision) pass on the four happy-1440 screenshots for the
visual half of the checklist, and a full code audit of the four owned
files. UI **login** against the live backend could not establish
(backend down — that IS the auth family's own error state, recorded
below); the dashboards were therefore exercised via the seeded-session
path the repo's own e2e harness uses.

## Audit table

| Role | Checklist item | Verdict |
|---|---|---|
| STUDENT | Stat hierarchy | PASS — momentum `StatLine` (`.pf-stat-value` at the `--fs-h3` display rung, tabular; `CountIn` settle; muted `--fs-sm` labels); instruments (RulerGauge/CourseBar/GradeBars/StreakTicks) print mono numerals |
| STUDENT | Hairline discipline | PASS — `r319s-bar` hairline rule, EmptyCell hatching, ledger rows, ScheduleStrip 7-cell hairline grid |
| STUDENT | [nn] indices | PASS — SectionBar `[01] الفصل الدراسي` … `[05] أسبوعك القادم` (verified on-screen) |
| STUDENT | Raw strings | PASS-by-design — `DUE/OVERDUE/LIVE/CLASS` are the R319 §B2 mono status-chip vocabulary (documented in-code, same register as the landing's status tags); no error keys/enums |
| STUDENT | States | PASS — pending mirror (header+hero+rows+statline skeletons, aria-busy), aggregate ErrorState+retry, EmptyCell empties, ADMIN/OWNER preview branch — all rendered in probe |
| TEACHER | Stat hierarchy | PASS — StatLine display values + tq-num tabular counts; VLM: "KPIs large display-size vs small labels" |
| TEACHER | Hairline discipline | PASS — RowList rows, hr-empty structured empties, hr-chip vocabulary |
| TEACHER | [nn] indices | **FAIL → FIXED** — three SectionHeaders + trend Card had no index seat |
| TEACHER | Raw strings | PASS — Arabic labels map every enum (RISK_LABEL etc.); course codes are data |
| TEACHER | States | PASS — page pending mirror + ErrorState; queue/today/risks/feed each pending/error/empty (all verified, incl. «لا انتظار — كل التسليمات مُقيَّمة» and «جميع طلابك في وضع جيد») |
| ADMIN | Stat hierarchy | **PARTIAL → FIXED** — KPI `StatStrip` cells already metric-rung (`--type-metric-size`, mono label, hairline cell dividers); but the «مؤشرات سريعة» `Stat` rows read one uniform `--fs-sm` rung (label AND value) |
| ADMIN | Hairline discipline | PASS — `.r305ao .stat-strip` internal hairlines; ledger panel |
| ADMIN | [nn] indices | **FAIL → FIXED** — the three cards had no index seat |
| ADMIN | Raw strings | PASS — all counts/labels Arabic; `Ctrl+K` is the shell's own token |
| ADMIN | States | PASS — pending mirror (strip+stat+charts slots), chrome-kept ErrorState+retry, chart empties («لا توجد بيانات طلاب بعد», «لا توجد بيانات أبحاث بعد» — the zero-trend arm verified), ActionStrip honest-absence (null when healthy) |
| OWNER | Stat hierarchy | PASS — StatLine metric values + owner-health rows (mono tabular `<bdi>` numerics) |
| OWNER | Hairline discipline | PASS — health-row hairlines, RowList compact density |
| OWNER | [nn] indices | **FAIL → FIXED** — four Cards had no index seat (loading mirror indexed too, so the pending→resolved handoff moves nothing) |
| OWNER | Raw strings | **FAIL → FIXED** — `actionLabel`/`resourceLabel` fell back to the RAW enum/Prisma model name (`COURSE_UPDATED`, `DEPARTMENT_CREATED` were on-screen in the probe); events rows now print Arabic for every action the backend writes (map extended to the full `auditLog.create` surface: COURSE_CREATED/UPDATED/DELETED, DEPARTMENT_CREATED, FACULTY_CREATED, OFFERING_CREATED, BULK_IMPORT + Course/CourseOffering/Department/Faculty/Enrollment/Institution resourceTypes) and unmapped codes degrade to «عملية نظام» / «سجلّ» with the technical token demoted to the `title` attribute |
| OWNER | States | PASS — loading mirror, ErrorState+retry, never-crash skeleton guard, alert band pending/healthy/degraded + retry, activity pending/error/empty («لا توجد أحداث بعد»), strip honest-absence |
| ALL | Unauth guard | PASS — `/student/dashboard` → redirect `/auth` (probe), `/auth` renders its error surface with the backend down (screenshot) |

## Fixes (owned files only)

- `frontend/src/pages/teacher/TeacherDashboardPage.tsx` — `[01]`–`[04]`
  `.w11-idx` chips into the three SectionHeader titles + the trend Card
  title; `inner.css` import. `PendingGradingQueue/TodayLectures/
  AtRiskShortcuts` take an `index` prop (component contracts otherwise
  untouched).
- `frontend/src/pages/admin/AdminPages.tsx` (dashboard section ONLY) —
  `[01]`–`[03]` chips on the three cards; «مؤشرات سريعة» Card gains
  `className="w11-quick"`; `inner.css` import.
- `frontend/src/pages/owner/OwnerDashboardPage.tsx` — `[01]`–`[04]`
  chips on the four Cards (loading mirror + resolved, one voice);
  ACTION_LABEL/RESOURCE_LABELS extended to backend parity; raw-enum
  fallbacks replaced (neutral Arabic + `title` attr); `inner.css` import.
- `frontend/src/styles/landing/inner.css` — EXTENDED (W10b file, nothing
  overwritten) with the `§W11` block: `.w11-idx` (the r319s-bar-index
  register spelled self-contained — those dashboards never load
  r319-student.css) and `.w11-quick` (admin-stat-value lifts from the
  uniform `--fs-sm` rung to the `--type-metric-size` metric rung,
  semibold + tabular; min-block-size 44px). Marker-scoped, unlayered
  (house inner.css contract), tokens only, logical properties, no
  `!important`, no ID selectors. Pages without the markers render
  byte-identical.
- `frontend/src/pages/student/DashboardPage.tsx` — **no changes needed**
  (already the §B2/R325 showpiece; its helpers' exported contracts kept
  byte-identical for the unit pins).

## Verification after the fixes

Re-probe (teacher/admin/owner happy @1440+390): `[01]`…`[nn]` markers
render, all role markers render, **suspect raw strings: none** (was
`['COURSE_UPDATED','DEPARTMENT_CREATED']` on owner pre-fix). VLM pass on
owner+admin-1440: indices visible, no raw enums, quick-stat values
clearly larger than labels, no layout breakage. Screenshots (before/
after, all variants): `/home/z/evidence-r332/w11/`.

## Gates

- `npx tsc -b --noEmit` — clean (exit 0).
- `npx -y stylelint@16 "src/styles/landing/inner.css"` — **0 issues**
  (file was clean before; no NEW issues introduced).
- `npx vitest run tests/unit/R305-dashboard-heron.test.tsx
  tests/unit/TeacherDashboard-trend.test.ts
  tests/unit/DashboardPage-agenda.test.ts
  tests/unit/DashboardPage-exams-resume.test.ts
  tests/unit/OwnerDashboard-action-strip.test.tsx` — **35/35 passed**
  (the action-strip pin is `.tsx` on disk; task's `.ts` suffix
  notwithstanding). No test edits; no pins moved.

## Honest unverified / notes

1. **Live-backend data states** — every dashboard was verified against
   the mock transport, not the real API. Wire-level drift (real payload
   shapes for teacher/admin/owner aggregates) remains unverifiable while
   the backend is down; payloads were authored to the hooks' TS
   interfaces, not observed responses.
2. **UI login** — the task's `*@test.ly` accounts are the shared table's
   demo domain (`shared/testAccounts.ts`), but UI login needs the
   backend; only the auth error surface could be exercised live. The
   mock's own login contract accepts only the e2e fixture account
   (`student@zu.edu.ly`), so the other roles boot via the same
   localStorage seed the repo's e2e fixtures use.
3. **Probe fixture gaps (loud 501s, tolerated by the app)** — shell
   chrome calls not on the dashboards' critical path: `GET
   /notifications` (teacher/admin/owner), `GET /me/profile` (student).
   Their absence changed nothing visible; noted for whoever extends the
   corpus.
4. **Six states per surface** is the long-term bar; this pass verified
   **loading/empty/error render** per dashboard (all pass). Deep states
   not exercised: offline/recovery arms, partial-failure (one section
   erroring while the page resolves — the student page's independent
   queries DID show it: results-500 hid GradeBars while everything else
   rendered), RTL dark theme (probe pinned light), and the `zh`/ar-LY
   date edges.
5. **Pre-existing flag, out of scope** — dev-run axe warnings on the
   student dashboard (`#cf4e27`-on-`#f6f6ee` at 11px, contrast ≈4.05) —
   token-owned colors in the r319 sheet, not a W11 file; reported for
   the color owner.
6. **Environment noise** — mid-session, `node_modules/.bin` churned
   (parallel waves installing) and one probe batch captured blank
   screenshots while Vite re-optimized; those runs were re-executed
   clean. Also `r305-admin-owner.css` was renamed to
   `shared/heron-admin-owner.css` by a parallel wave mid-pass — this
   work rode the new path without touching it.
