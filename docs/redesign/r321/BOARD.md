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

- docH ladder (R321 A2 — NOW GATED: gate:r321 docH-ladder, ±1.5 % of Heron at
  the five referenced viewports + never-raise pins at the other six):
  Heron: 1440=12,355 · 1024=9,938 · 768=12,577 · 390=11,441 · 360=10,684
  **c1 state (ALL WITHIN BAND): 1440=12,530 (+1.42 %) · 1024=10,083 (+1.46 %)
  · 768=12,697 (+0.95 %) · 390=11,357 (−0.73 %) · 360=10,724 (+0.37 %)**
  never-raise pins: 320=9,308 · 430=12,411 · 480=12,675 · 600=14,774 ·
  820=13,808 · 1,180=10,937
- Phone perf (390 @4×): 6/262 frames > 33 ms · p95 16.8 ms · CLS 0 · LCP 1.1 s
- Desktop perf @1440 4× scroll (the r316 harness, loader-skip):
  a7e335d ≈ 54 % > 33 ms (owner, loader-on cold) → c1: **75.9 % > 20 ms ·
  p95 183 · 60 longtasks/6.8 s · CLS 0.007 ✓ · LCP 2.44 s ✓** — the ≤2 %
  target is OPEN (the A1 decomposition map: audits/evidence/r321/a1-analysis.md).
- Suites: vitest front 2733/2733 (+4) · back 1825/1825 · tsc 0/0/0 · eslint 0
  errors · raw-css strict PASS · gate:r321 467 rows / 8 baseline tickets /
  0 regressions.

## §A The ten R321 landing/public tickets

| # | Defect (reproduced by owner on a7e335d) | State | Cycle |
|---|---|---|---|
| A1 | Desktop perf (1440): 54 % frames > 33 ms, CLS 0.27, LCP 21 s | **PARTIAL c1** — decomposition COMPLETE (audits/evidence/r321/a1-analysis.md): SVG/grain/reveals/gBCR Ruled OUT · UpdateLayoutTree 4.5 s is #1 (54 recalcs × 781 elements) · .jt-intro var chain 10 ms/frame · lenis-idle attr retired (root-attribute flips = whole-doc recalc) · c-v auto REJECTED (breaks docH ratchet) · CLS 0.007 ✓ · LCP-skip 2.44 s ✓. Remaining: the intro chain rewrite · the 756-family hunt · data-stage re-seat · loader plateau for the ≤4 s first-visit LCP (now 5.04 s) | 1→2 |
| A2 | Landing height creep +2.0/+2.5/+1.7 % | **FIXED c1** — every main section was ALREADY Heron-exact; the entire excess was the FOOTER (+267 px). Cuts: legal row rides the © bar · wordmark en-caption retired · tablet compact cut (≤1099) · pads tightened. ALL FIVE Heron viewports within ±1.5 % + the docH-ladder GATE rule (11 viewports, ±1.5 %, never-raise) | 1 ✓ |
| A3 | Phone hero art ≈160 px inside a 330 px window + stray `≡` glyph | OPEN | 2 |
| A4 | Legal/public sheets clipped LEFT on phones | **FIXED c1** — minmax(0,1fr) grid guards + .lg-title clamp(3.4rem,11vw,…) + overflow-wrap:last-resort + the cookies ledger ≤767 card transform. 19 routes × 4 widths × 2 themes: 0 text rects outside [0,innerWidth]. GATED (text-in-viewport rule) | 1 ✓ |
| A5 | Error pages: code twice + dangling `—` | **FIXED c1** — the eyebrow is the ONE carrier; coords carry the page's own word (SERVER FAULT…); sr-only twin deleted; text-wrap:balance + NBSP glue. GATED (duplicate-text rule) | 1 ✓ |
| A6 | Decor leaks + the orange tick at (0,0) | **FIXED c1** — 12 mark families → CSS ::before (incl. AuthPage/Register/Forgot/Reset/landing/InkSketch/PlatformCanvas + the dynamic hi-marker/vc-poster codes via attr()); the tick was .cursor-dot-core's missing inert opacity:0. GATED (decor-innertext rule + the r321-decor belt) | 1 ✓ |
| A7 | Rename leftovers | **FIXED c1** — «الحوكمة» group (type+rows+TEST_ACCOUNT_GROUPS+belts+docs+README) · LegalPages ×2 · docs/05-setup · 01-overview · 13-maintenance title · test-accounts comments · issue template. STATIC ledger scan in CI (1,007 files · 88 occ · 0 off-list · 20 reasoned keeps) | 1 ✓ |
| A8 | /auth panel/H1/labels | **FIXED c1** — panel starts OPEN (SHOW_TEST_ACCOUNTS gate) · H1 on the r319-student masthead ladder (31.8 px @390) · labels nowrap + max-content track. Belts re-pinned | 1 ✓ |
| A9 | Map labels collide at 1440 | OPEN | 2 |
### foreman-B c1 tickets (found by the wave-1 instruments)

