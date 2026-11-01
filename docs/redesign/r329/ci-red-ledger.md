# R329 · CI red ledger — the honest path back to green (and staying there)

Owner: **A-CI (G1)** · Branch: `main` · Opened at `6311d03e` (R329 round-open, docs-only).
Method: GitHub Actions API (`/actions/runs`, `/actions/runs/<id>/jobs`, `/actions/jobs/<id>/logs`)
over the last ~100 runs (runs 441–502, 2026-10-31 → 2026-11-01). Every FAILED run was
classified by workflow · job · failing step · root cause · first breaking commit. Nothing in
this ledger is masked: every fix below is a root fix in the source, a regeneration, or a
documented retirement of an assertion whose contract a later round legitimately superseded.

---

## 1 · Summary — failure classes over runs 441–502

| # | Failure class (workflow · job · step) | Runs | Status at R329 open |
|---|---|---:|---|
| 1 | `CI` · **e2e** · `npm --prefix frontend run test:e2e` | 16 | **RED (live)** — 6 specs, R328 H-wave |
| 2 | `Mobile` · mobile-gates · Generated-code drift (tokens · brand · OpenAPI) | 10 | green (last red `0c1660806`/run 26; `18ebf071` landed the regen) |
| 3 | `CI` · design-gates · `check-raw-css.sh --strict` | 10 | green (r327 C-wave; `f242bb781` "12-run CI red killed at its roots") |
| 4 | `CI` · 4 jobs · `npm ci` (install) | 4 | green (transient at `70f3e7976`/run 459; registry/install under load — next run green, no code change) |
| 5 | `CI` · design-gates · `verify-parity-export.mjs` | 3 | **RED (live)** at `1fce6157`/run 501 — R328 H7 token re-key without the export+pin |
| 6 | `CI` · db-integration · run the DB integration suite | 3 | green but **flaky** — Prisma interactive-transaction 5000 ms timeout overruns (61 ms over at run 499); fixed honestly this round (§3.6) |
| 7 | `Mobile` · mobile-gates · expo lint | 3 | green (r327 B-wave; fixed within the wave) |
| 8 | `Mobile builds ledger` · `eas build:list` | 2 | manual `workflow_dispatch` reds (runs 1–2); ledger workflow reviewed in §3.7 |
| 9 | `Mobile` · eas-build · Build preview | 2 | green (runs 19/21, r327 D2 bring-up; `f242bb781` era) |
| 10 | `CI` · test-frontend · `npm --prefix frontend run test` | 2 | green (r326 M1.2 render net; `4ab4125f6`) |
| 11 | `CI` · design-gates · `tokens/build.mjs --check` | 1 | green (`0c1660806`/run 499 — H7 committed the source before the regen; `18ebf071` landed the regen) |
| 12 | `CI` · surface-drift · drift detection | 1 | green (`166d485ea`/run 456, r327 evidence round) |
| 13 | `CI` · design-gates · `rename-ledger-scan.mjs` | 1 | green (`4ab4125f6`/run 444, r326) |
| 14 | `CI` · ios-webkit · webkit-iphone project | 1 | green (`f40181f1c`/run 441, r326 M0.6) |
| 15 | `CI` · design-gates · `check-icons.sh` | 1 | green (`f40181f1c`/run 441) |
| 16 | `CI` · build · `check-bundle-size.mjs` | 1 | green (`f40181f1c`/run 441) |
| 17 | `Deploy smoke` · live OpenAPI vs committed contract | 1 | green (`f40181f1c`/run 1) |

Cancelled runs (12 over the window) are rapid-push supersessions (`concurrency.cancel-in-progress`)
— not failures, excluded from classification.

**The live red at round open (verified by the leader, run 501 `41315560287` @ `1fce6157`,
persisting on `6311d03e`):**
- `design-gates` ❌ at `node scripts/verify-parity-export.mjs` — class 5.
- `e2e` ❌ at `npm --prefix frontend run test:e2e` — class 1 (R328 era: 6 specs).
- All 7 other CI jobs ✅.

---

## 2 · Root causes (per class, one line each)

