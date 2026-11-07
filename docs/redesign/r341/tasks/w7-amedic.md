# W7-AMEDIC — bundle gate: 770.4 → ≤769.5 KB gz (zero functional/visual change)

Worktree `/home/z/wt/amedic`, branch `wip/amedic` (at merged main). node_modules hardlinked — no npm install.

## Mission
`bash scripts/verify.sh --fast` fails ONLY at the bundle gate: total gz **770.4 KB > 770**. Find an honest cut ≥0.9 KB gz (target ≤769.5). Code-structure work only — zero functional or visual change.

## Method
1. Baseline: `bash scripts/verify.sh --fast > /tmp/amedic-verify0.log 2>&1; echo $?` (NEVER pipe verify.sh — redirect + check exit).
2. `cd frontend && npx vite build --sourcemap`; parse `dist/assets/*.map` with a node script in /tmp (not the repo) — aggregate size by source. Heaviest: pdf worker 95.7 gz, entry index ~74, charts 65, LandingPage 41.4, OwnerPages 28.2, TeacherPages 20.8.
3. Cheapest cuts first: dead/duplicated code in a chunk · lucide-react barrel leaks (111 importers — verify tree-shaking via the sourcemap; direct-import codemod precedent: apps/mobile/scripts/codemod-lucide-direct.mjs) · long repeated literals rollup can't merge (proven precedent: hero VALUES TSX→CSS vars saved 1.8 KB) · heavy entry-chunk module that's genuinely boot-unneeded → route-level lazy.
4. Re-run verify --fast until bundle gate green with margin.

## Laws
Tests are law (reconcile code, never tests). No visual change. No new deps, no package.json edits, no apps/mobile. Diff minimal, frontend/src/** only. Commit every ≤5 min; push after first commit `git push -u origin wip/amedic` and after each commit (credentials configured; branch must stay recoverable). Do NOT merge to main.

## Report ≤10 lines
gz before→after (exact) · what was cut (file + mechanism each) · verify exit code · commits · leads not taken.