| # | Ticket | Evidence | Cycle |
|---|---|---|---|
| A8-prod | The demo panel open-by-default now ships to PRODUCTION (§A8 made default-open unconditional — `VITE_SHOW_TEST_ACCOUNTS !== '0'` in every build; every visitor sees 10 demo rows expanded). Brief: default-open is a DEVELOPMENT behaviour; production shows the collapsed chip (§K5 one-tap still reachable) | proof.md §2 note + openByDefault=true measured on prod | 2 |
| A2-R | §A2 not fully closed at 11 viewports: 320=9,308 (+7.61 % vs Heron) · 430=12,411 (−1.77 %) · 600=14,774 (−6.51 %) · 1180=10,937 (−5.61 %) remain OUT of ±1.5 % (the batch-3 pins predated Heron refs; fresh ladder: audits/evidence/r321/ladder/ — Lenis-wrapper finding, the five BOARD refs reproduced exactly) | heron-docH.json + ladder.md §A2 UPDATE | 2 |

| A10 | Production proof harness | **FIXED c1 (foreman-B)** — scripts/r321/prod-proof.ts (5 phases) + FIRST RUN on production (buildId ff7aeed6): accounts **10/10** (API+UI@390, panel one-tap) · pages **19/19** (0 console/0 failed) · statics 3/3 · docH 390=11,357 (−0.7 %) / 1440=12,530 (+1.4 %) LIVE · desktop scroll row honest-baseline 32.1 % >33 ms (§A1 owns). Reviewer APPROVED (independent re-run + numbers cross-check). Re-run after every deploy | 1 ✓ |

## §B authenticated sweep (cycles 2–5) — recipe = the settings package · **inventory DONE c1 (foreman-B WP-B0)**: docs/redesign/r321/STUDENT-SWEEP.md — 37 student-visible routes mapped (32 sheet-verified · **5 conversion targets**: T-1 OnlineExamsPages.tsx 1,951 ln ZERO markers · T-2 CampusMapPage · T-3 LivePage · T-4 LecturePlayerPage · T-5 CommunityPages ×5) · queue B1 exams → B2 map+live → B3 lecture player → B4 community+dedupe → B-verify the rubric sweep (100 % coverage leg) · **PROGRESS c1 (foreman-B, all reviewer-approved)**: B1a+B1b DONE (the exams list + taker chrome in the sheet system, r321-exams.css; state machine untouched) · B2 DONE (CampusMap + Live, r321-map-live.css) · B3 DONE (the lecture player chrome — .r321p-page + r321-player-page.css, engine byte-untouched) · B4 DONE (community: census corrected the ×5 to route-rows-since-r299; the real composer twins deduped; .r321c-page) · **B-verify DONE: 199/200 cells green (40 routes × 4 viewports × light + 390 dark, 80 shots 1.67 MB — the 29 dark "defects" were the sweep's own 429 noise vs the documented 1000req/15min limiter, re-verified in isolation)** · Tickets born: Bverify-P3-1 (competition-detail dark: h1=0 in the ended/empty state) · B4-rem (PostsFeedPanel↔SocialPage ~180-ln clone + posts/rooms hairline adoption) · B3-rem (the old LectureSkeleton shimmer + dead .lecture-panel-* rules in student.css) · 48 shots

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

