# R343 · D1 — CSS dead-code report (PROVISIONAL subset crawl)

generated 2026-11-08T18:54:25.229Z · tool `scripts/css/dead.mjs` · dev server http://localhost:5208 · mode: vite-dev

## Baseline honesty — READ FIRST
- Crawl = 10 public + 1 student routes × bps {390/1440} × themes {light/dark} = 44 cells (student surfaces seeded via the D7a e2e transport).
- This ran on the D1 WORKTREE (wip/r343-D1): parallel R343 branches add CSS concurrently — the authoritative baseline is the post-merge full-matrix re-run.
- admin/teacher/owner/quality surfaces were NOT crawled (their fixture corpora live inside the per-role harness scripts) — their selectors are counted `notCrawled` (1168), never dead.
- ALL cells run on the D7a hermetic e2e transport (public cells as guests: /auth/me answers 401; public data surfaces get the fixture table — /colleges renders its designed state, never the no-backend ErrorState).
- Inherent subset limits (do NOT delete on these signals alone): (1) transient states — skeletons/toasts/modals unmount before the harvest (e.g. .gallery-skeleton-*); (2) a file loaded by a crawled route may also carry other surfaces' families — colleges.css's .comp-* belong to /competitions|/community and its detail/leaderboard classes to the 2 uncrawled colleges routes (no fixtures in the e2e table).
- Playwright CSS coverage cannot see Vite-dev's injected <style> tags — the live set is harvested from document.styleSheets (data-vite-dev-id attribution) after a scroll+hover pass; coverage entries: 88.

## Totals (frontend/src/styles — 78 files)
| selectors | matched | never-matched | print-only | not-crawled | dup groups (redundant decls) | shadowed | !important |
|---|---|---|---|---|---|---|---|
| 6268 | 3225 (51.5%) | 1756 (28%) | 119 | 1168 | 952 (1178) | 1311 | 52 |

used selectors: light 2038 · dark 2089 · union 2097 (dead = parsed ∧ file loaded by a crawled route ∧ not in the union).

## Top-20 dead files (never-matched selectors per file)
| file | sels | dead | dead% | !imp |
|---|---|---|---|---|
| frontend/src/styles/patterns.css | 807 | 423 | 52.4% | 0 |
| frontend/src/styles/components.css | 308 | 236 | 76.6% | 6 |
| frontend/src/styles/colleges.css | 193 | 171 | 88.6% | 0 |
| frontend/src/styles/student.css | 103 | 81 | 78.6% | 0 |
| frontend/src/styles/layout.css | 184 | 79 | 42.9% | 1 |
| frontend/src/styles/landing/journey.css | 255 | 78 | 30.6% | 0 |
| frontend/src/styles/notifications.css | 97 | 72 | 74.2% | 0 |
| frontend/src/styles/polish.css | 251 | 70 | 27.9% | 18 |
| frontend/src/styles/landing/hero-mechanics.css | 496 | 60 | 12.1% | 0 |
| frontend/src/styles/base.css | 105 | 54 | 51.4% | 10 |
| frontend/src/styles/motion.css | 48 | 45 | 93.8% | 1 |
| frontend/src/styles/landing/strata.css | 179 | 39 | 21.8% | 0 |
| frontend/src/styles/landing/hero.css | 146 | 37 | 25.3% | 0 |
| frontend/src/styles/landing/cta.css | 145 | 33 | 22.8% | 0 |
| frontend/src/styles/landing/preloader.css | 35 | 33 | 94.3% | 0 |
| frontend/src/styles/landing/nav.css | 105 | 28 | 26.7% | 0 |
| frontend/src/styles/legal.css | 56 | 22 | 39.3% | 1 |
| frontend/src/styles/student/pages.css | 60 | 20 | 33.3% | 0 |
| frontend/src/styles/landing/footer.css | 229 | 19 | 8.3% | 0 |
| frontend/src/styles/shell/shell.css | 60 | 15 | 25% | 0 |

