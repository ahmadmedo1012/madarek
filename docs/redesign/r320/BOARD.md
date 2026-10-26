# R320 BOARD — "COMPLETE, CLEAN, CONSISTENT"

Live board. Foreman updates after every merge. Head at cycle open: `aac261ec`
(R319 C3 closed — student pages A+B in the sheet system, §E-13 desktop perf
fixes 1-3, iOS WebKit harness in CI).

Mission (§J exit criteria): every role's screens in the Heron system; every
missing page built; «الإدارة» → «المسجل العام» renamed everywhere a human
reads it; one easy test account per job (`@test.ly` / `12345678`); no leftover
glitch, duplicate or dead code. All earlier programmes remain in force
(R318 defect gate, R319 gate + state-contrast + paired tokens + material
presence + iOS WebKit harness).

## Protected ratchets (re-measured after every merge; never regress)

- docH ladder: 1440=12,471 · 1024=10,056 · 768=12,679 · 390=11,300 · 360=10,722 (±3 %)
- Phone perf (390 @4×): 1/252 frames >33 ms · p95 16.8 ms · CLS 0 · LCP 1.0 s
- Desktop perf @1440 4× scroll (after §E-13 fix3, noisy-host median): ~62 % >33 ms
  whole · longtasks 42 · CLS 0.007 · LCP 1.80 s — R320 §A1 target: ≤2 % >20 ms,
  CLS ≤0.05, LCP ≤2.5 s (render pipeline dominates; far from target — Cycle 2)
- Suites: vitest front 2599/2599 · back 1783/1783 · tsc 0/0 · eslint 0 errors
- gate:r318 + gate:r319 (state-contrast, paired lint, shell geometry, material)

## §A landing residuals (re-measured by owner on b8e8b36)

