# R320 composed gate — 2026-11-01T13:00:07.292Z

Base `http://127.0.0.1:4257` · Routes landing,student-dashboard,teacher-dashboard,admin-dashboard,quality-dashboard,owner-dashboard · Viewports 390,768,1440 · Themes light,dark · Mode full · Only r319,svg-collisions,rename-scan,cleanliness,duplicate-selector,hover-guard

Runs the R319 gate (child process, own baseline: scripts/r319/gate-baseline.json) + the five R320 rules: svg-collisions (landing, text×text + text×geometry) · duplicate-selector (cross-file B1 class) · hover-guard (:hover inside @media (hover:hover)) · rename-scan (admin routes, «الإدارة» register) · cleanliness (console + network). Hermetic: the REAL e2e mock transport serves every /api/ call — no backend needed.

| route | viewport | theme | check | result | number | worst sample / failing selectors |
|---|---|---|---|---|---|---|
| landing | 390 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 390 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 43 texts · 372 geoms) | — |
| landing | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 390 | light | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 768 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 768 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 48 texts · 474 geoms) | — |
| landing | 768 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 768 | light | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 1440 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 1440 | light | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 48 texts · 501 geoms) | — |
| landing | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 1440 | light | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 390 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 390 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 43 texts · 372 geoms) | — |
| landing | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 390 | dark | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 768 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 768 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 48 texts · 474 geoms) | — |
| landing | 768 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 768 | dark | cleanliness/network | PASS | 0 unique · 0 occ | — |
| landing | 1440 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| landing | 1440 | dark | svg-collisions | PASS | 0 (0 text×text + 0 text×geom of 48 texts · 501 geoms) | — |
| landing | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 2 unique · 2 occ (0E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| landing | 1440 | dark | cleanliness/network | PASS | 0 unique · 0 occ | — |
| student-dashboard | 390 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 390 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 4 unique · 6 occ (2E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 390 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 2 unique · 4 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 768 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 768 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 768 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 4 unique · 6 occ (2E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 768 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 2 unique · 4 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 1440 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 1440 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 4 unique · 6 occ (2E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 1440 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 2 unique · 4 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 390 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 390 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 4 unique · 6 occ (2E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 390 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 2 unique · 4 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 768 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 768 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 768 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 4 unique · 6 occ (2E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 768 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 2 unique · 4 occ | 501 /api/v1/me/gaps ×2 |
| student-dashboard | 1440 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| student-dashboard | 1440 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| student-dashboard | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 4 unique · 6 occ (2E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| student-dashboard | 1440 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 2 unique · 4 occ | 501 /api/v1/me/gaps ×2 |
| teacher-dashboard | 390 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| teacher-dashboard | 390 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| teacher-dashboard | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| teacher-dashboard | 390 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 1 unique · 2 occ | 501 /api/v1/teacher/dashboard ×2 |
| teacher-dashboard | 768 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| teacher-dashboard | 768 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| teacher-dashboard | 768 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| teacher-dashboard | 768 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 1 unique · 2 occ | 501 /api/v1/teacher/dashboard ×2 |
| teacher-dashboard | 1440 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| teacher-dashboard | 1440 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| teacher-dashboard | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| teacher-dashboard | 1440 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 1 unique · 2 occ | 501 /api/v1/teacher/dashboard ×2 |
| teacher-dashboard | 390 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| teacher-dashboard | 390 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| teacher-dashboard | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| teacher-dashboard | 390 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 1 unique · 2 occ | 501 /api/v1/teacher/dashboard ×2 |
| teacher-dashboard | 768 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| teacher-dashboard | 768 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| teacher-dashboard | 768 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| teacher-dashboard | 768 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 1 unique · 2 occ | 501 /api/v1/teacher/dashboard ×2 |
| teacher-dashboard | 1440 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| teacher-dashboard | 1440 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| teacher-dashboard | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 3 unique · 4 occ (1E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| teacher-dashboard | 1440 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 1 unique · 2 occ | 501 /api/v1/teacher/dashboard ×2 |
| admin-dashboard | 390 | light | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer open | — |
| admin-dashboard | 390 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 390 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 768 | light | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer open | — |
| admin-dashboard | 768 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 768 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 768 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 1440 | light | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer — | — |
| admin-dashboard | 1440 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 1440 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 390 | dark | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer open | — |
| admin-dashboard | 390 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 390 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 768 | dark | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer open | — |
| admin-dashboard | 768 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 768 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 768 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| admin-dashboard | 1440 | dark | rename-scan | PASS | 0 hit(s) · 0 occ · 0 kept · drawer — | — |
| admin-dashboard | 1440 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| admin-dashboard | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| admin-dashboard | 1440 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) | 3 unique · 6 occ | 501 /api/v1/admin/stats ×2 |
| quality-dashboard | 390 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| quality-dashboard | 390 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| quality-dashboard | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| quality-dashboard | 390 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/quality/overview ×2 |
| quality-dashboard | 768 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| quality-dashboard | 768 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| quality-dashboard | 768 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| quality-dashboard | 768 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/quality/overview ×2 |
| quality-dashboard | 1440 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| quality-dashboard | 1440 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| quality-dashboard | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| quality-dashboard | 1440 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/quality/overview ×2 |
| quality-dashboard | 390 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| quality-dashboard | 390 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| quality-dashboard | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| quality-dashboard | 390 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/quality/overview ×2 |
| quality-dashboard | 768 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| quality-dashboard | 768 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| quality-dashboard | 768 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| quality-dashboard | 768 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/quality/overview ×2 |
| quality-dashboard | 1440 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| quality-dashboard | 1440 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| quality-dashboard | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 5 unique · 8 occ (3E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| quality-dashboard | 1440 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 3 unique · 6 occ | 501 /api/v1/quality/overview ×2 |
| owner-dashboard | 390 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| owner-dashboard | 390 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| owner-dashboard | 390 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 6 unique · 10 occ (4E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| owner-dashboard | 390 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 4 unique · 8 occ | 501 /api/v1/owner/stats ×2 |
| owner-dashboard | 768 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| owner-dashboard | 768 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| owner-dashboard | 768 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 6 unique · 10 occ (4E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| owner-dashboard | 768 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 4 unique · 8 occ | 501 /api/v1/owner/stats ×2 |
| owner-dashboard | 1440 | light | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| owner-dashboard | 1440 | light | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| owner-dashboard | 1440 | light | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 6 unique · 10 occ (4E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| owner-dashboard | 1440 | light | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 4 unique · 8 occ | 501 /api/v1/owner/stats ×2 |
| owner-dashboard | 390 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| owner-dashboard | 390 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| owner-dashboard | 390 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 6 unique · 10 occ (4E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| owner-dashboard | 390 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 4 unique · 8 occ | 501 /api/v1/owner/stats ×2 |
| owner-dashboard | 768 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| owner-dashboard | 768 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| owner-dashboard | 768 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 6 unique · 10 occ (4E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| owner-dashboard | 768 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 4 unique · 8 occ | 501 /api/v1/owner/stats ×2 |
| owner-dashboard | 1440 | dark | rename-scan | NA | — | rename scan is scoped to admin routes (§B RENAME) |
| owner-dashboard | 1440 | dark | svg-collisions | NA | — | SVG collision sweep is scoped to the landing drawings (§A4) |
| owner-dashboard | 1440 | dark | cleanliness/console | FAIL → §cleanup (console warnings/errors — router future flags + 501 fail-soft logs) **↗REGRESSION** | 6 unique · 10 occ (4E/2W) | warning @/node_modules/.vite/deps/react-router-dom.js:4416 «⚠️ React Router Future Flag Warning: React Router will begin |
| owner-dashboard | 1440 | dark | cleanliness/network | FAIL → §cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets) **↗REGRESSION** | 4 unique · 8 occ | 501 /api/v1/owner/stats ×2 |
| — | — | — | duplicate-selector | FAIL → R320 §cleanup (cross-file selector conflicts — Cycle 6 dedupe) **↗REGRESSION** | 76 fresh of 76 app×app (132 artifact pairs exempt · 189 harmless dups) · 6305 rules/53 sheets | styles/admin.css:402 ↔ styles/components.css:3879 .admin-faculty-card [box-shadow] |
| — | — | — | hover-guard | FAIL → B1 residue (unguarded :hover sweep — the R319 convention, C2+) | 179 fresh of 180 unguarded (312 :hover rules/53 sheets · 1 allowlisted) | styles/admin.css:377 .settings-links a:hover @ (root) |
| — | — | — | r319-gate | FAIL → the R319 ratchet (state-contrast/paired/leaks/shell/material) — regressions there block here too (see audits/evidence/r319/gate.md) **↗REGRESSION** | exit 1 | [mock-transport] no fixture for GET /api/v1/owner/alerts — answering 501 ⏎ [mock-transport] no fixture for GET /api/v1/o |

## Ratchet (baseline)

- baseline: `scripts/r320/gate-baseline.json` — compared against gate-baseline.json written 2026-10-26T07:11:41.288Z
- ↗ REGRESSION landing|768|light|cleanliness/console: FAIL (metric 2 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION landing|768|dark|cleanliness/console: FAIL (metric 2 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION student-dashboard|390|light|cleanliness/console: FAIL (metric 4 > baseline 3) — worse number
- ↗ REGRESSION student-dashboard|390|light|cleanliness/network: FAIL (metric 2 > baseline 1) — worse number
- ↗ REGRESSION student-dashboard|768|light|cleanliness/console: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION student-dashboard|768|light|cleanliness/network: FAIL (metric 2 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION student-dashboard|1440|light|cleanliness/console: FAIL (metric 4 > baseline 3) — worse number
- ↗ REGRESSION student-dashboard|1440|light|cleanliness/network: FAIL (metric 2 > baseline 1) — worse number
- ↗ REGRESSION student-dashboard|390|dark|cleanliness/console: FAIL (metric 4 > baseline 3) — worse number
- ↗ REGRESSION student-dashboard|390|dark|cleanliness/network: FAIL (metric 2 > baseline 1) — worse number
- ↗ REGRESSION student-dashboard|768|dark|cleanliness/console: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION student-dashboard|768|dark|cleanliness/network: FAIL (metric 2 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION student-dashboard|1440|dark|cleanliness/console: FAIL (metric 4 > baseline 3) — worse number
- ↗ REGRESSION student-dashboard|1440|dark|cleanliness/network: FAIL (metric 2 > baseline 1) — worse number
- ↗ REGRESSION teacher-dashboard|390|light|cleanliness/console: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|390|light|cleanliness/network: FAIL (metric 1 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|768|light|cleanliness/console: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|768|light|cleanliness/network: FAIL (metric 1 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|1440|light|cleanliness/console: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|1440|light|cleanliness/network: FAIL (metric 1 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|390|dark|cleanliness/console: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|390|dark|cleanliness/network: FAIL (metric 1 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|768|dark|cleanliness/console: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|768|dark|cleanliness/network: FAIL (metric 1 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|1440|dark|cleanliness/console: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION teacher-dashboard|1440|dark|cleanliness/network: FAIL (metric 1 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION admin-dashboard|768|light|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION admin-dashboard|768|light|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION admin-dashboard|768|dark|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION admin-dashboard|768|dark|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|390|light|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|390|light|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|768|light|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|768|light|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|1440|light|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|1440|light|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|390|dark|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|390|dark|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|768|dark|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|768|dark|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|1440|dark|cleanliness/console: FAIL (metric 5 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION quality-dashboard|1440|dark|cleanliness/network: FAIL (metric 3 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|390|light|cleanliness/console: FAIL (metric 6 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|390|light|cleanliness/network: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|768|light|cleanliness/console: FAIL (metric 6 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|768|light|cleanliness/network: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|1440|light|cleanliness/console: FAIL (metric 6 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|1440|light|cleanliness/network: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|390|dark|cleanliness/console: FAIL (metric 6 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|390|dark|cleanliness/network: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|768|dark|cleanliness/console: FAIL (metric 6 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|768|dark|cleanliness/network: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|1440|dark|cleanliness/console: FAIL (metric 6 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION owner-dashboard|1440|dark|cleanliness/network: FAIL (metric 4 > baseline —) — NEW failing row (absent from baseline)
- ↗ REGRESSION |—|—|duplicate-selector: FAIL (metric 76 > baseline 65) — worse number
- ↗ REGRESSION |—|—|r319-gate: FAIL (metric 1 > baseline 0) — worse number

**69 FAIL · 0 WARN · 0 cell error(s) · 56 regression(s) → exit 1** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
