# R320 §C-7 — Test accounts proof on PRODUCTION (the "after deploy" leg)

**Date:** 2026-10-28 · **Target:** `https://madarek.onrender.com`
**Deployed build at proof time:** `f7b85294c169` (health `buildId`, CI green)
**Harness:** `scripts/r320/login-proof.ts --api … --web … --out audits/evidence/r320/accounts-production`
(+ `scripts/r320/admin-clip-probe.mjs` for the panel re-shot and the tour-veil finding)

The cycle-1 proof (`accounts.md`) closed the LOCAL leg. This file closes the
§C-7 production leg the brief requires: *after deploy, log in as EVERY
account on production (API) and as each via the UI at 390 px*.

## The registrar name drift — found by this proof run, fixed, and healed

The first production login read `firstName: "إدارة", lastName: "الجامعة"` —
the pre-rename name. Root cause (measured, not guessed): `db:seed` runs
`ensureTestAccounts()` BEFORE the corpus body, and `ACCOUNT_PROFILES` (the
twin table in `backend/src/modules/auth/test-accounts.ts`) still carried the
pre-rename name while the corpus (`prisma/seed.ts`, c1-RENAME) had renamed it
to «المسجل العام»; the upsert's update branch healed only the password, so
the row created 2026-10-26 kept the dead name forever. Fixed in `3664c111`
(twin-table lockstep + name-healing update branch + render.yaml now declares
`MADAREK_TEST_ACCOUNTS='1'`; belt 12→14). After the deploy of `3664c111`,
production reads:

```
registrar@test.ly → name: المسجل العام · initials: مع · role: ADMIN
```

## Results — 10/10 accounts proven on production, 0 P0

| Job | Email | Role | API | Token | Route reached | Screenshot |
|---|---|---|---|---|---|---|
| طالب | student@test.ly | STUDENT | 200 | ✓ | /student/dashboard | student.jpg |
| طالب ثانٍ | student2@test.ly | STUDENT (مؤسسة الأندلس) | 200 | ✓ | /student/dashboard | student2.jpg |
| أستاذ | teacher@test.ly | TEACHER | 200 | ✓ | /teacher/dashboard | teacher.jpg |
| رئيس قسم | head@test.ly | TEACHER · DEPARTMENT_HEAD | 200 | ✓ | /teacher/dashboard | head.jpg |
| عميد | dean@test.ly | TEACHER · DEAN | 200 | ✓ | /teacher/dashboard | dean.jpg |
| نائب عميد | vicedean@test.ly | TEACHER · ASSOCIATE_DEAN | 200 | ✓ | /teacher/dashboard | vicedean.jpg |
| المسجل العام | registrar@test.ly | ADMIN (university-wide) | 200 | ✓ | /admin/dashboard | registrar.jpg |
| مسجل كلية (نطاق كلية) | faculty@test.ly | ADMIN · scopeFacultyId | 200 | ✓ | /admin/dashboard | faculty.jpg |
| أخصائي جودة | quality@test.ly | QUALITY | 200 | ✓ | /quality/dashboard | quality.jpg |
| مالك المنصة | owner@test.ly | OWNER (no membership) | 200 | ✓ | /owner/dashboard | owner.jpg |

All UI logins at 390×844 @2x, locale `ar`, light. The registrar logged in
THROUGH the demo panel's one-tap flow (تعبئة → the same button flips to دخول →
submitted) — proving the panel itself works on the deployment, not just the
form fields.

## Demo panel on production — works

- The reopen chip (`.auth-demo-hint-reopen`) opens the panel on `/auth`.
- **10 rows** rendered (`.auth-demo-row`), grouped التعليم/الإدارة/النظام.
- `demo-panel-390.jpg` (rows scrolled into frame). Raw check: `panel.json`.

## VLM review of the evidence (the "look at it" pass)

- `registrar.jpg` / `registrar-top-390.jpg`: framed sheet design ✓, the old
  label «إدارة الجامعة» **does not appear** ✓ — but the review flagged the
  page's display-size H1 poking 8 px above the onboarding tour card as
  unreadable glyph stubs (measured: `pf-page-title` t=113 vs `modal-card`
  t=121 at 390). Fixed the same cycle: the tour overlay now carries the
  Heron menu scrim (`--glass-bg-strong`, paper/ink @92 %) —
  `.modal-overlay:has(.onboarding-flow)` in `r305-shell.css` §7,
  belt-pinned in `OnboardingFlow.test.tsx` (rule presence + token 0.92 in
  both themes). First attempt (a9e071a3) carried a `.has-shell` prefix and
  never matched — the modal PORTAL renders at body level, outside the
  shell container (measured: rule in the built CSS, computed veil still
  40 %); fixed in 5b7369f9 (prefix dropped, belt re-pinned). After-verify
  on production: computed veil `rgba(246,246,238,0.92)` ✓ · VLM: no
  stubs, clean uniform scrim, card edge clean, 9/10 (was 6/10).
- `registrar-dashboard-390.jpg`: the clean dashboard after dismissing the
  tour (no mechanical text clip found by the DOM audit — the only
  `text-outside-box` hits are the four deliberate `sheet-mark` ± corner
  marks and the standard `sr-only` live region).

## Honest notes

- The proof harness logs in 10 × API + 10 × UI; the auth rate limiter counts
  only FAILED attempts (`skipSuccessfulRequests`), so the run never trips it.
- `pending@test.ly` remains the documented honest skip (no pending/approval
  user state in the schema — see `accounts.md`).
- Screenshots ≤ 150 KB each (JPEG q72, 780×1688).
