# R319 BOARD — "THE WHOLE PRODUCT, NOT JUST THE LANDING"

Live board. Foreman updates after every merge. Head at cycle open: `5466b5c` (R318 C2).
Mission: every authenticated screen (student, teacher, admin, owner) + every touch
interaction Heron-grade; finish the landing's last visible defects; desktop as smooth
as the phone now is. Exit criteria §H of the R319 brief (mirrored at bottom).

## Protected ratchets (re-measured after every merge; never regress)

- docH ladder: 1440=12,340 · 1024=9,959 · 768=12,627 · 720=17,819 · 600=15,876 ·
  480=12,716 · 430=12,548 · 390=11,418 · 360=10,739
- Phone perf (R318 verified @390, 4× CPU): 2/254 frames >33 ms · p95 16.8 ms · CLS 0 · LCP 1.1 s
- gate:r318 word-integrity/contrast/placeholders/overflow/OCR GREEN at 18 cells
- Suites: vitest front 2559/2559 · back 1783/1783 · tsc 0 · eslint 0 errors

## §B P0 register (owner-found on real iPhone, logged in as student)

| # | Defect | Root cause (verified in source) | Owner |
|---|--------|--------------------------------|-------|
| B1 | Tap makes drawer row text disappear (pale ghost on «مقرّراتي الدراسية») | layout.css `.nav-item:hover{background:var(--text);color:var(--bg)}` then polish.css `.nav-item:hover{background:var(--surface-2)}` — cascade keeps paper label on light-grey cell ≈1.1:1; `:hover` sticks after tap on touch; NO `@media (hover:hover) and (pointer:fine)` guard | C1-A |
| B1b | Drawer grammar off-system: active row = pink rounded wash + red end rule (accent-soft, R300-era); logo in pink tinted box; scrim flat grey #8e8e8a; list clipped at bottom («المصفوفة التعليمية» cut); orphan compass icon under theme switch; group heading misaligned | polish.css `.nav-item.on{background:var(--accent-soft)}` twin + drawer CSS | C1-A |
| B2 | Student dashboard not in Heron system: no sheet chrome (frame/grain/mono index/hairline grid); 60–70px heavy display headings ×3; translucent bottom bar with page text showing through + pink active pill + mixed icons + no safe-area; blue round avatar #5B8DEF; seed leaks (r180, J, قسم اختبار, السنة 8); mixed numerals + direction glitches (01/15 Latin digits, 36% Latin); bare empty states; no indicators (semester gauge, per-course bars, status chips, week strip) | whole-page + shell | C2 (after C1-A grammar lands) |

## §D landing register (re-seen on 5466b5c)

| # | Defect | Owner |
|---|--------|-------|
| D1 | Footer wordmark: solid-filled, ~340px, letter-spaced DISCONNECTED letters (م د ا ر ك); must be connected stroke-only full-cell-width (OCR «مدارك» must still pass) | C5 |
| D2 | Footer ink strip: 148px photo thumbnail among empty outline placeholders | C5 |
| D3 | Map labels smeared (halo stroke thicker than glyph on light-on-orange); verify 390 | C5 |
| D4 | Active-room mid-state label unreadable; INTRODUCTION card ghost line («في مدارك» overlapped at y≈735) | C5 |
| D5 | Platform cards/tooltips overlap + clipped at viewport edges 1440/768; left screenshot clipped at x=27 | C5 |
| D6 | Mobile map 390: white card pinned top with «شاهد» clipped; no [02/05] index | C5 |
| D7 | Edge tab/consent/header overlap sweep | C5 |

## §E gate extensions (wire into gate:r318 → r319)