- **(1) e2e, R328 era — 4 distinct roots, all in the R328 H-wave landing changes
  (`189c74ac9` H1+H3 → `1fce6157`), first confirmed red `9e2ff8187`/run 495:**
  1. `r309-recovery.e2e.ts:56` desktop drag opens 2/3 stations — the R312 belt hardening
     froze the sweep waypoints as fractions of the R322 **uncapped** stage; the R328 H2
     **stage cap** (`max-block-size: 56svh`) moved every dot's fractional seat (markers now
     fy 0.60–0.83 vs the frozen 0.52–0.72 sweep band), so the sweep stopped crossing the
     dot boxes.
  2. `r309-recovery.e2e.ts:310` "cards persist after drag release" opens 0 cards — same
     frozen-fraction root (the 0.75→0.45 line at fy 0.66 crosses no dot box under the cap).
  3. `r309-recovery.e2e.ts:258` mobile 360/390 — **a real app regression, not a test
     artifact**: the R328 H3 phone fold gave `.bp-stage` a hard `aspect-ratio: 8/5` at
     ≤767px, but the phone's inspection **flow rail is in-flow inside the stage** — opening
     a station grows the rail, the capped grid starves the drawing row, the letterbox
     mapping piles every dot at one point, and the rail (`pointer-events: auto` ≤767)
     covers them: the remaining stations can never be tapped. Verified locally at 390px
     (`zz-probe`: all three markers collapse to ≈(173, 55) and `elementFromPoint` returns
     `.hi-flow`).
  4. `r325-map-clip.e2e.ts:207` "the intro is unboxed" asserts the R325 Y1 **feathered
     paper mask** (`::before` + `mask-image`) on `.jt-card-plate` — a contract R328 H4
     **legitimately retired** when the statement plaques left the plan's surface for their
     own hairline-closed band (`.jt-cards`, documented in `landing.css` and the R328
     REPORT). The ghost line-work and unboxed-plate halves of the spec still hold.
  5. `r309-recovery.e2e.ts:128` "drag selection box VISIBLE" — CI-only 45s timeout (passed
     locally in 6.8s pre-fix and post-fix). Watched; see §5 CI log for the verdict.
- **(5) parity export** — R328 H7 re-keyed dark `--neutral-200 #4A4A48→#6F6F6B` and
  `--neutral-300 #5C5C5A→#85857F` in `shared/design-tokens.json` (a measured contrast fix,
  2.20:1 → 2.92:1 on the night ground) and regenerated both halves — but the **export
  (`unified-parity.css`) and the gate's documented pins were not moved with it**, so the
  gate correctly caught the drift. Root fix: move the export AND the pins together with
  the justification (the gate's own documented path for intentional change).
- **(6) db-integration flake** — `helpers.truncateAll` runs a Prisma interactive
  transaction with the default 5000 ms timeout; under CI's 2-CPU load the wipe ran
  5061 ms (run 499 log: `P2028 … 5061 ms passed`). Root fix: give the wipe an explicit,
  documented timeout headroom (§3.6) — the suite's own helper, not a product path.
- **(4) npm ci ×4** — transient install failure at `70f3e7976` (all install-needing jobs
  of that one run; green on the next push, zero code change). No action; recorded.
- Classes 2, 3, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17 — historical, already root-fixed
  inside their own rounds (each has a green run after it in the window; the fixing commits
  are named in §1). No action this round beyond verification that they stay green.

---

## 3 · Fixes landed this round (one coherent change per commit)

### 3.1 Parity gate — the export and pins follow the R328 H7 re-key
- `frontend/src/styles/unified-parity.css`: dark `--neutral-200/--neutral-300` →
  `#6F6F6B`/`#85857F` with the measured-contrast justification in place.
- `scripts/verify-parity-export.mjs`: the two dark pins re-pinned with the full
  change-history note (r305 value → R328 H7 value, why, and that both halves regenerated).
- Verified: `node scripts/verify-parity-export.mjs` → **PASS 200/200**;
  `node scripts/tokens/build.mjs --check` → **PASS** (untouched, was already green).

### 3.2 e2e — the drag geometry rides the LIVE seats
- `frontend/tests/e2e/r309-recovery.e2e.ts`: new `markerCenters()` helper measures the
  three dots live; the wide left sweep walks a waypoint per measured centre (the R312
  "guaranteed by construction" intent, restored under any honest future stage geometry).
  The desktop spec keeps every strict assertion (3 stations, no viewport clipping,
  pairwise non-overlap, inside the frame). The persist spec sweeps through one measured
  dot centre.
- No assertion was loosened; no retries added; nothing skipped.

### 3.3 e2e — the phone fold stops starving the flow rail (app root fix)
- `frontend/src/styles/landing.css` (≤767px block): `.bp-stage` keeps the 8:5 idle fold
  contract, but `:has(.hi-flow[data-any-open='on'])` releases `aspect-ratio` to `auto`
  while stations are open — the rail grows the stage, the ink keeps its box, the dots stay
  tappable. Minimal, documented, and scoped to the open state only (first paint/fold
  unaffected).

### 3.4 e2e — the r325 intro spec pins the R328 H4 statement seat
- `frontend/tests/e2e/r325-map-clip.e2e.ts`: the retired `hasMaskedPaper` assertion is
  REPLACED (not deleted) by the current documented contract: the `.jt-cards` band exists,
  `order: -1`, closes with the rule hairline, both plaques share the ONE crossfade grid
  cell; the plate keeps no border/shadow/background and — guards the retirement —
  `mask-image` stays `none`. **Justification for the retirement:** R328 H4 moved the
  plaques off the plan's surface (measured defect: titles crossing the wall lines
  mid-fade); there is nothing to feather-mask anymore; `landing.css`'s H4 block and the
  R328 REPORT document the decision.

