# Page Ledger — R353 P1 · سجلّ الصفحات

> **R356 Lane 2c re-run (2026-11-16, sha `c83f6d67` + the Lane 2c fixture work):**
> the FULL crawl re-executed after the R355 copy diet, with fixtures for every
> parametrized route — **129 route-crawls · ZERO findings** (every route × role ×
> 4–5 widths × light+dark). The 17 param routes below are RESOLVED (populated
> detail layouts crawled clean); two intentional-chrome entries joined the written
> allowlist (`div.r349p-savebar`, `div.auth-grain` — reasons in
> `scripts/qa/overlap-allow.json`). The full result set: `/tmp/r356/final-*.json`
> (23 chunk files, all `[]`).

**The "open every page literally" crawl.** Every authed route per role + every public surface, crawled with the hermetic per-role harness (`scripts/qa/overlap.mjs --seed <role>` — the mock API seeds the role's session, no backend needed), at **360×640 / 768×1024 / 1024×768 / 1440×900** (the 5 headline public surfaces also at **390×844**) × **light + dark**, scrolled stop-by-stop, probed for: text-on-text, text-on-media, fixed-over-text, big-fixed covers, clipped text, horizontal overflow.

- Date: 2026-11-15 · sha `99dfe80` (+ the two probe commits in this branch) · **110 route-crawls · 981 evidence screenshots** (`/tmp/p1/shots-*`, one PNG per route×width×theme at the top stop — re-crawl any time with the commands below).
- **Verdict: ZERO overlaps, ZERO clips, ZERO horizontal scroll, ZERO dead-probe findings on every crawled page, every role, every width, light + dark.**
- The ONE real defect the full crawl found — the landing journey annotation «[04] المكتبة» kissing the plan's own «المكتبة والبحوث» label at 1024×768 (39×5px corner, frac 0.59) — is FIXED in this branch (journey.css: the 992–1439 band moves anno-2 down one rung) and re-verified clean at all 5 widths × both themes.
- Four probe false-positive classes were closed in the probe itself (never allowlisted): closed `<details>` phantom rects (1266 phantom pairs on /help), `sr-only`/`visually-hidden` rects in the text set (32 phantom clips + phantom fixed-over-text), plus 3 documented intentional-chrome allowlist entries (`nav.sidebar.collapsed`, `div.pf-filterbar.sticky`, `div.pf-split-detail` — each with its written reason in `scripts/qa/overlap-allow.json`).

## Per-cluster verdicts

| cluster | routes crawled | verdict |
|---|---|---|
| Public (/, /about, /help, /features, /universities) @ **5 widths** incl. 390×844 | 5 | CLEAN (after the anno-2 fix) |
| Public B (/contact /app /capabilities /colleges /colleges/leaderboard /community /competitions /training) | 8 | CLEAN |
| Public C (/vision /legal/* ×6 /auth) | 8 | CLEAN |
| Public D (/auth/forgot-password /register /auth/register /403 /404 /500 /maintenance) | 7 | CLEAN |
| Student A–D (36 routes, seed student: dashboard, courses, courses/:offeringId, matrix, library, schedule, results, exams, online-exams, lectures ×2 fixtures, training, achievements, community, colleges, payment, profile, research, skills, social, university, webinars, calendar, catalog, downloads, gamification, jobs, labs, live, map, messages, mooc, alerts, ai, ar, /settings) | 36 | CLEAN |
| Teacher A–B (19 routes, seed teacher: dashboard, students, exams, grades, assignments, attendance, labs, library, materials, messages, schedule, performance, profile, research, intelligence, community, alerts, ai, live) | 19 | CLEAN |
| Admin/registrar A–B (14 routes, seed registrar: dashboard, students, teachers, courses, faculties, directory, reports, analysis, settings, import, mail, alerts, community, digital) | 14 | CLEAN |
| Quality A–B (10 routes, seed quality: dashboard, courses, curriculum, professors, engagement, reports, exam-moderation, alerts, community, notifications) | 10 | CLEAN |
| Owner A–B (13 routes, seed owner: dashboard, users, institutions, education, governance, system, content, feedback, activity, realtime, ai, alerts, notifications) | 13 | CLEAN |

**Route total: 110 crawls (104 unique routes + /settings ×2 seeds + the 5-width public re-verification).**

## Unresolved param routes — RESOLVED in R356 Lane 2c

`/student/online-exams/exm_e2e_quiz3` · `/student/training/study-skills-e2e` (+ `/lesson/les_e2e_recall`) · `/teacher/exams/tpl_e2e_quiz4` · `/teacher/intelligence/offr_e2e_algorithms` · `/admin/people/spr_e2e_amna` · `/admin/permissions/usr_e2e_teacher` · `/owner/institutions/zu` · `/colleges/clg_e2e_eng` · `/competitions/cmp_e2e_ai` · `/vision/ai-predictor` (+ `/vision/voice-assistant`) · `/auth/reset-password?token=…` · `/document/:filename` — every parametrized route now has a populated fixture (the Lane 2c block in `frontend/tests/e2e/fixtures/api-fixtures.ts` + the routes in `mock-transport.ts`), and each crawled its REAL detail layout clean at 4–5 widths × light/dark. `/document/:filename` remains an honest-error-state crawl by design (the PDF bytes live under `/files/**`, outside the `/api/**` mock transport's reach — the viewer's error layout is the truthful hermetic state).

## Honest 501s inside crawled routes (the page renders its empty state — clean)

`/api/v1/me/results`, `/api/v1/me/research`, `/api/v1/jobs?limit=50`, `/api/v1/ar-experiences`, `/api/v1/messages?page=1&limit=30`, `/api/v1/live/sessions`, `/api/v1/admin/papers`, `/api/v1/admin/digital`, `/api/v1/quality/engagement`, `/api/v1/me/permissions`, `/api/v1/owner/system`, `/api/v1/owner/alerts`.

## Re-run (CI-able) — the exact commands

```bash
cd frontend && npm run build && (npx vite preview --port 4173 --strictPort &)
# public (no seed):            node scripts/qa/overlap.mjs --url http://localhost:4173 --routes <csv> --bps 360x640,390x844,768x1024,1024x768,1440x900 --themes light,dark --out /tmp/p1/<name>.json --shots /tmp/p1/shots-<name>
# per role (hermetic seed):    … --seed student|teacher|registrar|quality|owner …
```

Exit 0 = clean. The probe prints the per-class totals; the JSON carries only defective stops (all files are `[]` today — the clean crawl leaves no rows).