| # | Defect | Owner | Cycle |
|---|---|---|---|
| A1 | Desktop perf: 1440 wheel 48/257 frames >33 ms · CLS 0.27 · LCP 21 s (owner's methodology, loader-on cold) — targets ≤2 % >20 ms · CLS ≤0.05 · LCP ≤2.5 s skip-loader / ≤4 s with | c2-PERF | 2 |
| A2 | Footer wordmark solid grey fill #8F8F8A — Heron's is OUTLINED (fill:none · stroke:ink · ≈1.5-2px · non-scaling-stroke; dark = paper stroke) | c2-L | 2 |
| A3 | Footer ink strip: mono label overlaps first thumbnail; thumbs ≈78 px; captions 18 px bold outweigh images — Heron: large images, small mono captions one baseline, label its own row | c2-L | 2 |
| A4 | Map labels collide («المكتبة والبحوث»×«M2 96», «غرفة الإتقان»×furniture, «M2 150»×window rule) — collision gate must cover SVG `<text>`; name/area separate baselines ≥14 px apart | c2-L | 2 |
| A5 | Footer has no legal/policy links at all (§D pages wire in) | c2-LEGAL | 2 |

## §B RENAME register («الإدارة» → «المسجل العام»)

Ledger: `RENAME-LEDGER.md` (one row per occurrence → RENAME/KEEP/REWORD + reason).
Central sources: `frontend/src/lib/roleLabels.ts` + backend twin. Technical
identifiers unchanged (Role.ADMIN, /admin/* URLs, DB values, CSS, test ids).

## §C test accounts register

One easy account per job (`@test.ly` / `12345678`) — shared source
`shared/testAccounts.ts`, `ensureTestAccounts()` idempotent upsert (seed +
boot when `MADAREK_TEST_ACCOUNTS=1`), demo lockout ≤60 s, AuthPage demo panel
(`VITE_SHOW_TEST_ACCOUNTS`), fixtures + docs. Proof: every account logs in.

## §D missing pages register

Inventory: `PAGES-GAP.md` (router crawl vs confirmed-missing list). Legal
content honesty rules apply (`[يُستكمل قبل الإطلاق]` markers → LEGAL-TODO.md).

## Fleet — Cycle 1 (parallel worktrees; merge order RENAME → ACCOUNTS → GATE → GAP)

| Agent | Task ID | Scope | Key files |
|-------|---------|-------|-----------|
| RENAME | c1-RENAME | §B complete: ledger, lib/roleLabels.ts + backend twin, every call-site sweep (nav, AuthPage, Community, Admin*, Teacher, Catalog, Register, university-media KEEP-check, PaymentPage KEEP-check), backend Arabic messages, seed display names, README/docs, tests re-pinned (R320 override), gate rename-scan rule | docs/redesign/r320/RENAME-LEDGER.md, lib/roleLabels.ts, nav.ts, AuthPage.tsx, Admin*.tsx, backend/src/**, backend/prisma/seed.ts |
| ACCOUNTS | c1-ACCOUNTS | §C complete: shared/testAccounts.ts (11 jobs per brief table), backend ensureTestAccounts() + lockout 60 s + mail suppression @test.ly, AuthPage demo panel (hairline rows, mono job label + email + password, تعبئة then دخخل, VITE_SHOW_TEST_ACCOUNTS), Playwright fixtures regen, docs, local login proof (every account, API + UI) | shared/testAccounts.ts, backend/prisma/seed.ts, backend/src/modules/auth/*, AuthPage.tsx, tests/e2e/fixtures/* |
| GATE | c1-GATE | gate additions: SVG `<text>` collision extension (map labels), duplicate-selector lint (same selector, different values, two files), `:hover` outside `@media (hover:hover)` guard rule, rename scan (no «الإدارة» role labels outside ledger KEEP), console/network cleanliness (0 errors/warnings/failed requests per route) | scripts/r319/gate.mjs, scripts/r320/*, package.json |
| GAP | c1-GAP | PAGES-GAP.md router-crawl inventory + LEGAL-TODO.md scaffold + footer/nav wiring map for the new pages | docs/redesign/r320/* |

Cycle 2 (planned): §D legal/policy/contact/about/help pages + forgot-password
flow + robots/sitemap/manifest · landing §A2–A5 · desktop perf §A1.
Cycle 3: student remaining pages + settings. Cycle 4: teacher + positions.
Cycle 5: المسجل العام + quality + owner. Cycle 6: cleanup/dedupe/dead-code/
bundle diet + red team.

## Cycle log

### Cycle 1 — CLOSED (merged through 6ebac5e8; all four fleet packages green)

| Package | State | Evidence |
|---|---|---|
| §B rename | **FIXED-with-test** | c1-RENAME b9113762: ledger 101 RENAME / 67 KEEP / 28 REWORD (docs/redesign/r320/RENAME-LEDGER.md + rename-keep.json sidecar) · roleLabels.ts front + backend twins (ADMIN «المسجل العام», QUALITY «أخصائي جودة», OWNER «مالك المنصة») · 106 files swept · belts 22+7 · remaining «الإدارة» in src = 9 hits/3 files, all KEEP (building ×4, finance office ×3, belt regex ×2) · wrap-check 30 shots (no truncation/wrap defects). Runtime proof: gate rename-scan PASS on ALL admin cells × themes (0 hits). |
| §C accounts | **FIXED-with-test** | c1-ACCOUNTS 2d04ea91: shared/testAccounts.ts single source (physical: backend/src/modules/auth/test-accounts.data.ts, @shared alias wired vite+vitest+tsconfig) · 10 jobs @test.ly/12345678 (pending@test.ly honest-skip: no pending state in schema) · ensureTestAccounts() idempotent on every db:seed + boot via MADAREK_TEST_ACCOUNTS=1 (the env var the owner sets on Render) · demo lockout 60 s (lockDurationFor) · AuthPage hairline demo panel (تعبئة → دخول, VITE_SHOW_TEST_ACCOUNTS) · LIVE PROOF 10/10: API 200 + token AND UI @390 role-home screenshots (audits/evidence/r320/accounts/) · old creds retired (audit: only historical remains). |
| Gate rules | **FIXED** | c1-GATE 0bffae9b: gate:r320 composer (r319 child untouched) + 5 rules — svg-collisions (SVG <text>×text/geometry: 9@390/14@1440 baseline = §A4 ticket) · duplicate-selector (65 app×app conflicts = Cycle-6 dedupe ticket) · hover-guard (184 unguarded = C2+ sweep) · rename-scan (admin routes runtime) · cleanliness (console/network per route). Pre-push: the two cheap lints in --ratchet mode. |
| §D inventory | **FIXED** | c1-GAP f4ec2b75: PAGES-GAP.md — 15 new routes (P0 ×4: forgot-password, privacy, terms + wiring; P1 ×7; P2 ×4) + 6 thin pages + LEGAL-TODO.md (15 [يُستكمل قبل الإطلاق] rows; known-true: Render, Neon, opt-in OpenAI-compatible AI, NO mail provider) + the REAL localStorage key list + footer/consent wiring map. |

**Post-merge foreman fixes (6ebac5e8):** rename-keep.json + the demo-panel group-bucket KEEP row (brief-mandated التعليم/الإدارة/النظام) · auth-demo-fill:hover PAIRED (fresh B1-class violation found by the paired lint at merge — fixed, lint 420 rules / 0 fresh) · loadRenameKeep() normalises the ledger schema.

**Suites at C1 close:** front **2626/2626** (226 files) · back **1805/1805** (78 files) · tsc 0/0 · eslint 0 errors (15 pre-existing warnings) · gate:r320 quick **26 FAIL baseline / 0 regressions / 117 s** · gate:r319 child exit 0.

**Cycle 2 dispatch:** §D P0/P1 pages (privacy, terms, cookies, accessibility, security, data, about, help, contact + forgot-password end-to-end + robots/sitemap/manifest + footer wiring) · landing §A2–A5 (wordmark outline, ink strip, map SVG label collisions — the gate now measures them) · desktop perf §A1 (LCP/CLS at 1440; render pipeline dominates post-fix3).

### R319 close (foreman, aac261ec)

- c3-S2 (student pages B: profile, messages inbox, AI, schedule, calendar,
  gamification, alerts, social, downloads, skills, payment, webinars, jobs,
  achievements) MERGED — verified tsc 0 · 2599/2599 · e2e 4/4; G-final empty-state
  contract re-pinned to the §B2 hatched EmptyCell (19/19).
- §E-13 fix1-3 (desktop landing perf) MERGED — fix3 scrollend-storm debounce
  reviewed sound; same-host A/B control shows no regression (noise-band equal);
  mechanism probe 107 scrollend → 1 scrollHeight read (was ~107 forced dirty
  reads ≈ 632 ms/run); longtasks 65→42 chain evidence. Render pipeline now
  dominates — R320 §A1 continues in Cycle 2.
- Full suites on merged main: front 2599/2599 · back 1783/1783 · tsc 0/0. PUSHED.
