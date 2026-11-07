# scripts/ — index

The gate set every agent runs before pushing: **`bash scripts/verify.sh`** (or `--fast`).
Nothing reaches main without it (R335/R336 lesson — twice red from unverified merges).

| path | what it does | when |
|---|---|---|
| `verify.sh` | the ONE local gate set: tsc, vitest, build+bundle gate, stylelint+CSS-ratchet (`gates/stylelint-gate.sh`), design gates, lint, conformance (ratchet), scoped e2e. `--fast` = tsc+vitest+bundle+stylelint-ratchet. `--sections <keys>` / `--specs <stems>` scope it | before every push |
| `gates/stylelint-gate.sh` (+ `stylelint-baseline.json`) | R339 T-30 CSS ratchet: stylelint errors + `!important` / raw-z-index / raw-hex counts vs the committed baseline — counts only go DOWN | verify.sh (both modes) |
| `gates/css-counts.mjs` / `gates/css-coverage.mjs` | CSS line/sheet budget counts + selector coverage probe (the r341 C-phase css-counts budget) | C-phase + manual |
| `deadcode/check.sh` (`knip.json`, `jscpd.json`, `baseline.json`) | dead-code / duplication / circular-dep ratchet (knip + jscpd + depcruise) vs baseline; `--update` re-pins measured improvements in the same commit | deadcode.yml CI + manual |
| `check-bundle-size.mjs` | gz ceilings: total ≤770 KB (r339 restored r337's 777), entry ≤92, pdf ≤110 (pinned; raise only with documented reason in the file header) | CI Build + verify.sh |
| `check-icons.sh` / `check-colors.sh --strict` / `check-raw-css.sh --strict` / `check-motion-tokens.sh` / `check-csp-hash.sh` | design gates: icon discipline, no raw colours, no raw type/radius/spacing, motion tokens, CSP pin | CI design-gates + verify.sh |
| `tokens/build.mjs --check` | generated-token drift (web CSS + mobile TS vs shared/design-tokens.json) | CI + verify.sh |
| `verify-parity-export.mjs` | parity export gate | CI + verify.sh |
| `spec/extract-heron.mjs` | freezes the Heron reference into `docs/redesign/r335/heron-spec/*.json` (5 bps, 9 sections + footer + _page + _motion) | once per reference state |
| `conformance/run.mjs` | OUR page vs frozen spec: 9×5 matrix, transformed Arabic expectations, no-counterpart=FAIL, `--gate` vs `ratchet.json` (monotonic, floor 91.8), `--ratchet` to raise; `--dark` adds a dark internal-consistency pass (spec is light-only) | CI conform-gate + verify.sh |
| `conformance/pages.mjs` | R340 per-page harness for the non-landing pages (no Heron counterpart): page × breakpoint × theme vs the pattern library's own sheet grammar — the r341 D-task ≥90-all-cells gate (`--routes <r> --bps 1440,390 [--dark]`) | D-task recipe + verify |
| `conformance/panel.mjs` | R340 T-P1x — the blind panel's findings as numbers (sticky-header overlap, orphaned edge marks, caption breaks …): human-visible failure classes as gate axes | I1/B1 panels |
| `conformance/scroll.mjs` | scroll-feel assertions (Lenis live, scroll-behavior, restoration, sticky offsets, dead anchors) + scrub-curve sampling vs frozen `scroll-curves.<bp>.json`; `extract` freezes curves from live Heron | run.mjs `--scroll` |
| `conformance/interact.mjs` | hover/focus-visible delta classes vs spec records + pattern-consistency census (one shared class per pattern) | run.mjs `--interact` |
| `r318/defect-gate.mjs` | release defect ledger gate | release |
| `smoke-deploy.mjs` | post-deploy smoke | deploy |
| `db-backup.mjs` / `db-restore.mjs` | Neon snapshot ops | manual |

Conformance flags + mapping schema (r338 T-14a):
- `--dark` — flips `<html data-theme="dark">` exactly the way the site's ThemeToggle does, waits out the swap, re-walks the same sections and re-asserts the SAME pairs: geometry/type/border/radius/opacity/interactive/transition vs the frozen (light) spec — a theme flip must not move a box or retype a line. The color group is NOT compared to the light spec (it differs by design); instead `--dark` measures OUR internal consistency: (a) the flip actually applied (`html[data-theme="dark"]`), (b) a token-flip census — ≥1 paired element per section must change color/bg light→dark (catches sections with no dark arm), (c) a WCAG-style contrast floor ≥ 3.0 for every text-bearing/interactive paired element vs its COMPOSITED effective background — the ancestor rgba layers are alpha-blended into one opaque surface and the ink (rgb/rgba/color(srgb)/oklch, times element opacity) is composited over it before the ratio; applicable-but-uncountable pairs are REPORTED as counted skips (skippedReport + contrastReported), never silently dropped. Post-flip measurement uses a deterministic settle (fonts.ready → rAF×2 → 3 stable frames) so identical runs yield identical geometry. Results land in `results.json` under `summary.dark` + per-cell `dark` (separate from the light pass-rate; the ratchet/gate still read the light rate).
- Per-binding `skip: ["tag"|"tc"|"geometry"|"type"|"color"]` (in `explicit[]`) and the mapping-level `plumbing: [{ "section", "heron", "skip": [...], "reason" }]` array (spec-path exact/suffix, same grammar as `noCounterpart`) declare field-groups that are tween/defs/mask plumbing, not measured design. Skipped checks are COUNTED per cell (`skipped`, console `s=`, `summary.totalSkipped`) and listed in `results.skippedReport` with the written reason — never a silent pass; every non-declared assertion (and all assertions on real boxes) stays measured.
