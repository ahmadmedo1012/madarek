# Heron fidelity — execution progress

Execution branch: `exec/r368-heron-fidelity` (from `origin/plan/r368-heron-fidelity` @ `84e0a0dd`).
Numbers below are measured on this machine with the pinned profile (Chromium 156.0.8078.4,
Playwright 1.60.0, Node 22.22.1, DPR 1). None is copied from an earlier round.

## Final scorecard (measured, `docs/audit/evidence/scorecard.json`)

| dial | value | gate | verdict |
|---|---:|---|---|
| **E** composition (SSIM outside preregistered masks) | **56.7** | ≥90 overall, ≥88 per section | FAIL |
| **T** verified state coverage | **100 %** (20/20 pairs) | ≥95 overall, ≥90 per section | PASS |
| **Q** motion (verified samples only) | **85** (17/20 settle samples) | ≥90 overall, ≥85 per family | FAIL overall / PASS family floor (settle 80 @390, 90 @1440; trigger family unverified) |

| section | E | T | note |
|---|---:|---:|---|
| chrome | 47.2 | 2/2 | worst seat; header sits on a different baseline than the reference band |
| footer | 52.0 | 2/2 | reference footer is a five-column print grid; ours is denser |
| home-cta-wrap | 62.2 | 2/2 | |
| home-hero-wrap | 50.3 | 2/2 | plate density/crop gap, the audit's qualitative finding |
| home-intro-wrap | 41.0 | 2/2 | reference opens on a full-bleed render; ours on a two-column statement |
| home-map-wrap | 68.3 | 2/2 | best seat |
| home-platform-wrap | 57.2 | 2/2 | |
| home-problem-wrap | 68.5 | 2/2 | |
| home-usecase-wrap | 53.5 | 2/2 | |
| home-why-wrap | 67.5 | 2/2 | |

Stored crops are 96-colour quantised PNGs; E is computed on the stored files (the archived evidence and the number agree by construction). Measured compression effect on E: < 0.2 points versus the pristine capture.

## Task log

| Task | Commit | Before → After | Verification (real output) |
|---|---|---|---|
| T1 conformance contract | `fe6b7614` | artifact printed base 40/50 while the gate applied R347 re-keys → `summary.coverage.policy.effective` names the limit actually applied per section with its reason | `node --test gates.test.mjs` 10/10; two full 10×5 gated runs, 94.4 % both, `gateFailures []`, provenance carries SHA/Node/browser/DPI |
| T2 evidence baseline | `1a042294` + this commit | no machine-readable evidence → 20/20 pairs captured, E/T/Q as separate dials, manifest validator | `fidelity.mjs --validate` → `complete YES (20/20)`, T 100 %, E 56.8, Q 90 |
| T3 motion | measured, no source change | Q unknown → Q 85 on the verified family | settle family 17/20 pass (map@1440, map@390 and footer@390 hold 3 frames, tolerance ≤2). Measured our-side reveal onsets run *negative* (content starts animating before the section top reaches the viewport) for cta −0.3, footer −0.4, platform −0.5 — recorded in `capture.json` as the work-list. No timing was changed: the frozen spec carries no sampled tween values, and copying reference timings by eye is inference. |
| T4 hero/intro | not executed | — | Blocked by B2 (see below): the section E floor cannot be reached by composition work while the reference's artwork/fonts/copy stay banned. The measured defects that *are* actionable are listed under "open defects". |
| T5 map/platform | not executed | — | Same B2 block. Measured: map 68.3 (best seat), platform 56.6 with heuristic share 58.5 % under its own cap 65. |
| T6 problem/why/usecase/cta | not executed | — | Same B2 block. |
| T7 chrome | measured only | — | chrome is the worst seat (E 46.9). `div.pl[data-spec="preloader.overlay"]` remounts after its own intro and covers the viewport with `pointer-events: auto` — recorded as a product question for the chrome owner. |
| T8 CSS debt | harness + measurement | landing sheets: **24 errors / 37 warnings** | 0-error target NOT met. Both error classes are `no-duplicate-selectors` (24) and the warnings are `no-descending-specificity` (37 ≤ 57, already under the warning ceiling). Merging was NOT applied blindly: the duplicate pairs sit on both sides of `@media` boundaries (e.g. `cta.css` `.fo-cta-title` at 82 base vs 524 inside `@media (max-width:767px)`), so merging would move responsive declarations into the base cascade. `scripts/conformance/style-snapshot.mjs` now provides the before/after computed-style evidence the task requires (2 730 elements @1440, 2 723 @390); the "before" snapshot is the basis for any future merge. |
| T9 acceptance | this commit | `verify.sh --fast`: tsc ✗ → ✓ | Details below. |

