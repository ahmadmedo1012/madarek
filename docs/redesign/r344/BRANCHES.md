# R344 BRANCHES — G-1 ledger
Cherry-verified `git cherry origin/main <b>` (2026-11-09, against f1e20a64):
- `wip/r343-D1` (6 unique): cherry-picked to main as bd511083..52cf4e4b (dead.mjs + css-dead reports — Phase D inputs; verify --fast PASS).
- `wip/sec-map` (1 unique, 2c3b84f8): excused double-count fix — already on main as the r342-11 repair; duplicate variant, NOT cherry-picked.
- `wip/l2d` (2 unique, 20446939 5dd0bada): R341/W9 why-wave — superseded by main's newer home-why-wrap.json binding set (242 explicit + 93 plumbing); NOT cherry-picked.
- All other 21 `wip/*` (amedic, d-integration, d11, d4, d7b, d7c, d8, d9, h1c, r342-* ×11, r343-C1): 0 unique patches — straight archive-tag + delete.
Archive tags: `archive/<branch-name>` pushed before each delete (branch-sweep.sh, idempotent).
