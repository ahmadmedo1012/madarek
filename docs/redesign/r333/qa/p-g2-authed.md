# P-G2 — Authenticated web: capture + first-pass rubric (R333)

Task P-G2 · 2025-11-03 · Reviewer: sub-agent P-G2 (playwright-chromium + VLM first-pass; stills only — motion criteria #6/#7/#8 NOT scored, per rubric §3.2).
Evidence root: `/home/z/evidence-r333/p-g2/` (40 PNGs + 6 contact sheets + 5 VLM verdict JSONs + per-role summary JSONs).

## Method (proven recipe, reusable)

- Boot: `node scripts/r319/local-db.mjs start` → `export DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev` → **`bash /home/z/evidence-r333/p-g2/boot.sh -- CMD`** (wrapper around dev-once.sh, see §Infrastructure fixes).
- Login: in-page `fetch('/api/v1/auth/login')` (vite proxy, no CORS), then **`localStorage['mdrk-auth']` = `{state:{user, accessToken, memberships, currentInstitution, membershipRole}, version:1}`** injected via `context.add_init_script` on every context (zustand persist v1 shape from `frontend/src/stores/auth.store.ts`). `madarek.intro.v1='1'` set to skip intro.
- Deep-link discovery: anchors scraped from rendered pages (offering → lecture → exam ids; owner institution slug). All succeeded.
- Screenshots: full-page, 1440×900 (dsf 1) + top pages 390×844 (dsf 2), `reduced_motion=reduce`, `networkidle`+1200ms.
- Capture scripts: `capture.py` (per role), `recapture-dash.py` (dashboards with onboarding modal dismissed).

## ⚠ Infrastructure fixes (needed by every future capture agent)

1. **dev-once.sh's vite dies with `ENOSPC: file watchers`** (inotify exhausted) and `fuser` is **not on the sandbox PATH** — dev-once's port cleanup silently no-ops, so *stale vites from earlier runs kept serving* with cold dep caches → `504 Outdated Optimize Dep` on lazy chunks (AuthPage etc.), blank captures. Fix in `boot.sh`: `pkill -f vite/tsx`, warm cache with `npx vite optimize --force` **before** serving, start vite without `--force`, `export CHOKIDAR_USEPOLLING=true CHOKIDAR_INTERVAL=400` (chokidar honors it — verified in vite bundle), liveness re-check 3s after ready. Also `--disable-gpu --disable-dev-shm-usage` on chromium (a headless-shell crash hit one screenshot).
2. **Onboarding modal auto-starts on every fresh authed session** (`AppShell` + `onboarding.store.ts`; test accounts have `onboardingCompletedAt=null`) → first-pass dashboards captured dimmed behind it. Dashboards re-captured with modal dismissed (Escape; session-scoped, no backend state mutated). There is **no hermetic e2e opt-out for onboarding** (intro has one) — ticket Q-10.
3. Login rate limiter: 1 login/role/call, token reused across contexts — no 429s.

## Pages captured (role → files in /home/z/evidence-r333/p-g2/)

| Role | @1440 (8) | @390 |
|---|---|---|
| student | dashboard, courses, course-detail (cmw15e502…), lecture-player (cmw15e5ct…), exams, exam-taking (cmw15e583…), ai, schedule | dashboard, courses, course-detail |
| teacher | dashboard, students, grades, exams, assignments, attendance, schedule, materials | dashboard, students, grades |
| owner | dashboard, institutions, institution-detail (madarek-demo), users, activity, realtime, governance, feedback | dashboard, institutions |
| quality | dashboard, courses, professors, reports, exam-moderation | dashboard |
| registrar (ADMIN) | dashboard, students | — |

BROKEN-STATE pages: **none** (all pages rendered; zero console errors except one axe warning, below).

## First-pass scores (stills; #6 motion / #7 scroll / #8 micro NOT scored)

C=composition, T=typography, S=spacing, D=density/contrast/legibility, K=consistency, P=polish. Ø = mean of 6.

### Student
| page | C | T | S | D | K | P | Ø |
|---|---|---|---|---|---|---|---|
| dashboard (modal dismissed) | 6 | 6 | 5 | 5 | 6 | 5 | **5.5** |
| courses | 7 | 6 | 6 | 7 | 6 | 6 | **6.3** |
| course-detail | 6 | 6 | 5 | 6 | 5 | 5 | **5.5** |
| lecture-player | 7 | 6 | 6 | 6 | 6 | 6 | **6.2** |
| exams | 5 | 5 | 5 | 5 | 5 | 5 | **5.0** |
| exam-taking | 3 | 4 | 3 | 4 | 4 | 3 | **3.5** |
| ai | 6 | 5 | 5 | 6 | 5 | 5 | **5.3** |
| schedule | 7 | 6 | 6 | 7 | 6 | 6 | **6.3** |

Reasons (one-line): dashboard — bottom half is a dead zone, schedule rows truncate raw codes (CT341/13391) with em-dash cells; courses — clean [01]/[02] card rhythm but duplicated H1 «مقرراتي الدراسية» and raw CT141K badges; course-detail — title clipped under top bar, stats row reads backwards in RTL, 2024/1446 strings; lecture-player — good dark focal panel but video shows error state with harsh red seam; exams — half-empty with floating card + duplicated header; **exam-taking — ~80% whitespace, one lonely button, placed-not-staged**; ai — uneven task-card grid, mixed EN strings, dark bar off-palette; schedule — disciplined timetable but filler-identical rows, truncated titles.

### Teacher
| page | C | T | S | D | K | P | Ø |
|---|---|---|---|---|---|---|---|
| dashboard (modal dismissed) | 7 | 6 | 6 | 6 | 6 | 6 | **6.2** |
| students | 6 | 6 | 6 | 6 | 6 | 6 | **6.0** |
| grades | 5 | 6 | 5 | 6 | 6 | 5 | **5.5** |
| exams | 5 | 6 | 5 | 6 | 6 | 5 | **5.5** |
| assignments | 5 | 6 | 5 | 6 | 6 | 5 | **5.5** |
| attendance | 6 | 6 | 5 | 6 | 6 | 5 | **5.7** |
| schedule | 4 | 5 | 3 | 5 | 5 | 4 | **4.3** |
| materials | 6 | 6 | 6 | 7 | 7 | 6 | **6.3** |

Reasons: dashboard — decent 3-column rhythm, «لا توجد محاضرات» band is low-content; students — solid table but raw DEMO-2026-001 IDs + placeholder-looking 0%/100% columns; grades/exams/assignments — clean type, big voids between fragments, duplicated breadcrumb+H1; attendance — LTR dates (11/03/2026) break RTL flow, row clipped at fold; **schedule — narrow right-hugging column leaves a huge empty canvas, truncated cards, EN/AR codes (SEC101/WEB301)**; materials — densest, most consistent; identical 48.0 KB placeholders betray staging.

### Owner
| page | C | T | S | D | K | P | Ø |
|---|---|---|---|---|---|---|---|
| dashboard (modal dismissed) | 6 | 5 | 5 | 4 | 6 | 4 | **5.0** |
| institutions | 6 | 6 | 6 | 6 | 7 | 6 | **6.2** |
| institution-detail | 6 | 6 | 5 | 6 | 6 | 6 | **5.8** |
| users | 6 | 6 | 6 | 5 | 6 | 5 | **5.7** |
| activity | 5 | 6 | 6 | 4 | 6 | 6 | **5.5** |
| realtime | 6 | 7 | 6 | 5 | 6 | 6 | **6.0** |
| governance | 6 | 6 | 6 | 6 | 6 | 5 | **5.8** |
| feedback | 5 | 6 | 5 | 4 | 6 | 5 | **5.2** |

Reasons: dashboard — header duplicated twice, near-empty alert bars, low-contrast donut legend, footer rows clipped mid-line; institutions — disciplined table, raw seed emails (registrar@test…) + truncated lat/long; institution-detail — uneven dead zones inside collapsed faculty cards, LTR-mixed row headers; users — six near-identical rows, repeated «عضة معائلة» pills (also a **typo: should be «عضو معاين»**), wide dead column; activity — one giant empty state, zero-contrast body; realtime — thin data (three 0-counters), floating filter bar, mixed-direction timestamp; governance — tabular donut center works, tiny axis glyphs, clipped bottom canvas; feedback — empty tabs, duplicated heading, form cut at edge.

### Quality (QUALITY) + Registrar (ADMIN)
| page | C | T | S | D | K | P | Ø |
|---|---|---|---|---|---|---|---|
| quality/dashboard ⚠MODAL-OPEN capture | 4 | 4 | 5 | 4 | 5 | 4 | **4.3 (provisional)** |
| quality/courses | 6 | 6 | 6 | 6 | 6 | 6 | **6.0** |
| quality/professors | 6 | 6 | 6 | 6 | 6 | 6 | **6.0** |
| quality/reports | 6 | 6 | 6 | 6 | 6 | 6 | **6.0** |
| quality/exam-moderation | 5 | 6 | 5 | 6 | 6 | 5 | **5.5** |
| registrar/dashboard (modal dismissed) | 6 | 6 | 6 | 5 | 6 | 5 | **5.7** |
| registrar/students | 6 | 6 | 6 | 6 | 6 | 6 | **6.0** |

⚠ quality-dashboard was captured with the onboarding modal still open (not in the dismiss re-run) — rescore before judging. Underlying skeleton reads half-empty regardless.

## Worst 3 overall (product-truth captures)

1. **student/exam-taking — 3.5** (`student-exam-taking-1440.png`): ~80% dead whitespace, a single floating button, duplicated title, orphaned nav text mid-paragraph. Needs a full re-stage.
2. **teacher/schedule — 4.3** (`teacher-schedule-1440.png`): content hugs the right edge inside a vast empty canvas; truncated card titles; mixed EN/AR section codes; no focal hierarchy.
3. **owner/dashboard — 5.0** (`owner-dashboard-1440.png`): duplicated header, near-empty alert strips at tiny centered type, donut legend without readable labels, footer clipped mid-row.
(Honorable mention: student/exams 5.0, owner/feedback 5.2, student/ai 5.3.)

## Mobile 390 first-pass (modal-open dashboards = stale cells; recaptured clean files on disk)

Best: owner/institutions-390 (6.2-class, tuned form rhythm). Fails: **teacher/students-390 — modal card heading overflows card width at 390 (truncation/overflow failure)**; student/course-detail-390 — stats row cramped; most dashboards-390 — greeting/hero oversized, scrim kills legibility (capture artifact for the modal cells).

## Rebuild queue (every page <8; craft-system fixes, ranked)

| # | ticket | pages | craft-system fix |
|---|---|---|---|
| Q-1 | Re-stage exam-taking | student/exam-taking | one focal scenario (exam header, timer, question sheet skeleton, [nn] index), designed ready-state instead of a lone button; kill duplicate title |
| Q-2 | Rebuild teacher schedule grid | teacher/schedule | full-width time grid, RTL-first day columns, hairline cells, tabular times, no EN codes without Arabic pair |
| Q-3 | Owner dashboard composition | owner/dashboard | single header rule (no topbar+page-title duplication), alert bars with real content or removed, donut legend labels ≥4.5:1, footer row completion |
| Q-4 | Dead-zone sweep | student/dashboard+exams, teacher/exams+assignments+grades, owner/activity+feedback, quality/exam-moderation | section tension/release cadence; designed empty states (illustration + one line + primary action), never bare voids |
| Q-5 | Technical-string audit | all roles | CT141K/SEC101/DEMO-2026-001/demo emails/2024-1446/48.0 KB placeholders — translate or humanize; [nn] indices instead of raw codes where data is seed |
| Q-6 | Duplicated page titles | courses, exams, feedback (+ dashboards) | system rule: one H1 per page; breadcrumb ≤ 1 level; ghosted oversized watermark text removed (student/teacher dashboards) |
| Q-7 | Contrast fixes | registrar dashboard (axe: #fa3600 on #f9e3dc = 3.04:1 @13px), owner/users pills, teacher/materials search placeholder | ≥4.5:1 body, ≥3:1 large; fix the red/orange alert token family |
| Q-8 | RTL numerals/dates | teacher/attendance, course-detail stats, realtime timestamp | Arabic-Indical or fixed Latin policy, one direction per cell; bidi isolates for mixed lines |
| Q-9 | Typo + copy audit | owner/users «عضة معائلة»→«عضو معاين», institution-detail clipped labels | Arabic copy pass with native review |
| Q-10 | Onboarding hermetic opt-out | all dashboards (capture/e2e) | sessionStorage skip flag like intro's `INTRO_SKIP_KEY`; otherwise every authed capture/e2e runs behind the modal |
| Q-11 | 390 overflow pass | teacher/students modal card, student/course-detail stats row | clamp display type, allow wrap, min 16px edge clearance |

## Honest limits

- Stills only: motion/scroll/micro (rubric #6/#7/#8) unscored — judge from recordings.
- VLM (GLM vision) first-pass from half-scale contact sheets; small-type contrast judged coarsely. Sheets kept (`SHEET-*.jpg`) for re-review.
- student-dashboard-1440 full page is 2011px (only page taller than one viewport; others are 100vh shells with inner scroll).
- Capture summaries with console/request logs: `summary-{student,teacher,owner,quality,registrar}.json`; VLM verdicts: `vlm-*.json`.
- Do NOT commit (lead commits). Capture tooling lives outside the repo at `/home/z/evidence-r333/p-g2/` by design.