### Cycle 1 — foreman-B close (8f061a25 + bverify merge; production re-proven)

| Ticket | State | Evidence |
|---|---|---|
| A10 prod-proof | **FIXED** | harness + 2 production runs (ff7aeed6 + 5928c69a: accounts 10/10 · pages 19/19 · statics 3/3 · landing 2/2 · 0 FAIL) |
| A2-R ladder | **EVIDENCED** | 11-viewport Heron ladder (Lenis-wrapper finding); 4 seats remain out of ±1.5% (320/430/600/1180) — foreman-A's A2 line |
| A8-prod | **TICKETED** | the demo panel open-by-default ships to production (dev-only per the brief) — AuthPage owner line |
| B0 inventory | **FIXED** | STUDENT-SWEEP.md: 37 routes mapped · 5 targets named · the B1..B4 queue |
| C0 clean baseline | **FIXED** | jscpd 980 · CSS 2,230/5,627 candidates · ts-prune 757 rows · dup-selector 65 · hover 182 · bundle 736.0/736 · the C-1..C-10 factory + 3 raw-CSS banner defects killed |
| B1a/B1b exams | **FIXED** | list + taker in the sheet system (reviewer-approved ×2 passes each) · belt 42/42 |
| B2 map+live | **FIXED** | .r321m conversion, reviewer-approved |
| B3 player | **FIXED** | .r321p chrome conversion, engine untouched, reviewer-approved · 2 source pins re-pinned (R321 override) |
| B4 community | **FIXED** | census-corrected dedupe + conversion, reviewer-approved after the alef fix |
| B-verify | **FIXED** | 199/200 green (the re-verified matrix) · Bverify-P3-1 filed |
| CI repair | **FIXED** | the ledger scan self-trip (batch-2's ci.yml comment) — reworded, scan green |

Cycle-1 foreman-B line: **11 work packages merged, every one through a separate reviewer** (2 REJECTs caught real defects — the hidden-hover ratchet break + the auth-page shot bug + the inverted masthead + the dropped alef — and were fixed before merge). Gates on the final tree: front 2733/2733 · tsc 0/0 · raw-css strict PASS · hover 182≤185 · dup-selector 65 (baseline) · ledger 0 · bundle 736.0/736. Remaining for the cycle per §K: foreman-A's A1-trio + A3 + A9 (untouched ≥2.5 h — the A2-R/A8-prod/Bverify-P3-1/B4-rem tickets above are queued for whoever takes the line next).

### Cycle 1 — the foreman-A line CLOSED at bd4253ac (A2/A4/A5/A6/A7/A8 ✓ · A1 partial · A10 = foreman-B)

| Batch | Commits | Content |
|---|---|---|
| 1 | 147051a3 | §A4 clipping + §A5 codes + §A6 decor/tick + §A7 rename + §A8 auth door (18 routes × 4 widths × 2 themes: 0 clip · code-once · 0 plus-runs · pixel-probe clean) |
| 2 | 1cd79446 | gate:r321 (text-in-viewport · duplicate-text · decor-innertext · rename-ledger + baseline 467 rows) + the 12-family mark completion + CI ledger leg |
| 3 | ff7aeed6 | §A2: docH back inside ±1.5 % at ALL five Heron viewports + the docH-ladder gate rule + the tablet compact cut |
| 4 | bd4253ac | §A1 part-1: the decomposition map + lenis-idle retirement + the isolation instruments |

**Cycle-1 remaining:** A1 continuation (the intro var-chain rewrite · the 756-family hunt · the loader plateau) · A3 phone hero art · A9 map labels · foreman-B's WP-A10/B0/C0/HL packages · then C2 per §I.
