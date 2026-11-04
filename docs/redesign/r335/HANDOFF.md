# R335 — Spec-Driven Conformance Round · HANDOFF / LEDGER

Method change (owner's verdict absorbed): **measure → conform → delete.** Heron becomes
frozen, machine-checkable JSON specs; our code must pass the conformance suite; the
failing-assertion count is the only progress metric. No screenshot galleries, no per-wave
VLM ceremonies. Most time goes into code.

## Wave log (append-only; every row = one verified commit on main)

| sha | verdict | what |
|---|---|---|
| 488245b0 | ✅ | .gitignore `node_modules` (no trailing slash) — matches symlinked worktree installs |
| 118afa1f | ✅/⚠️ | merge(r335): R334 mobile branch — 74 commits, `--no-ff`, rebased on main conflict-free; ownership proven (0 files outside apps/mobile + docs/mobile); gates re-verified pre-merge (tsc 0 · jest 1154/1154 · lint 0 err · contract · tokens · export 9.82 MB). **Mobile gates CI job ran for the first time ever → red** (root causes below) |
| e0c5ff51 | ✅ | fix(mobile): Mobile-gates red root causes — (1) hostile-shape hardening: nextStep lecture+agenda guards, GapList Array.isArray seam (real crash class the net exists for); (2) Node 22 net pathology: `doNotFake: [setImmediate, queueMicrotask]` — 96s→22s, asserts were <1ms while timers drained 18–30s idle; (3) route requires hoisted to file scope in both nets. Verified Node 22 + Node 24 |

## Phase 0 ledger (merge round)

- **Ownership proof**: `git diff --stat origin/main...origin/feat/mobile-r334-pro` → 232 files, only `apps/mobile/**` + `docs/mobile/**`.
- **Rebase**: 74/74 commits conflict-free onto 488245b0 (main touched zero mobile files).
- **Gates at merge**: tsc 0 · jest 1154/1154 (38 suites) · expo lint 0 err/15 documented warnings · contract-check no drift · tokens:check green · expo export web 9.82 MB.
- **LR-002 (check-icons)**: closed — already fixed on main at e057b01f (icon-discipline; raw svg removed); Design gates green on main.
- **LR-001 (expo-navigation-bar)**: ADOPTED, batched with the Phase 5 native build (Android APK workflow + iOS) per owner decision — no standalone EAS build now.
- **P0-7 bundle budget** (branch r335/bundle-budget @ 5b31d730, merging after gates green): root cause was a font barrel shipping 34 font files (5.03 MB) → deep per-weight imports ship 9 used weights. Web export **9.82 → 6.58 MiB (−23.6% vs main 8.61)**; budget ≤+8% holds with 2.7 MiB headroom; no ADR needed, no budget touched. EAS native cost measured: iOS sim preview artifacts 32.2 → 32.8 MiB (+1.8%); next native build projected −3.4 MB from the font cut. Cuts applied: fonts deep imports + new `scripts/analyze-sections.mjs`. Reverted: inlineRequires (grew +27.4 kB on Expo 58). Verified: no zero-import dep rides the bundle (RHF/netinfo decisions respected).
- **OTA**: CI's `eas-ota` job auto-publishes to production+preview on every green push that touches apps/mobile/** — it was skipped only because mobile-gates was red. After e0c5ff51 goes green, OTA flows again; update ids recorded here.

## Tools-actually-used (this round so far)

| tool | task | outcome |
|---|---|---|
| GitHub Actions API (check-runs, jobs, logs) | main red diagnosis | found first-ever Mobile gates run + 4 failing tests + full stack traces |
| local Node 22.14 (downloaded tarball) | reproduce CI env | reproduced BOTH failures exactly (TypeError + 30s timeouts) |
| node --cpu-prof + cpuprofile analysis | find the waits | 98.5% IDLE — waits not CPU; led to timer-drain diagnosis |
| console probes (test body / afterEach / timers counts) | isolate the drain | afterEach blocked; ≤138 timers total; clock distortion + drain pathology |
| jest doNotFake experiment | root fix | 96s→22s, all green both Node versions |

## Spec/conformance status (R336 state table — replaces the stale "pending" rows)

| item | state @ 86d6e91f (R336 start) |
|---|---|
| Frozen Heron specs | ✅ `docs/redesign/r335/heron-spec/*` (5 bps, 9 sections + footer + page/motion), extractor `scripts/spec/extract-heron.mjs` |
| Conformance suite | ⚠️ `scripts/conformance/` exists; the INSTRUMENT is weak — fixed first this round (below) |
| W-chrome (nav/preloader/cursor/consent) | ✅ conformed @1440 (69.9%, 986 assertions), `data-spec` hooks in |
| Landing sections | ❌ 0/9 conformed — Phase 2 main work |
| CSS | ❌ 43,428 lines / 109 `!important` (target ≤33,000 / 0) |
| Inner + authed pages | ❌ Phase 3 not started |
| Mobile P1 / Android workflow / review ≥9 | ❌ Phase 5 not started |
| CI | ✅ green again at 86d6e91f (red at e1ecedb6: bundle 776.2>776 KB, r306 stale pin, r309 mount flake — all root-caused, NO ceiling raised) |
| OTA (verified, run 41853500404) | ✅ production iOS group `1995b95a-756c-4dd2-a506-5103e3ab72ed` (update `01a1a71b-019f-74f8-b1c6-d51fa598ac17`); preview iOS group `9dd70372-683c-4009-8f7c-4a58cf6a93a9`; preview Android group `449c6060-16a1-4bac-b6a4-7c14de54211b` |
| Branches | ✅ all r335/* deleted (content merged); `feat/mobile-r334-pro` kept — tip is a stale rebase snapshot, main is strictly ahead |

**R336 instrument fix — DONE @ 1a402d74:** tolerances v2 (transformed expectations: mirror-x / ls→0 / lh-floor assert, never waive; exceptions = true waivers only, 0 uses at baseline), run.mjs v2 (data-spec hooks recorded + bound, unmatched → no-counterpart FAIL unless excused with reason, full 9×5 matrix, per-cell e/d/h/u/x), ratchet.json honest baseline **39.6%** (10,117/25,554; was 66.6% self-graded), ci.yml `conform-gate` job (dev server + full matrix + --gate vs ratchet, never allowed to drop). Weakest first queue: usecase 10–13% → intro 24–31% → problem/footer/why ~35–45% → platform/map/cta/hero → (chrome spec files don't exist yet — cells read `missing`, zero assertions, no drift).

**Original instrument gaps (historical):**
1. `exceptionRate` 20.4% vs cap <5% — the Arabic rules (rtl-x-mirror 70, ar-letter-spacing-zero 69, ar-line-height-floor 62) become TRANSFORMED EXPECTATIONS: assert mirrored x, |ls|≤0.05em, lh-floor directly — they stop counting as exceptions because they are the spec, not waivers.
2. Mapping mostly heuristic (hero @1440: 1 explicit / 41 heuristic / 278 unmatched of 597) — explicit `data-spec` keys for every spec element with a counterpart; `unmatched` reported as FAIL (or named no-counterpart with reason).
3. Full 9×5 matrix in one report (last results.json = 2 sections @1440), then `--gate` in CI at the honest baseline + ratchet file (rate may never drop).

- Baselines for the round: CSS 43,555 lines / 105 `!important` (target ≤33,000 / 0); web entry gz ≤776 KB (ceiling unchanged).
