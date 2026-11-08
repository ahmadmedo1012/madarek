# Task D1b (respawn from D1's commit 8331fcb1) — finish the CSS dead-code subset crawl + report
Worktree /home/z/wt/D1 · Branch wip/r343-D1 (has your tool `scripts/css/dead.mjs` committed) · Port 5208 · Browsers: yours ONLY, 1 chromium at a time, sequential

## Inputs
`tasks/_README.md` sections: env + commit discipline (ignore the no-browser rule — this task is the exception, you own the only browser). Your own tool `scripts/css/dead.mjs` (read it; you wrote it as D1) · `scripts/conformance/pages.mjs` (route discovery reference — read only) · `docs/redesign/r343/tasks/D1.md` (original contract).

## Do
1. `source /home/z/.madarek-env`; verify the tool runs: `node scripts/css/dead.mjs --help` (or no-arg usage). Fix crashes ONLY in dead.mjs (it is yours).
2. Boot vite: `cd frontend && (nohup npx vite --port 5208 --strictPort > /tmp/vite-D1b.log 2>&1 &)`; wait for 200.
3. Subset crawl: public routes (landing /, /auth, /about, /help, /contact + 3-5 more discovered from pages.mjs; if authed fixtures are trivially reachable use one student page, else note it) × light/dark × 390/1440 → `docs/redesign/r343/css-dead/report.json` + `report.md` (≤80 lines: total selectors, matched, never-matched per file top-20, duplicate declarations count, `!important` map count with file:line).
4. Kill your vite: `pkill -f 'vite --port 5208'`. Commit + push.

## Acceptance
report.json + report.md exist with the numbers above; dead.mjs untouched except crash fixes; NO changes under frontend/src/styles.

## Files you own
`scripts/css/dead.mjs` · `docs/redesign/r343/css-dead/*`. Nothing else.
