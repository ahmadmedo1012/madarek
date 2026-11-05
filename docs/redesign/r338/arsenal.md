# R338 arsenal (tools actually used)
T-07 | playwright(chromium-1200) + scroll.mjs extract/feel/assert + node tsc | live-extract Heron scrub curves @5 bps, fix inkCoverage poles, verify scroll feel+curves conformance
T-01 | curl+jq (Actions API) | pulled failing jobs+logs for 37705268/e31fb42/766871a + branch-run verdicts
T-01 | playwright+tsx audit sweep (repo scripts, attempted) | local drift repro blocked by conf.lock contention — same-infra control run used instead

T-02 | rg/python import-graph scan + npm workspaces install + vite build/check-bundle-size | dead-code census (usecase JS/CSS), gate measurement at 776
T-02a | conformance/run.mjs + mapping wordset rule | structural word-split scaffold isolation for usecase (vite 5302 + instrument --url)
L-04 | curl+jq (Actions API) + git merge + verify.sh --fast | branch-CI verdicts for t02/t03/t04 heads, combined landing + fast-verify on main