8. State-contrast sweep (force hover/active/focus/focus-visible/focus-within via CDP; ≥4.5:1, 3:1 ≥24px) @390 touch + 1440, light/dark, all routes
9. Paired-token lint (`--_bg`+`--_fg` set together in every state rule)
10. Authenticated leak scan (raw ids/codes/test strings/undefined; one numeral system; bidi isolation)
11. Shell geometry (bottom bar opaque, no text through, padding reserve, drawer no clipped rows, scrim on-palette)
12. Material presence per route (frame+grain+mono index+≥1 indicator; no round avatar/pink pill/rounded chrome)
13. Desktop perf: 1440 wheel 66/245 frames>33ms, CLS 0.28 → ≤2% frames>20ms, CLS ≤0.05 (suspects: map SVG repaint, 1440-wide patterns, sticky header transform, gBCR storms)

## Fleet — Cycle 1 (parallel worktrees; merge order A → C → D → B → E)

| Agent | Task ID | Scope | Files |
|-------|---------|-------|-------|
| A · SHELL | c1-A | B1 total fix: paired `--_bg/--_fg` state tokens sitewide, hover-guard `@media (hover:hover)(pointer:fine)`, `:active` touch states, delete polish.css twins (`.nav-item` hover/on + bottom-nav twins), drawer rebuild (full-bleed paper panel, hairline rows 48–56px ≥44px, mono gutter index [01], active = ink+2px orange start rule, scrim ink@55–60%, overscroll-behavior contain, 100dvh, safe-area, footer cell w/ theme+user, 44px square close), bottom bar rebuild (opaque paper, 1px top hairline, 5 square cells hairline-separated, active = ink label + 2px orange top rule + filled icon, radius 0, safe-area padding, content padding reserve), square avatar (32–40px cell, mono initials, hairline) | layout.css, polish.css, components.css, notifications.css, unified-parity.css, r305-shell.css, Sidebar.tsx, BottomNav.tsx, UserAvatar.tsx |
| B · STACK | c1-B | embedded-postgres local stack, migrations + realistic Arabic seed for ALL roles, `npm run dev:full`, Playwright auth fixture per role (API token login) | backend/*, scripts/*, package.json |
| C · LEAKS | c1-C | leak scan utils (numeral system uniform, bidi isolate on mixed runs, Intl.DateTimeFormat('ar-LY') dates, never raw codes/ids) applied to student dashboard visible text + seed strings | frontend/src/utils/format*, student/DashboardPage.tsx (text nodes only) |
| D · GATE | c1-D | `scripts/r319/gate.mjs`: §E-8 state-contrast sweep, §E-9 paired-token lint, §E-10 leak scan, §E-11 shell geometry, §E-12 material presence; wired `gate:r319` + pre-push; extends (not replaces) gate:r318 | scripts/r319/*, scripts/r318/defect-gate.mjs, package.json |
| E · ROUTES | c1-E | `docs/redesign/r319/ROUTES.md`: every authenticated route × role matrix from App.tsx crawl + capture-coverage table | docs/redesign/r319/* |
| F · SANDBOX | c1-F | sandbox preview (port 3000) font-fetch failure fix — independent of repo | /home/z/my-project |

Cycle 2 (after A merges): shared shell components conversion (AppShell/Topbar/PageHeader/Cards/Tabs/Tables/Forms/Badges/Toasts/Dialogs/Empty states) + student dashboard §B2 rebuild + WebKit iPhone before/after.
Cycle 3: student pages sweep. Cycle 4: teacher+admin+owner. Cycle 5: landing §D + desktop perf §E-13. Cycle 6+: red team.

## Cycle log

### Cycle 2 — CLOSED (shell grammar + dashboard §B2 + iOS harness + ALL §D landing defects; merged through b0ad264f)

| # | State | Evidence (command → number) |
|---|---|---|
| B2 dashboard (the owner's 2nd screenshot) | **FIXED-with-test** | G1: SectionBar title bars (mono [nn] gutter + hairline rule — the giant 60-70px headings re-seated) + RulerGauge (weekly ticks, orange fill, mono W09/15) + CourseBar (hairline + end-tick) + StatusChip ([LIVE]/[DUE nD]/[DONE] square mono) + WeekStrip (7-cell, current day inked) + EmptyCell (hatched). Gate: material/mono-index FAIL→PASS (26 labels), material/indicator FAIL→PASS (14). e2e r319-dashboard-material **13/13**; units 40/40. |
| §C3 shared shell | **FIXED-with-test** | G2: SheetFrame (7px + ± marks) + grain layer + PageHeader additive grammar (index/sheetCode props + SheetCodeContext — every authed page shows S-01·STUDENT… O-01·OWNER free, 40+ consumers untouched) + hairline primitives (cards radius 0, mono badges, tab underline, EmptyState hatch variant). Gate: material/frame+grain+chrome-radius FAIL→PASS **20/20 cells**; full unit suite **2585/2585**; e2e r319-shell-chrome 10/10. |
| §C6 iOS/WebKit | **FIXED (CI-routed)** | G3: webkit-iphone Playwright project + ios-webkit CI job (sandbox lacks root for WebKit system libs — BLOCKED locally by construction, runs in CI on push); chromium-iphone local truth **8/8 contracts** (drawer both themes tap-ghost-free, bar α1 + no jump, safe-area rule, 100dvh, tap-highlight, ≥16px inputs); owner screenshots re-shot → audits/evidence/r319/ios/. |
| D1 wordmark | **FIXED-with-test** | Connected kashida shaping (10 tatweels, aspect 4.545 = the reference strip's own) + clipper UNION (the R318 filled render hid a doubled-outline seam at م→د — stroke-only exposed it) + full-cell width (94.5% ink) + OCR seat: «مدارك» in **ALL 4 gate cells** (hollow fails at every stroke 1.7→9px — measured matrix; 50% interior tone = lightest STABLE). VLM: one connected word, outline-style. docH ladder all ±3%. |
| D2 ink strip | **FIXED** | 5 equal-height ink renders, captions one baseline, full-bleed width-driven (VLM-verified). |
| D3 halo smear | **FIXED** | Whisper 1.4px halo on dark-ink-on-paper labels ONLY, none on lit rooms (was 3.17px thicker-than-glyph); VLM clean single-strike 1440+390. |
| D4 mid-state label + intro ghost | **FIXED** | State-safe ink labels (13.4:1 paper / 6.6:1 salmon / 3.85:1 orange — chip snaps); INTRO fade repaired (the R315 fade never ran — invalid CSS; split fade, content ≤ ground at every instant — ghost-over-strokes impossible by construction). |
| D5 platform | **FIXED-with-test** | VIEW-A/B tag dir=ltr axis-flip → inset-inline-end on the stage's reading-start corner + max-inline-size; **0 overlaps/escapes/clips** at 360–1920; gate collisions 8/8. |
| D6 mobile map | **FIXED-with-test** | Plan 95.9% width breakout (342→374px @390), [01-05/05] index chip, 34svh frame clears «شاهد» (12px clear); docH 11,418→11,300 (−1.03%); r312-camera re-pinned 9/9. |
| D7 link contrast | **FIXED-with-test** | a.cb-more 4.44→6.91 · fo-hero-discover 3.76→4.55 · fo-text-link 3.46→6.91 (light); gate state-contrast **0 fails** (144/144 @1440 + 96/96 @390). |
| Paired-lint regression (gate-found at close) | **FIXED** | The D7 dark-theme link/wipe rules introduced 5 XOR state rules → allowlisted with reasons (layered wipe-layers + ink-only link emphasis — the documented safe patterns) → lint PASS (416 rules / 143 allowlisted / 0 fresh). |

**Suites after C2 close:** vitest front **2599/2599** · tsc front+back 0 · eslint 0 errors · paired lint PASS · gate:r319 quick **0 regressions** (1 baseline ratchet row in quick; full-mode baseline FAILs = the Cycle-3/4 page-conversion ratchet: material on non-dashboard pages, owner indicator seats).

**docH ladder (protected, after §D):** 12,471 (+1.06%) · 10,056 (+0.97%) · 12,679 (+0.41%) · 11,300 (−1.03%) · 10,722 (−0.16%) — all ±3%.

**Cycle 3 dispatch (next):** student pages sweep (schedule, calendar, courses, course detail, results, messages, notifications, assistant, settings → sheet grammar + indicators per §B2 pattern; the G1 components + G2 context are the kit) · §E-13 desktop perf (1440 wheel 66/245 frames >33ms, CLS 0.28 → ≤2% >20ms, CLS ≤0.05 — suspects: map SVG repaint, 1440-wide patterns, sticky header transform, gBCR storms) · WebKit CI results watch.

### Cycle 1 — CLOSED (all five work packages merged at `1a67b9ee` + foreman close)

**Every §B1/§B1b ticket's state (rule 2 — FIXED-with-test or BLOCKED-with-reason):**

| # | State | Evidence (command → number) |
|---|---|---|
| B1 tap-ghost | **FIXED-with-test** | e2e `r319-shell-states` @390 iPhone ctx light+dark: tap-forced row contrast **1.06:1 → 13.57:1** (light) / **13.85:1** (dark); `.nav-item`/`.bottom-nav-item`/`.search-row`/topbar toggles all route background+color+icon through `--_bg/--_fg/--_icon-fg` paired tokens; polish.css twins DELETED; hover washes guarded `@media (hover:hover)(pointer:fine)`; touch `:active` twins identical. `node scripts/r319/paired-state-lint.mjs` → PASS (412 state rules / 37 sheets / 139 allowlisted / 0 fresh). Vitest grep-belt **384/384, 0 re-pins**. |
| B1b drawer grammar | **FIXED-with-test** | e2e drawer grammar checks: opaque var(--bg) panel, 48px hairline rows, `[01]` mono gutter indexes, shared start inset («التعلم الذكي» aligned), `overscroll-behavior: contain` + drawer clip check **1054≤546 scrollable** (gate E11 `shell/drawer-clip` PASS), scrim **ink α0.58 light / paper α0.92 dark** (gate E11 `shell/scrim-palette` PASS, old #8e8e8a gone), 44px square close, tour label visible in drawer, safe-area footer. |
| Bottom bar | **FIXED-with-test** | gate E11: `shell/bar-opaque` **PASS (α=1)** on all 5 role dashboards; `shell/bar-bleed` PASS (0 visible-through); `shell/padding-reserve` PASS (128px ≥ 86px need); active = ink label + 2px orange top rule (pink pill deleted); 5 hairline-separated square cells; safe-area padding. |
| Avatar | **FIXED-with-test** | gate E12 `material/avatar-square` **PASS on all 5 dashboards** (0 round avatars; blue #5B8DEF gone from shell chrome — Sidebar/Topbar no longer forward DB avatarColor). |
| Seed leaks (§B2 text) | **FIXED-with-test** | display-text.ts sanitizers (`REVISION_CODE_RE`, `PLACEHOLDER_INSTITUTION_RE`) + e2e `r319-leaks` **3/3**: poisoned profile (`قسم اختبار r180`) → header omits BOTH; ar-LY term dates «1 فبراير…» (kills «01/15» RLM shape); one numeral system (Latin — evidence: numbers.ts `ar-LY-u-nu-latn` r197 §7); `<bdi>` on every mixed run; unit **20/20**; page belt **174/174, 0 re-pins**. Seed audit (c1-B): current seed.ts CLEAN — the production leaks are the older seed generation; r188 data realistic throughout. |
| Local stack (§C1) | **FIXED-with-test** | `npm run dev:full` (embedded-postgres :5433 · api :4000 · web :5173): fresh boot health HTTP 200 in ~6s; per-role login curl: student/teacher/admin/quality/owner **all 200**; smoke spec **5/5** (15.5s) via `storageStateForRole()`; teardown zero-orphans. `MADAREK_E2E_STACK=1` opt-in keeps CI hermetic. |
| ROUTES.md (§C2) | **FIXED** | 115 route rows (106 live · 9 redirects): student 41 · teacher 21 · admin 13 · quality 10 · owner 13 · shared 5 · colleges+public 11; coverage matrix **648 cells** (105 routes × 3 viewports × 2 themes); 5-wave capture plan with concrete seed slugs. 0 nav.ts↔App.tsx mismatches. |
| Gate extensions (§E-8..12) | **FIXED** | `npm run gate:r319` + `.githooks/pre-push` (paired lint + colors, ~10s). Full run: 6 routes × 3 viewports × 2 themes — **state-contrast 0 fails on ALL 5 role dashboards** (shell + drawer-open); leaks 0/0/0; shell geometry ALL PASS; material frame/grain FAIL = honest B2 ratchet (**131 baseline FAIL rows, 0 regressions, exit 0**). Quick rerun 72s reproducible. |

**Pre-existing test hole found + fixed:** `r311-cursor-ownership` failed on ≤2-core hosts (R318's loader skip-policy vs unstubbed `hardwareConcurrency`) — fixed by stubbing cores UP in beforeEach exactly like the e2e fixture's determinism knob (documented in-test).

**Suites after C1 close:** vitest front **2579/2579** · tsc front/back **0/0** · eslint **0 errors** (15 pre-existing warnings) · check:colors/icons/motion/raw-css/csp-hash **OK** · paired-state lint **PASS**.

**Landing state-contrast residuals (gate-found, light theme only, ticketed → C5):** `a.cb-more` 4.44:1 · `a.fo-hero-discover` 3.76:1 · `a.fo-text-link` 3.46:1 (dark theme: 0 fails).

**Cycle 2 dispatch:** shared shell components conversion (AppShell/Topbar/PageHeader/Cards/Tabs/Tables/Forms/Badges/Toasts/Dialogs/Empty states → sheet grammar) + student dashboard §B2 rebuild (sheet chrome: 7px frame + grain + dashed inner frame + ± marks + title bar `[nn] TITLE` + sheet code `S-01 · STUDENT`; indicators: semester ruler gauge W09/15, per-course hairline bars with end-tick, mono status chips [LIVE]/[DUE 3D], 7-cell week strip with current day inked; hatched empty states; display-size for the ONE H1 only) + WebKit iPhone before/after re-shoot of the owner's two screenshots.

### Cycle 1 — OPEN (historical)
- Environment rebuilt post-sandbox-reset: repo re-cloned @5466b5c, npm ci + webkit install in flight.
- B1 root cause CONFIRMED in source (layout.css `.nav-item:hover` wash vs polish.css background-only twin; polish.css imported after layout.css in main.tsx).

## Exit criteria (§H, measured on production after deploy)

1. Gate green (word integrity, all-state contrast, collisions, placeholders, leaks, overflow, OCR, shell geometry, material presence, paired lint) at 320/360/390/430/768/1024/1440, light/dark, public AND authenticated.
2. Perf: 390 (4× CPU) ≥98% frames ≤20ms, CLS ≤0.05, INP ≤150ms, LCP ≤2.5s; 1440 same; Lighthouse mobile Perf ≥90 landing / ≥85 app, A11y ≥95.
3. Authenticated coverage = 100% routes × {390,768,1440} × {light,dark} captured/judged/green; WebKit-iPhone run included.
4. Landing: VLM scene-graph ≥80, masked worst-region ≤40% on anchored frames, geometry ladder ±3%.
5. Red team finds nothing open; no P0/P1 on this board. Owner's two screenshots re-shot on iPhone-class WebKit: row text visible in every state, opaque bottom bar, square avatar, framed sheet, indicators present.