### 3.5 (reserved — workflow bypass sweep, see §3.7)

### 3.6 db-integration — the wipe gets honest timeout headroom
- `backend/tests/integration/helpers.ts`: `truncateAll`'s interactive transaction gets an
  explicit timeout sized to the observed CI overrun (§2.6) — see commit for the value and
  the run-499 evidence. This is test-infra robustness, not a product change.

### 3.7 Workflow bypass sweep (`.github/workflows/*`)
- Audited `ci.yml`, `deploy-smoke.yml`, `keep-warm.yml`, `mobile-builds-ledger.yml`,
  `mobile.yml` for `continue-on-error` and steps that cannot fail — findings and removals
  in the sweep commit + §5.

### 3.8 Pre-push gate
- `scripts/pre-push.mjs` + `.githooks/pre-push` — the CI jobs mirrored locally with
  ≤2-way parallelism; default set ≤ 6 min; `--full` adds e2e + db-integration; loud
  explicit skips. Measured runtime in §6.

---

## 4 · Local gates — status board (run once, honestly)

| Gate | Command | Status |
|---|---|---|
| tokens:check | `node scripts/tokens/build.mjs --check` | ✅ PASS |
| parity | `node scripts/verify-parity-export.mjs` | ✅ PASS (after §3.1) |
| icons | `bash scripts/check-icons.sh` | (see §5 final update) |
| motion tokens | `bash scripts/check-motion-tokens.sh` | (see §5 final update) |
| csp hash | `bash scripts/check-csp-hash.sh` | (see §5 final update) |
| colors | `bash scripts/check-colors.sh --strict` | (see §5 final update) |
| raw css | `bash scripts/check-raw-css.sh --strict` | (see §5 final update) |
| raw-css gate self-test | `bash scripts/test-raw-css-gate.sh` | (see §5 final update) |
| rename ledger | `node scripts/r321/rename-ledger-scan.mjs` | (see §5 final update) |
| gate:r318 / r319 / r320 / lint:r320 | `node scripts/r31{8,9}/…`, `r320/…` | (see §5 final update) |
| gate:r321 | `node scripts/r321/gate.mjs` | (see §5 final update) |
| gate:clean | `node scripts/r323/clean-gate.mjs` | (see §5 final update — zeroing the override pin) |
| gate:perf / contrast / height | r323/r324 gates | (see §5 final update) |

## 5 · CI log (per push, this round)

| sha | conclusion | failing job (if any) |
|---|---|---|
| `6311d03e` (round open, docs-only; run 502) | ❌ (pre-existing) | design-gates · parity; e2e · 6 specs |

## 6 · Pre-push runtime (measured on this 2-CPU sandbox)

(filled by §3.8's commit)
