# R343 decisions (one line each)
1. 2026-11-08 §1 GITHUB_TOKEN returns 401; the message-end token works → env file uses it; dead token removed.
2. ruflo unavailable (no claude CLI) → native Task sub-agents; gstack cloned + ./setup ok but its runtime is absent → role docs read manually, usage never faked.
3. New per-agent mapping files (`mapping/footer-<ID>.json` etc.) instead of edits to footer.json/home-intro-wrap.json — run.mjs merges every mapping/*.json; kills merge conflicts; regeneration of the big mapping files is forbidden during waves.
4. New per-agent CSS files `landing/footer-<id>.css`/`statement-<id>.css` imported from `landing/home.css` (one @import line each) — avoids 6-way edits of footer.css/statement.css.
5. Phase-A sub-agents branch `wip/r343-<ID>` off b8755850; merges land on `wip/r342-integration` (PR #45) per §4.
6. Browser discipline box-wide: ≤3 headless chromium at once, vite ports 5201-5208, single-bp chunks during waves; full 5-bp matrix only at wave end (2 CPU/4 GB).
7. r343 scaffolding docs committed directly on wip/r342-integration (docs-only commit, no code risk).
8. npm ci completed at repo root of the PR worktree (npm workspaces hoist); agents must never run npm install (hard-linked node_modules shared by inode).
