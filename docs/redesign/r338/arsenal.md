# R338 arsenal (tools actually used)
T-07 | playwright(chromium-1200) + scroll.mjs extract/feel/assert + node tsc | live-extract Heron scrub curves @5 bps, fix inkCoverage poles, verify scroll feel+curves conformance
T-01 | curl+jq (Actions API) | pulled failing jobs+logs for 37705268/e31fb42/766871a + branch-run verdicts
T-01 | playwright+tsx audit sweep (repo scripts, attempted) | local drift repro blocked by conf.lock contention — same-infra control run used instead
T-02 | rg/python import-graph scan + npm workspaces install + vite build/check-bundle-size | dead-code census (usecase JS/CSS), gate measurement at 776
T-02a | conformance/run.mjs + mapping wordset rule | structural word-split scaffold isolation for usecase (vite 5302 + instrument --url)
T-03 | scripts/conformance/run.mjs (direct, --url own vite :5183) | baseline measure home-intro-wrap 5bps on r338 WIP (70.6%)
T-03 | PLAYWRIGHT_BROWSERS_PATH private symlink dir (.pw-browsers, 1200→1223) | chromium launch workaround while lead's 1223 download stalled at 80%
T-03 | python3 analysis of scripts/conformance/results.json | failure census by kind/path family (x-mirror 231, w 183, y 160, h 110, transition 55, bg 32)
T-03b | scripts/conformance/run.mjs + build-intro-mapping.py (regen) + python census on results.json | mapping desync fix (ROOT→CLI arg, 58→64 explicit bindings, svg collision unbound) + failure census on own vite :5303
T-14a | conformance/run.mjs (--dark + plumbing-skip) + own vite :5314 + chromium-1200 via PLAYWRIGHT_BROWSERS_PATH symlink dir | dark internal-consistency measurement, plumbing-skip selftest, light regression check (9511/12493 identical)
T-05 | jq | compact TSV dumps of the frozen home-why-wrap specs (structure/geometry/type/colour per element, 5 bps)
T-05 | npx tsc -p frontend | typecheck of the rewritten Why.tsx + WhyScene.tsx (caught the dead agent's capSrc?.src error)
T-05 | vite dev (port 5175) + scripts/conformance/run.mjs --sections home-why-wrap | conformance harness for the why cell (run launched; lock-starved at time-out, no measured number)
T-05b | python (results.json census) + run.mjs --url :5305 | failure census by kind×family; measure+iterate loop
T-05c | python3 json rebuilder + playwright probe (/tmp/t05) | true-path rebinds of home-why-wrap mapping from frozen spec
T-05d | python3 str/regex surgery | byte-exact why.css/WhyScene edits where Edit whitespace-matching failed
T-05d | vite build + scripts/check-bundle-size.mjs | bundle-diet verify 777.4→777.0 KB gz PASS
T-05d | conformance/run.mjs --sections home-why-wrap --url :5305 | post-reseat why measurement
T-04a | python census over scripts/conformance/results.json (check-kind × element-family grouping) | top-family failure census
T-04a | playwright probe (repo node_modules; PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-t04 chromium-1200→1223 symlink fallback) | root fs + pm-frame/head/bandinner geometry sanity
T-04b | python3 (json census diffing of heron-spec vs results.json) | decomposed the height/y residuals into per-bp rem targets
T-04b | node scripts/conformance/run.mjs --url :5304 | measured problem 84.6→88.8
T-04c | playwright chromium (/tmp/pw-browsers symlink fallback) + scripts/conformance/run.mjs --url :5304 + vitest r306 + check-colors --strict | 390 DOM forensics (phantom 56px section pad), pm-meta border restore, conformance re-measure, CI test verify
T-04c | curl+jq Actions API + vitest/eslint/tsc/size-gate.sh/design-gates local mirrors + conformance run.mjs --url | CI forensics (fleet-wide red) + 90.5% re-measure
# R338 — tools actually used (append one line per agent)
T-06 | python3 (json census diff of docs/redesign/r335/heron-spec/footer.*.json vs our DOM plan) | footer spec analysis for the rewrite
T-06 | node + npm install (worktree-local completion of the stalled shared install) | deps repair; tsc/vite were blocked until it finished
T-06b | playwright+node walk (scripts/walk-footer-dom.mjs) + python generator (scripts/build-footer-mapping.py) | footer.json data-spec bindings regenerated from live DOM walk vs frozen census
T-06c | walk-footer-dom.mjs + build-footer-mapping.py + census-geometry hand-bind script | footer explicit bindings 25→64
T-06d | python3 (json spec/mapping forensics) | heron footer.{390,768,1440}.json tree walks + footer.json rebinds
T-06d | vitest (r321-decor-innertext) | source-contract fix verification for fo-wordmark-reg
T-06d | scripts/check-colors.sh --strict | color-token gate verification
T-06d | playwright-probe (cmp-t06.mjs sr-seat diff) + node conformance/run.mjs | mobile seat delta table @390/768, re-measure
L-6 | curl+jq (GitHub Actions API — run verdicts, rerun-failed-jobs, log 404 probe) | medic incident diagnosis
L-6 | postcss (node API in repo node_modules) | surgically retire dead legacy footer/why css rules
L-6 | vite build + scripts/check-bundle-size.mjs | local bundle gate measurement (found gate = JS-only)
T-05e | node/playwright (pw-browsers chromium-1223 fallback) | spec-tree rect extraction @768/390 + DOM probe of the ≤991 belt
T-99 | vite build + check-bundle-size.mjs + node zlib gz census + node codemod | bundle diet: per-module sourcemap ranking, dead data-spec/class audit, exact gz byte measurement (777.6→777.5 clean; 578→~500B residual, landing blocked)
T-06f | conformance/run.mjs --sections footer --url :5306 | footer re-measure (dead-agent WIP + plumbing census)
