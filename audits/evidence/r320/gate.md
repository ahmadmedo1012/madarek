# R320 composed gate — 2026-10-28T23:56:17.610Z

Base `http://127.0.0.1:4319` · Routes landing · Viewports 390,768,1440 · Themes light,dark · Mode full · Only svg-collisions

Runs the R319 gate (child process, own baseline: scripts/r319/gate-baseline.json) + the five R320 rules: svg-collisions (landing, text×text + text×geometry) · duplicate-selector (cross-file B1 class) · hover-guard (:hover inside @media (hover:hover)) · rename-scan (admin routes, «الإدارة» register) · cleanliness (console + network). Hermetic: the REAL e2e mock transport serves every /api/ call — no backend needed.

| route | viewport | theme | check | result | number | worst sample / failing selectors |
|---|---|---|---|---|---|---|
| landing | 390 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 0 texts · 0 geoms) | — |
| landing | 768 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 0 texts · 0 geoms) | — |
| landing | 1440 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 0 texts · 0 geoms) | — |
| landing | 390 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 0 texts · 0 geoms) | — |
| landing | 768 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 0 texts · 0 geoms) | — |
| landing | 1440 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 0 texts · 0 geoms) | — |

## Ratchet (baseline)

- baseline: `scripts/r320/gate-baseline.json` — compared against gate-baseline.json written 2026-10-26T07:11:41.288Z
- no regressions vs baseline (ratchet holds)

**0 FAIL · 0 WARN · 0 cell error(s) · 0 regression(s) → exit 0** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
