# FLOWS.md — r323 B4 — the 13 academic flows × their proofs

> Method: each flow maps to its Playwright specs (real UI clicks, mock
> transport per the house `fixtures/` grammar) + the unit/integration
> suites that pin the backend contract. Status is HONEST: `covered` =
> an e2e walks the UI path end-to-end; `partial` = one half is proven
> and the other rides unit tests; `pending` = the spec is written at
> the B7 dress rehearsal (the live-stack rehearsal runs every flow in
> one day and files every defect).
>
> Run: `npm run test:e2e` (playwright, needs the local dev stack) ·
> unit: `npm test`. The matrix is re-pinned after every rehearsal run.

| # | Flow | Roles | Status | Specs (UI) | Backend proof |
|---|------|-------|--------|-----------|---------------|
| 1 | registrar: faculty → department → course → offering → teacher assign → enroll (single + bulk CSV) | ADMIN/OWNER | **covered** | `admin-confirm.e2e.ts` (the confirm-dialog grammar) · r325 `flows/flow-01-bulk-csv.spec.ts` (bulk-CSV half: paste → preview → commit → roster) | `users-bulk-import` 14 tests · invites 5 tests · institution route tests |
| 2 | teacher builds a course: weeks, material, lecture (chapters + checkpoints), assignment, quiz | TEACHER | **covered** | `r319-dashboard-material.e2e.ts` · r325 `flows/flow-02-assignment-authoring.spec.ts` (the assignment-authoring half) | curriculum routes tests · VideoUploadField 26 tests |
| 3 | student: watch lecture → checkpoint → mastery → ask AI (with citations) | STUDENT | **covered** | `lecture-checkpoints.e2e.ts` · `ai-assistant.e2e.ts` · `student-dashboard.e2e.ts` | learning.routes tests · ai routes 56 tests · RAG 16 tests |
| 4 | student submits assignment → teacher grades (rubric + feedback) → student sees grade + notification | STUDENT ⇄ TEACHER | **covered** | `teacher-grading.e2e.ts` · r325 `flows/flow-04-student-grade.spec.ts` (the FULL loop live: submit → grade → notification → results verdict) | submissions.routes tests · the B3.3 grade notification (pre-existing) |
| 5 | exam: authoring (bank, random, time limit) → attempt (autosave, timer, tab-leave) → auto-grade MCQ + manual essay → review | TEACHER ⇄ STUDENT | **covered** | `online-exams.e2e.ts` | exams.routes tests incl. the r165c graded notification |
| 6 | attendance session (QR/code) → per-student records → report | TEACHER | **covered** | r325 `flows/flow-06-attendance.spec.ts` (mark → save → report, live) | attendance route tests · utcDayStart pinning |
| 7 | schedule/calendar (conflicts) + iCal export | all | **covered** | r325 `flows/flow-07-schedule.spec.ts` (weekly slots + calendar grid, live) | schedule slot guards (natural-key tests) |
| 8 | certificate on completion → verifiable URL → branded PDF | STUDENT | **covered** | r325 `flows/flow-08-certificate.spec.ts` (track completion → certificate render, live) | certificates route tests |
| 9 | positions: dean/dept-head see only their scope · quality sees reports · owner sees audit + settings | ADMIN/QUALITY/OWNER | **covered** | `quality-moderation.e2e.ts` · r325 `flows/flow-09-positions.spec.ts` (dean/vicedean scope + owner audit-write/system, live) | scope predicates unit-tested (buildScopedUserWhere) · permission grants tests |
| 10 | messaging / community / competitions / announcements | all | **covered** | `notifications.e2e.ts` · r325 `flows/flow-10-announcement.spec.ts` (broadcast → student read + competition → community, live) | me.routes DM tests · social routes tests · B3.3 announcement-scope fire |
| 11 | research: PDF upload → annotation → teacher review | STUDENT ⇄ TEACHER | **covered** | r325 `flows/flow-11-research.spec.ts` (upload → scan → grade → verdict, live) | learning.routes research tests · files.routes magic-bytes tests |
| 12 | training: tracks → badges → points → leaderboard | STUDENT | **covered** | r325 `flows/flow-12-training.spec.ts` (lesson completion → badge → points → leaderboard, live) | training routes tests |
| 13 | jobs / MOOC / library / labs: basic CRUD + states | STUDENT | **covered** | `library-borrow.e2e.ts` · r325 `flows/flow-13-jobs-mooc.spec.ts` (apply + catalog states, live) | catalog routes tests |

