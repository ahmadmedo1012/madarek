# Phase 0 Research — Heron Fidelity

**Branch**: `wip/r368-t0` | **Date**: 2026-11-18 | **Plan**: [`plan.md`](./plan.md)

The binding research is `docs/audit/project-audit.md` (tool ledger + evidence provenance) and the measured findings in `docs/superpowers/plans/heron-fidelity-progress.md`. This file indexes the decisions that bind later phases.

---

## R-001 — Measurement before product work (Task 0's reason to exist)

**Decision**: Fix the instrument first; treat the stored E=56.7/T=100% as diagnostic only (3/20 aligned roots). **Measured outcome**: the repaired instrument produced a valid baseline (E 53.0 · T 98.3% · Q 95) and three laws with failing-first fixtures (`positionTarget`, `bothSidesReason`, `aggregateT`-conformance). **Alternatives rejected**: tuning product code against the invalid crops (would have moved the wrong dials in both directions).

## R-002 — The reference's trigger table is NOT its visible onsets

**Decision**: Task 1 tuning targets are the wheel-seated VISUAL onsets (`docs/audit/evidence/ref-onsets.json`): problem −0.34×H, why −0.78×H, map −0.1×H, usecase +0.2×H, intro/platform/cta/footer no pre-entry motion. The audit's live trigger table (starts −1.2/−1.8/−3.5×H for those same sections) disagrees with the visible record because its starts are stage-offset arithmetic, not visible-change moments. **Alternatives rejected**: tuning the reveal lines against the table (the plan explicitly forbids: "Do not tune product code against the reference's trigger table alone").

## R-003 — Reveal heterogeneity requires per-family lines

**Decision**: the two global IO buckets in `frontend/src/lib/reveals.ts` (`OBSERVER_ROOT_MARGIN_LINES` −15%, `OBSERVER_ROOT_MARGIN_ITEMS` −12%) become per-family lines (scene/beat/items/rows families), because the reference is heterogeneous (why fires at −0.78×H; problem at −0.34; scrub families at/after entry). **Alternatives rejected**: one global line tuned to the average (would be wrong for every family); adding a new animation dependency (bundle + unmeasured gain).

## R-004 — Mask policy for E

**Decision (preregistered, unchanged)**: masks cover reference-side text only (frozen-spec rects for entry; live capture rects for non-entry), grow 4 px, share cap 55%; E-refused pairs stay covered evidence with `E: null`. The two refused frames measured 74.9%/63.7% text — independently recomputed from `capture.json` `liveMaskRects`. **Alternatives rejected**: raising the cap to score them (weakens a preregistered policy); shrinking the mask basis after seeing the score (the policy's own forbidden move).

## R-005 — Documented limitations vs. denominator changes

**Decision**: a state unreachable on BOTH sides (footer@390:mid60: local live end 13992 < needed 14219; reference stage end 11075 < needed 11404) follows the spec's escape path — documented limitation with both sides' reasons in the row; it stays in the denominator. **Alternatives rejected**: excluding the row (denominator change); re-declaring the pair END (its entry IS seatable — the END collapse law doesn't apply); counting it as covered (a false pass).

## R-006 — Ambient loops are not scroll-settle

**Decision**: running infinite CSS keyframe animations (the intro crawl marquee) are excluded from the settle/onset signature (count recorded per sample); finite entrance animations still count. **Measured cause**: intro settle frame 9/9 while scroll-linked reveals complete ≤2 frames. **Alternatives rejected**: lowering the settle tolerance (would pass truly-unsettled sections); disabling the marquee in the product (the audit explicitly forbids breaking the product to please the instrument).

## R-007 — Asset size vs. quality

**Decision** (binding for Task 2): the R366 ≤60 KB policy is re-evaluated per asset: keep dimensions/quality where before/after 2× evidence shows softness; every replaced asset carries source/license/dimensions/alpha/bytes evidence. **Alternatives rejected**: a universal byte target (proven softness risk); copying Heron media (banned).

## R-008 — SpecKit tooling in this environment

**Finding**: the real GitHub SpecKit CLI is not installable here — `npm view @specify/cli` → 404 on the public registry; the registry's `specify@1.3.0` (dscape/specify, a node test framework) and `speckit@0.1.0` (a ShellSpec wrapper) are unrelated packages; no `/speckit-*` commands exist in this runtime. **Decision**: author the package manually in the repo's established SpecKit structure (`spec.md`/`plan.md`/`tasks.md`/`research.md`/`quickstart.md`/`checklists/requirements.md`/`contracts/`), derived from the approved spec+plan without scope or criteria changes. No claim is made that the tool ran.
