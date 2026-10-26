# R320 §C — Test accounts proof (every account logs in)

**Task:** c1-ACCOUNTS · **Cycle:** R320 Cycle 1 · **Branch:** `r320/accounts`
**Date:** 2026-10-26 (local sandbox, UTC; re-proven after the job-label
corrections أخصائي جودة / مالك المنصة and the dev-full proxy fix, and
re-proven again at close on the final tree — tsc 0/0/0 · vitest front
2604/2604 · back 1798/1798 · eslint 0 errors)

## Method

Full local stack, booted exactly as the §C-7 bar prescribes:

```
embedded PostgreSQL :5434  (scripts/r319/local-db.mjs)
prisma migrate deploy + db:seed  (corpus + ensureTestAccounts)
backend API  :4253   (MADAREK_TEST_ACCOUNTS=1 — boot-time ensure ON)
vite web     :4254   (dev-full passes VITE_API_TARGET=…:4253 to the proxy)
```

Boot log (verbatim, `/tmp/r320-accounts-devfull.log`):

```
[api] 🧪 Test accounts ensured (10 jobs) — MADAREK_TEST_ACCOUNTS=1
[api] 🚀 Madarek Platform API listening on http://0.0.0.0:4253 (development)
```

For EVERY account in the shared table (`shared/testAccounts.ts`, physically
`backend/src/modules/auth/test-accounts.data.ts`, password `12345678`):

- **API login** — `POST /api/v1/auth/login {email, password}` → expect
  `200` + `data.accessToken`.
- **UI login @390px** — playwright-core chromium, 390×844 @2x, locale `ar`:
  fill «البريد الإلكتروني أو رقم القيد» + «كلمة المرور» on `/auth`, press
  «تسجيل الدخول», wait for the role's home route AND its visible H1,
  screenshot (JPEG ≤150 KB).
- Proof harness: `scripts/r320/login-proof.ts` (committed); raw rows in
  `proof.json`.

Note (found during this proof): `dev-full.mjs` did not forward a custom
`MADAREK_API_PORT` into the Vite `/api` proxy (default `:4000`), so browser
logins 500'd on custom ports — fixed in this branch (the web child now gets
`VITE_API_TARGET=http://localhost:$API_PORT` unless explicitly overridden).

## Results — 10/10 accounts proven, 0 P0

| Job | Email | Role | API | Token | Route reached | Screenshot |
|---|---|---|---|---|---|---|
| طالب | student@test.ly | STUDENT | 200 | ✓ | /student/dashboard | student.jpg (60K) |
| طالب ثانٍ (للرسائل/المجتمع) | student2@test.ly | STUDENT (مؤسسة الأندلس) | 200 | ✓ | /student/dashboard | student2.jpg (60K) |
| أستاذ | teacher@test.ly | TEACHER | 200 | ✓ | /teacher/dashboard | teacher.jpg (59K) |
| رئيس قسم | head@test.ly | TEACHER · DEPARTMENT_HEAD | 200 | ✓ | /teacher/dashboard | head.jpg (59K) |
| عميد | dean@test.ly | TEACHER · DEAN | 200 | ✓ | /teacher/dashboard | dean.jpg (59K) |
| نائب عميد | vicedean@test.ly | TEACHER · ASSOCIATE_DEAN | 200 | ✓ | /teacher/dashboard | vicedean.jpg (59K) |
| المسجل العام | registrar@test.ly | ADMIN (university-wide) | 200 | ✓ | /admin/dashboard | registrar.jpg (58K) |
| مسجل كلية (نطاق كلية) | faculty@test.ly | ADMIN · scopeFacultyId | 200 | ✓ | /admin/dashboard | faculty.jpg (59K) |
| أخصائي جودة | quality@test.ly | QUALITY | 200 | ✓ | /quality/dashboard | quality.jpg (60K) |
| مالك المنصة | owner@test.ly | OWNER (no membership) | 200 | ✓ | /owner/dashboard | owner.jpg (62K) |

No errors on any account. All ten JPEG screenshots are ≤150 KB
(780×1688 — 390×844 @2x, locale ar, light).

## Old-credentials audit (`rg "demo\.madarek\.ly|Madarek2026"`)

Every remaining hit is intentional (classified):

- **Immutable history** — `backend/prisma/migrations/
  20261019000000_r188_demo_institution_rebrand/migration.sql` (the r188
  rename zu.edu.ly → demo.madarek.ly; migrations never change).
- **Archives + historical logs** — `scripts/archive/*` (untouched per the
  brief), `audits/evidence/r313/**` (historical capture evidence),
  `CHANGELOG.md` (3 historical entries), `docs/archive/*`,
  `docs/design/r190-wave-d-recipe.md` (historical design recipe),
  `docs/redesign/handoff/4d-admin-owner.md` (historical handoff),
  `docs/runbooks/restore-exercise-log.md` (a past exercise's log).
- **Explicitly-historical mentions** — `docs/12-deployment.md` +
  `docs/10-security.md` say «على نطاق demo.madarek.ly **السابق**» (the
  FORMER domain) inside the R320 §C context; `docs/launch-readiness.md`
  describes the historical r188 migration.
- **The fictional demo institution's CONTACT identity (not credentials)** —
  `PaymentPage/CampusMapPage/ProfilePage/MorePages` show
  `info@`/`ico@demo.madarek.ly` + `https://demo.madarek.ly` as the
  fictional «جامعة مدارك التجريبية»'s public website/contact emails
  (the project's own domain); the test-ACCOUNT domain `@test.ly` is a
  different artifact. Also `backend/src/lib/zu-sync/static-source.ts`
  (the same fictional contact identity in the ZU-sync demo source).

Zero live credential fixtures, seeds, tests or docs still carry the old
pair.

## Skipped job (honest)

**طالب قيد الاعتماد** (pending@test.ly) — NOT implemented: the schema has
no pending/approval user state (`User.isActive` is a plain boolean,
registration is instant-active; the only `PENDING_*`/`SUSPENDED` enums are
exam/workflow/institution statuses — verified in `backend/prisma/schema.prisma`).
Documented in the shared table's header; add the row when an approval
workflow lands.

## Stack teardown

API :4253, web :4254 and pg :5434 all verified DOWN after the proof run
(`ss -tln` — ports closed; pg stopped via `local-db.mjs stop`).
