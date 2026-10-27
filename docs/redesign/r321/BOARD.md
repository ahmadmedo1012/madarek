# R321 BOARD — FINAL PROGRAMME: FINISH MADAREK

Live board. Foreman updates after every merge. Head at cycle open: `a7e335db`
(R320 cycle 3 close — CI green on 111f7f79).

Mission: every public page, every role's screens, every
phone/tablet/laptop — Heron-grade, smooth, clean, complete; zero leftover
defects, duplicates or dead code. Scope: ONLY this repo (`madarek`, branch
`main`). Small verified commits straight to `main` (rebase first, never
force-push, never the root `npm run build`). Standing gates stay mandatory
and only extend: `gate:r318`, `gate:r319`, `gate:r320` + the new R321
extensions. A red gate blocks merge. A cycle report lists every ticket as
FIXED-with-test or BLOCKED-with-reason, with numbers and the command that
produced them.

## Protected ratchets (re-measured after every merge; never regress)

- docH ladder (R321 A2 hardens to ±1.5 % of Heron at 11 viewports):
  Heron: 1440=12,355 · 1024=9,938 · 768=12,577 · 390=11,441 · 360=10,684
  a7e335d: 1440=12,607 (+2.0 %) · 1024=10,184 (+2.5 %) · 768=12,795 (+1.7 %) ·
  390=11,388 (−0.5 %) · 360=10,742 (+0.5 %)
- Phone perf (390 @4×): 6/262 frames > 33 ms · p95 16.8 ms · CLS 0 · LCP 1.1 s
- Desktop perf @1440 (a7e335d, owner's wheel-scroll harness): 115/212 frames
  > 33 ms (54 %) · p95 50 ms · max 83 ms · CLS 0.27 · LCP 21 s (loader-on
  cold). Targets: ≤ 2 % > 20 ms · CLS ≤ 0.05 · LCP ≤ 2.5 s skip-loader / ≤ 4 s
  first visit.
- Suites: vitest front 2729/2729 · back 1825/1825 · tsc 0/0/0 · eslint 0
  errors (15 pre-existing warnings) · raw-css strict PASS · CI 10/10 green.

## §A The ten R321 landing/public tickets

| # | Defect (reproduced by owner on a7e335d) | State | Cycle |
|---|---|---|---|
| A1 | Desktop perf (1440): 54 % frames > 33 ms, CLS 0.27, LCP 21 s — trace SVG repaint, `<pattern>` fills, sticky header, gBCR storms, grain, loader gate; rasterise static art; `contain`; loader-skip on desktop too | OPEN | 1 |
| A2 | Landing height creep: 1440=12,607 (+2.0 % vs Heron 12,355) · 1024=10,184 (+2.5 %) · 768=12,795 (+1.7 %). Hard ratchet: docH + every section ±1.5 % of Heron at 11 viewports | OPEN | 1 |
| A3 | Phone hero art ≈160 px inside a 330 px window + stray tiny `≡` glyph top-left; scale elevation to window width | OPEN | 2 |
| A4 | Legal/public sheets clipped at LEFT edge on phones (RTL overflow, clipped not scrollable — `.lg{overflow-x:clip}` hides it from scrollWidth). Fix container on EVERY public sheet at 320/360/390/430 + extend gate to assert every text element's rect ∈ [0, innerWidth] | OPEN | 1 |
| A5 | Error pages render the code twice (kicker `ERR [500]` + mono footer `ERR · 500`) + sr-only third copy in innerText; H1 dangling `—` on its own line. Show once; `text-wrap:balance` + NBSP glue; gate: no duplicate normalised visible text per region | OPEN | 1 |
| A6 | Decor leaks: corner marks read `+ | + | + | +` in innerText (aria-hidden does NOT remove from innerText — needs pseudo-element content); tiny orange tick at pixel (0,0) of every page | OPEN | 1 |
| A7 | Rename leftovers: LegalPages.tsx ×2 strings, test-accounts group «الإدارة» → «الحوكمة», AuthPage comment, docs/05-setup.md, test-accounts.ts stale comments; ledger scan in CI (fail on any «الإدارة» off KEEP) | OPEN | 1 |
| A8 | /auth: demo panel must be OPEN by default in development; mobile H1 ≈80 px/2 lines → inner-page title scale; in-row label «البريد الإلكتروني أو رقم القيد» wraps at 1440 | OPEN | 1 |
| A9 | Map labels collide at 1440 (name vs `M2`; furniture lines through «غرفة الإتقان»); extend collision gate to SVG `<text>`/`<tspan>` bboxes | OPEN | 2 |
| A10 | Production proof harness: after every deploy — all 10 accounts API+UI @390, every public page, robots/sitemap/manifest, landing perf harness → `audits/evidence/r321/prod/` | OPEN | 1 (harness) |

## §B authenticated sweep (cycles 2–5) — recipe = the settings package

student (remaining: results, jobs, AI, gamification, skills, alerts,
messages, AR/VR, social, downloads, university, live, payment, campus map,
lecture player, profile, webinars, online exams + taker, training ×3,
achievements, community, settings re-check) → teacher (all 20 routes) →
رئيس قسم / عميد / نائب عميد → المسجل العام (all /admin/* + مسجل كلية
scoped variant + governance/sync/permissions/reports) → quality → owner.
Coverage reported as `routes × viewports × themes × roles captured+green /
total`; target 100 %. Local full stack: `npm run dev:full` (embedded
Postgres; fallback system PostgreSQL 16 as `postgres` user documented in
STACK.md).

## §C/§D cleanup + landing art (cycle 6+)

§C: CSS one-definition-per-selector (65-conflict baseline → 0), knip +
jscpd + depcheck + ts-prune, duplicate components merged (AlertsPage ×5,
CommunityPage ×5, LibraryPage ×2), copy dedupe, zero console/network
errors, bundle caps only DOWN (736 → targets §E: main ≤ 200 KB gz, route
≤ 150 KB gz). `gate:clean` in CI. §F: landing art backlog (VLM ≥ 80,
masked-pixel ≤ 40 %, motion ≥ 90, geometry ±1.5 %).

## Cycle log

### Cycle 1 — IN PROGRESS (head a7e335db)

Work order: A4/A5/A6/A7/A8 (the one-hour fixes) → gates extension → A2
height ratchet → A1 desktop perf → production proof harness. Then C2: A3 +
A9 + student remaining + gate:clean baseline.
