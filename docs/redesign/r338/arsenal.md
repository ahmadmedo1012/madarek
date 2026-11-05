T-04a | python census over scripts/conformance/results.json (check-kind × element-family grouping) | top-family failure census
T-04a | playwright probe (repo node_modules; PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-t04 chromium-1200→1223 symlink fallback) | root fs + pm-frame/head/bandinner geometry sanity
T-04b | python3 (json census diffing of heron-spec vs results.json) | decomposed the height/y residuals into per-bp rem targets
T-04b | node scripts/conformance/run.mjs --url :5304 | measured problem 84.6→88.8
T-04c | playwright chromium (/tmp/pw-browsers symlink fallback) + scripts/conformance/run.mjs --url :5304 + vitest r306 + check-colors --strict | 390 DOM forensics (phantom 56px section pad), pm-meta border restore, conformance re-measure, CI test verify
