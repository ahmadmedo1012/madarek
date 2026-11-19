# SpecKit analyze — 013-heron-fidelity (continuation pass)

**Date:** 2026-11-19
**Artifacts read:** `spec.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/measurement-law.md`, `checklists/requirements.md`, `tasks.md`,
`docs/specs/heron-fidelity.md`, `docs/superpowers/plans/heron-fidelity-plan.md`,
`docs/superpowers/plans/heron-fidelity-progress.md`, and the live tree.

**Tooling note:** the GitHub SpecKit CLI available on this host (`specify`, at
`~/.local/bin/specify`) exposes only `init` / `check` / `self`; the analyze and
checklist flows are agent prompts, not CLI subcommands. `specify check` reports
"Specify CLI is ready to use!". This file is therefore the analyze output,
produced by comparing the artifacts above line by line — not a claim that a CLI
command ran.

## Inconsistencies found and resolved

| # | Finding | Resolution |
|---|---|---|
| A1 | `tasks.md` recorded T2 as `TODO` although `wip/r368-t2` (`f402e47a`) had landed the owned asset set (4 seats × light/dark, ≤60 KB, provenance file). | T2 set to DONE with the asset evidence and the byte/dimension table. |
| A2 | `tasks.md` T3 pointed at `a6652bd8`, a SHA that does not exist on any fetched ref (`git cat-file` fails). The t3 branch's real tip is `2b226441`. | T3 re-pointed at `2b226441` and the continuation branch. |
| A3 | `checklists/requirements.md` §Validation Notes 4 states the implementation baseline as "E 53.0 · T 98.3 % · Q 95". That baseline was produced by the 390+1440-only matrix with the pre-fix mask bounding; it cannot be compared to a 5-viewport run. | Baseline superseded in the progress record by the full matrix (E 57.2 · T 83.7 % · Q 100); the checklist keeps its historical note but the live number is the scorecard. |
| A4 | `tasks.md` T3 said the method was "authored plates at the measured 8×8 luminance skeletons … block-profile tuning" — in practice the media files were **crops of the reference band**, which `spec.md` §Excluded forbids. | Crops retired; original compositions authored (`scripts/art/r368-original-media.py`), provenance recorded, band plates (colour-block statistics, no pixel recovered) kept and documented. |
| A5 | The T0/T1 records claim "T by `aggregateT`" while the code's `perSection.T` is `covered/pairs` per seat and `overallT = sum(covered)/sum(required)`; the two agree, but the doc did not state that the 5-viewport matrix changes the denominator. | Recorded: T 98.3 % (58 pairs, 2 viewports) vs 83.7 % (128 pairs, 5 viewports) are *different denominators*, not a regression of the same statistic. |
| A6 | The plan's Task 2 says "re-evaluate the R366 ≤60 KB policy per asset"; `tasks.md` T2 said "≤60 KB" as a requirement. | Restated as evidence-backed: the four webp twins stay ≤60 KB with their recorded dimensions; the new PNG seats are 3.3–20.4 KB by construction, so the policy is not violated either way. |

## Coverage check (spec → tasks)

| Spec requirement | Task | Status on the live tree |
|---|---|---|
| E ≥90 overall / ≥88 per target | T3 | **not met** — measured E 57.2 (pre-swap), per-seat 45.9–68.7 |
| T ≥95 / ≥90 per target | T0, T3 | **not met** — 83.7 % overall, 66.7 % worst seat |
| Q ≥90 / ≥85 per family | T1 | overall 100 (verified settle only); trigger family remains an **unscored baseline** by the preregistered rule |
| Zero responsive overflow/clipping/overlap | T3, T10 | stress 7/7 clean at the wave's own run; not re-run after the swap |
| Lighthouse ≥90 + LCP/CLS/INP | T10 | not run in this pass |
| WCAG 2.2 AA / reduced motion / keyboard | T3, T5, T6 | not run in this pass |
| Bundle ≤770 KB gzip | T1, T3 | T1 record: 762.6 KB; not re-run after the swap |
| Copy −20 % | T8 | pre-existing R366 diet (13 043 → 10 419 mobile; web 11 887 under the 10 770 enforced sum); the landing-specific baseline is not separately reproduced — T8 remains open |
| CSS −10 % (≤601 352 B) | T9 | **not met** — landing CSS now 721 612 B (baseline 668 169 B) |
| Originality / provenance | T2 | met for the media seats; band plates documented as measurement-derived colour blocks |
| No route/permission/API/DB change | all | no such file touched on this branch |

## Consequences recorded for the owner

The E floor and the originality rule pull in opposite directions: the previous
waves reached E 57–68 precisely by carrying the reference's own imagery. With
crops removed, the remaining levers are geometry (seat heights, grid, type
scale) and authored artwork, and those are measured now as a concrete list
(progress record §"Measured work-list"). Reaching E ≥88 with original artwork
would require the composition to be near-isomorphic to the reference's
photographic bands, which the spec's §Excluded forbids. This is a spec-level
conflict, not an execution shortcut, and it needs an owner decision: either
accept a lower E floor for original-artwork seats, or state in writing which
non-photographic reference structure may be reproduced.

## A7 — the copy-reduction baseline is not pinned to a landing measurement

`spec.md` acceptance 7 asks for "landing copy … at least 20 % below the committed
baseline". The only committed copy number in the repository is the global
`copy-budget` sum (11 887 Arabic words across the enforced pages, ceiling 10 770) and
the R366 mobile result (13 043 → 10 419, −20.1 %). There is **no landing-only
baseline file** in `docs/audit/`, so a landing percentage cannot be computed without
inventing one. T8 therefore stays open on a measurement precondition: either the owner
names the baseline artifact, or the acceptance moves to the global budget (already
CLEAN). Recorded instead of picking a convenient denominator.
