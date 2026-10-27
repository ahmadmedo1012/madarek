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
| A1 | Desktop perf: 1440 wheel 48/257 frames >33 ms · CLS 0.27 · LCP 21 s (owner's methodology, loader-on cold) — targets ≤2 % >20 ms · CLS ≤0.05 · LCP ≤2.5 s skip-loader / ≤4 s with | c2-PERF | 3 (open) |
| A2 | ~~Footer wordmark solid grey fill~~ **FIXED 7234c432** — the OCR tint twin (computed #8F8F8B) retired; TRUE outline fill:none · stroke:ink 1.7px non-scaling (dark = paper stroke). Probe: 4 cells | — | 2 |
| A3 | ~~Footer ink strip~~ **FIXED 7234c432** — images 54u→70u (99px @1440), mono captions 8.5u one baseline, [01] label its own ruled row (0 overlap, probe-verified); docH ladder ±1.25% | — | 2 |
| A4 | ~~Map labels collide~~ **FIXED f7c4540c** — svg-collisions 9@390/14@1440 → **0/0, no allowlist**; every name/area pair on separate baselines clear of furniture | — | 2 |
| A5 | ~~Footer has no legal/policy links~~ **FIXED c41a5560** (c2-LEGAL) — the nine-link legal row wired | — | 2 |
| A6 | Onboarding tour veil: the 40% ink veil let the display H1 poke 8px above the centred tour card at 390 (pf-page-title t=113 vs modal-card t=121 — read as "clipped stubs" by two VLM reviews) — **FIXED a9e071a3+5b7369f9** (the tour overlay carries the Heron menu scrim --glass-bg-strong paper/ink @92%, scoped :has(.onboarding-flow); first attempt's .has-shell prefix never matched — the modal portal renders at body level; verified on production: computed rgba(246,246,238,0.92), VLM 9/10 no stubs) | found by the §C-7 production proof | 3 |

## §B RENAME register («الإدارة» → «المسجل العام»)

Ledger: `RENAME-LEDGER.md` (one row per occurrence → RENAME/KEEP/REWORD + reason).
Central sources: `frontend/src/lib/roleLabels.ts` + backend twin. Technical
identifiers unchanged (Role.ADMIN, /admin/* URLs, DB values, CSS, test ids).

## §C test accounts register — CLOSED ON BOTH LEGS

One easy account per job (`@test.ly` / `12345678`) — shared source
`shared/testAccounts.ts`, `ensureTestAccounts()` idempotent upsert (seed +
boot when `MADAREK_TEST_ACCOUNTS=1` — render.yaml now DECLARES it), demo
lockout ≤60 s, AuthPage demo panel (`VITE_SHOW_TEST_ACCOUNTS`), fixtures +
docs. Proof: LOCAL 10/10 (cycle 1, `accounts.md`) · **PRODUCTION 10/10**
(cycle 3, `accounts-production.md` — API 200 + token + role home at 390 UI;
the registrar logs in THROUGH the panel one-tap flow; the panel opens with
10 rows). The production run caught + fixed the registrar name drift
(«إدارة الجامعة» → «المسجل العام», twin-table lockstep + name-healing
update branch, belt 12→14) and the onboarding tour veil defect (see §A6).

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

### Cycle 2 — CLOSED (merged through 7234c432; §D pages + flow + §A2–A5 fixed; CI repaired)

| Package | State | Evidence |
|---|---|---|
| §D legal/public pages (c2-LEGAL) | **FIXED-with-test** | 7787f809→c41a5560: nine public sheets + LegalSheet kit + useLegalMeta + robots/sitemap/manifest + brand icons + footer/consent wiring; LEGAL-TODO 18 rows; belt 89/89. |
| §D forgot/reset flow (c2-FLOW) | **FIXED-with-test** | 08b1444c→2569f135: PasswordResetToken model+migration, no-oracle service (CAS claim, policy-before-burn, digest-only, equal-cost unknown path), dual limiters, @test.ly devInbox, two guest sheets; backend belt 18/18 (fd157c4c); auth.css merge conflict resolved BOTH sides. |
| §A2 wordmark outline | **FIXED** | 7234c432: tint twin retired — fill:none · stroke 1.7px non-scaling; dark = paper stroke; probe 4 cells (audits/evidence/r320/landing/). |
| §A3 ink strip | **FIXED** | 7234c432: 70u images (99px @1440), 8.5u mono captions one baseline, [01] its own ruled .fl-head row — 0 overlap; LENS_R 47.2 (the reference proportion); lens math on the svg box; docH ladder ±1.25% (the R319 protocol — NOTE: forcing reduced-motion inflates desktop docH +9%, a protocol artefact). |
| §A4 map label collisions | **FIXED** | f7c4540c: svg-collisions 9@390/14@1440 → 0/0 no allowlist; five zones re-seated; camera crops verified (r312 9/9); dump probe committed. |
| §A5 footer legal row | **FIXED** | c41a5560 (with c2-LEGAL). |
| §A1 desktop perf | **OPEN → Cycle 3** | Render pipeline dominates post-§E-13-fix3; internal CLS 0.007 / LCP 1.80s already inside targets, but the owner's loader-on cold methodology reads LCP ~21s — the loader duration itself is the gap. Needs the perf harness + loader-policy decision. |
| CI repair | **FIXED** | 7234c432: e2e/ios-webkit/surface-drift pinned ubuntu-24.04 (ubuntu-latest→26.04 roll; PW 1.60 has no builds); auth.css gap 2px→var(--sp-0-5) (raw-css strict PASS); bundle ceilings 712→736 / 80→82 documented (measured 730.3/80.4 — the §D route growth; r183-B8 belt re-pinned with the down-never-up note). |

**Suites at C2 close:** front **2717/2717** (227 files) · back **1823/1823** (79 files) · tsc 0/0 · eslint 0 errors · raw-css --strict PASS · svg-collisions 0/0 · colors/icons/motion/CSP/parity OK · bundle gate PASS (730.5/736 · 80.4/82 · 95.7/110).

**Cycle 3 queue:** §A1 desktop perf (the loader-on LCP gap + render pipeline) · student remaining pages + /settings (PAGES-GAP P1/P2: 403/500/maintenance + profile/admin-settings thin pages) · the Playwright/Ubuntu-26.04 bump (Cycle-6 dep refresh, un-pins ubuntu-24.04) · Cycle 6 diet (65-conflict duplicate-selector baseline + bundle 736→down).

### Cycle 3 — IN PROGRESS (head fb5745f1)

| Package | State | Evidence |
|---|---|---|
| §C-7 production proof + the registrar name heal | **FIXED-with-test** | 3664c111+ec9716fc: the twin-table lockstep (ACCOUNT_PROFILES registrar → المسجل العام per the ledger) + the update branch heals names + render.yaml declares MADAREK_TEST_ACCOUNTS='1'; belt 12→14 (CANONICAL_NAMES both branches, no «إدارة» in any name). PRODUCTION 10/10 (accounts-production.md): every account API 200 + token + role home @390; the demo panel opens (10 rows) and the registrar logs in via the one-tap تعبئة→دخول flow. |
| §A6 onboarding tour veil | **FIXED-with-test** | a9e071a3+5b7369f9: the tour overlay carries the Heron menu scrim (paper/ink @92%) scoped :has(.onboarding-flow) — the .has-shell prefix of the first attempt never matched (the modal portal renders at body level; measured). OnboardingFlow belt 8→10 (rule presence + 0.92 token both themes + the dead prefixed twin forbidden). Production after-verify: computed veil rgba(246,246,238,0.92), VLM 9/10, stubs gone. |
| P2-1/P2-2 /settings (any-authed) | **FIXED-with-test** | 5d6132b4: seven §B2 sections; ChangePasswordCard LIFTED to components/account (ONE definition — teachers had NO change-password UI, PAGES-GAP T-2); honest قريبًا seats; nav wiring every role (one label إعدادات الحساب, UserCog vs Settings icon separation, adjacency contracts intact; nav-coverage 33→34 re-pinned). Belt r320-settings-pages 10 NEW. Production-verified (settings-after.mjs): 7 bars + theme group + 3 pw fields (geometry-proven) + honest seats. |
| P2-3/4/5 error sheets (/500 /403 /maintenance) | **FIXED-with-test** | 5d6132b4: the /404 grammar via shared ErrorSheetPage (mk-ill error-generic/forbidden/server-waking); 403's way-back follows ROLE_HOME; maintenance disabled-by-default; PAGE_TITLES rows (resolveTitle never falls to generic — route-titles-coverage re-pinned). Production: all three PASS (h1 + document.title). |
| ADMIN nav retitle | **FIXED** | 5d6132b4: «الإعدادات» → «إعدادات المنصّة» for /admin/settings — now MATCHES the page's own H1 (pinned by r305a8 since before); the account door is the new /settings row. |
| Suites at this checkpoint | GREEN | front **2729/2729** (228 files) · back **1825/1825** · tsc 0/0/0 · eslint 0 errors (15 pre-existing warnings) · raw-css strict PASS · dup-selector/hover-guard zero NEW vs baseline. |

**Cycle 3 remaining:** §A1 desktop perf (the loader-on LCP ~21s decision) ·
student remaining §E pages (results, AR/VR, university, live, map, lectures
player, online exams + taker, training ×3, community, dashboard re-check) ·
§E admin/quality/owner sweeps (cycles 4-5 per §I) · Playwright/Ubuntu bump ·
Cycle 6 diet. **Continuation:** read this table + the r320-c3 worklog entries
first; the settings/error package pattern (shared component + belt + nav
wiring + production probe) is the established recipe for the §E sweeps.

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
