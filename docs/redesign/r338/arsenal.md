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
T02 | playwright probe + spec census diff | y/h geometry re-seat (h2 3-line 64% seat, deck scale model)
||||||| 36a32694
T-08c | playwright (repo node_modules + /tmp/pw-browsers chromium-1200→1223 fallback) | section-relative rect probe of our platform band + mirror-aware rect→data-spec binding generator (/tmp/rectbind.mjs) |
T-08c | node one-liners | failure clustering from scripts/conformance/results.json by kind/selector/heronPath |
T-08c1 | node -e census over scripts/conformance/results.json + docs/redesign/r335/heron-spec/*.json | color/lh family census, spec-value mining (aLh ar-floor + per-bp label/menu/CTA voices)
T-08c2 | conformance/run.mjs (--sections home-platform-wrap --url :5308, light+dark), python/json (mapping rebind analysis + rewrite) | re-pairing + dark pass
||||||| 0188bf2f
T-03d | conformance run.mjs (--url :5303) + build-intro-mapping.py | intro per-char scaffold mirror bindings (intro.wchar.N.M) + 5-bp measurement
L-8 | verify.sh --fast + vite build/check-bundle-size.mjs + vitest/tsc + curl GitHub API | landed t02+t08+t03 (3 gate fixes), runner pin ubuntu-24.04
||||||| 37705268
T-04a | python census over scripts/conformance/results.json (check-kind × element-family grouping) | top-family failure census
T-04a | playwright probe (repo node_modules; PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-t04 chromium-1200→1223 symlink fallback) | root fs + pm-frame/head/bandinner geometry sanity
T-04b | python3 (json census diffing of heron-spec vs results.json) | decomposed the height/y residuals into per-bp rem targets
T-04b | node scripts/conformance/run.mjs --url :5304 | measured problem 84.6→88.8
T-04c | playwright chromium (/tmp/pw-browsers symlink fallback) + scripts/conformance/run.mjs --url :5304 + vitest r306 + check-colors --strict | 390 DOM forensics (phantom 56px section pad), pm-meta border restore, conformance re-measure, CI test verify
T-04c | curl+jq Actions API + vitest/eslint/tsc/size-gate.sh/design-gates local mirrors + conformance run.mjs --url | CI forensics (fleet-wide red) + 90.5% re-measure
L-9 | git/vite/check-bundle-size/verify.sh/curl+jq | staged landing w15: per-merge bundle checks + fast verify
T-09b | node (spec census/generator) + run.mjs --url | per-bp explicit re-pin, svg[N]/corner-mark/station excuses, driver dvh fix
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
T02 | playwright probe + spec census diff | y/h geometry re-seat (h2 3-line 64% seat, deck scale model)
||||||| 36a32694
T-08c | playwright (repo node_modules + /tmp/pw-browsers chromium-1200→1223 fallback) | section-relative rect probe of our platform band + mirror-aware rect→data-spec binding generator (/tmp/rectbind.mjs) |
T-08c | node one-liners | failure clustering from scripts/conformance/results.json by kind/selector/heronPath |
T-08c1 | node -e census over scripts/conformance/results.json + docs/redesign/r335/heron-spec/*.json | color/lh family census, spec-value mining (aLh ar-floor + per-bp label/menu/CTA voices)
T-08c2 | conformance/run.mjs (--sections home-platform-wrap --url :5308, light+dark), python/json (mapping rebind analysis + rewrite) | re-pairing + dark pass
||||||| 0188bf2f
T-03d | conformance run.mjs (--url :5303) + build-intro-mapping.py | intro per-char scaffold mirror bindings (intro.wchar.N.M) + 5-bp measurement
L-8 | verify.sh --fast + vite build/check-bundle-size.mjs + vitest/tsc + curl GitHub API | landed t02+t08+t03 (3 gate fixes), runner pin ubuntu-24.04
T-09 | playwright chromium (pw-browsers fallback chromium-1223→1200) | map conformance baseline + re-measure on port 5309
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
T02 | playwright probe + spec census diff | y/h geometry re-seat (h2 3-line 64% seat, deck scale model)
||||||| 36a32694
T-08c | playwright (repo node_modules + /tmp/pw-browsers chromium-1200→1223 fallback) | section-relative rect probe of our platform band + mirror-aware rect→data-spec binding generator (/tmp/rectbind.mjs) |
T-08c | node one-liners | failure clustering from scripts/conformance/results.json by kind/selector/heronPath |
T-08c1 | node -e census over scripts/conformance/results.json + docs/redesign/r335/heron-spec/*.json | color/lh family census, spec-value mining (aLh ar-floor + per-bp label/menu/CTA voices)
T-08c2 | conformance/run.mjs (--sections home-platform-wrap --url :5308, light+dark), python/json (mapping rebind analysis + rewrite) | re-pairing + dark pass
||||||| 0188bf2f
T-03d | conformance run.mjs (--url :5303) + build-intro-mapping.py | intro per-char scaffold mirror bindings (intro.wchar.N.M) + 5-bp measurement
L-8 | verify.sh --fast + vite build/check-bundle-size.mjs + vitest/tsc + curl GitHub API | landed t02+t08+t03 (3 gate fixes), runner pin ubuntu-24.04
T-99d2 | tsc+vitest+vite/check-bundle-size | axios→native-fetch migration gates + bundle truth
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
T02 | playwright probe + spec census diff | y/h geometry re-seat (h2 3-line 64% seat, deck scale model)
||||||| 36a32694
T-08c | playwright (repo node_modules + /tmp/pw-browsers chromium-1200→1223 fallback) | section-relative rect probe of our platform band + mirror-aware rect→data-spec binding generator (/tmp/rectbind.mjs) |
T-08c | node one-liners | failure clustering from scripts/conformance/results.json by kind/selector/heronPath |
T-08c1 | node -e census over scripts/conformance/results.json + docs/redesign/r335/heron-spec/*.json | color/lh family census, spec-value mining (aLh ar-floor + per-bp label/menu/CTA voices)
T-08c2 | conformance/run.mjs (--sections home-platform-wrap --url :5308, light+dark), python/json (mapping rebind analysis + rewrite) | re-pairing + dark pass
||||||| 0188bf2f
T-03d | conformance run.mjs (--url :5303) + build-intro-mapping.py | intro per-char scaffold mirror bindings (intro.wchar.N.M) + 5-bp measurement
L-8 | verify.sh --fast + vite build/check-bundle-size.mjs + vitest/tsc + curl GitHub API | landed t02+t08+t03 (3 gate fixes), runner pin ubuntu-24.04
T-99d2 | tsc+vitest+vite/check-bundle-size | axios→native-fetch migration gates + bundle truth
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
T-05e | node/playwright (pw-browsers chromium-1223 fallback) | spec-tree rect extraction @768/390 + DOM probe of the ≤991 belt
T-05f | python3 (results.json cluster forensics) | grouped 800 failure rows to find the 224 display:none y≈-8074 hidden-counterpart clusters
T-05f | playwright probe + heron-spec.768/390.json rect extraction | measured row-relative seats for player bits + 12 point-reveals + map box
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
T-03d | conformance run.mjs (--url :5303) + build-intro-mapping.py | intro per-char scaffold mirror bindings (intro.wchar.N.M) + 5-bp measurement
T-03e | run.mjs conformance instrument (--url mode) + build-intro-mapping.py | measured intro junk-pool claims, charSplit container safety verification
T-20 | targeted source reads (rg/grep + package.json x2, scripts/README + verify.sh + run.mjs flags, OWNERSHIP.md, ci.yml, HANDOFF.md, check-bundle-size.mjs, mapping/, styles/landing/, apps/mobile/) | fact-base for AGENTS.md (verified every command, gate, ceiling, seat binding)
T-21 | git mv + du/rg script-dep audit (heron-spec/r331-twin/r320-gate/assets refs) | archive closed redesign rounds into docs/archive/redesign, add docs/INDEX.md, fix AGENTS.md r313 link
T-14a2 | playwright chromium (chromium-1200 via /tmp/pw-browsers symlink fallback, PLAYWRIGHT_BROWSERS_PATH) | dark-path instrument validation: light regression (usecase+footer), 390 determinism double-run, per-bp dark-contrast counts
T-02e | scripts/conformance/run.mjs --dark + vite --port 5302 | usecase dark-ink contrast measurement: rgba composite census 44/43/35/35/35 fails → 0 (43+35 soft-ink seats + 1 seat 2.71@390 via --rl-soft-ink dark arm)
T-11 | run.mjs --sections/--url + python census | hero baseline, failure families, spec-path binding generator
T-11b | run.mjs+playwright(chromium-1200 fallback) | hero pass-2 plumbing-skip + measured transition fixes
T-11c | node + playwright chromium (run.mjs --dark) + vite 5311 | hero measured restyle: span→div tags, work-strip 6-box grid (2.2vw rail, measured w/gap/start), CTA text-link reskin, alt flare block, h1 ar-floor, single-entry 0.4s/ease transitions, vh seats
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
T-06g1 | vitest run (frontend, 242 files) | footer contract reconciliation verify (L-9 list r320/r162/r168/r177/r307/r321/funnel) — 3051/3051 after markup reconcile
T-22 | knip@5.88.1 + jscpd@5.4.2 + dependency-cruiser@18.7.2 (temp-prefix installs /home/z/.t22-tools, zero writes into node_modules) | dead-code/duplication/circular-dep baselines as ratcheted gate (scripts/deadcode/check.sh)
L-c | verify.sh --fast | landing gate tsc+vitest+bundle
L-c | vite build + scripts/check-bundle-size.mjs | bundle ceiling check <=777 gz
L-c | npm install --package-lock-only | lockfile sync after t22 devDep removal
T-11d | conformance run.mjs --dark + vite:5311 | hero dark-contrast baseline/after (30 strip ink seats)
T-09c | playwright(chromium via /tmp/pw-browsers symlink fallback) + run.mjs --sections/--url | baseline+remeasure map conformance
T-09d | conformance run.mjs (+webkit temp-copy probe) | map pass-4 type/colour rhythm measurement; webkit launch blocked by host libs (libgtk-4 etc.)
T-09e | node+JSON edit | mapping noCounterpart batch-add (8 svg-root families, 45 cells)