## All files with dead>0 (40 files; per-selector detail in report.json)
- `frontend/src/styles/patterns.css` 423/807 · `frontend/src/styles/components.css` 236/308 · `frontend/src/styles/colleges.css` 171/193
- `frontend/src/styles/student.css` 81/103 · `frontend/src/styles/layout.css` 79/184 · `frontend/src/styles/landing/journey.css` 78/255
- `frontend/src/styles/notifications.css` 72/97 · `frontend/src/styles/polish.css` 70/251 · `frontend/src/styles/landing/hero-mechanics.css` 60/496
- `frontend/src/styles/base.css` 54/105 · `frontend/src/styles/motion.css` 45/48 · `frontend/src/styles/landing/strata.css` 39/179
- `frontend/src/styles/landing/hero.css` 37/146 · `frontend/src/styles/landing/cta.css` 33/145 · `frontend/src/styles/landing/preloader.css` 33/35
- `frontend/src/styles/landing/nav.css` 28/105 · `frontend/src/styles/legal.css` 22/56 · `frontend/src/styles/student/pages.css` 20/60
- `frontend/src/styles/landing/footer.css` 19/229 · `frontend/src/styles/shell/shell.css` 15/60 · `frontend/src/styles/student/heron.css` 15/32
- `frontend/src/styles/landing/why.css` 14/293 · `frontend/src/styles/tokens/tokens.css` 13/35 · `frontend/src/styles/shared/indicators.css` 12/79
- `frontend/src/styles/landing/patterns.css` 11/18 · `frontend/src/styles/illustrations.css` 10/10 · `frontend/src/styles/landing/cursor.css` 10/12
- `frontend/src/styles/landing/shared.css` 9/63 · `frontend/src/styles/landing/chrome.css` 8/25 · `frontend/src/styles/landing/pains.css` 8/112
- `frontend/src/styles/shared/app-grammar.css` 6/9 · `frontend/src/styles/shell/chrome.css` 6/39 · `frontend/src/styles/landing/platform.css` 5/104
- `frontend/src/styles/landing/inner.css` 3/6 · `frontend/src/styles/shell/sheet-frame.css` 3/16 · `frontend/src/styles/landing/consent-edge.css` 2/47
- `frontend/src/styles/landing/home.css` 2/6 · `frontend/src/styles/landing/roles.css` 2/102 · `frontend/src/styles/landing/consent.css` 1/9
- `frontend/src/styles/student/heron-dashboard.css` 1/13

## `!important` map — 52 declarations (full file:line in report.json)
- base.css ×10 — L154, L155, L506, L506, L513, L514, L515, L516, L517, L518
- components.css ×6 — L2726, L2728, L2742, L2750, L2751, L2759
- layout.css ×1 — L1596
- legal.css ×1 — L179
- motion.css ×1 — L518
- pdf.css ×4 — L807, L814, L835, L836
- polish.css ×18 — L1310, L1474, L1680, L1839, L2210, L2363, L2377, L2380, L2381, L2384, L2385, L2386, L2387, L2388, L2389, L2398, L2406, L2407
- shared-design-system.css ×5 — L397, L397, L397, L398, L398
- unified-parity.css ×6 — L818, L819, L820, L821, L822, L823

## Duplicate/shadow findings (cross-file order = crawl sheet order)
- exact duplicate groups: 952 (1178 redundant declarations) — top: `.st-section.st-section min-block-size: 0` ×5 · `.wy-stage, .wy-capbar --wy-ct-fw: 700` ×5 · `.wy-stage, .wy-capbar --wy-ct-color: rgb(255, 255, ` ×5
- last-wins shadowed declarations: 1311 (earlier value never applies; the winner is listed per entry in report.json).

NO CSS was deleted by this task — the tool + this report are the deliverable; deletions are later tasks' decisions.
