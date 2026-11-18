# Plan — Heron Fidelity (execution order 0–10)

**Branch pattern**: one worktree per task (`/home/z/wt/<task-id>`, branch `wip/<task-id>`) per `AGENTS.md`; program root `plan/r368-heron-fidelity` @ `3b8eba04`; base `main` @ `347e2508`. No force-push; no merge to `main` in this program.

**Source plan (authoritative)**: [`docs/superpowers/plans/heron-fidelity-plan.md`](../../../docs/superpowers/plans/heron-fidelity-plan.md) — this file is its SpecKit-form mirror; the ordered tasks, files, checks, done-when gates, dependencies and rollbacks are unchanged. Progress log: `docs/superpowers/plans/heron-fidelity-progress.md`.

## Execution contract

Valid before measurement → focused implementation → focused after measurement → separate commit per task → push. Every handoff records: branch+SHA, files changed, before/after scorecard + relevant gates, exact commands and outputs, screenshot/trace paths, known residuals, rollback commit. No parallel heavy builds on the 2-CPU host. No production credentials/DB/deploys.

## Ordered tasks (with current status)

| # | Task (goal) | Status at package creation | Branch |
|---|---|---|---|
| 0 | Repair measurement; trustworthy baseline (E/T/Q valid; wheel-driven reference protocol; manifest validation) | **DONE** — closed at `6ee606e3`: T 94.8%→98.3% via two instrument-law fixes; footer@390:mid60 impossibility proven both sides; E re-baselined 51.8→53.0 on true seats | `wip/r368-t0` |
| 1 | Match shared scroll/transitions/preloader/pointer (per-family reveal lines from `ref-onsets.json`; settle sampler; mouse/touch/keyboard/reduced-motion; LoAF; build+bundle) | Measurement foundation DONE (`ref-onsets.json`, tuning matrix @ `2e7491a2`); product tuning NOT started | `wip/r368-t1` |
| 2 | Owned raster/SVG asset system (Madarek artwork; 1×/2× proof; ≤60KB re-evaluated per asset) | Not started | new `wip/r368-t2` |
| 3 | Rework the ten landing seats in ascending valid E (intro 31.3 → … → problem 67.1; one owned seat per task/commit) | Not started | per-seat branches |
| 4 | Unify color/typography/spacing tokens (lead-approved shared tokens only; section-scoped exceptions preserved) | Not started | `wip/r368-t4` |
| 5 | Extend the language to other public pages (`AGENT5-ROUTE-INVENTORY.md` families; no route-string changes) | Not started | page-family branches |
| 6 | Apply the visual system to every authenticated web role (visual only; inventory-derived; zero permission/workflow change) | Not started | role-family branches |
| 7 | Adapt the language to Expo mobile (~125 routes; native interaction; APK only) | Not started | mobile worktree |
| 8 | Reduce copy ≥20% without lost meaning (Arabic editorial review; legal/help preserved) | Not started | copy branches |
| 9 | Consolidate and archive safely (CSS ≥10% below 668,169 bytes; provenance preserved) | Not started | `wip/r368-t9` |
| 10 | Full acceptance, scorecard, handoff (all gates; real results only) | Not started | lead aggregate |

## Task-1 next increment (the committed tuning matrix)

| seat | reference visual onset (×H) | ours (Task 0) | the lever |
|---|---:|---:|---|
| home-why-wrap | −0.78 | undetected | scene family needs an EARLY line (≈ +70% vh root expansion) |
| home-intro-wrap | −0.8 | undetected (ambient crawl masked it — sampler now excludes it) | beat family's entry line |
| home-map-wrap | −0.1 | −0.1 ✓ | none |
| home-problem-wrap | −0.34 | −1.1 | items line: −12% → ≈ −28% |
| home-usecase-wrap | +0.2 | undetected | rows family rides later |
| home-platform-wrap / cta / footer | no pre-entry motion | −1.0 / undetected | families play at/after entry |

The two global IO buckets (`OBSERVER_ROOT_MARGIN_LINES` −15%, `OBSERVER_ROOT_MARGIN_ITEMS` −12% in `frontend/src/lib/reveals.ts`) cannot express this heterogeneity — the next increment restructures them per family and re-measures our onsets against this table.

## Review and git sequence

Per task: before evidence → implement only assigned files → focused checks → record scorecard deltas → review diff → commit `type(rNNN): subject` → push. A separate integration decision handles merging after all acceptance criteria pass.
