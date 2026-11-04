# scripts/ — index

The gate set every agent runs before pushing: **`bash scripts/verify.sh`** (or `--fast`).
Nothing reaches main without it (R335/R336 lesson — twice red from unverified merges).

| path | what it does | when |
|---|---|---|
| `verify.sh` | the ONE local gate set: tsc, vitest, build+bundle gate, design gates, lint, conformance (ratchet), scoped e2e. `--fast` = tsc+vitest+bundle. `--sections <keys>` / `--specs <stems>` scope it | before every push |
| `check-bundle-size.mjs` | gz ceilings: total ≤776 KB, entry ≤92, pdf ≤110 (pinned; raise only with documented reason in the file header) | CI Build + verify.sh |
| `check-icons.sh` / `check-colors.sh --strict` / `check-raw-css.sh --strict` / `check-motion-tokens.sh` / `check-csp-hash.sh` | design gates: icon discipline, no raw colours, no raw type/radius/spacing, motion tokens, CSP pin | CI design-gates + verify.sh |
| `tokens/build.mjs --check` | generated-token drift (web CSS + mobile TS vs shared/design-tokens.json) | CI + verify.sh |
| `verify-parity-export.mjs` | parity export gate | CI + verify.sh |
| `spec/extract-heron.mjs` | freezes the Heron reference into `docs/redesign/r335/heron-spec/*.json` (5 bps, 9 sections + footer + _page + _motion) | once per reference state |
| `conformance/run.mjs` | OUR page vs frozen spec: 9×5 matrix, transformed Arabic expectations, no-counterpart=FAIL, `--gate` vs `ratchet.json` (monotonic), `--ratchet` to raise | CI conform-gate + verify.sh |
| `conformance/scroll.mjs` | scroll-feel assertions (Lenis live, scroll-behavior, restoration, sticky offsets, dead anchors) + scrub-curve sampling vs frozen `scroll-curves.<bp>.json`; `extract` freezes curves from live Heron | run.mjs `--scroll` |
| `conformance/interact.mjs` | hover/focus-visible delta classes vs spec records + pattern-consistency census (one shared class per pattern) | run.mjs `--interact` |
| `r318/defect-gate.mjs` | release defect ledger gate | release |
| `smoke-deploy.mjs` | post-deploy smoke | deploy |
| `db-backup.mjs` / `db-restore.mjs` | Neon snapshot ops | manual |
