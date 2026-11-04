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

## Spec/conformance status

- `scripts/spec/extract-heron.mjs` — pending (A-Spec-1..4)
- `docs/redesign/r335/heron-spec/*.json` — pending
- `scripts/conformance/` — pending (A-Conform)
- Baselines for the round: CSS 43,555 lines / 105 `!important` (target ≤33,000 / 0); web entry gz ≤776 KB (ceiling unchanged).
