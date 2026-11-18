# Contract: the measurement law (E / T / Q)

**Feature**: `013-heron-fidelity` | **Authority**: `docs/specs/heron-fidelity.md` §Fidelity scorecard + `scripts/conformance/pairs.mjs` (the tested law module; `fidelity.mjs` obeys it)

This is the binding contract between the fidelity instrument and every task that consumes its numbers. Changing any rule below requires the lead's review and a failing-first fixture in `scripts/conformance/pairs.test.mjs` — never a silent edit.

## The dials

| Dial | Formula | Floor (overall / per-unit) | Notes |
|---|---|---|---|
| **E** | `100 × mean SSIM` over 8×8 windows OUTSIDE preregistered masks, per section∩viewport crop at the named state | 90 / 88 per section | Crops stored ≤480 px wide (box-average); every score runs on the STORED files so `--score-only` reproduces it |
| **T** | `100 × verdict-valid matched pairs / required non-coincident pairs` (pairs.mjs `aggregateT`) | 95 / 90 per target | A pair counts only with both sides at the same declared state within ±2 px (entry: declared tops; position: own target ±2; END: both at own maximum). E-refused-by-mask pairs are covered-but-E-unscored (`E_unscored`); genuinely invalid pairs stay in the denominator |
| **Q** | `100 × passing verified samples / verified samples` (settle family only) | 90 / 85 per measured family | Trigger family is a paired BASELINE recorded for tuning, never a pass; magnitude parity stays unverified until sampled |
| **F** | `0.45E + 0.25T + 0.30Q` | shown only when all component minimums pass | never hides a failed section or family |

## The pair-validity law (`pairs.mjs`)

1. A side's achieved state is only ever: `entry` (declared top ±2 px), `end-clamped` (own scroller maximum, top recorded), or `unlanded` (invalid).
2. Position-state targets derive from the **live entry seat** (`positionTarget`: live entry + delta; the live scroller maximum governs inaccessibility) — never a stale load-time snapshot.
3. A state unreachable on BOTH sides carries both sides' reasons in the row (`bothSidesReason`) — the impossibility proof lives in the scorecard itself; the row stays in the denominator.
4. Protocol-coincident states (duplicates <100 px, fixed chrome, END collapse) are recorded with reasons and excluded from the required denominator — nothing else may be excluded.
5. The manifest validator rejects: scored rows without coordinate provenance; a scored entry outside ±2 px of its declared top; undeclared row statuses; captures without motion traces. `--validate` exits non-zero on any rejection.
6. Running infinite CSS keyframe animations are excluded from the settle/onset signature (count recorded per sample); finite entrance animations still count.

## Known measured limitations (current baseline, r368 closure)

- `footer@390:mid60` — impossible on both sides (local live end 13992 < 14219; reference stage end 11075 < 11404); documented limitation per the spec's escape path; footer's per-target T is 75% (3/4) with the proof on the row.
- `home-hero-wrap@390:mid60` / `home-map-wrap@390:exit` — E refused (mask share 74.9% / 63.7% > the 55% cap); covered evidence, `E: null`.
- The reference's stage is wheel-driven; its footer entry offset exceeds its stage end at 1440 (END-declared pair — the 183 px top is by design).
