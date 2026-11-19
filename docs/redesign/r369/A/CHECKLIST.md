# R369 · Agent A — Integrator & Foundations · CHECKLIST

Branch: `agent/r369-integrate` (from `origin/exec/r368-fidelity-v2` @ `9d278577`) · Worktree: `/home/z/wt/r369-A`
Law: tick only with proof on the same line. "Pushed/written" ≠ done; "executed, measured, target met" = done.
Skipped items = `SKIPPED — reason — needs <owner decision/credential>`.

## Lane A1 — one green base

- [ ] BRANCH-LEDGER.md: every R368 branch inventoried (contained-in / unique commits / verdict merge|cherry-pick|drop + reason); the unique commits of `exec/r368-heron-fidelity` (3), `wip/r368-t5` (8), `wip/r368-t5-public` (1) inspected individually.
- [ ] Merge `origin/wip/r368-t6` into `agent/r369-integrate` (`--no-ff`); conflicts resolved (logic/tests both; CSS both intents; evidence PNGs/manifests regenerated or dropped; ratchet/baselines never hand-merged — stricter wins, regenerate at end).
- [ ] Unique valuable commits from `exec/r368-heron-fidelity`, `wip/r368-t5`, `wip/r368-t5-public` merged/cherry-picked per ledger verdict.
- [ ] Size-gate red fixed at the ROOT: per-state captures → gitignored `docs/audit/evidence/.local/` (+ CI artifacts); committed evidence = JSON + ≤ 1.5 MB contact sheets per push; historical `waves/` pruned; `.gitignore` + pre-push guard script added.
- [ ] Deadcode ratchet red fixed at the root (genuinely dead exports/duplicates removed; never re-pinned upward).
- [ ] Failing CI job(s) fixed from actual job logs (not guessed), incl. the reproducible `useScrollRestoration` "throwing sessionStorage" failure (root-caused: real bug fixed or instrument-excluded with proof).
- [ ] Gates green on merged tree with proof: `bash scripts/verify.sh --fast` (no pipe), frontend unit + e2e, backend tests, mobile jest, design gates, stylelint ratchet, size gate, contrast gate, conformance gate, graphics verifier, worklet-audit, identity guard.
- [ ] `docs/redesign/r369/BASE-READY.md` written (SHA + green CI proof); pushed; CI green on pushed SHA.

## Lane A2 — truthful instruments & the new acceptance

- [ ] `docs/specs/heron-fidelity.md` + plan amended: E demoted to diagnostic; acceptance = judge ≥ 4/5 per seat × primary bp, T ≥ 95 % (≥ 90/seat), Q = 100 verified, geometry tolerance, zero overlap/clip, no regression. Amendment recorded (owner decision 2026-11-19).
- [ ] `scripts/fidelity/judge-sheets.mjs`: deterministic paired sheets (Heron | ours | overlay) 10 seats × {390,768,1024,1440,1920} × states, settled-state protocol, ≤ 1.5 MB committed + rest `.local/`; `docs/audit/evidence/judge-ledger.json` (seat, bp, rating 1–5, defects, reviewer, date) that B fills and `accept.mjs` reads.
- [ ] `scripts/fidelity/accept.mjs`: one command printing the complete acceptance table (T, Q, judge ledger, geometry, stress, bundle, CSS counts, words, Lighthouse links), exit non-zero on any unmet criterion; conformance runner relative paths; committed `results.json` provenance explicit (SHA, profile, gate-vs-scoped); threshold fixtures for floor/heuristic cap.
- [ ] The 5 invalid T pairs (footer@390/768 mid, cta@1440 mid) root-caused to instrument or to B (REQUESTS written).

## Lane A3 — tokens, hygiene, simplification

- [ ] T4 token migration executed from `wave4-notes/value-inventory.md` (add/tune only); `layout.contentMaxWidth` + motion/ease + shadow/depth tokens seated per B/C REQUESTS (answered within the hour); web↔mobile token parity gate green.
- [ ] Repo simplified (ponytail + impeccable): `docs/INDEX.md` single source-of-truth map; obsolete R3xx prompts/briefs/duplicates → `docs/archive/` (grep test/gate references first); dead scripts/deps removed with proof; `docs/FIDELITY-HOWTO.md` written. Files/KB removed reported.
- [ ] Bundle ceiling doc reconciled (770 vs 774 KB → ONE source); landing lazy-chunk budget line in size gate IF justified by B with numbers (owner decision stated; never raised silently).
- [ ] `npm run typecheck` green on Node 22; backend tests green; no schema changes.

## Lane A4 — rolling support & closeout

- [ ] ~60 min cadence: `git fetch`; read B/C REQUESTS + RESUME; answer tooling/token requests; `accept.mjs` kept current; conflicts flagged in `docs/redesign/r369/A/COORDINATION.md`.
- [ ] When B and C both have `DELIVERY.md` (or ~10 h of A work): dry-run integration on `agent/r369-integrate-dryrun` (merge both, regenerate baselines once via documented scripts, full gate set + `accept.mjs`); `docs/redesign/r369/A/INTEGRATION-DRYRUN.md` records conflicts + fixes. NOT merged to `main`.
- [ ] DELIVERY.md written on branch; final report (Arabic, ≤ 12 lines).
