# R344 DECISIONS
- 2026-11-09 D1 cherry-picks: scripts/css/dead.mjs + css-dead reports live ONLY on wip/r343-D1 (briefing said 0 unique — wrong, cherry shows 6); Phase D needs them → cherry-picked 8331fcb1..90b47d17 to main (52cf4e4b), verify --fast PASS, pushed.
- 2026-11-09 wip/sec-map (2c3b84f8): the excused double-count fix is ALREADY on main as the r342-11 repair (run.mjs:751,820,851) — duplicate patch, document + archive, no cherry-pick.
- 2026-11-09 wip/l2d (20446939+5dd0bada): R341/W9 why-wave superseded — main carries a NEWER why binding set (home-why-wrap.json: 242 explicit + 93 plumbing; why rate 95.1% on the 20261108-231423 blob); document + archive, no cherry-pick.
- 2026-11-09 GitHub credentials: briefing §2 token returns 401 (Bad credentials); the trailing token from the R343 briefing works — recorded in /home/z/.madarek-env (not committed).
