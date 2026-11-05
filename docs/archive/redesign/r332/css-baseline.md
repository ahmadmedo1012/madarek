# R332 · A-CSS consolidation baseline (Phase 1 — measurement & plan)

Scope: `/home/z/madarek/frontend/src/styles/**`. Read-only phase; no file under `frontend/src` touched.
Dev server verified live before/while measuring: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/` → `200`.

---

## 1. Measured truth

| Metric | Value | Command (run in `frontend/src/styles` unless noted) |
|---|---|---|
| Total CSS lines | **52,121** across **56 files** (54 in `styles/` + 2 in `styles/r331/`) | `wc -l *.css r331/*.css \| sort -rn` |
| `!important` mentions (lines) | **107 lines / 111 occurrences** | `rg -c '!important' *.css r331/*.css` / `rg -o … \| wc -l` |
| `!important` **declarations** (real lever-pulls) | **43** — 64 of the 107 lines are comments/docs | `rg -c '^\s*(--)?[a-zA-Z-]+\s*:[^;]*!important' …` |
| rNNN sheets | **27 files, 10,799 lines** (20.7% of total) | derived from `wc -l` |
| Dead-candidate selectors | **3,524 of 5,061** (69.6%) | `docs/redesign/r331/css-coverage.json` (`totals`) |
| Stylelint (v16) | **78 errors + 104 warnings = 182 findings, 25 files dirty** | see §4 |
| Orphan sheets (zero importers) | `unified-parity.css` (1,300) + `shared-design-system.css` (404) = **1,704 lines** | import scan §1.4 |
| Sheets with **no `@layer`** at all | **12** | §1.3 |

### 1.1 Top files by lines

```
landing.css 7920 · components.css 5705 · student.css 4161 · polish.css 3404 · teacher-quality.css 2592
owner.css 1704 · layout.css 1599 · auth.css 1565 · r305-research-pdf-ai.css 1463 · tokens.css 1314
unified-parity.css 1300 · colleges.css 1242 · r305-admin-owner.css 1176 · r305-teacher-quality.css 1106
training.css 904 · pdf.css 865 · r331/hero.css 862 · notifications.css 793 · research.css 785 · campus.css 782
```

### 1.2 Top files by `!important` (lines / declarations)

```
polish.css 40 / 16 · components.css 13 / 6 · base.css 10 / 6 · unified-parity.css 6 / 6 · pdf.css 5 / 2
landing.css 5 / 4 · student.css 3 / 0 · notifications.css 3 / 0 · motion 2/1 · legal 1/1 · layout 1/1
(all other rNNN sheets: mention-only, 0 declarations)
```

### 1.3 Layer status

Constitution: `layers.css` = `@layer reset, tokens, base, layout, components, pages, utilities;` (60 lines, imported first in `main.tsx:7`).
`tokens.css:100` and `motion.css:15` declare `@layer tokens, base, layout, components, pages, overrides;`.

**12 fully unlayered files** (`rg -n '@layer'` empty): `campus.css, fonts.css, landing.css, patterns.css, r314-productframe.css, r323-design.css, r325-app.css, r325-indicators.css, r325-shell.css, r330-home.css, r331/hero.css, r331/nav.css`.
Everything else is partially layered (`@layer pages` dominates; `base.css` keeps a deliberately-unlayered §loader rung; `polish.css`/`motion.css`/`auth.css`/`components.css` carry `@layer overrides` capstone blocks — the documented escape hatches that keep `!important` alive).

### 1.4 Import graph (essentials)

- `main.tsx` (13 imports, global): `layers → fonts → tokens.generated → tokens → motion → base → components → layout → patterns → auth → notifications → student → polish`.
- `AppShell.tsx`: `r305-shell:10 → r319-shell:15 → r325-app:21 → r325-shell:27 → r325-indicators:35` (fixed order — merge window).
- Heavy per-page stacks: student pages import 4–6 sheets each in a stable order (`r305-student → r305-student-{courses|dashboard|schedule|supplemental} → r319-student → r319-student-pages`).
- **Zero-importer orphans**: `unified-parity.css`, `shared-design-system.css` — referenced only by comments (`base.css`, `r314-chrome.css`) and two unit tests that read them from disk (`tests/unit/r324-type-gate.test.ts:6`, `tests/unit/r323-brand-system.test.ts`). Verified with `rg '(unified-parity|shared-design-system)' frontend -g '!node_modules/**'`.

Full importer file:line map is embedded in the rename table (§7).

---

## 2. rNNN inventory (27 sheets, 10,799 lines)

| File | Lines | Importers (file:line) | Actual scope (sampled selectors) |
|---|---|---|---|
| r305-research-pdf-ai.css | 1,463 | DocumentViewerPage.tsx:17; ResearchReviewPage.tsx:28; ResearchPage.tsx:34; LibraryPage.tsx:34; AiAssistantPage.tsx:59 | R305 Heron tech-family for research/pdf/ai: `.r305rp-band`, `.r305rp-band--deep`, `.r305pdf-hitmark` |
| r305-admin-owner.css | 1,176 | AdminExtraPages:44, AdminPages:66, AdminSyncPage:35, AdminGovernancePages:72, OwnerInstitutionDetailPage:33, OwnerInstitutionsPage:19, OwnerPages:4 | admin/owner Heron scoping: `.r305ao*`, `.admin-stat-row`, `.admin-sync-runs`, `.auth-row-2`, `.form-field` |
| r305-teacher-quality.css | 1,106 | QualityPages:37; OnlineExamsPages:47; TeacherLivePage:25; TeacherIntelligencePage:34; ExamAuthorPages:78; TeacherPages:54; TeacherDashboardPage:16; TeacherProfilePage:35; TeacherLabsPage:34 | teacher Heron layer: `.hr-scope` (47 decls), `.hr-edge`, `.hr-table`, `.oex-mod-row`, `.page/.page-header` overrides |
| r331/hero.css | 862 | components/landing/hero/Hero.tsx:52 | landing hero rebuild: `.hro-actions`, `.hro-alt`, `.bp-rulers`, `.fo-hero` |
| r305-shell.css | 454 | AppShell.tsx:10 | shell chrome gen-1: `.topbar-inst-trigger`, `.has-shell`, `.nav-group`, `.nav-item` |
| r325-indicators.css | 468 | AppShell.tsx:35 | dashboard indicators (all roles): `.dash-resume-progress`, `.ind-mono`, `.dash-ai-row` |
| r314-productframe.css | 425 | components/landing/ProductFrame.tsx:23 | product frame: `.prf`, `.prf-card`, `.prf-card--attend`, `.prf-card--chat` |
| r319-student.css | 406 | 16 student pages + MessagesInbox + CommunityPages + SettingsPage + OnlineExams (16+ importers) | student gen-3: `.r319s-bar-title`, `.r319s-empty`, `.stu-course-progress` |
| r325-app.css | 200 | AppShell.tsx:21; DesignPage.tsx:74 | pattern utilities: `.pat-cross`, `.pat-hatch`, `.pat-skeleton` |
| r325-shell.css | 306 | AppShell.tsx:27 | shell sidebar gen-3: `.sidebar`, `.nav-item`, `.sidebar-backdrop` |
| r319-student-pages.css | 132 | 14 student pages | page-level deltas: `.r319s-page`, `.r319sp-matrix-bar`, `.thumb-card` |
| r314-chrome.css | 519 | LandingPage.tsx:51 | landing chrome: `.et-tab`, `.cb-banner`, `.cb-accept`, `.cb-more` (cookie banner) |
| r305-student.css | 264 | 18 student/exam pages | student Heron band: `.r305s-band`, `.r305s-band--deep`, `.r305s-eyebrow` |
| r305-student-schedule.css | 243 | MorePages:41, OnlineExamsPages:46, MatrixPage:21, CalendarPage | calendar/matrix: `.r305s-chip`, `.cal-event-row`, `.cal-legend`, `.matrix-cell` |
| r321-player-page.css | 205 | LecturePlayerPage.tsx:37 | lecture player: `.vpc`, `.r321p-page`, `.tr-cue` |
| r321-map-live.css | 189 | LivePage.tsx:54; CampusMapPage.tsx | live map: `.live-dot`, `.live-embed-frame`, `.r321m-page`, borrows `.r305s-chip` |
| r321-exams.css | 186 | OnlineExamsPages.tsx:55 | exam taker: `.r321x-taker`, `.r321x-page` |
| r330-home.css | 186 | LandingPage.tsx:68 | home patches: `.pm-col`, `.pm-cols`, `.pm-section`, `.st-section` |
| r323-design.css | 226 | DesignPage.tsx:73 | design-system showcase: `.r323d`, `.r323d-grid`, `.r323d-stackdemo-fab` |
| r305-student-supplemental.css | 300 | 12 student pages | gamification/profile: `.r305s-next`, `.r305g-level`, `.r305p-hero`, `.r305p-hero-meter` |
| r323-brand.css | 178 | BrandPage.tsx:37 | brand page: `.mdrk-logo`, `.r323b-anim`, `.r323b-chip-ink` |
| r305-student-courses.css | 168 | CatalogPage:18, CoursesPage:39, LecturePlayerPage:29, CourseDetailPage | courses: `.courses-row-progress`, `.lecture-panel`, `.cp-row` |
| r305-student-dashboard.css | 151 | DashboardPage.tsx:43 | dashboard: `.dash-hero-deep`, `.dash-momentum`, `.dash-resume-card` |
| r319-shell.css | 192 | AppShell.tsx:15 | shell chrome gen-2: `.content`, `.has-shell`, `.pf-page-header` |
| r321-community.css | 117 | CommunityPages.tsx:76 | community: `.r321c-page` |
| r320-settings.css | 52 | SettingsPage.tsx:16 | settings rows: `.set-note`, `.set-row`, `.set-row-main` |
| **Total** | **10,799** | | |

---

## 3. Dead-code evidence (R331 harness)

`scripts/gates/css-coverage.mjs` (read in full): Playwright sweep of 6 role-guarded route sets × {390,768,1440} × {light,dark} against a running dev server (`CSS_COVERAGE_URL`, default `http://localhost:5173`), mock API via `tests/e2e/fixtures`. For every style rule in every **loaded** sheet it probes `document.querySelector(sel)` (pseudo-elements + interaction pseudo-classes stripped; group rules descended unconditionally). Dead candidate = selector matching zero elements on zero routes. Outputs: committed summary `docs/redesign/r331/css-coverage.json` + full map at `$CSS_COVERAGE_FULL` (default `/home/z/heron-lab/css-coverage-full.json`). Checkpointed after each route (`*.ckpt.json`), `CSS_COVERAGE_FRESH=1` to restart.

**Artifact status**: committed summary EXISTS (`generatedAt: 2026-11-02T03:45:39Z`, totals 5,061/1,537/3,524 — matches stated truth). Full selector→routes map at `/home/z/heron-lab/` is **gone** (dir holds only HANDOFF.md/sections/twin). The sample of 500 dead selectors is inside the committed JSON.

**Re-run decision**: NOT re-run in Phase 1. It is neither cheap nor OOM-safe on this box (66 role×theme×route probes × 3 viewports = 198 page loads at ≥1.5 s settle each; the script header documents cgroup OOM kills). It is scheduled as the **first action of the deletion phase**, fresh (`CSS_COVERAGE_FRESH=1`), per deletion bucket (§9) — a stale artifact must never gate deletions anyway.

Top dead buckets today (`perFile`, deadCandidates of selectors, deadRatio × lines = raw upper bound):

| file | sel | dead | deadRatio | lines | raw savable |
|---|---|---|---|---|---|
| components.css | 785 | 644 | 0.82 | 5,705 | 4,680 |
| student.css | 523 | 460 | 0.88 | 4,161 | 3,659 |
| teacher-quality.css | 397 | 385 | 0.97 | 2,592 | 2,513 |
| landing.css | 763 | 273 | 0.36 | 7,920 | 2,833 |
| r305-research-pdf-ai.css | 228 | 222 | 0.97 | 1,463 | 1,424 |
| polish.css | 332 | 189 | 0.57 | 3,404 | 1,937 |
| r305-admin-owner.css | 210 | 182 | 0.87 | 1,176 | 1,019 |
| owner.css | 165 | 163 | 0.99 | 1,704 | 1,683 |
| colleges.css | 168 | 150 | 0.89 | 1,242 | 1,108 |
| r305-teacher-quality.css | 153 | 142 | 0.93 | 1,106 | 1,026 |
| research.css | 107 | 104 | 0.97 | 785 | 762 |
| layout.css / auth.css / training.css / notifications.css / campus.css / tokens.css | … | … | 0.32–0.58 | … | 2,977 |
| **Σ loaded sheets (46)** | 5,061 | 3,524 | 0.696 | 46,408 | **29,772** |

**Not measured** (never loaded on swept routes): unified-parity (orphan), shared-design-system (orphan), layers, fonts, pdf.css, ai.css, player.css, r321-player-page.css, r331/hero.css, r331/nav.css, r323-brand.css, r323-design.css = 5,713 lines. These need the Chrome DevTools Coverage pass (§9 step D3).

Caveat carried through the plan: deadRatio × lines is an **upper bound** (a dead selector row ≠ proportional lines; comments/blank lines don't shrink with the first rule deleted). Realization assumed 50–65%; every bucket is gated by `wc -l` before/after.

---

## 4. Stylelint truth

```
cd /home/z/madarek/frontend && npx -y stylelint@16 "src/styles/**/*.css" -f json -o /tmp/stylelint-r332.json   # exit 2
python3 summary over /tmp/stylelint-r332.json
```

- Files linted: 56 · files with findings: 25
- **Errors 78** · warnings 104 · total 182
- Error rules: `no-duplicate-selectors` **75**, `declaration-block-no-duplicate-properties` **3**
- Warning rules: `no-descending-specificity` **104** (only warning rule)
- Dirtiest files: `landing.css 30E/35W` · `components.css 14E/16W` · `layout.css 7E/2W` · `tokens.css 6E` · `owner.css 5E/3W` · `polish.css 4E/4W` · `r314-productframe.css 4E/1W`

Read: the 75 duplicate-selector errors are the merge map in bug-form — they concentrate exactly where §6 finds cross-file duplication (`landing.css` `.fo-cta`/`.pr-*` re-declared across its own sections; `layout/polish/shell` chrome families). Consolidation (§8) removes the duplicates structurally; a final `npx stylelint` clean pass is the exit gate.

---

## 5. Existing drift / md5 verification harness

- `frontend/tests/audit/run-drift.ts` (CLI): loads fresh `tests/audit/surface-inventory.json` vs committed `tests/audit/surface-baseline.json` (16,031 lines, `generatedAt 2026-11-02T15:07Z`, **72 captures = 12 BASELINE_ROUTES × {360,768,1280} × {light,dark} × rtl**), runs `detectDrift` over budgets: colors, colorProbe coverage floor, motion treatments, contrast, CLS, FCP ratio, bytes, illustrations, overlays. Exit 0 clean / 1 drift / 2 no inventory.
- Capture command: `npm run test:audit:capture:mock` (= `AUDIT_BASELINE=1 AUDIT_API_MOCK=1 playwright test tests/audit/surface-inventory.spec.ts`); slices via `AUDIT_ROUTES_ONLY` / `AUDIT_ROUTES_FROM`. Baseline promotion: `npm run audit:baseline`.
- **Pixel/md5 identity**: `scripts/gates/css-shots.mjs` — deterministic full-page PNG pairs across two dev servers (reduced-motion frozen, `document.fonts.ready` + settle, `fullPage:false`). R331 used PIL diff (% pixels >8/255 + mean abs diff; see `docs/redesign/r331/css-pass1.md §5`). The R332 invariant check per step:

```bash
# golden once, then after every step:
CSS_SHOTS_BASES="wt=http://localhost:5173" CSS_SHOTS_ROUTES="/,/login,/about" CSS_SHOTS_VPS="1440,390,768" \
  node scripts/gates/css-shots.mjs