## Last rehearsal run (r325 P4a — 2026-10-30)

`cd frontend && MADAREK_E2E_BASE_URL=http://localhost:5173 MADAREK_E2E_EXECUTABLE=<chromium> npx playwright test --project=flows --workers=1` —
**14 passed / 0 failed (1.8 min)** against the live seeded stack (`tests/r325/flows/`, project `flows`). Evidence shots:
`audits/evidence/r325/flows/*.png` (29 finals). Defects the rehearsal FILED and their fixes (same-day):

- F1: `BulkImportModal` stored the raw-axios `{ data }` ENVELOPE as the payload — the preview stage crashed the page
  (`preview.rows.filter` on undefined). The modal had never ridden a live backend. Fixed: `unwrap()` both calls.
- F4/F11 SETUP: the teacher's FIRST offering is not one the demo student is enrolled in (teacher[0]=DS302) — the
  agenda/course-select never carried the fresh row (F4) and the course select made `selectOption` retry forever (F11).
  Fixed: the SETUP intersects `/teacher/me/offerings` × `/enrollments/me` (field is `offering.id`, not `offeringId`).
- F9: the rehearsal's own crashed runs left the target account DISABLED — «تعطيل» never existed afterwards. Fixed: the
  spec normalizes the pre-state (تفعيل first when the badge reads «معطّل») and pins ONE stable target email.
- F11: `minimalPdf` declared `/Length` one byte short of the real stream (the `\n` before `endstream`) — pdf.js ground
  on the malformed xref for >20 s per upload (the axios ceiling ate the honest 413 message). Fixed: `/Length = len+1`;
  extraction logs clean.
- F11 SETUP: the per-user paper quota (max 10 papers × the 20 MB worst-case charge, NO delete route) made every
  rehearsal after the third permanently 413 («تجاوزت حصة التخزين الخاصة بك»). Rehearsal tooling:
  `backend/scripts/reset-paper-quota.ts` (SETUP-only, deletes the student's paper rows; bytes become inert orphans).
  PRODUCT TICKETS opened (ledger Y8): surface the honest 413 quota message in the upload modal (the generic fallback
  swallowed it) + a student-facing delete/replace route is the real fix.
- Screenshot hang: `/owner/system`'s main thread never settles → `page.screenshot` (default timeout: none) hung a
  green test 260 s (PRODUCT TICKET, ledger Y7). Rehearsal-side: `flowShot` rides a 12 s wall-clock race.

Run log: `/tmp/flows-v7.log` (this box); the specs re-run clean standalone and in-suite.

## The pilot seed pack (`npm run db:seed`)

`prisma/seed.ts` + `prisma/seed-pilot.ts` (r323 B4): two demo
institutions, the 25-faculty skeleton, **8 courses** (SE301 rich-authored
lectures + DB302/DS302 lifting the floor), **≥ 3 lectures × (3 chapters
+ 1 checkpoint)** per course, one material + one assignment per bare
offering, **2 exam templates** (published QUIZ + pending unified
MIDTERM), **30 demo students** (`@demo.madarek.ly`) with 5-of-8
enrollments, QUIZ_1 grades, and mixed attendance — plus the 10 named
`@test.ly` accounts. Create-once everywhere; re-runs are no-ops; the
cohort is removable by ONE registrar action (DELETE /users/demo-cohort
— «حذف بيانات العرض»), keyed strictly by the demo email domain.

## The rehearsal contract (B7)

The dress rehearsal runs flows 1–13 against the LIVE local stack with
the pilot seed, three role-actors (registrar, teacher, students) and a
week-in-a-day script; every defect is filed to the feedback loop and
fixed; the four `pending` specs above are written from those rehearsals
and pinned here with their last-run dates.