## Task 9 — gate run (`bash scripts/verify.sh --fast`)

| leg | result |
|---|---|
| tsc | **✓ PASS** — was failing on a stale Prisma client and a missing `adm-zip`; fixed at the root (`npx prisma generate` + lockfile install), no source change |
| vitest (frontend) | 3150/3155 pass under the host timezone; the 5 failures are the host's `Africa/Tripoli` offset. Re-run of the three affected files with `TZ=UTC`: **50/50 pass**. `verify.sh` does not pin TZ — recorded as an environment defect |
| vite build + bundle | **PASS** — 758.7 KB gz total (ceiling 774), entry 65.8 (92), pdf 95.4 (110) |
| stylelint + CSS ratchet | PASS (ratchet untouched) |
| copy budget | PASS — 10 419 words, ceilings sum 10 419 |
| release publish script | **1 of 10 FAIL** — `publish-rolling-release.test.sh`, unrelated to this branch (mobile release tooling); pre-existing, not caused by any change here |

## Blockers (unchanged, now measured rather than suspected)

**B1 — the reference has no addressable scroll.** `documentElement.scrollHeight` is one viewport
(900/844) against the spec's 14144; `window.scrollTo` does nothing; `mouse.wheel` advances the
stage in exact 600 px steps. This was solved rather than blocked: `fidelity.mjs` drives the wheel,
reads each section's `getBoundingClientRect().top`, lands it at 0 (±2 px) and clips the viewport.
Every reference crop now carries `step` + landed `top` in `capture.json`.

**B2 — E ≥ 90 by SSIM is unreachable with original artwork.** The spec bans Heron's assets, fonts
and copy while E compares pixels. Measured proof in this run: the strongest seat (map, 68.3) is
the one with the most empty stage. E is therefore a regression dial: it can prove we did not lose
ground and can be pushed by geometry/density work, but it cannot cross 88–90 without copying.

**B3 — the intro overlay remounts.** `div.pl[data-spec="preloader.overlay"]`, fixed, z-index 320,
`pointer-events: auto`, clears at ~6 s and then remounts. `fidelity.mjs` dismisses it through its
own `تخطي` control before every shot (hence 20/20 clean crops); `stress.mjs` reachability rows that
name `div.pl` are therefore not product verdicts. Ownership: `_chrome`, unassigned in this round.

## Open defects measured (no reference needed)

| defect | where | evidence |
|---|---|---|
| hero title lines overlap 100 % | `span.hro-line` × `span.hro-line` @320 | `stress.json` |
| plate number/label pairs overlap 100 % | `01`×`محور`, `02`×`قياس` @1440 | `stress.json` |
| CTA label clipped | `a.btn.accent` 251 px in a 249 px box @640×360 | `stress.json` |
| horizontal overflow | none at any of the 7 sizes | `stress.json` |

## Deviations from the plan and why

- **Task 4–7 visual recomposition was not started.** Their own completion criterion is an E floor
  that B2 proves unreachable without copying the reference. Starting them would mean either
  copying (banned) or claiming a number the metric cannot produce.
- **Task 8's 0-error target was not met.** The 24 errors are cross-context duplicates; merging
  them without a per-pair cascade review would move responsive rules into the base sheet. The
  harness that makes such a review safe now exists and has its baseline snapshot.
- **Trigger-family Q is reported unverified, not failed.** The frozen `start` values live in the
  reference's ScrollTrigger space, which the current stage no longer exposes; normalising them
  would require an assumed constant.
