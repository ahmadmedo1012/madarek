T-05 | jq | compact TSV dumps of the frozen home-why-wrap specs (structure/geometry/type/colour per element, 5 bps)
T-05 | npx tsc -p frontend | typecheck of the rewritten Why.tsx + WhyScene.tsx (caught the dead agent's capSrc?.src error)
T-05 | vite dev (port 5175) + scripts/conformance/run.mjs --sections home-why-wrap | conformance harness for the why cell (run launched; lock-starved at time-out, no measured number)
T-05b | python (results.json census) + run.mjs --url :5305 | failure census by kind×family; measure+iterate loop
T-05c | python3 json rebuilder + playwright probe (/tmp/t05) | true-path rebinds of home-why-wrap mapping from frozen spec
T-05d | python3 str/regex surgery | byte-exact why.css/WhyScene edits where Edit whitespace-matching failed
T-05d | vite build + scripts/check-bundle-size.mjs | bundle-diet verify 777.4→777.0 KB gz PASS
T-05d | conformance/run.mjs --sections home-why-wrap --url :5305 | post-reseat why measurement
