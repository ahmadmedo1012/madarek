# R333 · A-CSS debt census & P-I plan (Phase 1 — read-only)

Scope: `frontend/src/styles/**`. **No CSS, config, or gate script was modified this round.**
Base commit: `5d4468a5` (r332 exit). Census measured at HEAD `7d4ba8b8` (= base + docs-only kickoff commit; code-identical for every number below).
Prior art carried forward: `docs/redesign/r332/css-baseline.md` (12-step plan, census method), `docs/redesign/r332/css-split-landing.md` (landing split proof), `docs/redesign/r331/css-coverage.json` (dead-candidate artifact).

---

## §1 Fresh census (r333 @ 5d4468a5)

| Metric | r332 (measured) | **r333 (fresh)** | Δ |
|---|---|---|---|
| Total CSS lines (`styles/**`) | 52,121 / 56 files | **52,959 / 71 files** | +838 (landing split headers/provenance + new owner dirs), 15 more files |
| `!important` — lines / occurrences | 107 / 111 | **110 / 114** | +3 / +3 (split provenance headers) |
| `!important` — **real declarations** | 43 (line-start regex) | **61 occurrences on 57 lines** (comment-stripped state machine; r332's 43 under-counted nested one-liners) | re-counted |
| `!important` — comment/doc-only lines | 64 | **53** | re-counted |
| Stylelint errors / warnings / dirty files | 78 E / 104 W / 25 files | **53 E / 94 W / 30 files** | −25 E (landing.css's 30 dup-selector errors dissolved by the split; 1 dup-properties fixed) |
| Dead-candidate selectors (r331 artifact) | 3,524 / 5,061 (69.6%) | unchanged **but stale** → re-sweep is PI-00 | — |
| Parity-export sheets (load-bearing) | 1,704 lines | **1,704 lines — DO-NOT-DELETE** (§3) | — |

Commands (verbatim, all run this round):

```bash
find frontend/src/styles -name '*.css' | xargs wc -l | sort -rn        # 52,959 total / 71 files
grep -rc '!important' --include='*.css' frontend/src/styles            # 110 lines, per-file §1.2
cd frontend && npx -y stylelint@16 "src/styles/**/*.css" -f json       # → /tmp/sl.err (exit 2)
python3 comment-stripping state machine                                 # 61 real declarations / 53 doc lines
```

### 1.1 Top 20 files by line count (of 71)

| # | File | Lines | | # | File | Lines |
|---|---|---|---|---|---|---|
| 1 | `components.css` | 5,705 | | 11 | `tokens.css` | 1,314 |
| 2 | `student.css` | 4,161 | | 12 | `unified-parity.css` ⛔ | 1,300 |
| 3 | `polish.css` | 3,404 | | 13 | `colleges.css` | 1,242 |
| 4 | `teacher-quality.css` | 2,592 | | 14 | `shared/heron-admin-owner.css` | 1,176 |
| 5 | `landing/strata.css` | 1,954 | | 15 | `landing/hero.css` | 1,144 |
| 6 | `owner.css` | 1,704 | | 16 | `teacher/heron.css` | 1,106 |
| 7 | `layout.css` | 1,599 | | 17 | `landing/hero-mechanics.css` | 915 |
| 8 | `auth.css` | 1,565 | | 18 | `student/training.css` | 904 |
| 9 | `shared/research-heron.css` | 1,463 | | 19 | `landing/footer.css` | 890 |
| 10 | `landing/journey.css` | 1,324 | | 20 | `landing/chrome.css` | 869 |

Rest of the long tail (≥500): `pdf.css 865 · notifications.css 793 · research.css 785 · campus.css 782 · base.css 665 · landing/nav.css 625 · legal.css 598 · motion.css 558 · landing/platform.css 538 · landing/consent-edge.css 519 · patterns.css 499 · landing/shared.css 495 · player.css 476 · shared/indicators.css 468 · shell/shell.css 454 · landing/product-frame.css 425 · admin.css 424 · student/pages.css 406 · shared-design-system.css 404 ⛔`. ⛔ = parity-export artifact.

### 1.2 `!important` lines per file

| File | lines | | File | lines |
|---|---|---|---|---|
| polish.css | 40 | | shell/sheet-frame.css, shell/chrome.css, shared/indicators.css, shared/app-grammar.css, research.css, legal.css, landing/shared.css, landing/nav.css, landing/home.css, landing/consent.css, landing/consent-edge.css, illustrations.css, auth.css, teacher-quality.css | 1 each |
| components.css | 13 | | student.css, notifications.css, teacher/heron.css, shell/shell.css, shared-design-system.css ⛔, motion.css, layout.css, landing/inner.css | 2–3 each |
| base.css | 10 | | | |
| unified-parity.css ⛔ | 6 | | | |
| pdf.css | 5 | | | |
| landing/chrome.css | 4 | | | |

Real declarations by file: **polish.css 28 · base.css 10 · components.css 6 · unified-parity.css ⛔ 6 · shared-design-system.css ⛔ 5 · landing/chrome.css 4 · pdf.css 4 · layout.css 1 · legal.css 1 · motion.css 1 · research.css 1** = 61. In **loaded** sheets: 50 (11 live only inside the two parity-export artifacts, which are never rendered — see §2 note).

### 1.3 Stylelint (v16) — fresh JSON census

- **Errors 53**: `no-duplicate-selectors` **52** · `declaration-block-no-duplicate-properties` **1** (admin.css:279 font-size).
- **Warnings 94**: `no-descending-specificity` (only warning rule).
- 30 files dirty. Error leaders: `components.css 14 · layout.css 7 · tokens.css 6 · owner.css 5 · landing/shared.css 5 · polish.css 4 · landing/product-frame.css 4 · admin.css 2 · auth/campus/colleges/legal/pdf/teacher-heron 1 each`.
- Delta vs r332 (78 E): the `landing.css` monolith carried 30 dup-selector errors; the r332 split (13 byte-verbatim region files) dissolved them. Remaining 52 = the live merge/dedupe map (each error = one consolidation micro-task inside §4's per-file tasks).

### 1.4 Gate inventory (exact names, `package.json`)

| Script | Enforces today | CSS-line relevant? |
|---|---|---|
| `npm run lint:css` (frontend) | stylelint@16 over `src/styles/**` — **53 E / 94 W today, exit 2** | ✅ structural |
| `npm run lint:r320` (root) | `scripts/r320/duplicate-selector-lint.mjs` (12 allowlisted entries in `duplicate-selector-allowlist.json`, incl. both parity sheets) + `hover-guard-lint.mjs` | ✅ structural |
| `npm run gate:css-coverage` (frontend) | `scripts/gates/css-coverage.mjs` — dead-rule census (Playwright sweep, checkpointed); writes `docs/redesign/r331/css-coverage.json` | ✅ evidence |
| `npm run gate:size` (root) | `scripts/gates/size-gate.sh` — **repo BYTES only**: rule 1 file ≤500KB (allowlist), rule 2 docs/ ≤30MB, rule 3 push ≤5MB to docs/ | ❌ **no CSS line budget exists anywhere** |
| `npm run check:raw-css` | declaration-level token axes (type/radius/spacing), `--strict`-capable | ✅ per-decl |
| `npm run check:colors -- --strict` | raw color literals (strict mode supported, `scripts/check-colors.sh:89`) | ✅ per-decl |
| `npm run check:motion-tokens` / `check:icons` / `check:csp-hash` | motion tokens / icon set / CSP hashes | ✅ per-decl |
| `npm run test:audit:capture:mock` + `test:audit:drift` | 72-capture authenticated matrix (12 routes × {360,768,1280} × {light,dark} × rtl) vs budgets | ✅ per-deletion |
| `scripts/gates/css-shots.mjs` | deterministic PNG pairs across two dev servers → md5 identity check | ✅ per-deletion |

---

## §2 `!important` ledger — all 61 real declarations

Classification of **why**: `RM` = reduced-motion belt · `A11Y` = a11y media block · `PRINT` = print belt · `CURSOR` = custom-pointer instrument · `LENIS` = scrollbar takeover · `PRINT-PDF` = canvas-vs-inline-style fight · `THEME` = theme-swap freeze · `EXPORT` = parity-export artifact copy (never rendered).

Removal strategy vocabulary: **overrides-seat** = move block into `@layer overrides` (plain declarations then beat every layered opponent, `!important` dropped) · **owner-sheet** = delete the competing rule so the survivor needs no flag · **JS-prop** = convert inline `width/height` to a custom property so CSS can win without `!important` · **keep-export** = leave (artifact contract, not rendered by the app).

| Cluster | file:line | Selector / declaration | Why it exists | Removal strategy | md5 risk |
|---|---|---|---|---|---|
| RM | base.css:507–512 | `*` — animation/transition-duration 0.01ms, delays 0s, iteration-count 1, scroll-behavior auto (6 decls) | canonical reduced-motion belt; must beat layered animation declarations | overrides-seat: consolidate to ONE belt in `shared/polish.css` `@layer overrides` **after** base.css §loader (unlayered rung) is seated into `@layer base` (r332 step 8) | ✅ full matrix (motion surfaces) |
| RM | polish.css:2795–2800 | `*` — animation/transition/box-shadow/text-shadow/backdrop-filter none (6 decls) | polish's own RM belt duplicating base.css's | owner-sheet: delete — base.css belt (post-consolidation) already covers; verify no unlayered opponent | ✅ full matrix |
| RM | polish.css:1727 | `.landing-megamenu — animation: none` | RM + dead megamenu? (189/332 dead) — likely dies with coverage task | fold into PI-11 polish.css RM consolidation | ✅ landing matrix |
| RM | polish.css:1956, 2140, 2606, 2611, 2615 | `.badge`/`.nav-item.on::after`/state icons/`.thumb-card-image > *` — animation/transition none (5 decls) | RM belt per-family patches (patch-on-patch over base belt) | owner-sheet: delete; base belt wins under RM | ✅ shell/student matrix |
| RM | polish.css:1563 | `.btn:active…` — transform: none | RM patch | owner-sheet: delete with base belt consolidation | ✅ full matrix |
| RM | motion.css:504 | `.section-accent, ::after` — transition: none | RM patch on layered animation | owner-sheet: delete (base belt covers) | ✅ landing matrix |
| RM | layout.css:1597 | `.search-dropdown, .search-shimmer, .wake-pill, .nav-item.on::before` — animation: none | RM patch | owner-sheet: delete | ✅ shell matrix |
| RM | components.css:5340 | `.card > .state…::before` — animation: none | RM patch | owner-sheet: delete | ✅ student matrix |
| RM | research.css:783 | `.doc-reader` → `.doc-notes-fab { display: none }` under RM | hides FAB under RM (single decl inside RM media) | overrides-seat into shared RM belt block | ✅ viewer matrix |
| THEME | base.css:499 | `html[data-theme-swapping] *` — transition: none + animation-duration 0ms (2 decls) | freeze during theme swap (flash-of-wrong-theme guard) | overrides-seat into `@layer overrides`; opponents are all layered | ✅ theme-switch shot |
| LENIS | base.css:154–155 | `html[data-lenis-on]` + `::-webkit-scrollbar` — scrollbar-width/display none (2 decls) | beats polish v22's unlayered `*` scrollbar block (specificity war) | owner-sheet: delete/merge the competing polish `*` scrollbar block; single owner in `@layer base` | ✅ shell matrix (scrollbar pixels) |
| A11Y | components.css:5307, 5309 | `:focus-visible` — outline 3px solid var(--accent-ink…), box-shadow none (2 decls) | `prefers-contrast: more` capstone vs layered focus styles | overrides-seat: move §a11y media section to `@layer overrides` | ✅ focus-visible shots + contrast gate |
| A11Y | components.css:5323 | `:focus-visible` — outline 3px solid Highlight | forced-colors mode | overrides-seat (same block) | ✅ forced-colors shot |
| A11Y | components.css:5331–5332 | `.topbar, .bottom-nav, .sidebar-backdrop.show` — backdrop-filter none ×2 | `prefers-reduced-transparency` | overrides-seat (same block) | ✅ shell matrix |
| PRINT | polish.css:2773–2828 | print block: `html, body` background transparent; hide `html, body` decls; `.has-shell` grid 1fr; `.page` padding; overlay backgrounds; `[data-reveal]` opacity/transform reset; `.parallax` --parallax-y (13 decls incl. nested one-liners 2788/2790/2791/2816/2828) | print capstone vs layered/unlayered page styles | overrides-seat: whole print block → `@layer overrides`; drop `!important` | ✅ print CSS export (pdf print path) |
| PRINT | legal.css:481 | `.lg-header, .auth-frame, .auth-grain, .skip-link` — display: none | print hide for legal sheet | overrides-seat (move to shared print block) | ✅ print export |
| PRINT-PDF | pdf.css:836–837 | `.pdf-page canvas` — max-width 100%, height auto (2 decls) | **only `!important` that beats an inline style** (JS sets canvas width/height px) | JS-prop: render module writes `--pdf-canvas-w/h`; CSS `width: min(var(--pdf-canvas-w), 100%); height: auto` (r332 §10-4b, the one JS-coupled item) | ✅ viewer matrix + pdf print |
| PRINT-PDF | pdf.css:807, 814 | `@media print` viewer height auto / `.pdf-touch-hint` display none | print capstone | overrides-seat | ✅ pdf print |
| CURSOR | landing/chrome.css:437, 447, 456, 465 | `.sc-ring`, `[data-sheet-cursor='live'] …` — cursor: none/crosshair (4 decls) | custom-pointer ownership ladder vs thousands of `cursor: pointer` rules | overrides-seat: move 4 rules to `@layer overrides` in `landing/` keeping order | ✅ landing matrix (pointer pixels) |
| EXPORT | unified-parity.css:815–820 | `:where(a, button, …)` RM belt copy (6 decls) | parity-export artifact v2 — **never rendered by the app** (zero importers, by design) | **keep-export**: file is DO-NOT-DELETE (§3); not counted against the loaded-sheet 0-target | ❌ none (not loaded) |
| EXPORT | shared-design-system.css:397–398 | RM belt copy + `[data-reveal]` reset (5 decls) | parity-export artifact (r127-F1) — **never rendered** | **keep-export** (same) | ❌ none (not loaded) |

**Loaded-sheet target: 61 → 50 in scope for r333+ (11 EXPORT declarations are contractual keepers; the r332 "→ 0" target should be restated as "0 outside the two parity-export artifacts").**
The remaining 53 `!important` mentions are comment/doc lines (provenance notes, gate-allowlist prose) — zero cascade weight; they disappear opportunistically with their owner sections and are not gated.

Sequence guard (from r332 §12 risk 2): **no `!important` removal before layer seating completes** — unlayered normal declarations lose to layered ones; removing the flag early inverts cascade wins. Each removal above ships with its own md5 diff.

---

## §3 Dead-weight map (coverage-driven deletion)

Method (carried from r332 §3/§9): `scripts/gates/css-coverage.mjs` sweeps 6 role-guarded route sets × {390,768,1440} × {light,dark} on the running dev server and probes every selector of every **loaded** sheet. Dead candidate = matched zero elements on zero routes. Deletion rule per bucket: remove a rule only when **every** selector in its list is dead on the **fresh** sweep; interaction pseudo-classes (`:hover/:focus…`) die only together with their base rule; `wc -l` before/after per commit; md5 matrix + drift after every commit.

**⚠ Artifact status**: `docs/redesign/r331/css-coverage.json` (totals 3,524/5,061) is from the r331 sweep — **stale**. It is valid for prioritization only. Fresh per-bucket sweep (`CSS_COVERAGE_FRESH=1 npm run gate:css-coverage`, checkpoint-resumable, OOM-safe) is **PI-00**, mandatory before any deletion.

### 3.1 Buckets (r331 artifact numbers, mapped to r333 renamed files)

| Priority | File (today) | old name in artifact | dead/tested sel | deadRatio | lines | raw savable (deadRatio×lines) |
|---|---|---|---|---|---|---|
| B1 | owner.css | owner.css | 163/165 | 0.99 | 1,704 | 1,683 |
| B2 | teacher-quality.css | teacher-quality.css | 385/397 | 0.97 | 2,592 | 2,513 |
| B3 | shared/research-heron.css | r305-research-pdf-ai.css | 222/228 | 0.97 | 1,463 | 1,424 |
| B4 | research.css | research.css | 104/107 | 0.97 | 785 | 762 |
| B5 | student.css | student.css | 460/523 | 0.88 | 4,161 | 3,659 |
| B6 | colleges.css | colleges.css | 150/168 | 0.89 | 1,242 | 1,108 |
| B7 | shared/heron-admin-owner.css | r305-admin-owner.css | 182/210 | 0.87 | 1,176 | 1,019 |
| B8 | components.css | components.css | 644/785 | 0.82 | 5,705 | 4,680 |
| B9 | teacher/heron.css | r305-teacher-quality.css | 142/153 | 0.93 | 1,106 | 1,026 |
| B10 | student/training.css | training.css | 93/101 | 0.92 | 904 | 831 |
| B11 | polish.css | polish.css | 189/332 | 0.57 | 3,404 | 1,937 |
| B12 | landing/* (13 sheets) | landing.css | 273/763 | 0.36 | 7,920 family | 2,833 |
| B13 | auth.css | auth.css | 79/168 | 0.47 | 1,565 | 735 |
| B14 | layout.css | layout.css | 64/139 | 0.46 | 1,599 | 736 |
| B15 | notifications.css / base.css / admin.css / motion.css / campus.css | same | 47/81 · 42/85 · 42/46 · 39/47 · 30/89 | 0.34–0.58 | 3,225 | 1,705 |
| B16 | shell trio + student/heron-* + pages tail | r305-shell/r319-shell/r325-shell, r305-student*, r319-student*, r32x-* | ~0.4–0.7 | ~3,100 | ~1,500 |
| — | **Σ loaded (46 sheets measured in r331)** | | 3,524/5,061 | 0.696 | 46,408 | **29,772** |

Caveat carried from r332: deadRatio × lines is an **upper bound**; realization assumed 55–70% for high-dead files (whole dead sections), 40–60% for mixed files. §4's per-task estimates bake this in.

### 3.2 Unmeasured sheets — D2 DevTools Coverage pass first

Never loaded on swept routes → no dead-candidate evidence: `pdf.css 865 · ai.css 279 · player.css 476 · legal.css 598 · landing/consent-edge.css 519 · shared/design.css 226 · shared/brand.css 178 · fonts.css 233 · landing/inner.css 119 · landing/consent.css 97 · landing.css stub 12 · layers.css 60 · tokens* 1,524` (≈ 5,700 lines). r331 history says ~60% dead. Each gets a Chrome DevTools Coverage capture per route (same route list) before its deletion task (§4 batch D). `layers.css` (constitution), `tokens.css`/`tokens.generated.css` (generated), `fonts.css` (@font-face only) are **not deletion candidates**.

### 3.3 ⛔ DO-NOT-DELETE — the two parity-export sheets

| File | Lines | Why load-bearing |
|---|---|---|
| `unified-parity.css` | 1,300 | Parity EXPORT artifact v2 (R313 re-sync). Deliberately **not imported** by the app (its own header says so; verified — zero import statements). Re-distills the Heron foundation for **external hosts**. Value-synced by **`scripts/verify-parity-export.mjs`** and exempted in `scripts/r320/duplicate-selector-allowlist.json` (`unloadedFiles`). |
| `shared-design-system.css` | 404 | Parity EXPORT artifact (r127-F1), same contract — mirrors structural recipes for external hosts; synced by `scripts/verify-parity-export.mjs`. |

**This supersedes r332 §8 step 1** ("orphan retirement: delete both, −1,704"). They are orphans *at runtime* but **files-on-disk contracts** for the parity export: deleting them breaks `verify-parity-export.mjs` and the external-host parity guarantee. r333 carries them as permanent zero-importer exceptions (already encoded in the r320 allowlist). Their 11 `!important` declarations and their selector mentions in lint reports are exempt (§2).

### 3.4 Explicit non-buckets

`layers.css` (layer constitution, first import) · `tokens.generated.css` (regeneration path) · `fonts.css` (`@font-face`) · `tokens.css` (source tokens; only its 6 dup-selector errors are actionable) · `landing.css` (12-line rule-free stub kept because `check-motion-tokens.sh` / `check-raw-css.sh` / allowlists enumerate the path).

---

## §4 P-I micro-task queue (each ≤25 min, ONE file)

Queue invariant per task: golden md5 (`css-shots.mjs`, routes × 3 viewports) diff **empty** + `npm run test:audit:capture:mock && npm run test:audit:drift` exit 0 (authenticated surfaces) + `wc -l` delta logged. For never-loaded sheets the pixel check alone suffices. Every coverage task also clears that file's duplicate-selector stylelint errors while inside the file.

**Sequencing**: PI-00 is global-sequential (blocks everything). Batches A–D are **parallel-safe** (disjoint files) — sub-agents may take any one task each. Sequential-only: PI-08 components.css (single owner — biggest file + a11y block move), PI-25 pdf.css (JS-coupled), and PI-Z last.

| ID | Task | est saved | Parallel? |
|---|---|---|---|
| PI-00 | Run fresh coverage sweep `CSS_COVERAGE_FRESH=1 npm run gate:css-coverage` → re-commit to `docs/redesign/r333/css-coverage.json`; publish per-file dead lists (incl. landing family + unmeasured D2 captures) | — | **sequential, first** |
| PI-01 | `owner.css` — delete dead rules (0.99 dead) + 5 dup-selector errors | 1,150 | ✅ A |
| PI-02 | `teacher-quality.css` — dead rules (0.97) | 1,700 | ✅ A |
| PI-03 | `shared/research-heron.css` — dead rules (0.97) | 980 | ✅ A |
| PI-04 | `research.css` — dead rules (0.97) + 1 dup-selector | 500 | ✅ A |
| PI-05 | `student.css` — dead rules (0.88); biggest single bucket, keep RM patch lines (§2) until PI-Z | 2,300 | ✅ A |
| PI-06 | `colleges.css` — dead rules (0.89); keep `.comp-*` borrow contract | 700 | ✅ A |
| PI-07 | `shared/heron-admin-owner.css` — dead rules (0.87) | 650 | ✅ A |
| PI-08 | `components.css` — dead rules (0.82) + 14 dup-selector errors + move §a11y media to `@layer overrides` (§2) | 2,800 | **sequential (single owner)** |
| PI-09 | `teacher/heron.css` — dead rules (0.93); preserve `.hr-scope` contract | 600 | ✅ A |
| PI-10 | `student/training.css` — dead rules (0.92); keep `.filter-pill/.back-link` exports | 520 | ✅ A |
| PI-11 | `polish.css` — dead rules (0.57) + 4 dup-selector errors + RM/print belt consolidation prep (§2) | 1,050 | ✅ A |
| PI-12 | `landing/journey.css` — dead rules (per PI-00 fresh list) | 350 | ✅ B |
| PI-13 | `landing/strata.css` — dead rules; **append-order-protected**: delete in place, never re-order (r332 split doc §2) | 400 | ✅ B |
| PI-14 | `landing/footer.css` — dead rules | 250 | ✅ B |
| PI-15 | `landing/hero.css` — dead rules | 250 | ✅ B |
| PI-16 | `landing/hero-mechanics.css` — dead rules | 150 | ✅ B |
| PI-17 | `landing/platform.css` — dead rules | 200 | ✅ B |
| PI-18 | `landing/shared.css` — dead rules + 5 dup-selector errors (only keep RM/reveal belts) | 200 | ✅ B |
| PI-19 | `landing/nav.css` — dead rules | 190 | ✅ B |
| PI-20 | `landing/chrome.css` — dead rules; **keep** the 4 cursor `!important` rules (§2 CURSOR) | 260 | ✅ B |
| PI-21 | `landing/pains.css` — dead rules | 160 | ✅ B |
| PI-22 | `landing/why.css` — dead rules | 170 | ✅ B |
| PI-23 | `auth.css` — dead rules (0.47) | 370 | ✅ C |
| PI-24 | `layout.css` — dead rules (0.46) + 7 dup-selector errors; keep RM line (§2) | 370 | ✅ C |
| PI-25 | `pdf.css` — D2 coverage, delete dead; **JS-prop change for canvas pair** (§2) | 350 | **sequential** (JS-coupled) |
| PI-26 | `motion.css` — dead rules (0.83); keep :504 until belt consolidation | 280 | ✅ C |
| PI-27 | `notifications.css` — dead rules (0.58) | 230 | ✅ C |
| PI-28 | `base.css` — dead rules (0.49); keep §loader rung + belt lines | 170 | ✅ C |
| PI-29 | `campus.css` — dead rules (0.34) | 140 | ✅ C |
| PI-30 | `admin.css` — dead rules (0.52) + dup-properties fix | 130 | ✅ C |
| PI-31 | `legal.css` — D2 coverage, delete dead | 300 | ✅ D |
| PI-32 | `ai.css` — D2 coverage, delete dead | 120 | ✅ D |
| PI-33 | `player.css` — D2 coverage, delete dead | 200 | ✅ D |
| PI-34 | `landing/consent-edge.css` — D2 coverage, delete dead | 200 | ✅ D |
| PI-35 | `shared/design.css` — D2 coverage, delete dead | 140 | ✅ D |
| PI-36 | `shell/shell.css` — dead rules | 120 | ✅ C |
| PI-37 | `shell/chrome.css` — dead rules | 90 | ✅ C |
| PI-38 | `shell/sheet-frame.css` — dead rules | 40 | ✅ C |
| PI-39 | `shared/indicators.css` — dead rules | 230 | ✅ C |
| PI-40 | `patterns.css` — dead rules | 250 | ✅ C |
| PI-41 | `student/heron.css` + `student/heron-supplemental.css` + `student/heron-courses.css` + `student/heron-dashboard.css` — dead rules, one commit each | 180+210+120+105 | ✅ C (×4 tasks) |
| PI-42 | `student/heron-schedule.css` + `student/academic-pages.css` + `student/pages.css` — dead rules, one commit each | 160+90+240 | ✅ C (×3) |
| PI-43 | `student/exams.css` + `student/map-live.css` + `student/lecture-player.css` + `student/community.css` + `student/settings.css` — dead rules, one commit each | 110+115+120+70+25 | ✅ C (×5) |
| PI-44 | `vision.css` + `landing/inner.css` + `landing/home.css` + `landing/statement.css` + `landing/roles.css` + `landing/colleges.css` — dead rules, one commit each | 77+60+95+65+65+25 | ✅ C (×6) |
| PI-45 | `tokens.css` — 6 dup-selector consolidations (no line target) | 60 | ✅ C |
| PI-46 | `landing/product-frame.css` — 4 dup-selector consolidations + dead rules | 80 | ✅ C |
| PI-Z | Close-out: `!important` elimination per §2 (−~40 lines), re-run coverage, re-commit, all gates green | 40 | **sequential, last** |

**Σ est saved ≈ 21,000 lines** (raw upper bounds 29.8k loaded + ~2.3k D2-unmeasured; realization 55–70% big buckets / 40–60% mixed). Exit projection: 52,959 − ~21,000 ≈ **31,900 ≤ 33,000 target**, with the stylelint/dedupe savings as buffer. Fallback levers if any bucket under-realizes: deeper landing-family sweep, polish §pages regrouping, D2 second pass.

---

## §5 Gate wiring plan

### G1 — Stylelint CI gate (new ratchet, zero new deps)

1. Today `npm run lint:css` exits 2 on the 53 errors but is **not wired into the root gate chain**. Add to root `package.json`: `"gate:css-stylelint": "node scripts/gates/css-stylelint-ratchet.mjs"`.
2. `css-stylelint-ratchet.mjs` runs stylelint `-f json` and enforces **max counts** frozen in `scripts/gates/css-lint-budget.json`: r333 commit `{errors: 53, warnings: 94}` (current truth — nothing red on day one). Stepwise: r334 `{20, 40}` → r335 `{0, 0}`. Rationale: freeze prevents regression while §4 tasks burn the stock; each §4 task that clears a file lowers the budget in the same commit.
3. At r335, flip `no-descending-specificity` from warning to error in `.stylelintrc` and delete the budget file (stylelint alone then gates).

### G2 — Duplicate-selector allowlist shrink (`scripts/r320/duplicate-selector-allowlist.json`)

- Today: 12 `allow` entries + 2 `unloadedFiles` (the parity sheets — permanent).
- Path: 12 → 8 (r333, as §4 dedupe tasks land) → 3 (r334) → 0 (r335). Every removal pairs with the corresponding `no-duplicate-selectors` fix. `unloadedFiles` stays forever (it is the DO-NOT-DELETE encoding).

### G3 — CSS line budget (the missing "css-size-gate")

`gate:size` enforces **bytes**, not lines — no CSS line budget exists today. Add RULE 4 to `scripts/gates/size-gate.sh` (or a sibling `scripts/gates/css-line-budget.mjs` wired as `gate:css-lines`):

```
total = find frontend/src/styles -name '*.css' | xargs wc -l   (sum)
fail if total > CSS_LINE_BUDGET (from scripts/gates/.css-line-budget, committed)
```

Stepwise budget (each step = a round exit condition, recorded here):

| Round | Budget | Cumulative cut |
|---|---|---|
| r333 exit | **50,000** | −2,959 |
| r334 | 46,000 | −6,959 |
| r335 | 42,000 | −10,959 |
| r336 | 38,000 | −14,959 |
| r337 | **33,000** | −19,959 ✅ target |

Optional per-file soft cap 2,500 lines with grandfathered allowlist (`components.css` 5,705 shrinking each round) to prevent new monoliths. Rule 4 failure message must point at the newest `docs/redesign/rNNN/css-baseline.md` queue.

### G4 — Per-deletion invariant (unchanged, mandatory)

Per §4 commit: (1) `css-shots.mjs` golden md5 diff empty on `/`, `/login`, `/about` × {1440, 768, 390}; (2) `npm run test:audit:capture:mock && npm run test:audit:drift` exit 0 for authenticated-surface touches; (3) `wc -l` before/after logged in the round ledger. Never-loaded-sheet tasks: (1) suffices.

### G5 — Coverage freshness rule

Deletions are legal **only** against a coverage JSON generated in the same round (`docs/redesign/r333/css-coverage.json` after PI-00). Stale artifacts (r331's) rank buckets but never gate a deletion. Token gates (`check:colors --strict`, `check:raw-css`, `check:motion-tokens`, `check:icons`) keep running per-commit — deletion tasks must not need any `gate: allow` comment additions; if one appears, the deletion is wrong.

---

## §6 Top risks (delta vs r332 §12)

1. **Stale coverage** → PI-00 mandatory, per §5-G5.
2. **Parity-export sheets** deleted by a sub-agent following r332's superseded step 1 → §3.3 is the authority; allowlist `unloadedFiles` is the machine check; PI-01/PI-45 briefings must cite §3.3.
3. **`!important` removal before layer seating** inverts cascade → §2 sequence guard; elimination deferred to PI-Z.
4. **Landing strata order** — deletions inside `landing/strata.css` must not re-order survivors (append-order contract).
5. **Canvas `!important`** needs the one JS-prop change (PI-25) — only cross-language item in the queue.
6. **OOM on sweeps** — checkpoint/resume already built into the harness; never kill the dev server.