md5sum /home/z/heron-lab/css-shots/wt-*.png | sed 's#/home/z/heron-lab/css-shots/##' | sort > /tmp/r332-md5-after.txt
diff /tmp/r332-md5-golden.txt /tmp/r332-md5-after.txt   # empty = identical pixels (PNG bytes deterministic by construction)
```

- Authenticated 72-capture matrix (shell/student/teacher/admin/owner surfaces):

```bash
cd frontend && npm run test:audit:capture:mock && npm run test:audit:drift   # drift exit 0 = no drift
```

**Per-step invariant (both, in order): md5-diff empty on public pixel routes AND drift exit 0 on the 72-capture matrix.** For steps that only touch never-loaded sheets, the pixel check alone suffices.

---

## 6. Duplication probes

`rg -o '^\s*\.[a-zA-Z][a-zA-Z0-9-]*' --glob '*.css'` + python per-file exact-token census:

- **250 distinct class selectors declared in ≥2 files; 124 involve an rNNN sheet.**
- Top offenders: `.btn` ×8 files · `.has-shell` ×7 (`base, layout, polish, r305-shell, r319-shell, r325-shell, shared-design-system`) · `.content` ×6 · `.badge`, `.nav-item`, `.page`, `.page-header`, `.topbar`, `.topbar-notif` ×5 · `.bottom-nav`, `.card-header`, `.icon-btn`, `.input`, `.list-row`, `.sidebar`, `.sidebar-backdrop`, `.skeleton` ×4.
- Shell chrome is spread over **3 generations** (r305-shell → r319-shell → r325-shell) + `layout.css` + `polish.css` — `.has-shell` and `.topbar-notif` declared in all three rNNN shells; the trio merges into one file with source order preserved (§7), which also dissolves the pairwise override hacks R331 documented (`r321-player-page.css:97-135` notes about r319-shell unlayered `.page-index`).
- In-file duplication: stylelint's 75 `no-duplicate-selectors` (landing 30, components 14, layout 7, owner 5, polish 4) + 3 `declaration-block-no-duplicate-properties` (admin.css:279 font-size; tokens.css ×2).
- Orphans duplicate live token declarations (r324 test note: "unified-parity + shared-design-system re-declare the token layer") — dies with the orphan retirement.

---

## 7. Rename map (every rNNN/round file → owner dir; ★ = importer to re-point)

Target layout: `src/styles/{landing,shell,student,teacher,admin,owner,auth,shared}/…`; foundation stays `src/styles/shared/`. Names drop all `rNNN`/`rNNNx-` prefixes; Heron (R305 codename) kept as a semantic family name.

| # | Current | Lines | → Target | Merge partners | Risk note |
|---|---|---|---|---|---|
| 1 | unified-parity.css | 1,300 | **DELETE** (orphan) | — | Update `tests/unit/r324-type-gate.test.ts` + `r323-brand-system.test.ts` readers first |
| 2 | shared-design-system.css | 404 | **DELETE** (orphan) | — | Same |
| 3 | r305-shell.css | 454 | `shell/shell.css` | merge with 4+5, order preserved | `.has-shell/.sidebar/.topbar-notif` dupes; AppShell import sites 10/15/27 |
| 4 | r319-shell.css | 192 | `shell/shell.css` | ↑ | `.pf-page-header` also in productframe? no — `pf-` prefix here only; safe |
| 5 | r325-shell.css | 306 | `shell/shell.css` | ↑ | unlayered today → seats into `@layer layout` |
| 6 | layout.css | 1,599 | `shell/layout.css` | — | global import order in main.tsx must not shift |
| 7 | notifications.css | 793 | `shell/notifications.css` | — | global import; badge geometry cross-refs polish `@layer overrides` |
| 8 | r325-app.css | 200 | `shared/patterns.css` (merge) | patterns.css | **dual importer**: AppShell:21 + DesignPage:74 — re-point both |
| 9 | r325-indicators.css | 468 | `shared/indicators.css` | — | AppShell:35; unlayered → `@layer components` |
| 10 | r305-student.css | 264 | `student/heron.css` | merge 10–14, order preserved | 18 importer files; biggest rename surface |
| 11 | r305-student-courses.css | 168 | `student/heron.css` | ↑ | |
| 12 | r305-student-dashboard.css | 151 | `student/heron.css` | ↑ | |
| 13 | r305-student-schedule.css | 243 | `student/heron.css` | ↑ | `.r305s-chip` also re-declared in r321-map-live (dedupe at merge) |
| 14 | r305-student-supplemental.css | 300 | `student/heron.css` | ↑ | |
| 15 | r319-student.css | 406 | `student/pages.css` | merge with 16 | also imported by community/Settings/exams — re-point all |
| 16 | r319-student-pages.css | 132 | `student/pages.css` | ↑ | |
| 17 | student.css | 4,161 | `student/student.css` | — | 88% deadRatio → biggest deletion bucket |
| 18 | training.css | 904 | `student/training.css` | — | shared `.filter-pill/.back-link` families imported by teacher/admin pages — keep exported-family contract documented |
| 19 | ai.css | 279 | `student/ai.css` | — | unmeasured by coverage; DevTools pass |
| 20 | r320-settings.css | 52 | `student/settings.css` | — | SettingsPage:16 |
| 21 | r321-exams.css | 186 | `student/exams.css` | — | OnlineExamsPages:55 |
| 22 | r321-map-live.css | 189 | `student/map-live.css` | — | LivePage:54, CampusMapPage |
| 23 | r321-player-page.css | 205 | `student/lecture-player.css` | — | LecturePlayerPage:37; carries documented dead-letter rules vs r319-shell |
| 24 | r321-community.css | 117 | `student/community.css` | — | CommunityPages:76 |
| 25 | vision.css | 154 | `student/vision.css` | — | VisionPages |
| 26 | teacher-quality.css | 2,592 | `teacher/quality.css` | — | R304 family sheet; `.oex-/.exa-/.tpg-` sections live here |
| 27 | r305-teacher-quality.css | 1,106 | `teacher/heron.css` | — | 9 importer files; `.hr-scope` scoping contract |
| 28 | admin.css | 424 | `admin/admin.css` | — | also imported by OwnerInstitutionDetailPage/OwnerInstitutionsPage (ws-table family) — document borrow |
| 29 | r305-admin-owner.css | 1,176 | `shared/heron-admin-owner.css` | — | 7 importers across admin+owner; import-after-family contract |
| 30 | owner.css | 1,704 | `owner/owner.css` | — | 99% deadRatio; confirm-dialog surfaces imported by 5 non-owner modules |
| 31 | auth.css | 1,565 | `auth/auth.css` | — | global main.tsx import + `@layer overrides` block at :1537 |
| 32 | landing.css | 7,920 | `landing/landing.css` | — | 30 stylelint errors internally; split home/marketing only if time permits |
| 33 | r314-chrome.css | 519 | `landing/chrome.css` | — | LandingPage:51 |
| 34 | r314-productframe.css | 425 | `landing/product-frame.css` | — | ProductFrame.tsx:23 |
| 35 | r330-home.css | 186 | `landing/home.css` | — | LandingPage:68; re-declares `.pm-*/.st-section` from landing.css (dedupe candidate) |
| 36 | r331/hero.css | 862 | `landing/hero.css` | — | Hero.tsx:52; unlayered → seat `@layer pages` |
| 37 | r331/nav.css | 625 | `landing/nav.css` | — | SheetNav.tsx:58; unlayered → seat `@layer pages` |
| 38 | r323-brand.css | 178 | `landing/brand.css` | — | BrandPage:37; token mirror test reads it |
| 39 | campus.css | 782 | `landing/campus.css` | — | public routes; CapabilityPages + CampusPages |
| 40 | colleges.css | 1,242 | `shared/colleges.css` | — | imported by colleges + community + competitions (`.comp-*` borrows) → shared, not landing |
| 41 | legal.css | 598 | `landing/legal.css` | — | LegalSheet; 1 `!important` (print) |
| 42 | research.css | 785 | `shared/research.css` | — | student + teacher + DocumentViewer |
| 43 | pdf.css | 865 | `shared/pdf.css` | — | DocumentViewer; print `!important` pair (§10) |
| 44 | r305-research-pdf-ai.css | 1,463 | `shared/research-heron.css` | — | 5 importers across student/teacher/viewer |
| 45 | player.css | 476 | `shared/player.css` | — | VideoPlayerChrome |
| 46 | illustrations.css | 127 | `shared/illustrations.css` | — | 2 component importers |
| 47 | patterns.css | 499 | `shared/patterns.css` | merges 8 | unlayered → `@layer components` |
| 48 | polish.css | 3,404 | `shared/polish.css` | — | keeps `@layer overrides` capstone; 16 `!important` → §10 |
| 49 | components.css | 5,705 | `shared/components.css` | — | a11y media blocks → overrides seat (§10) |
| 50 | motion.css | 558 | `shared/motion.css` | — | layer-order statement lives here; do not move before layers.css |
| 51 | base.css | 665 | `shared/base.css` | — | §loader unlayered rung must seat before belt de-!important (§10) |
| 52 | fonts.css | 233 | `shared/fonts.css` | — | `@font-face` only; seat `@layer base` for tidiness |
| 53 | tokens.css / tokens.generated.css | 1,524 | `shared/tokens.css` / `shared/tokens.generated.css` | — | generated file: keep name + regeneration path |
| 54 | layers.css | 60 | `src/styles/layers.css` (stays) | — | constitution; first import |

Result: 27 rNNN sheets → **19 round-free files** (8 rNNN sheets disappear entirely: 2 as shell-trio merge twins, 4 as heron-quintet twins, 1 as r319-pair twin, 1 = r325-app into patterns.css). Plus the 2 non-rNNN orphan sheets deleted = **10 files gone, 1,704 lines**. 56 files → **46 files** across 8 owner dirs + `layers.css` at the styles root.

---

## 8. Merge order (safest first) — invariant after EVERY step: §5 md5-diff empty + drift exit 0

| Step | Action | Δ lines (proj) | Why safe here |
|---|---|---|---|
| 0 | Freeze golden: css-shots PNGs + `md5sum` → `/tmp/r332-md5-golden.txt`; `npm run test:audit:capture:mock && npm run test:audit:drift` must be clean at HEAD | 0 | baseline before any touch |
| 1 | Orphan retirement: delete unified-parity.css + shared-design-system.css; update the two unit tests that read them | **−1,704** | zero importers → zero runtime delta by construction; unit tests are the only readers |
| 2 | Pure renames, import-site-only edits, one file per commit: r320→student/settings, r321-{community,exams,map-live,player-page}→student/*, r323-brand→landing/brand, r330-home→landing/home, r314-{chrome,productframe}→landing/*, r331/{hero,nav}→landing/* | 0 | content byte-identical; Vite import re-point only |
| 3 | Cross-scope moves: campus→landing, legal→landing, colleges→shared, training→student, ai→student, vision→student, research/pdf/r305-research-pdf-ai→shared/{research,pdf,research-heron}, player/illustrations→shared | 0 | same load order at each import site preserved |
| 4 | Shell trio merge → `shell/shell.css` (r305→r319→r325 order preserved inside the file; AppShell:10/15/27 → one import at :10 position) | −40 (dupe headers/comments) | consecutive imports in one file = exact same cascade order; `.has-shell` dedupe resolved explicitly |
| 5 | Student heron quintet merge → `student/heron.css`; r319 pair merge → `student/pages.css` | −60 | same argument as step 4; ~18 import sites re-pointed mechanically |
| 6 | Teacher pair move (quality + heron), admin-owner move → shared/heron-admin-owner.css | 0 | no merge, rename only |
| 7 | r325-app merge into shared/patterns.css; re-point AppShell:21 + DesignPage:74 | −20 | dual importer is the only risk; both re-pointed in same commit |
| 8 | Layer seating pass 2 (per layers.css mapping): seat the 12 unlayered files; base.css §loader → `@layer base`; fonts → base; shell trio → layout; patterns/indicators → components; hero/nav/landing → pages | 0 (wrap only) | each seat is one file per commit + md5 check (R331 pass-1 proved the empty-slot technique) |
| 9 | Stylelint structural cleanup: fix 75 no-duplicate-selectors + 104 no-descending-specificity + 3 dup-properties (merge/sort in place) | −400…−800 | pure refactor, diff-gated |
| 10 | Dead-rule deletion buckets (§9) | §9 | coverage-driven |
| 11 | `!important` elimination (§10) | −30…−60 | after seating, per case |
| 12 | Final gates: `npx stylelint` = 0 findings · `wc -l` ≤ 33,000 · coverage re-run re-committed · drift clean | — | round exit |

---

## 9. Deletion strategy (3,524 dead candidates → actual deletions)

1. **D0 — fresh census.** `cd frontend && npm run gate:css-coverage` with `CSS_COVERAGE_FRESH=1` (harness is checkpoint-resumable; never touches the dev server). Re-commits `docs/redesign/r331/css-coverage.json` → move to `docs/redesign/r332/css-coverage.json` path for the round; regenerates the full selector map under `/home/z/heron-lab/`.
2. **D1 — bucket order (largest, highest-confidence first), each bucket = one commit + invariant check + `wc -l` delta:**
   - `owner.css` (0.99 dead) → `teacher-quality.css` (0.97) → `r305-research-pdf-ai` (0.97) → `research.css` (0.97) → `student.css` (0.88) → `colleges.css` (0.89) → `r305-admin-owner` (0.87) → `components.css` (0.82) → `training/r305-teacher-quality/landing/polish/layout/auth/notifications/campus/tokens` remainder.
   - Deletion rule per bucket: remove a rule only when **every** selector in its list is dead on the fresh sweep; keep rules with ≥1 live selector; interactive-state selectors (:hover etc. — stripped by the harness) are deleted only together with their base rule.
3. **D2 — unmeasured sheets**: run DevTools Coverage (Chrome, against :5173, per-route with the same route list) for pdf/ai/player/r321-player-page/hero/nav/brand/design/fonts → same bucket treatment. Est. 1,500–2,000 lines.
4. **D3 — re-run after merge steps 4–7**: merges expose more dead (overridden twins become visible); final coverage re-run closes the round.

Projected savings: raw upper bound 29,772 (loaded sheets) + 1,704 orphans + ~1,750 unmeasured-sheet dead ≈ **33,200 raw**; at 50–65% realization → **16,600–21,600 deleted**.

---

## 10. `!important` elimination plan (43 declarations → 0)

Top files (declarations): polish 16 · unified-parity 6 (dies in step 1) · components 6 · base 6 · landing 4 · pdf 2 · motion/legal/layout 1 each.

Root cause is uniform: capstone/a11y/print/reduced-motion blocks fighting layered rules **and one deliberately-unlayered rung** (`base.css` §loader). Once step 8 seats everything, `@layer overrides` plain declarations beat every layered declaration — `!important` loses its only justification. Five representative cases (rule read, replacement):

1. **Reduced-motion belt** — `base.css:507-512` (`animation-duration: 0.01ms !important` ×6), `polish.css:1727,1956,2140,2606-2611,2795-2796` (`animation/transition: none !important`), `components.css:5340`, `motion.css:504`, `layout.css:1597`, `polish.css:1563` — ~19 decls. **Replace**: consolidate to ONE canonical `@media (prefers-reduced-motion: reduce)` block in `shared/polish.css` `@layer overrides`; requires base.css §loader (`base.css:530` "appended OUTSIDE @layer base") seated into `@layer base` first (step 8) — then plain `animation: none` in overrides wins (layers < overrides). Est. −19.
2. **Lenis scrollbar** — `base.css:154-155` `scrollbar-width: none !important` "deliberate: polish v22's overrides-layer `*` scrollbar block would otherwise win". **Replace**: delete/merge the competing polish `*` scrollbar block (it fights a base-layer rule only because both exist); single owner in `@layer base`, attribute-scoped. Est. −2.
3. **A11y media blocks** — `components.css:5307/5309` (`outline: 3px solid var(--accent-ink) !important; box-shadow: none !important` under `prefers-contrast`), `:5323` (forced-colors `Highlight`), `:5331-5332` (reduced-transparency `backdrop-filter: none !important`). **Replace**: move the whole §a11y media section into `@layer overrides` — opponents (focus outlines, shadows, backdrop-filters) all live in base/components/pages layers → plain declarations suffice. Est. −5.
4. **Print belt** — `pdf.css:836-837` (`max-width/height !important` vs canvas **inline** px sizing set by JS), `pdf.css:807/814` (`height:auto/display:none !important`), `polish.css:2773-2826` print block, `legal.css:481`. **Replace**: (a) layered/unlayered CSS opponents → seat print blocks in `@layer overrides`, drop `!important` (−6); (b) the canvas pair is the one case where `!important` beats an inline style — change the JS render to write `style.setProperty('--pdf-canvas-w', …)` instead of `width/height`, CSS becomes `width: min(var(--pdf-canvas-w), 100%); height: auto` (−2, includes a one-line change in the canvas render module — flagged as the only JS-coupled item).
5. **Cursor instrument** — `landing.css:3996/4006/4015/4024` (`cursor: none/crosshair !important`, custom-pointer ownership ladder vs thousands of `cursor: pointer` rules). **Replace**: move the four rules into `@layer overrides` in `landing/` (or `shared/cursor.css`) keeping selector order — overrides beat all page-layer `cursor` declarations without `!important`. Est. −4.

Remaining after 1–5 + orphan retirement: 0. Reserve: if any straggler fights an **inline style** not convertable to a custom property, it becomes a documented single exception — goal explicitly 0, so the JS conversion (4b) is in scope.

---

## 11. Projection table

| Phase (§8 step) | Lines | `!important` decls | Files | Dead candidates |
|---|---|---|---|---|
| Current (measured) | 52,121 | 43 (107 lines) | 56 | 3,524/5,061 measured |
| 1 orphans | 50,417 | 37 | 54 | unchanged |
| 2–3 renames | 50,417 | 37 | 54 | unchanged |
| 4–7 merges | ~50,300 | 37 | 46 | −150 (exposed twins) |
| 8 layer seating | ~50,300 | 37 (now all eliminable) | 46 | re-census |
| 9 stylelint cleanup | ~49,700 | 37 | 46 | −100 |
| 10 dead buckets (50–65% of ~33,200 raw) | **29,900…35,100** | 37 | 46 | → ~500 residual (interactions) |
| 11 `!important` elimination | −90 | **0** | 46 | — |
| 12 exit | **target ≤ 33,000** — met at ≥53% realization; fallback levers: landing.css internal dedupe (30 dup-selector errors), polish §pages→components regrouping, unmeasured-sheet D2 pass | 0 | 46 files / 8 dirs | ≤500 documented |

Risk math: even at the pessimistic 40% realization (−13,300), lines land at ~36,400 — the two fallback levers (landing internal dedupe + D2 DevTools pass on the 5,713 unmeasured lines, itself ~60% dead historically) close the remaining ~3,400.

---

## 12. Top risks

1. **Stale-coverage deletions**: committed census is from 2026-11-02; any UI merged since invalidates rows. Mitigation: fresh `CSS_COVERAGE_FRESH=1` run is the mandatory first deletion action; never delete off the R331 artifact.
2. **`!important` removal before full layer seating** inverts cascade wins (unlayered beats overrides only while `!important` is present). Mitigation: step 8 completes before step 11; per-case md5 + reduced-motion/contrast screenshots.
3. **Import-order drift during merges**: three generations of shell chrome and 18-site student stacks are order-sensitive. Mitigation: merge = concatenation at the exact first-import position, single import per consumer, one commit per family.
4. **The 5,713 unmeasured lines** (orphans + pdf/ai/player/hero/nav/brand/design) have no dead-candidate evidence; blind deletion risks regressing print/viewer surfaces. Mitigation: DevTools Coverage pass (D2) before touching them; canvas `!important` pair coupled to a JS change (4b).
5. **Test/borrow coupling**: unit tests read deleted orphans from disk; admin/owner/training/colleges sheets are cross-module borrows with documented contracts (`ws-table`, `.comp-*`, `.back-link`). Mitigation: contract comments moved with the sheets; borrow map checked via `rg` before each rename; `npm run test:audit:drift` + unit suite after every step.
6. **Box OOM** on long sweeps (documented 4GiB cgroup kills). Mitigation: coverage harness checkpoint/resume; buckets small; never kill the dev server.

## 13. Command appendix (verbatim, all executed this round)

```bash
wc -l *.css r331/*.css | sort -rn                                   # 52,121 / 56 files
rg -c '!important' *.css r331/*.css | sort -t: -k2 -rn              # 107 lines
rg -o '!important' *.css r331/*.css | wc -l                          # 111 occurrences
rg -c '^\s*(--)?[a-zA-Z-]+\s*:[^;]*!important' *.css r331/*.css      # 43 declarations
rg -n '@layer' --glob '*.css' . | head -50
rg -n "import ['\"][^'\"]+\.css['\"]" frontend/src -g '*.{ts,tsx}'   # via Grep tool: 182 imports / 61 files
cd frontend && npx -y stylelint@16 "src/styles/**/*.css" -f json -o /tmp/stylelint-r332.json   # 78E/104W
python3 - (summarize /tmp/stylelint-r332.json)                       # top: no-descending-specificity 104, no-duplicate-selectors 75
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/        # 200
```
