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
| 1 | registrar: faculty → department → course → offering → teacher assign → enroll (single + bulk CSV) | ADMIN/OWNER | **partial** | `admin-confirm.e2e.ts` (the confirm-dialog grammar) | `users-bulk-import` 14 tests · invites 5 tests · institution route tests |
| 2 | teacher builds a course: weeks, material, lecture (chapters + checkpoints), assignment, quiz | TEACHER | **partial** | `r319-dashboard-material.e2e.ts` · `r305` teacher suites | curriculum routes tests · VideoUploadField 26 tests |
| 3 | student: watch lecture → checkpoint → mastery → ask AI (with citations) | STUDENT | **covered** | `lecture-checkpoints.e2e.ts` · `ai-assistant.e2e.ts` · `student-dashboard.e2e.ts` | learning.routes tests · ai routes 56 tests · RAG 16 tests |
| 4 | student submits assignment → teacher grades (rubric + feedback) → student sees grade + notification | STUDENT ⇄ TEACHER | **partial** | `teacher-grading.e2e.ts` (the grading half) | submissions.routes tests · the B3.3 grade notification (pre-existing) |
| 5 | exam: authoring (bank, random, time limit) → attempt (autosave, timer, tab-leave) → auto-grade MCQ + manual essay → review | TEACHER ⇄ STUDENT | **covered** | `online-exams.e2e.ts` | exams.routes tests incl. the r165c graded notification |
| 6 | attendance session (QR/code) → per-student records → report | TEACHER | **pending** | — (rehearsal) | attendance route tests · utcDayStart pinning |
| 7 | schedule/calendar (conflicts) + iCal export | all | **pending** | — (rehearsal) | schedule slot guards (natural-key tests) |
| 8 | certificate on completion → verifiable URL → branded PDF | STUDENT | **pending** | — (rehearsal) | certificates route tests |
| 9 | positions: dean/dept-head see only their scope · quality sees reports · owner sees audit + settings | ADMIN/QUALITY/OWNER | **partial** | `quality-moderation.e2e.ts` | scope predicates unit-tested (buildScopedUserWhere) · permission grants tests |
| 10 | messaging / community / competitions / announcements | all | **partial** | `notifications.e2e.ts` · `guest-landing.e2e.ts` (public shells) | me.routes DM tests · social routes tests · B3.3 announcement-scope fire |
| 11 | research: PDF upload → annotation → teacher review | STUDENT ⇄ TEACHER | **pending** | — (rehearsal) | learning.routes research tests · files.routes magic-bytes tests |
| 12 | training: tracks → badges → points → leaderboard | STUDENT | **pending** | — (rehearsal) | training routes tests |
| 13 | jobs / MOOC / library / labs: basic CRUD + states | STUDENT | **partial** | `library-borrow.e2e.ts` (borrow path) | catalog routes tests |

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
