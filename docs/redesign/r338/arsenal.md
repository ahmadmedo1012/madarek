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
T-08 | node+playwright(dev-server dump + conformance run.mjs) | platform baseline census, explicit-binding structural pass
T-08b | playwright (chromium-1200 symlinked as 1223 via /tmp/pw-browsers) + conformance run.mjs --url | baseline+re-measure platform bp matrix
T-08c | playwright (repo node_modules + /tmp/pw-browsers chromium-1200→1223 fallback) | section-relative rect probe of our platform band + mirror-aware rect→data-spec binding generator (/tmp/rectbind.mjs) |
T-08c | node one-liners | failure clustering from scripts/conformance/results.json by kind/selector/heronPath |
T-08c1 | node -e census over scripts/conformance/results.json + docs/redesign/r335/heron-spec/*.json | color/lh family census, spec-value mining (aLh ar-floor + per-bp label/menu/CTA voices)
