# R341 ARSENAL — tools actually installed/used (honesty ledger)

## Installed & USED (this round)
- **gstack 1.97.0.0** (`~/.claude/skills/gstack`, host=auto → claude tier, full scope, global). Verified skills present on disk: `plan-eng-review`, `plan-design-review`, `design-review`, `devex-review`, `review`, `qa`, `qa-only`, `ship`, `retro`, `careful`, `freeze`, `guard`, `investigate`, `spec`, `test`, `health`, `runaway-stopper`. Usage in R341: review/QA/ship checklists embedded in reviewer-agent briefs; retro at phase ends; careful/freeze guards on cleanup agents.
- **ruflo v3.72.2** (npx). `swarm init --topology hierarchical --max-agents 14` → swarm-1794031015184-ypumjs (message-bus protocol, auto-scale enabled). Used as the coordination ledger: swarm status/scale record N per wave. NOTE: `ruflo agent spawn` targets a claude binary that does not exist in this harness — worker spawning is done by the harness's native sub-agent facility (queen + role workers + independent reviewers), per the §3.1 fallback clause. Never faked.
- Harness native sub-agents (the Task tool): the actual swarm executor. Concurrency controller: target 12, ceiling 14, floor 4; ≤3 browser/dev-server agents at once; CHOKIDAR_USEPOLLING=1; ≤1 worktree per agent.

## Also available in this harness (verified present)
- Image generation, web search/page reading, agent-browser (headless browser automation) — for captures/evidence when needed.
- Repo's own instrument: `scripts/conformance/{run,scroll,interact,tween,panel,pages}.mjs`, `verify.sh`, `branch-sweep.sh`, stylelint gate, knip/jscpd/depcruise gates.

## gstack/ruflo status per phase (appended per wave)
- Phase 0: gstack installed+skills verified; ruflo swarm initialized (14 max); both recorded here. Sub-agent spawn via harness Task tool (fallback documented above).
