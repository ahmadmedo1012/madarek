# R338 — tools actually used (append one line per agent)
T-06 | python3 (json census diff of docs/redesign/r335/heron-spec/footer.*.json vs our DOM plan) | footer spec analysis for the rewrite
T-06 | node + npm install (worktree-local completion of the stalled shared install) | deps repair; tsc/vite were blocked until it finished
T-06b | playwright+node walk (scripts/walk-footer-dom.mjs) + python generator (scripts/build-footer-mapping.py) | footer.json data-spec bindings regenerated from live DOM walk vs frozen census
T-06c | walk-footer-dom.mjs + build-footer-mapping.py + census-geometry hand-bind script | footer explicit bindings 25→64
T-06d | python3 (json spec/mapping forensics) | heron footer.{390,768,1440}.json tree walks + footer.json rebinds
T-06d | vitest (r321-decor-innertext) | source-contract fix verification for fo-wordmark-reg
T-06d | scripts/check-colors.sh --strict | color-token gate verification
T-06d | playwright-probe (cmp-t06.mjs sr-seat diff) + node conformance/run.mjs | mobile seat delta table @390/768, re-measure
