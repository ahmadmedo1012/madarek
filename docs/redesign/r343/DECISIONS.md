# R343 decisions (one line each)
1. 2026-11-08 §1 GITHUB_TOKEN returns 401; the message-end token works → env file uses it; dead token removed.
2. ruflo unavailable (no claude CLI) → native Task sub-agents; gstack cloned + ./setup ok but its runtime is absent → role docs read manually, usage never faked.
3. New per-agent mapping files (`mapping/footer-<ID>.json` etc.) instead of edits to footer.json/home-intro-wrap.json — run.mjs merges every mapping/*.json; kills merge conflicts; regeneration of the big mapping files is forbidden during waves.
4. New per-agent CSS files `landing/footer-<id>.css`/`statement-<id>.css` imported from `landing/home.css` (one @import line each) — avoids 6-way edits of footer.css/statement.css.
5. Phase-A sub-agents branch `wip/r343-<ID>` off b8755850; merges land on `wip/r342-integration` (PR #45) per §4.
6. Browser discipline box-wide: ≤3 headless chromium at once, vite ports 5201-5208, single-bp chunks during waves; full 5-bp matrix only at wave end (2 CPU/4 GB).
7. r343 scaffolding docs committed directly on wip/r342-integration (docs-only commit, no code risk).
8. npm ci completed at repo root of the PR worktree (npm workspaces hoist); agents must never run npm install (hard-linked node_modules shared by inode).
9. Phase B merged PR #45 with a merge commit a0fb0bb1 (history preserved); CI green on it; deploy-smoke success; live smoke green 390/1440×2 themes (the dark-seed key: madarek-theme zustand JSON).
10. C-1 architecture: ONE shared geometry source shared/media/university-cards.ts — web renders inline SVG (theme via seat tokens), mobile/static files consume the same module (never forked); cards replace 26 photo derivatives + all renders; the 9 -800 renditions stay until the Phase F mobile port (documented blocker, C1).
11. The crawl is type-first (cards at uniform 2:1), fixing the never-shipped crop-uob-garden 404; the intro veil svg retired with the photo (its 2 bindings replaced by card-seat bindings — intro back at 41.1/40.1 baseline, zero new fails).
12. Mobile CI red on main = the EAS build-quota death (resets Dec 1) — external; documented, not gated around.
13. The card component lives under components/illustrations/ (the icon-policy allowlist) — not components/media.
14. knip: postcss.config.cjs ignored (config file, not an import); UniversityCardProps un-exported — deadcode ratchet back to 0 regressed.
15. OG regenerated in place by the R323 pipeline + the skyline band + [01] index (the imagery system); 5 orphans deleted.
16. STOPPED BY BUDGET at C-6 (textures): A+B done, C-1/C-2/C-7a/C-7b done; C-4/C-5/C-6/C-sheet + D/E/F/G remain — RESUME.md is the continuation contract.
