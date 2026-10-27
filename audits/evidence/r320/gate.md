# R320 composed gate — 2026-10-27T21:40:43.802Z

Base `http://127.0.0.1:4257` · Routes landing,student-dashboard,admin-dashboard · Viewports 390,1440 · Themes light,dark · Mode quick · Only r319,svg-collisions,rename-scan,cleanliness,duplicate-selector,hover-guard

Runs the R319 gate (child process, own baseline: scripts/r319/gate-baseline.json) + the five R320 rules: svg-collisions (landing, text×text + text×geometry) · duplicate-selector (cross-file B1 class) · hover-guard (:hover inside @media (hover:hover)) · rename-scan (admin routes, «الإدارة» register) · cleanliness (console + network). Hermetic: the REAL e2e mock transport serves every /api/ call — no backend needed.

| route | viewport | theme | check | result | number | worst sample / failing selectors |
|---|---|---|---|---|---|---|
| landing | 390 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 390 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 43 texts · 373 geoms · cam full-view 2nd pass) | — |
| landing | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 390 | light | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 1440 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 1440 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 59 texts · 502 geoms) | — |
| landing | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 1440 | light | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 390 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 390 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 43 texts · 373 geoms · cam full-view 2nd pass) | — |
| landing | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 390 | dark | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 1440 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 1440 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 59 texts · 502 geoms) | — |
| landing | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 1440 | dark | cleanliness/network | PASS | 0 unique · 0 occ | — |
| student-dashboard | 390 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 390 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 390 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 1 unique · 2 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 1440 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 1440 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 1440 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 1 unique · 2 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 390 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 390 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 390 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 1 unique · 2 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 1440 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 1440 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 1440 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 1 unique · 2 occ | 501 /api/v1/me/gaps ×2 |
| admin-dashboard | 390 | light | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer open | — |
| admin-dashboard | 390 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 390 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 1440 | light | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer — | — |
| admin-dashboard | 1440 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 1440 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 390 | dark | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer open | — |
| admin-dashboard | 390 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 390 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 1440 | dark | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer — | — |
| admin-dashboard | 1440 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 1440 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| — | — | — | duplicate-selector | FAIL → R320 §cleanup (cross-file selector conflicts — Cycle 6 dedupe) | 65 fresh of 65 app×app (129 artifact pairs exempt · 184 harmless dups) · 5677 rules/43 sheets | styles/admin.css:402 ↔ styles/components.css:3862 .admin-faculty-card [box-shadow] |
| — | — | — | hover-guard | FAIL → B1 residue (unguarded :hover sweep — the R319 convention, C2+) | 183 fresh of 184 unguarded (297 :hover rules/43 sheets · 1 allowlisted) | styles/admin.css:377 .settings-links a:hover @ (root) |
| — | — | — | r319-gate | FAIL → the R319 ratchet (state-contrast/paired/leaks/shell/material) — regressions there block here too (see audits/evidence/r319/gate.md) **↗REGRESSION** | exit 1 | [mock-transport] no fixture for GET /api/v1/me/gaps — answering 501 ⏎ [mock-transport] no fixture for GET /api/v1/me/gap |

## Ratchet (baseline)

- baseline: `scripts/r320/gate-baseline.json` — compared against gate-baseline.json written 2026-10-26T07:11:41.288Z
- ↗ REGRESSION |—|—|r319-gate: FAIL (metric 1 > baseline 0) — worse number

**23 FAIL · 0 WARN · 0 cell error(s) · 1 regression(s) → exit 1** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
