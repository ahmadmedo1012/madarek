# R338 — tools actually used (append one line per agent)
T-06 | python3 (json census diff of docs/redesign/r335/heron-spec/footer.*.json vs our DOM plan) | footer spec analysis for the rewrite
T-06 | node + npm install (worktree-local completion of the stalled shared install) | deps repair; tsc/vite were blocked until it finished
T-06b | playwright+node walk (scripts/walk-footer-dom.mjs) + python generator (scripts/build-footer-mapping.py) | footer.json data-spec bindings regenerated from live DOM walk vs frozen census
