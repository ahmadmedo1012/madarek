# R343 · D1 — CSS dead-code report (PROVISIONAL subset crawl)

generated 2026-11-08T18:39:05.301Z · tool `scripts/css/dead.mjs` · dev server http://localhost:5208 · mode: vite-dev

## Baseline honesty — READ FIRST
- Crawl = 10 public + 1 student routes × bps {390/1440} × themes {light/dark} = 44 cells (student surfaces seeded via the D7a e2e transport).
- This ran on the D1 WORKTREE (wip/r343-D1): parallel R343 branches add CSS concurrently — the authoritative baseline is the post-merge full-matrix re-run.
- admin/teacher/owner/quality surfaces were NOT crawled (their fixture corpora live inside the per-role harness scripts) — their selectors are counted `notCrawled` (1168), never dead.
- Playwright CSS coverage cannot see Vite-dev's injected <style> tags — the live set is harvested from document.styleSheets (data-vite-dev-id attribution) after a scroll+hover pass; coverage entries: 88.

## Totals (frontend/src/styles — 78 files)
| selectors | matched | never-matched | print-only | not-crawled | dup groups (redundant decls) | shadowed | !important |
|---|---|---|---|---|---|---|---|
| 6268 | 3207 (51.2%) | 1774 (28.3%) | 119 | 1168 | 952 (1178) | 1311 | 52 |

used selectors: light 2021 · dark 2072 · union 2080 (dead = parsed ∧ file loaded by a crawled route ∧ not in the union).

## Top-20 dead files (never-matched selectors per file)
| file | sels | dead | dead% | !imp |
|---|---|---|---|---|
| frontend/src/styles/patterns.css | 807 | 430 | 53.3% | 0 |
| frontend/src/styles/components.css | 308 | 229 | 74.4% | 6 |
| frontend/src/styles/colleges.css | 193 | 191 | 99% | 0 |
| frontend/src/styles/student.css | 103 | 81 | 78.6% | 0 |
| frontend/src/styles/layout.css | 184 | 79 | 42.9% | 1 |
| frontend/src/styles/landing/journey.css | 255 | 78 | 30.6% | 0 |
| frontend/src/styles/notifications.css | 97 | 72 | 74.2% | 0 |
| frontend/src/styles/polish.css | 251 | 69 | 27.5% | 18 |
| frontend/src/styles/landing/hero-mechanics.css | 496 | 60 | 12.1% | 0 |
| frontend/src/styles/base.css | 105 | 54 | 51.4% | 10 |
| frontend/src/styles/motion.css | 48 | 47 | 97.9% | 1 |
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
- `frontend/src/styles/patterns.css` 430/807 · `frontend/src/styles/components.css` 229/308
- `frontend/src/styles/colleges.css` 191/193 · `frontend/src/styles/student.css` 81/103
- `frontend/src/styles/layout.css` 79/184 · `frontend/src/styles/landing/journey.css` 78/255
- `frontend/src/styles/notifications.css` 72/97 · `frontend/src/styles/polish.css` 69/251
- `frontend/src/styles/landing/hero-mechanics.css` 60/496 · `frontend/src/styles/base.css` 54/105
- `frontend/src/styles/motion.css` 47/48 · `frontend/src/styles/landing/strata.css` 39/179
- `frontend/src/styles/landing/hero.css` 37/146 · `frontend/src/styles/landing/cta.css` 33/145
- `frontend/src/styles/landing/preloader.css` 33/35 · `frontend/src/styles/landing/nav.css` 28/105
- `frontend/src/styles/legal.css` 22/56 · `frontend/src/styles/student/pages.css` 20/60
- `frontend/src/styles/landing/footer.css` 19/229 · `frontend/src/styles/shell/shell.css` 15/60
- `frontend/src/styles/student/heron.css` 15/32 · `frontend/src/styles/landing/why.css` 14/293
- `frontend/src/styles/shared/indicators.css` 12/79 · `frontend/src/styles/tokens/tokens.css` 12/35
- `frontend/src/styles/landing/patterns.css` 11/18 · `frontend/src/styles/landing/cursor.css` 10/12
- `frontend/src/styles/landing/shared.css` 9/63 · `frontend/src/styles/illustrations.css` 8/10
- `frontend/src/styles/landing/chrome.css` 8/25 · `frontend/src/styles/landing/pains.css` 8/112
- `frontend/src/styles/shared/app-grammar.css` 6/9 · `frontend/src/styles/shell/chrome.css` 6/39
- `frontend/src/styles/landing/platform.css` 5/104 · `frontend/src/styles/landing/inner.css` 3/6
- `frontend/src/styles/shell/sheet-frame.css` 3/16 · `frontend/src/styles/landing/consent-edge.css` 2/47
- `frontend/src/styles/landing/home.css` 2/6 · `frontend/src/styles/landing/roles.css` 2/102
- `frontend/src/styles/landing/consent.css` 1/9 · `frontend/src/styles/student/heron-dashboard.css` 1/13

## Notable concentrations (top single-file work-lists)
- frontend/src/styles/patterns.css: e.g. `.pf-page[data-width='reading']` · `.pf-page[data-width='default']` · `.pf-page[data-width='wide']`
- frontend/src/styles/components.css: e.g. `.grid-1-2` · `.card` · `.card.flush`
- frontend/src/styles/colleges.css: e.g. `.college-city-section` · `.college-city-section:first-of-type` · `.college-city-header`
- frontend/src/styles/student.css: e.g. `.lecture-aside` · `.lecture-video-wrap` · `.lecture-video`
- frontend/src/styles/layout.css: e.g. `.nav-badge.brand` · `[dir="ltr"] .sidebar` · `.sidebar.open`

## Duplicate/shadow findings (cross-file order = crawl sheet order)
- exact duplicate groups: 952 (1178 redundant declarations) — top: `.st-section.st-section min-block-size: 0` ×5 · `.wy-stage, .wy-capbar --wy-ct-fw: 700` ×5 · `.wy-stage, .wy-capbar --wy-ct-color: rgb(255, 255, ` ×5
- last-wins shadowed declarations: 1311 (earlier value never applies; the winner is listed per entry in report.json).

NO CSS was deleted by this task — the tool + this report are the deliverable; deletions are later tasks' decisions.
