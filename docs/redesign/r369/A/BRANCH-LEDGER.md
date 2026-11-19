# R369 · Branch ledger — collapsing the R368 mess

Base for `agent/r369-integrate`: `origin/exec/r368-fidelity-v2` @ `9d278577`.
Inspected 2026-11-19 from the live remote (post `git fetch --prune`).

| branch | tip | contained-in | unique commits | verdict |
|---|---|---|---|---|
| `main` | `347e2508` | — | — | the R366 merge point; NOT touched by R369 |
| `exec/r368-fidelity-v2` | `9d278577` | — (base) | 11 vs t6: T8 copy line (051d621d, a06ad7cf, 392a5bbd, ef4535ff, 54cedd00, ed3f148a, f089795c), T3 platform media (cf484722, 9d278577), wave-3 scorecard + diagnoses (e4bcbf75, a683e405) | BASE (B's starting line) |
| `wip/r368-t6` | `5925fabd` | — | 6 vs v2: wave-1 inventory + student family (dc046b26, 1567384b), shell dark band (ed81e2de), teacher + dark-contrast harvest (c0e3fbef), owner family (5846019b), quality family (5925fabd) | **MERGE `--no-ff`** — 4 role families all-cells-≥90 with axe clean; disjoint product files (pages/admin-owner-quality + family sheets); C's starting line |
| `exec/r368-heron-fidelity` | `9634b24f` | nothing | 3: fe6b7614 (gate-threshold truthfulness in gates.mjs/run.mjs + gates.test.mjs), 1a042294 (first-gen fidelity.mjs/stress.mjs, Codebuff), 9634b24f (first-gen scorecard E 56.7/T 100/Q 85 + prisma/adm-zip root fixes) | **DROP — superseded.** v2's T0 line rebuilt the same instruments under the pair-validity law (wheel-driven reference protocol, live-base position targets, aggregateT, settled-height census, ambient-excluded sampler) and re-measured everything (wave-3 scorecard E 55.4/T 96.5/Q 100 committed as evidence). The 3 commits' valuable extras already exist on v2: adm-zip present in root package.json (`@types/adm-zip ^0.5.8`, `adm-zip ^0.5.16`); prisma client staleness is a worktree-setup step (`npx prisma generate`), not a code delta. Merging would resurrect the first-generation instrument semantics and stale first-gen evidence blobs — a regression of the measurement law. |
| `wip/r368-t5` | `db9e105b` | — | 8: 83749b03 (auth verify-email), d04bd992 (colleges family), b6149b51 (competitions), 82ddb693 (vision+document + real .flex-wrap overflow bug fix), 7d3b8404 (errors 404), fac668c3 (leaderboard ladder repair), d4c1aadc (acceptance sweep + evidence), db9e105b (notes) | **MERGE** — T5 public-pages line complete (all inventoried public routes ≥90 light+dark, axe 0 critical/serious, overflow sweeps); disjoint files (public pages/sheets) |
| `wip/r368-t5-public` | `4c8cc32c` | — | 1: 4c8cc32c (public sheets own their head + announce loading — Codebuff meta/SEO + a11y hardening, 5 files) | **MERGE** — disjoint meta/loading polish on T5's files, recorded as the parallel Codebuff line |
| `wip/r368-t0` | `048e1393` | v2 | 0 | contained (T0 closure) |
| `wip/r368-t1` | `ecb6749c` | v2 | 0 | contained (T1 closure) |
| `wip/r368-t2` | `f402e47a` | v2 | 0 | contained (T2 assets + provenance) |
| `wip/r368-t3` | `2b226441` | v2 | 0 | contained (T3 mid-line; v2 continued it) |
| `wip/r368-t8` | `392a5bbd` | v2 | 0 (NOT in t6) | contained in v2 (T8-a baseline) |
| `plan/r368-heron-fidelity` | `3b8eba04` | v2 (ancestor) | 0 | the planning branch |
| `continuation/r368-t3` (local only) | `edfba1c4` | v2 | 0 | contained |

## Merge execution record

1. `git merge --no-ff origin/wip/r368-t6` — conflicts and resolutions: (appended live below)
2. `git merge --no-ff origin/wip/r368-t5` — (appended live below)
3. `git merge --no-ff origin/wip/r368-t5-public` — (appended live below)
