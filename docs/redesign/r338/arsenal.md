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
T-02c | python3 census over scripts/conformance/results.json + heron-spec/home-usecase-wrap.*.json | color/lh family decomposition (39 color = rowink/h2box opaque-ink seats; 26 lh = 1.35 floor), spec seat lookup by heron path
T-02c | conformance/run.mjs --sections home-usecase-wrap --url http://localhost:5302 (own vite) + PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers symlink fallback | baseline 90.8 + post-fix measurement
T-03c | scripts/conformance/run.mjs --sections/--url + build-intro-mapping.py | intro word-census bindings regen + residue diagnosis (2 measured runs)
T-08 | node+playwright(dev-server dump + conformance run.mjs) | platform baseline census, explicit-binding structural pass
T-08b | playwright (chromium-1200 symlinked as 1223 via /tmp/pw-browsers) + conformance run.mjs --url | baseline+re-measure platform bp matrix
L-7 | git merge --no-ff train | bundle-neutral land: t02+t03+t08 merged; t05(3c647923) dropped — its TSX added 0.9KB gz (776.4→777.3>777)
L-7 | vite build + check-bundle-size.mjs | per-stage bundle truth: main 776.4 / +t02 776.1 / +t03 776.4 / +t05 777.3 offender / +t08 777.3
L-7 | scripts/verify.sh --fast | landing gate on final train before push to main
L-7 | GitHub Actions API via curl | post-landing triggered-run status check
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
